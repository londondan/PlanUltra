"""
SQLite staging database client for the race ingestion pipeline.
DB lives at ~/.local/share/planultra/staging.db (not in the repo).
"""

from __future__ import annotations
import json
import sqlite3
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

DB_PATH = Path.home() / '.local' / 'share' / 'planultra' / 'staging.db'

CREATE_STAGED_RACES = """
CREATE TABLE IF NOT EXISTS staged_races (
    slug TEXT PRIMARY KEY,
    race_name TEXT NOT NULL,
    website_url TEXT,
    status TEXT NOT NULL DEFAULT 'staged',
    completeness_score INTEGER,
    staged_at TEXT,
    approved_at TEXT,
    rejected_at TEXT,
    rejection_reason TEXT,
    gpx_source TEXT,
    gpx_hash TEXT,
    pdf_hash TEXT,
    race_json TEXT NOT NULL DEFAULT '{}',
    issues_json TEXT,
    reviewed_json TEXT,
    pipeline_version TEXT
)
"""

CREATE_FETCH_LOG = """
CREATE TABLE IF NOT EXISTS fetch_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    slug TEXT,
    run_at TEXT,
    event TEXT,
    detail TEXT
)
"""


def _now() -> str:
    return datetime.now(timezone.utc).isoformat()


def _connect() -> sqlite3.Connection:
    DB_PATH.parent.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def init_db():
    """Create tables if they don't exist."""
    with _connect() as conn:
        conn.execute(CREATE_STAGED_RACES)
        conn.execute(CREATE_FETCH_LOG)


def upsert_staged_race(
    slug: str,
    race_name: str,
    race_json: dict,
    *,
    website_url: str | None = None,
    status: str = 'staged',
    completeness_score: int | None = None,
    issues: list | None = None,
    gpx_source: str | None = None,
    gpx_hash: str | None = None,
    pdf_hash: str | None = None,
    pipeline_version: str | None = None,
):
    init_db()
    with _connect() as conn:
        existing = conn.execute(
            'SELECT slug FROM staged_races WHERE slug = ?', (slug,)
        ).fetchone()

        if existing:
            conn.execute(
                """UPDATE staged_races SET
                    race_name = ?, website_url = ?, status = ?,
                    completeness_score = ?, staged_at = ?,
                    issues_json = ?, gpx_source = ?, gpx_hash = ?,
                    pdf_hash = ?, race_json = ?, reviewed_json = NULL,
                    pipeline_version = ?
                WHERE slug = ?""",
                (
                    race_name, website_url, status,
                    completeness_score, _now(),
                    json.dumps(issues) if issues is not None else None,
                    gpx_source, gpx_hash, pdf_hash,
                    json.dumps(race_json), pipeline_version, slug,
                ),
            )
        else:
            conn.execute(
                """INSERT INTO staged_races
                    (slug, race_name, website_url, status, completeness_score,
                     staged_at, issues_json, gpx_source, gpx_hash, pdf_hash,
                     race_json, pipeline_version)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
                (
                    slug, race_name, website_url, status,
                    completeness_score, _now(),
                    json.dumps(issues) if issues is not None else None,
                    gpx_source, gpx_hash, pdf_hash,
                    json.dumps(race_json), pipeline_version,
                ),
            )


def get_staged_race(slug: str) -> dict | None:
    init_db()
    with _connect() as conn:
        row = conn.execute(
            'SELECT * FROM staged_races WHERE slug = ?', (slug,)
        ).fetchone()
    return dict(row) if row else None


def list_races(status_filter: str | list[str] | None = None) -> list[dict]:
    init_db()
    with _connect() as conn:
        if status_filter is None:
            rows = conn.execute(
                'SELECT * FROM staged_races ORDER BY completeness_score ASC NULLS LAST'
            ).fetchall()
        elif isinstance(status_filter, str):
            rows = conn.execute(
                'SELECT * FROM staged_races WHERE status = ? ORDER BY completeness_score ASC NULLS LAST',
                (status_filter,),
            ).fetchall()
        else:
            placeholders = ','.join('?' * len(status_filter))
            rows = conn.execute(
                f'SELECT * FROM staged_races WHERE status IN ({placeholders}) ORDER BY completeness_score ASC NULLS LAST',
                status_filter,
            ).fetchall()
    return [dict(r) for r in rows]


def save_reviewed_json(slug: str, reviewed_data: dict):
    init_db()
    with _connect() as conn:
        conn.execute(
            'UPDATE staged_races SET reviewed_json = ? WHERE slug = ?',
            (json.dumps(reviewed_data), slug),
        )


def mark_approved(slug: str, race_id: str):
    init_db()
    with _connect() as conn:
        conn.execute(
            "UPDATE staged_races SET status = 'approved', approved_at = ?, rejection_reason = NULL WHERE slug = ?",
            (_now(), slug),
        )


def mark_rejected(slug: str, reason: str):
    init_db()
    with _connect() as conn:
        conn.execute(
            "UPDATE staged_races SET status = 'rejected', rejected_at = ?, rejection_reason = ? WHERE slug = ?",
            (_now(), reason, slug),
        )


def reset_to_staged(slug: str):
    """Reset a race back to staged status, clearing reviewed_json."""
    init_db()
    with _connect() as conn:
        conn.execute(
            "UPDATE staged_races SET status = 'staged', reviewed_json = NULL, approved_at = NULL, rejected_at = NULL WHERE slug = ?",
            (slug,),
        )


def log_event(slug: str, event: str, detail: str | None = None):
    init_db()
    with _connect() as conn:
        conn.execute(
            'INSERT INTO fetch_log (slug, run_at, event, detail) VALUES (?, ?, ?, ?)',
            (slug, _now(), event, detail),
        )


def get_fetch_log(slug: str, limit: int = 20) -> list[dict]:
    init_db()
    with _connect() as conn:
        rows = conn.execute(
            'SELECT * FROM fetch_log WHERE slug = ? ORDER BY run_at DESC LIMIT ?',
            (slug, limit),
        ).fetchall()
    return [dict(r) for r in rows]


if __name__ == '__main__':
    # Quick smoke test
    init_db()
    upsert_staged_race(
        slug='test-race',
        race_name='Test Race 100',
        race_json={'race': {'name': 'Test Race 100'}, 'aid_stations': []},
        website_url='https://example.com',
        status='staged',
        completeness_score=75,
    )
    log_event('test-race', 'fetch_ok', 'Downloaded GPX and PDF')
    race = get_staged_race('test-race')
    print(f"Staged race: {race['race_name']} (score {race['completeness_score']})")
    print(f"DB path: {DB_PATH}")
    print('db_client smoke test passed.')
