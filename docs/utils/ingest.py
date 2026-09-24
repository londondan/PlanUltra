#!/usr/bin/env python3
"""
PlanUltra Race Ingestion Pipeline CLI
======================================
Runs Stages 1–3 of the race ingestion pipeline:
  Stage 1: Discover and download GPX + PDF via Playwright
  Stage 2: Extract structured data (GPX parse + Claude tool-call)
  Stage 3: Validate, score, and write to SQLite staging DB

Usage
-----
    # Run all new Sheet rows through the pipeline
    python3 ingest.py run --all

    # Run a specific race by slug
    python3 ingest.py run --slug western-states-100

    # Stage 1 only (fetch, no extraction)
    python3 ingest.py fetch --all
    python3 ingest.py fetch --slug western-states-100

    # Print status of all staged races
    python3 ingest.py status

Requirements
------------
    pip install playwright gspread pydantic boto3 fastapi uvicorn jinja2
    playwright install chromium
    ANTHROPIC_API_KEY environment variable must be set for extraction.
"""

from __future__ import annotations
import argparse
import hashlib
import json
import os
import sys
import re
from datetime import datetime, timezone
from pathlib import Path

# Pipeline modules
import db_client
import sheets_client as sheets_mod
from schema import PIPELINE_VERSION
from extract_race import (
    parse_gpx,
    extract_relevant_pages,
    extract_text_from_pdf,
    llm_extract_structured,
    merge_pipeline,
)

CACHE_DIR = Path(__file__).parent / 'cache'
LOG_DIR   = Path(__file__).parent / 'logs'

GPX_LINK_PATTERNS = [
    r'\.gpx$',
    r'gpx',
    r'course.*download',
    r'route.*download',
    r'download.*course',
]

PDF_LINK_PATTERNS = [
    r'runner.*guide',
    r'runners.*guide',
    r'race.*guide',
    r'participant.*guide',
    r'runner.*manual',
    r'race.*manual',
    r'course.*guide',
    r'\.pdf$',
]


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _slug_from_name(name: str) -> str:
    slug = name.lower()
    slug = re.sub(r'[^a-z0-9\s-]', '', slug)
    slug = re.sub(r'\s+', '-', slug.strip())
    slug = re.sub(r'-+', '-', slug)
    return slug


def _file_hash(path: Path) -> str:
    h = hashlib.sha256()
    with open(path, 'rb') as f:
        for chunk in iter(lambda: f.read(65536), b''):
            h.update(chunk)
    return h.hexdigest()


def _load_hashes(slug: str) -> dict:
    hashes_path = CACHE_DIR / slug / 'hashes.json'
    if hashes_path.exists():
        return json.loads(hashes_path.read_text())
    return {}


def _save_hashes(slug: str, hashes: dict):
    hashes_path = CACHE_DIR / slug / 'hashes.json'
    hashes_path.parent.mkdir(parents=True, exist_ok=True)
    hashes_path.write_text(json.dumps(hashes, indent=2))


def _log(msg: str):
    LOG_DIR.mkdir(parents=True, exist_ok=True)
    ts = datetime.now(timezone.utc).isoformat()
    line = f"[{ts}] {msg}"
    print(line)
    with open(LOG_DIR / 'ingest.log', 'a') as f:
        f.write(line + '\n')


# ---------------------------------------------------------------------------
# Stage 1: Discover and download
# ---------------------------------------------------------------------------

def _score_link(href: str, text: str, patterns: list[str]) -> int:
    combined = (href + ' ' + text).lower()
    return sum(1 for p in patterns if re.search(p, combined))


def _discover_links(page, patterns: list[str]) -> list[tuple[str, str]]:
    """Return (href, text) pairs from the page that match the patterns, scored."""
    links = page.query_selector_all('a[href]')
    scored = []
    for link in links:
        href = link.get_attribute('href') or ''
        text = link.inner_text() or ''
        score = _score_link(href, text, patterns)
        if score > 0:
            scored.append((score, href, text))
    scored.sort(reverse=True)
    return [(href, text) for _, href, text in scored]


def _resolve_url(base_url: str, href: str) -> str:
    from urllib.parse import urljoin
    return urljoin(base_url, href)


def discover_and_download(
    slug: str,
    website_url: str,
    gpx_override: str | None = None,
    pdf_override: str | None = None,
    force: bool = False,
) -> dict:
    """
    Stage 1: Visit race website, find and download GPX + PDF.
    Returns dict with keys: gpx_path, pdf_path, gpx_changed, pdf_changed, gpx_source.
    Raises on fatal errors.
    """
    try:
        from playwright.sync_api import sync_playwright
    except ImportError:
        raise ImportError(
            "playwright not installed. Run: pip install playwright && playwright install chromium"
        )

    race_dir = CACHE_DIR / slug
    race_dir.mkdir(parents=True, exist_ok=True)

    gpx_path = race_dir / 'route.gpx'
    pdf_path = race_dir / 'packet.pdf'
    cached_hashes = _load_hashes(slug)
    result = {
        'gpx_path': None,
        'pdf_path': None,
        'gpx_changed': False,
        'pdf_changed': False,
        'gpx_source': 'unknown',
    }

    with sync_playwright() as pw:
        browser = pw.chromium.launch(headless=True)
        context = browser.new_context()
        page = context.new_page()

        _log(f"[{slug}] Visiting {website_url}")
        page.goto(website_url, timeout=30000, wait_until='networkidle')

        # --- Download GPX ---
        gpx_url = gpx_override
        if not gpx_url:
            gpx_links = _discover_links(page, GPX_LINK_PATTERNS)
            if gpx_links:
                gpx_url = _resolve_url(website_url, gpx_links[0][0])
                gpx_text = gpx_links[0][1].strip()
                result['gpx_source'] = (
                    'official' if any(w in gpx_text.lower() for w in ('official', 'course'))
                    else 'community'
                )
                _log(f"[{slug}] GPX link found: {gpx_url} ('{gpx_text}')")
            else:
                # Log candidate links for manual review
                all_links = [(link.get_attribute('href') or '', link.inner_text() or '')
                             for link in page.query_selector_all('a[href]')]
                db_client.log_event(slug, 'fetch_error', f"GPX not found — {len(all_links)} candidate links on page")
                raise RuntimeError(f"GPX not found on {website_url} — {len(all_links)} links logged for manual review")

        if gpx_url:
            _log(f"[{slug}] Downloading GPX: {gpx_url}")
            resp = context.request.get(gpx_url)
            if resp.status >= 400:
                raise RuntimeError(f"GPX download failed: HTTP {resp.status}")
            gpx_path.write_bytes(resp.body())
            new_hash = _file_hash(gpx_path)
            result['gpx_changed'] = force or (new_hash != cached_hashes.get('gpx'))
            cached_hashes['gpx'] = new_hash
            result['gpx_path'] = str(gpx_path)

        # --- Download PDF ---
        pdf_url = pdf_override
        if not pdf_url:
            pdf_links = _discover_links(page, PDF_LINK_PATTERNS)
            # Skip obvious non-race PDFs
            filtered = [
                (href, text) for href, text in pdf_links
                if not any(skip in (href + text).lower()
                           for skip in ('sponsor', 'media', 'waiver', 'volunteer'))
            ]
            if filtered:
                pdf_url = _resolve_url(website_url, filtered[0][0])
                _log(f"[{slug}] PDF link found: {pdf_url} ('{filtered[0][1].strip()}')")

        if pdf_url:
            _log(f"[{slug}] Downloading PDF: {pdf_url}")
            resp = context.request.get(pdf_url)
            if resp.status < 400:
                pdf_path.write_bytes(resp.body())
                new_hash = _file_hash(pdf_path)
                result['pdf_changed'] = force or (new_hash != cached_hashes.get('pdf'))
                cached_hashes['pdf'] = new_hash
                result['pdf_path'] = str(pdf_path)
            else:
                _log(f"[{slug}] ⚠ PDF download failed: HTTP {resp.status} — continuing without PDF")
        else:
            _log(f"[{slug}] No PDF found — will extract from GPX waypoints only")

        browser.close()

    _save_hashes(slug, cached_hashes)
    return result


# ---------------------------------------------------------------------------
# Stage 2: Extract
# ---------------------------------------------------------------------------

def run_extraction(slug: str, race_name: str, download: dict) -> dict:
    """Stage 2: Parse GPX + extract from PDF via Claude, then merge."""
    gpx_path = download.get('gpx_path')
    pdf_path = download.get('pdf_path')

    if gpx_path and Path(gpx_path).exists():
        _log(f"[{slug}] Parsing GPX: {gpx_path}")
        gpx_data = parse_gpx(gpx_path)
        _log(f"[{slug}]   {len(gpx_data['waypoints'])} waypoints · {gpx_data['total_miles']:.1f} miles")
        if not gpx_data.get('waypoints'):
            db_client.log_event(slug, 'extract_ok', 'no_waypoints: GPX has no <wpt> elements')
    else:
        gpx_data = {'waypoints': [], 'track_points': [], 'cumulative_miles': [], 'total_miles': None}

    if pdf_path and Path(pdf_path).exists():
        _log(f"[{slug}] Extracting relevant pages from PDF...")
        source_text = extract_relevant_pages(pdf_path)
        _log(f"[{slug}]   {len(source_text)} chars of relevant text")
        extracted = llm_extract_structured(source_text, race_name_hint=race_name)
    else:
        _log(f"[{slug}] No PDF — using GPX waypoints only")
        extracted = {
            'name': race_name,
            'date': None, 'start_time': None, 'timezone': None,
            'location': None, 'distance_miles': gpx_data.get('total_miles'),
            'description': None, 'aid_stations': [],
        }

    _log(f"[{slug}] Merging GPX + extracted data...")
    merged = merge_pipeline(gpx_data, extracted)
    db_client.log_event(slug, 'extract_ok', f"{len(merged['aid_stations'])} stations")
    return merged


# ---------------------------------------------------------------------------
# Stage 3: Validate and score
# ---------------------------------------------------------------------------

def score_race(data: dict) -> tuple[int, list[dict]]:
    """Returns (score 0-100, list of issue dicts)."""
    issues = []
    score = 100

    aid_stations = data.get('aid_stations', [])
    crew_stations = [s for s in aid_stations if s.get('crew_access')]

    # Coords (40 pts) — only crew stations
    missing_coords = [s for s in crew_stations if s.get('lat') is None or s.get('lng') is None]
    if crew_stations:
        coord_score = 40 * (1 - len(missing_coords) / len(crew_stations))
        score -= round(40 - coord_score)
        for s in missing_coords:
            issues.append({
                'station': s['name'], 'mile': s.get('mile'),
                'field': 'coords', 'severity': 'high',
                'msg': 'No GPS coords — crew station will not appear on map',
            })

    # Parking notes (30 pts) — only crew stations
    missing_parking = [s for s in crew_stations if not s.get('parking_notes')]
    if crew_stations:
        parking_score = 30 * (1 - len(missing_parking) / len(crew_stations))
        score -= round(30 - parking_score)
        for s in missing_parking:
            issues.append({
                'station': s['name'], 'mile': s.get('mile'),
                'field': 'parking', 'severity': 'medium',
                'msg': 'Crew-accessible but no parking notes extracted',
            })

    # Cutoffs (20 pts) — all stations except Start/Finish
    skip_names = {'start', 'start/finish', 'finish'}
    missing_cutoffs = [
        s for s in aid_stations
        if s.get('cutoff_elapsed_minutes') is None
        and s.get('name', '').lower() not in skip_names
    ]
    if aid_stations:
        cutoff_score = 20 * (1 - len(missing_cutoffs) / len(aid_stations))
        score -= round(20 - cutoff_score)

    # Description (10 pts)
    race_meta = data.get('race', {})
    if not race_meta.get('description'):
        score -= 10
        issues.append({
            'station': None, 'field': 'description', 'severity': 'low',
            'msg': 'No library description — add a 1-2 sentence summary',
        })

    return max(0, round(score)), issues


# ---------------------------------------------------------------------------
# Main pipeline runner
# ---------------------------------------------------------------------------

def run_race(row: dict, force: bool = False):
    slug = row.get('slug') or _slug_from_name(row.get('race_name', 'unknown'))
    race_name = row.get('race_name', slug)
    website_url = row.get('website_url', '')
    gpx_override = row.get('gpx_url_override') or None
    pdf_override = row.get('pdf_url_override') or None

    _log(f"[{slug}] Starting pipeline run")

    try:
        sheets = sheets_mod.SheetsClient()
        sheets.mark_fetching(slug)
    except Exception as e:
        _log(f"[{slug}] ⚠ Could not update Sheet (continuing): {e}")
        sheets = None

    # Stage 1
    try:
        db_client.log_event(slug, 'fetch_ok', f"Starting fetch for {website_url}")
        download = discover_and_download(
            slug, website_url,
            gpx_override=gpx_override,
            pdf_override=pdf_override,
            force=force,
        )
    except Exception as e:
        _log(f"[{slug}] ✗ Stage 1 failed: {e}")
        db_client.log_event(slug, 'fetch_error', str(e))
        if sheets:
            sheets.mark_fetch_error(slug, str(e))
        return

    # Skip if nothing changed (unless force)
    if not force and not download.get('gpx_changed') and not download.get('pdf_changed'):
        _log(f"[{slug}] No file changes detected — skipping extraction")
        db_client.log_event(slug, 'skipped_no_change')
        return

    # Stage 2
    try:
        merged = run_extraction(slug, race_name, download)
    except Exception as e:
        _log(f"[{slug}] ✗ Stage 2 failed: {e}")
        db_client.log_event(slug, 'extract_error', str(e))
        if sheets:
            sheets.mark_fetch_error(slug, f"Extraction failed: {e}")
        return

    # Stage 3
    score, issues = score_race(merged)
    _log(f"[{slug}] Completeness score: {score} ({len(issues)} issues)")

    db_client.upsert_staged_race(
        slug=slug,
        race_name=race_name,
        race_json=merged,
        website_url=website_url,
        status='staged',
        completeness_score=score,
        issues=issues,
        gpx_source=download.get('gpx_source'),
        gpx_hash=_file_hash(Path(download['gpx_path'])) if download.get('gpx_path') else None,
        pdf_hash=_file_hash(Path(download['pdf_path'])) if download.get('pdf_path') else None,
        pipeline_version=PIPELINE_VERSION,
    )

    if sheets:
        try:
            sheets.mark_staged(slug, score)
        except Exception as e:
            _log(f"[{slug}] ⚠ Could not update Sheet staged status: {e}")

    _log(f"[{slug}] ✓ Staged successfully (score {score})")


# ---------------------------------------------------------------------------
# CLI
# ---------------------------------------------------------------------------

def cmd_run(args):
    try:
        sheets = sheets_mod.SheetsClient()
        if args.all:
            rows = sheets.get_new_races()
            _log(f"Found {len(rows)} new/error races to process")
        elif args.slug:
            row = sheets.get_race_by_slug(args.slug)
            if not row:
                print(f"Slug '{args.slug}' not found in Sheet.")
                sys.exit(1)
            rows = [row]
        else:
            rows = []
    except Exception as e:
        print(f"Error connecting to Google Sheet: {e}")
        print("Hint: check ~/.config/planultra/config.toml and gsheets-key.json")
        sys.exit(1)

    for row in rows:
        run_race(row, force=getattr(args, 'force', False))


def cmd_fetch(args):
    """Stage 1 only — download without extraction."""
    try:
        sheets = sheets_mod.SheetsClient()
        if args.all:
            rows = sheets.get_new_races()
        elif args.slug:
            row = sheets.get_race_by_slug(args.slug)
            rows = [row] if row else []
        else:
            rows = []
    except Exception as e:
        print(f"Error connecting to Google Sheet: {e}")
        sys.exit(1)

    for row in rows:
        slug = row.get('slug') or _slug_from_name(row.get('race_name', 'unknown'))
        try:
            result = discover_and_download(
                slug,
                row.get('website_url', ''),
                gpx_override=row.get('gpx_url_override') or None,
                pdf_override=row.get('pdf_url_override') or None,
                force=True,
            )
            print(f"  {slug}: GPX={'changed' if result['gpx_changed'] else 'unchanged'}, PDF={'changed' if result['pdf_changed'] else 'unchanged'}")
        except Exception as e:
            print(f"  {slug}: ERROR — {e}")


def cmd_status(args):
    races = db_client.list_races()
    if not races:
        print("No staged races found.")
        return
    print(f"\n{'Race':<40} {'Score':>5}  {'Status':<10}  Staged")
    print('-' * 75)
    for r in races:
        score_str = str(r['completeness_score']) if r['completeness_score'] is not None else '—'
        staged = (r.get('staged_at') or '')[:10]
        print(f"{r['race_name']:<40} {score_str:>5}  {r['status']:<10}  {staged}")
    print()


def build_parser():
    p = argparse.ArgumentParser(
        description='PlanUltra race ingestion pipeline CLI.',
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog=__doc__,
    )
    sub = p.add_subparsers(dest='command', required=True)

    run_p = sub.add_parser('run', help='Run full pipeline (Stages 1-3) for new Sheet rows')
    run_p.add_argument('--all', action='store_true', help='Process all new/error rows')
    run_p.add_argument('--slug', help='Process a specific race by slug')
    run_p.add_argument('--force', action='store_true', help='Re-run even if files unchanged')

    fetch_p = sub.add_parser('fetch', help='Stage 1 only: discover and download files')
    fetch_p.add_argument('--all', action='store_true')
    fetch_p.add_argument('--slug')

    sub.add_parser('status', help='Print status of all staged races')

    return p


def main():
    parser = build_parser()
    args = parser.parse_args()

    if args.command == 'run':
        cmd_run(args)
    elif args.command == 'fetch':
        cmd_fetch(args)
    elif args.command == 'status':
        cmd_status(args)


if __name__ == '__main__':
    main()
