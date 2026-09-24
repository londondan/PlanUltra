#!/usr/bin/env python3
"""
PlanUltra Race Review App
=========================
Localhost FastAPI app for reviewing and approving staged races.

Usage:
    python3 review_app.py
    # → open http://localhost:8123

Routes:
    GET  /                          List all staged races
    GET  /race/<slug>               Detail/edit view
    POST /race/<slug>/save          Save reviewer edits
    POST /race/<slug>/approve       Write to DynamoDB + mark approved
    POST /race/<slug>/reject        Mark rejected with reason
    POST /race/<slug>/re-extract    Re-run pipeline for this race
    GET  /race/<slug>/diff          Diff original vs reviewed
    GET  /status                    JSON health check
"""

from __future__ import annotations
import difflib
import json
import os
import subprocess
import sys
from pathlib import Path

try:
    from fastapi import FastAPI, Form, HTTPException, Request
    from fastapi.responses import HTMLResponse, JSONResponse, RedirectResponse
    from fastapi.templating import Jinja2Templates
    import uvicorn
except ImportError:
    print("Missing dependencies. Run: pip install fastapi uvicorn jinja2")
    sys.exit(1)

import db_client
import dynamo_writer
from ingest import run_race, score_race, CACHE_DIR

TEMPLATES_DIR = Path(__file__).parent / 'templates'
app = FastAPI(title='PlanUltra Race Review')
templates = Jinja2Templates(directory=str(TEMPLATES_DIR))


def _get_race_or_404(slug: str) -> dict:
    race = db_client.get_staged_race(slug)
    if race is None:
        raise HTTPException(status_code=404, detail=f"Race '{slug}' not found in staging DB")
    return race


def _active_json(record: dict) -> dict:
    """Return reviewed_json if present, else race_json."""
    raw = record.get('reviewed_json') or record.get('race_json') or '{}'
    return json.loads(raw)


def _score_badge(score: int | None) -> str:
    if score is None:
        return 'badge-unknown'
    if score >= 80:
        return 'badge-green'
    if score >= 60:
        return 'badge-amber'
    return 'badge-red'


def _issues_from_record(record: dict) -> list[dict]:
    raw = record.get('issues_json')
    if not raw:
        return []
    try:
        return json.loads(raw)
    except Exception:
        return []


# ---------------------------------------------------------------------------
# Routes
# ---------------------------------------------------------------------------

@app.get('/', response_class=HTMLResponse)
async def list_view(request: Request):
    all_races = db_client.list_races()
    staged = [r for r in all_races if r['status'] == 'staged']
    approved = [r for r in all_races if r['status'] == 'approved']
    rejected = [r for r in all_races if r['status'] in ('rejected', 'fetch_error')]

    for r in staged + approved + rejected:
        r['_issues'] = _issues_from_record(r)
        r['_badge'] = _score_badge(r.get('completeness_score'))

    return templates.TemplateResponse(
        'list.html',
        {
            'request': request,
            'staged': staged,
            'approved': approved,
            'rejected': rejected,
        },
    )


@app.get('/race/{slug}', response_class=HTMLResponse)
async def detail_view(request: Request, slug: str):
    record = _get_race_or_404(slug)
    data = _active_json(record)
    issues = _issues_from_record(record)

    high_issues   = [i for i in issues if i.get('severity') == 'high']
    medium_issues = [i for i in issues if i.get('severity') == 'medium']
    low_issues    = [i for i in issues if i.get('severity') == 'low']

    score = record.get('completeness_score')
    badge = _score_badge(score)

    return templates.TemplateResponse(
        'detail.html',
        {
            'request': request,
            'record': record,
            'data': data,
            'race': data.get('race', {}),
            'stations': data.get('aid_stations', []),
            'issues': issues,
            'high_issues': high_issues,
            'medium_issues': medium_issues,
            'low_issues': low_issues,
            'score': score,
            'badge': badge,
            'has_edits': bool(record.get('reviewed_json')),
        },
    )


@app.post('/race/{slug}/save')
async def save_edits(request: Request, slug: str):
    record = _get_race_or_404(slug)
    current = _active_json(record)

    form = await request.form()

    # Update race-level fields
    race = dict(current.get('race', {}))
    for field in ('name', 'date', 'start_time', 'timezone', 'location', 'description', 'distance_miles'):
        if field in form:
            val = form[field]
            if field == 'distance_miles':
                try:
                    race[field] = float(val) if val else None
                except ValueError:
                    race[field] = None
            else:
                race[field] = val or None

    # Update aid stations
    stations = list(current.get('aid_stations', []))
    updated_stations = []
    i = 0
    while f'station_{i}_name' in form:
        if i < len(stations):
            s = dict(stations[i])
        else:
            s = {}

        s['name']    = form.get(f'station_{i}_name', s.get('name', ''))
        s['crew_access'] = form.get(f'station_{i}_crew_access') == 'on'
        s['drop_bag']    = form.get(f'station_{i}_drop_bag') == 'on'

        for num_field in ('mile', 'mile_return'):
            val = form.get(f'station_{i}_{num_field}', '')
            try:
                s[num_field] = float(val) if val else None
            except ValueError:
                pass

        cutoff = form.get(f'station_{i}_cutoff_elapsed_minutes', '')
        try:
            s['cutoff_elapsed_minutes'] = int(cutoff) if cutoff else None
        except ValueError:
            pass

        s['parking_notes'] = form.get(f'station_{i}_parking_notes') or None

        for coord_field in ('lat', 'lng'):
            val = form.get(f'station_{i}_{coord_field}', '')
            try:
                s[coord_field] = float(val) if val else None
            except ValueError:
                pass

        updated_stations.append(s)
        i += 1

    reviewed = {**current, 'race': race, 'aid_stations': updated_stations}

    # Recompute score
    score, issues = score_race(reviewed)
    db_client.save_reviewed_json(slug, reviewed)
    # Update score in DB
    import sqlite3
    from db_client import _connect, _now
    with _connect() as conn:
        conn.execute(
            'UPDATE staged_races SET completeness_score = ?, issues_json = ? WHERE slug = ?',
            (score, json.dumps(issues), slug),
        )
    db_client.log_event(slug, 'save', f"Reviewer saved edits (score {score})")

    return RedirectResponse(url=f'/race/{slug}', status_code=303)


@app.post('/race/{slug}/approve')
async def approve_race(request: Request, slug: str, dry_run: bool = False):
    record = _get_race_or_404(slug)

    if record['status'] == 'approved':
        return JSONResponse({'ok': False, 'error': 'Race is already approved'}, status_code=400)

    race_data = _active_json(record)
    gpx_path = str(CACHE_DIR / slug / 'route.gpx')
    if not Path(gpx_path).exists():
        gpx_path = None

    try:
        race_id = dynamo_writer.write_race(race_data, gpx_path=gpx_path, dry_run=dry_run)
    except Exception as exc:
        db_client.log_event(slug, 'approve_error', str(exc))
        return JSONResponse({'ok': False, 'error': str(exc)}, status_code=500)

    if not dry_run:
        db_client.mark_approved(slug, race_id=race_id)
        db_client.log_event(slug, 'approved', f"race_id={race_id}")
        try:
            import sheets_client as sheets_mod
            sheets = sheets_mod.SheetsClient()
            sheets.mark_approved(slug)
        except Exception as e:
            db_client.log_event(slug, 'sheet_error', f"Could not update Sheet: {e}")

    return JSONResponse({'ok': True, 'race_id': race_id, 'redirect': f'/race/{slug}'})


@app.post('/race/{slug}/reject')
async def reject_race(slug: str, reason: str = Form(...)):
    record = _get_race_or_404(slug)
    db_client.mark_rejected(slug, reason)
    db_client.log_event(slug, 'rejected', reason)

    try:
        import sheets_client as sheets_mod
        sheets = sheets_mod.SheetsClient()
        sheets.mark_rejected(slug, reason)
    except Exception as e:
        db_client.log_event(slug, 'sheet_error', f"Could not update Sheet: {e}")

    return RedirectResponse(url='/', status_code=303)


@app.post('/race/{slug}/re-extract')
async def re_extract(slug: str, confirm: bool = Form(default=False)):
    record = _get_race_or_404(slug)

    if record.get('reviewed_json') and not confirm:
        return JSONResponse(
            {
                'ok': False,
                'needs_confirm': True,
                'warning': 'Re-extraction will discard your reviewer edits. POST with confirm=true to proceed.',
            },
            status_code=409,
        )

    try:
        import sheets_client as sheets_mod
        sheets = sheets_mod.SheetsClient()
        row = sheets.get_race_by_slug(slug)
    except Exception:
        row = {'slug': slug, 'race_name': record['race_name'], 'website_url': record.get('website_url', '')}

    db_client.log_event(slug, 'reextract', 'Re-extraction triggered')
    # Run in the background so the endpoint returns quickly
    subprocess.Popen(
        [sys.executable, str(Path(__file__).parent / 'ingest.py'), 'run', '--slug', slug, '--force'],
        cwd=str(Path(__file__).parent),
    )

    return JSONResponse({'ok': True, 'message': f'Re-extraction started for {slug}. Refresh in ~30s.'})


@app.get('/race/{slug}/diff', response_class=HTMLResponse)
async def diff_view(request: Request, slug: str):
    record = _get_race_or_404(slug)

    original = json.dumps(json.loads(record.get('race_json') or '{}'), indent=2).splitlines()
    reviewed = record.get('reviewed_json')

    if reviewed:
        reviewed_lines = json.dumps(json.loads(reviewed), indent=2).splitlines()
        diff = difflib.unified_diff(
            original, reviewed_lines,
            fromfile='original extraction',
            tofile='reviewed',
            lineterm='',
        )
        diff_text = '\n'.join(diff)
    else:
        diff_text = None

    return templates.TemplateResponse(
        'diff.html',
        {
            'request': request,
            'record': record,
            'diff_text': diff_text,
        },
    )


@app.get('/status')
async def health():
    races = db_client.list_races()
    staged_count = sum(1 for r in races if r['status'] == 'staged')
    approved_count = sum(1 for r in races if r['status'] == 'approved')
    return JSONResponse({
        'ok': True,
        'staged': staged_count,
        'approved': approved_count,
        'total': len(races),
    })


# ---------------------------------------------------------------------------
# Entry point
# ---------------------------------------------------------------------------

if __name__ == '__main__':
    print("PlanUltra Race Review App")
    print("→  http://localhost:8123")
    uvicorn.run(app, host='127.0.0.1', port=8123, reload=False)
