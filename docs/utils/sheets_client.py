"""
Google Sheets client for the race ingestion pipeline.

Reads race rows from the configured Sheet and writes status back.

Config: ~/.config/planultra/config.toml
Credentials: ~/.config/planultra/gsheets-key.json
"""

from __future__ import annotations
import re
from datetime import datetime, timezone
from pathlib import Path

try:
    import tomllib
except ImportError:
    try:
        import tomli as tomllib  # type: ignore
    except ImportError:
        tomllib = None  # type: ignore

CONFIG_PATH = Path.home() / '.config' / 'planultra' / 'config.toml'
CREDS_PATH  = Path.home() / '.config' / 'planultra' / 'gsheets-key.json'

# Expected column names in the Sheet (case-insensitive header matching)
REQUIRED_COLS = ['race_name', 'website_url', 'slug', 'status']
OPTIONAL_COLS = [
    'completeness_score', 'staged_at', 'approved_at',
    'rejection_reason', 'notes', 'gpx_source',
    'gpx_url_override', 'pdf_url_override',
]


def _load_config() -> dict:
    if not CONFIG_PATH.exists():
        raise FileNotFoundError(
            f"Config not found at {CONFIG_PATH}. "
            "Create it with at minimum:\n\n"
            "[sheets]\nsheet_id = \"your-sheet-id\"\n"
        )
    if tomllib is None:
        import re
        config: dict = {}
        section: dict = config
        with open(CONFIG_PATH) as f:
            for line in f:
                line = line.strip()
                if not line or line.startswith('#'):
                    continue
                m = re.match(r'^\[(\w+)\]$', line)
                if m:
                    config.setdefault(m.group(1), {})
                    section = config[m.group(1)]
                    continue
                m = re.match(r'^(\w+)\s*=\s*"(.+)"$', line)
                if m:
                    section[m.group(1)] = m.group(2)
                    continue
                m = re.match(r'^(\w+)\s*=\s*(\d+)$', line)
                if m:
                    section[m.group(1)] = int(m.group(2))
        return config
    with open(CONFIG_PATH, 'rb') as f:
        return tomllib.load(f)


def _get_client():
    try:
        import gspread
    except ImportError:
        raise ImportError("gspread not installed. Run: pip install gspread")

    if not CREDS_PATH.exists():
        raise FileNotFoundError(
            f"Google service account key not found at {CREDS_PATH}. "
            "Download it from Google Cloud Console and place it there."
        )
    return gspread.service_account(filename=str(CREDS_PATH))


def _now() -> str:
    return datetime.now(timezone.utc).isoformat()


def _slug_from_name(name: str) -> str:
    slug = name.lower()
    slug = re.sub(r'[^a-z0-9\s-]', '', slug)
    slug = re.sub(r'\s+', '-', slug.strip())
    slug = re.sub(r'-+', '-', slug)
    return slug


class SheetsClient:
    def __init__(self):
        config = _load_config()
        self._sheet_id = config['sheets']['sheet_id']
        self._gc = _get_client()
        self._sheet = None
        self._headers: list[str] = []

    def _get_sheet(self):
        if self._sheet is None:
            wb = self._gc.open_by_key(self._sheet_id)
            self._sheet = wb.sheet1
            raw_headers = self._sheet.row_values(1)
            self._headers = [h.strip().lower() for h in raw_headers]
        return self._sheet

    def _col(self, name: str) -> int | None:
        """Return 1-based column index for a header name, or None if not present."""
        try:
            return self._headers.index(name.lower()) + 1
        except ValueError:
            return None

    def _row_to_dict(self, row_values: list[str], row_num: int) -> dict:
        d = {'_row': row_num}
        for i, header in enumerate(self._headers):
            d[header] = row_values[i] if i < len(row_values) else ''
        # Auto-generate slug if missing
        if not d.get('slug') and d.get('race_name'):
            d['slug'] = _slug_from_name(d['race_name'])
        return d

    def get_new_races(self) -> list[dict]:
        """Return rows where status is 'new' or 'fetch_error'."""
        sheet = self._get_sheet()
        all_rows = sheet.get_all_values()
        if not all_rows:
            return []
        result = []
        for i, row in enumerate(all_rows[1:], start=2):  # skip header row
            d = self._row_to_dict(row, i)
            status = d.get('status', '').strip().lower()
            if status in ('new', 'fetch_error', ''):
                if d.get('race_name'):
                    result.append(d)
        return result

    def get_all_races(self) -> list[dict]:
        sheet = self._get_sheet()
        all_rows = sheet.get_all_values()
        if not all_rows:
            return []
        return [self._row_to_dict(row, i + 2) for i, row in enumerate(all_rows[1:])]

    def get_race_by_slug(self, slug: str) -> dict | None:
        for race in self.get_all_races():
            if race.get('slug') == slug:
                return race
        return None

    def update_status(self, slug: str, **kwargs):
        """
        Update one or more columns for a row identified by slug.
        kwargs keys must match column headers in the Sheet.
        Example: update_status('western-states-100', status='staged', completeness_score=82)
        """
        sheet = self._get_sheet()
        race = self.get_race_by_slug(slug)
        if race is None:
            print(f"  ⚠  Sheet: no row found for slug '{slug}' — cannot update status")
            return
        row_num = race['_row']
        for key, value in kwargs.items():
            col = self._col(key)
            if col is None:
                print(f"  ⚠  Sheet: column '{key}' not found — skipping")
                continue
            sheet.update_cell(row_num, col, str(value) if value is not None else '')

    def mark_fetching(self, slug: str):
        self.update_status(slug, status='fetching')

    def mark_staged(self, slug: str, score: int, staged_at: str | None = None):
        self.update_status(
            slug,
            status='staged',
            completeness_score=score,
            staged_at=staged_at or _now(),
        )

    def mark_fetch_error(self, slug: str, detail: str):
        self.update_status(slug, status='fetch_error', rejection_reason=detail)

    def mark_approved(self, slug: str):
        self.update_status(slug, status='approved', approved_at=_now())

    def mark_rejected(self, slug: str, reason: str):
        self.update_status(slug, status='rejected', rejection_reason=reason)


if __name__ == '__main__':
    # Smoke test — prints first few rows from the Sheet
    client = SheetsClient()
    races = client.get_new_races()
    print(f"Found {len(races)} new/error races:")
    for r in races:
        print(f"  {r.get('slug', '?')}  {r.get('race_name')}  [{r.get('status', 'new')}]")
