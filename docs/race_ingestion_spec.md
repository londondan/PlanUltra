# Race Ingestion Pipeline — Technical Spec
**Project:** PlanUltra Phase 1 Automation  
**Date:** 2026-05-02  
**Version:** 2 — decisions confirmed  
**Status:** Ready for implementation  

---

## 0. Context and Goals

`docs/utils/extract_race.py` already handles the core extraction: it accepts a GPX and a PDF/text race packet, calls Claude to extract structured aid station data, fuzzy-matches waypoints, and emits a review-ready JSON. This spec wraps that script in a full pipeline with automated sourcing at the front and a proper review UX at the back.

**Before:** Dan finds a GPX, downloads it, finds the PDF, runs the script by hand, edits JSON, imports via admin UI. ~30–60 minutes per race.

**After:** Dan adds a race name and website URL to a Google Sheet. Automation handles discovery, download, extraction, and staging. Dan opens a localhost web app, reviews the race rendered exactly as it will appear in PlanUltra, edits anything that needs fixing, and clicks Approve. One boto3 call writes to prod DynamoDB.

The human-in-the-loop gate before any write to prod is non-negotiable.

---

## 1. Confirmed Design Decisions

These were open questions in v1. They are now closed.

**Input mechanism:** Google Sheet (not `races.yaml`). Dan adds rows manually: race name + website URL. That's the only required human input before the pipeline runs. The Sheet also serves as the status dashboard — the pipeline writes back to it (staged, approved, rejected, fetch_error).

**PDF/text parsing:** Claude with a structured output schema (not regex, not pdfplumber-only). Race packets vary too much across events for reliable heuristics. Claude cost is negligible at 25–50 races per year. pdfplumber is still used to extract raw text from the PDF before passing it to Claude — that part is unchanged.

**GPX/PDF discovery:** Playwright-based browser automation that visits the race website and finds the download links, rather than requiring explicit URLs in the config. This is the biggest architectural change from v1 — it removes the manual URL-sourcing step entirely.

**Review UX:** A localhost web app (FastAPI + Jinja2) that renders the race as it would appear in PlanUltra. Not JSON editing. Approve/reject/edit per race in the browser.

**Load mechanism:** Direct DynamoDB write via `boto3`. No session token management, no admin API fragility. The pipeline runs with the same AWS credentials already configured locally for the app.

---

## 2. Pipeline Architecture

```
┌──────────────────────────────────────────────────────────┐
│  INPUT: Google Sheet                                     │
│  Dan adds row: race name + website URL                   │
│  Pipeline reads new rows on each scheduled run           │
└───────────────────────────┬──────────────────────────────┘
                            │  scheduled (launchd, weekly)
                            ▼
┌──────────────────────────────────────────────────────────┐
│  Stage 1: Discover                                       │
│  Playwright visits race website                          │
│  Finds and downloads GPX + PDF (runner's guide)          │
│  Hash-checks against cache — skips if unchanged          │
│  Writes fetch status back to Sheet                       │
└───────────────────────────┬──────────────────────────────┘
                            │
                            ▼
┌──────────────────────────────────────────────────────────┐
│  Stage 2: Extract                                        │
│  GPX parsed → track points + waypoints                   │
│  PDF text extracted via pdfplumber                       │
│  Claude (structured output) extracts aid station data    │
│  GPX waypoints reconciled with extracted stations        │
└───────────────────────────┬──────────────────────────────┘
                            │
                            ▼
┌──────────────────────────────────────────────────────────┐
│  Stage 3: Validate + Stage                               │
│  Completeness scoring and auto-flagging                  │
│  Write to local SQLite staging DB                        │
│  Write status + score back to Sheet                      │
└───────────────────────────┬──────────────────────────────┘
                            │
                            ▼  Dan opens localhost:8123
┌──────────────────────────────────────────────────────────┐
│  Stage 4: Human Review (localhost web app)               │
│  List view: all staged races + completeness scores       │
│  Detail view: race rendered as PlanUltra production UI   │
│  Edit fields inline → saved back to staging DB           │
│  Approve or Reject per race                              │
└───────────────────────────┬──────────────────────────────┘
                            │  Dan clicks Approve
                            ▼
┌──────────────────────────────────────────────────────────┐
│  Stage 5: Load                                           │
│  boto3 writes Race + SectionPlan records to prod DynamoDB│
│  Sheet row marked "approved"                             │
│  Staging record archived                                 │
└──────────────────────────────────────────────────────────┘
```

Stages 1–3 run on schedule unattended. Stages 4–5 are human-triggered (open browser, review, click Approve).

---

## 3. Stage 1: Discovery and Download

### Input: Google Sheet schema

| Column | Description | Set by |
|---|---|---|
| `race_name` | Full race name, e.g. "Western States 100" | Dan |
| `website_url` | Official race website | Dan |
| `slug` | URL-safe identifier, e.g. `western-states-100` | Dan (or auto-generated from name) |
| `status` | `new` → `fetching` → `staged` → `approved` / `rejected` / `fetch_error` | Pipeline |
| `completeness_score` | 0–100 after staging | Pipeline |
| `staged_at` | ISO timestamp | Pipeline |
| `approved_at` | ISO timestamp | Pipeline |
| `rejection_reason` | Free text | Pipeline (from review app) |
| `notes` | Free text for Dan | Dan |
| `gpx_source` | `official` / `community` / `unknown` — set by Playwright heuristic | Pipeline |

The pipeline reads rows where `status == 'new'` or `status == 'fetch_error'` (retry). All other statuses are skipped.

**Sheet access:** `gspread` + a service account JSON key stored in `~/.config/planultra/gsheets-key.json`. The sheet ID is in `~/.config/planultra/config.toml`.

### Playwright discovery logic

For each new row, Playwright opens a Chromium browser (headless) and visits the race website. It looks for downloadable files matching known patterns:

```python
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
```

The scraper checks `<a href>` link text and URLs against these patterns. If multiple matches exist, it prefers:
- GPX: links with "official" or "course" in the anchor text over generic `.gpx` filenames
- PDF: "runner's guide" or "runner manual" over generic PDFs (e.g. skip "sponsorship_deck.pdf")

If Playwright can't find a GPX or PDF confidently, it logs the page's link inventory to the staging DB and marks the Sheet row `fetch_error` with a note like "GPX not found — 3 candidate links logged for manual review." Dan can then add an explicit override URL to a `gpx_url_override` column in the Sheet.

**Override columns:** Two optional Sheet columns — `gpx_url_override` and `pdf_url_override`. If set, Playwright skips discovery for that file type and downloads directly from the override URL. This handles races where the Playwright heuristic fails or where the GPX is hosted on a third-party site (e.g. Ultrasignup, FKT.com).

**Change detection:** SHA-256 hash of each downloaded file compared against `cache/<slug>/hashes.json`. If the hash matches the cached version, extraction is skipped for that file (no re-run, no Sheet update). If changed, extraction re-runs and `status` is reset to `staged` (i.e. back to the review queue even if previously approved — a changed GPX is a meaningful event).

**ToS note:** Playwright is behaving as a browser visiting public race websites to find publicly linked files. This is equivalent to a human clicking the same links. It is not spidering, not bypassing authentication, and not hitting APIs not intended for public use. That said, if a race site has a `robots.txt` disallow for the relevant path, respect it and fall back to manual override.

---

## 4. Stage 2: Extraction

### 4.1 GPX parsing

Unchanged from `extract_race.py`. Key outputs:
- `track_points`: ordered lat/lng/ele along the course
- `waypoints`: named points with coordinates, snapped to nearest track point for accurate mile markers
- `total_miles`: haversine sum along the track

The one new behaviour vs. `extract_race.py`: if the GPX has no `<wpt>` elements at all, the pipeline logs a `no_waypoints: true` flag on the staging record. This surfaces as a high-severity issue in the review app ("Aid station GPS coords will all be null — GPX has no waypoints").

### 4.2 PDF text extraction

`pdfplumber` extracts raw text page by page. Before passing to Claude, the pipeline applies a page-relevance filter to avoid truncation problems with long PDFs:

```python
def extract_relevant_pages(pdf_path: str) -> str:
    """
    Extract text from pages likely to contain aid station data.
    Heuristic: pages containing two or more of the trigger words below.
    Falls back to all pages if no pages match.
    """
    TRIGGER_WORDS = [
        'aid station', 'crew', 'drop bag', 'cutoff', 'cut-off',
        'mile', 'pacer', 'parking', 'access'
    ]
    
    relevant_pages = []
    with pdfplumber.open(pdf_path) as pdf:
        for i, page in enumerate(pdf.pages):
            text = page.extract_text() or ''
            hit_count = sum(1 for w in TRIGGER_WORDS if w in text.lower())
            if hit_count >= 2:
                relevant_pages.append(f"--- Page {i+1} ---\n{text}")
    
    if not relevant_pages:
        # Fallback: extract everything
        with pdfplumber.open(pdf_path) as pdf:
            relevant_pages = [p.extract_text() or '' for p in pdf.pages]
    
    return '\n\n'.join(relevant_pages)
```

This replaces the 15,000-char truncation in `extract_race.py`. For a 40-page runner's guide, this typically reduces input to 3–8 pages containing the actual aid station table, well within Claude's context window and without arbitrary cutoffs mid-table.

### 4.3 Claude extraction with structured output

Rather than prompting Claude to return JSON and then parsing it (the current approach in `extract_race.py`, which occasionally fails on malformed output), this pipeline uses the Anthropic API's structured output / tool use feature to enforce the schema at the API level.

```python
import anthropic
from pydantic import BaseModel

class AidStation(BaseModel):
    name: str
    mile: float
    mile_return: float | None
    cutoff_elapsed_minutes: int | None
    crew_access: bool
    drop_bag: bool
    parking_notes: str | None

class RaceExtraction(BaseModel):
    name: str
    date: str | None          # ISO 8601
    start_time: str | None    # HH:MM 24h
    timezone: str | None      # IANA
    location: str | None
    distance_miles: float | None
    description: str | None   # ≤160 chars
    aid_stations: list[AidStation]

def extract_with_claude(source_text: str, race_name_hint: str) -> RaceExtraction:
    client = anthropic.Anthropic()
    
    response = client.messages.create(
        model="claude-opus-4-6",
        max_tokens=4096,
        tools=[{
            "name": "submit_race_data",
            "description": "Submit the extracted race data in structured form.",
            "input_schema": RaceExtraction.model_json_schema(),
        }],
        tool_choice={"type": "tool", "name": "submit_race_data"},
        messages=[{
            "role": "user",
            "content": EXTRACTION_PROMPT.format(
                race_name=race_name_hint,
                source_text=source_text
            )
        }]
    )
    
    tool_use = next(b for b in response.content if b.type == "tool_use")
    return RaceExtraction(**tool_use.input)
```

`tool_choice: {"type": "tool", "name": "submit_race_data"}` forces Claude to always call the tool — no prose, no JSON parsing, no regex stripping of markdown fences. If the API returns anything other than a valid tool call, it raises immediately rather than silently producing garbage.

**Extraction prompt additions vs. v1:** The prompt should explicitly request:
- Crew access flagged per station (not just "crew friendly" course-level notes)
- Parking details extracted per station (not just a general "ample parking" note)
- Pacer pickup points noted in `parking_notes` where mentioned (relevant to crew planning)
- For out-and-back courses: `mile_return` set for stations that appear on both legs

### 4.4 GPX + extraction merge and waypoint reconciliation

The merge logic from `extract_race.py` is reused unchanged: fuzzy name match between GPX waypoints and extracted station names, mile-proximity boost, `_match_confidence` scoring.

One new behaviour: **missing waypoints are not added back to the GPX.** If an extracted station has no GPX match (`_match_confidence: 'none'`), it is staged with `lat: null, lng: null`. The reviewer is expected to supply coords manually in the review app for crew-accessible stations. The GPX source file is never modified.

---

## 5. Stage 3: Validate and Stage

### 5.1 Completeness scoring

```python
def score_race(data: dict) -> tuple[int, list[dict]]:
    """
    Returns (score 0–100, list of issue dicts).
    """
    issues = []
    score = 100
    
    crew_stations = [s for s in data['aid_stations'] if s['crew_access']]
    
    # Coords (40 pts) — only penalise crew stations, not all stations
    missing_coords = [s for s in crew_stations
                      if s['lat'] is None or s['lng'] is None]
    if crew_stations:
        coord_score = 40 * (1 - len(missing_coords) / len(crew_stations))
        score -= (40 - coord_score)
        for s in missing_coords:
            issues.append({
                'station': s['name'], 'mile': s['mile'],
                'field': 'coords', 'severity': 'high',
                'msg': 'No GPS coords — crew station will not appear on map'
            })
    
    # Parking notes (30 pts) — only crew stations
    missing_parking = [s for s in crew_stations if not s['parking_notes']]
    if crew_stations:
        parking_score = 30 * (1 - len(missing_parking) / len(crew_stations))
        score -= (30 - parking_score)
        for s in missing_parking:
            issues.append({
                'station': s['name'], 'mile': s['mile'],
                'field': 'parking', 'severity': 'medium',
                'msg': 'Crew-accessible but no parking notes extracted'
            })
    
    # Cutoffs (20 pts) — all stations
    all_stations = data['aid_stations']
    missing_cutoffs = [s for s in all_stations
                       if s['cutoff_elapsed_minutes'] is None
                       and s['name'] not in ('Start', 'Start/Finish', 'Finish')]
    if all_stations:
        cutoff_score = 20 * (1 - len(missing_cutoffs) / len(all_stations))
        score -= (20 - cutoff_score)
    
    # Description (10 pts)
    if not data['race'].get('description'):
        score -= 10
        issues.append({
            'station': None, 'field': 'description', 'severity': 'low',
            'msg': 'No library description — add a 1–2 sentence summary'
        })
    
    return round(score), issues
```

Score thresholds shown in the review app list view:
- 80–100: green — ready to approve
- 60–79: amber — review recommended
- 0–59: red — significant gaps, manual work needed

### 5.2 Local SQLite staging database

The staging DB is a SQLite file at `~/.local/share/planultra/staging.db`. It is **not** in the git repo (contains potentially stale data and local paths). The `approved/` directory in the repo (from v1) is retired — the Sheet is now the record of approval status.

Schema:

```sql
CREATE TABLE staged_races (
    slug TEXT PRIMARY KEY,
    race_name TEXT NOT NULL,
    website_url TEXT,
    status TEXT NOT NULL DEFAULT 'staged',
    -- status: staged | approved | rejected
    completeness_score INTEGER,
    staged_at TEXT,      -- ISO timestamp
    approved_at TEXT,
    rejected_at TEXT,
    rejection_reason TEXT,
    gpx_source TEXT,     -- official | community | unknown
    gpx_hash TEXT,
    pdf_hash TEXT,
    -- The full extracted + merged race object as JSON
    race_json TEXT NOT NULL,
    -- Issues list from scoring as JSON
    issues_json TEXT,
    -- Reviewer edits applied on top of race_json (JSON patch or full replacement)
    reviewed_json TEXT,
    pipeline_version TEXT
);

CREATE TABLE fetch_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    slug TEXT,
    run_at TEXT,
    event TEXT,   -- 'fetch_ok' | 'fetch_error' | 'extract_ok' | 'extract_error' | 'skipped_no_change'
    detail TEXT
);
```

`reviewed_json` stores the full race JSON as edited by the reviewer. On approval, `reviewed_json` (if present) takes precedence over `race_json` for the DynamoDB write. This means the reviewer's edits are always what gets loaded — not the original extraction.

---

## 6. Stage 4: Localhost Review App

### 6.1 Overview

A FastAPI + Jinja2 app that runs locally at `http://localhost:8123`. Started manually when you want to review: `python3 review_app.py`. Reads from and writes to the SQLite staging DB. Does not require the Next.js app to be running.

**Why FastAPI over Flask:** async request handling makes the DynamoDB write in the approval endpoint cleaner; Pydantic integration reuses the same schema models from Stage 2; better type safety on the route handlers. Either would work.

**Why not reuse Next.js components:** The Next.js app is TypeScript/React; the pipeline is Python. Spinning up the Next.js dev server as part of the review tool adds significant startup time and a Node.js dependency. The review app should be a standalone Python process. The race rendering mimics PlanUltra visually but is implemented in Jinja2 + Tailwind CDN, not by importing React components.

### 6.2 Routes

```
GET  /                          → list view: all staged races
GET  /race/<slug>               → detail/edit view for one race
POST /race/<slug>/save          → save edits to staged DB (does not approve)
POST /race/<slug>/approve       → write to DynamoDB, mark approved in DB + Sheet
POST /race/<slug>/reject        → mark rejected in DB + Sheet, capture reason
POST /race/<slug>/re-extract    → re-run extraction pipeline for this race
GET  /race/<slug>/diff          → show diff between original extraction and reviewed_json
GET  /status                    → JSON health check (used by launchd watchdog)
```

### 6.3 List view (`GET /`)

Renders a table of all staged races, sorted by completeness score ascending (worst first):

```
PlanUltra — Race Review Queue
────────────────────────────────────────────────────────────────────
  Race                    Score  Status    Staged         Issues
  ──────────────────────  ─────  ────────  ─────────────  ──────────────────────────
  Hardrock 100              52   🔴 staged  2026-05-01     5 stations missing coords
  Western States 100        74   🟡 staged  2026-05-02     2 stations missing parking
  Cruel Jewel 100           91   🟢 staged  2026-05-02     —
  Bear 100                  96   🟢 staged  2026-05-02     —
  ──────────────────────  ─────  ────────  ─────────────  ──────────────────────────
  Leadville 100            100   ✅ approved 2026-04-28    —
  Wasatch 100                —   ❌ fetch_error            GPX not found
────────────────────────────────────────────────────────────────────
```

Each row links to the detail view. Approved and rejected races are shown collapsed at the bottom.

### 6.4 Detail / edit view (`GET /race/<slug>`)

The detail view has two panels side-by-side:

**Left panel — Issues sidebar** (narrow, ~280px):

Shows the issues list from `_review.station_issues`, grouped by severity. High-severity issues have a red indicator and clicking one scrolls the right panel to the relevant station row. This panel is always visible while scrolling the race view.

**Right panel — Race preview** (full width):

Renders the race as it will appear in PlanUltra production. Specifically, it mimics the layout of:
- The race header (name, date, distance, location)
- The aid station table with crew/drop bag flags, mile markers, cutoff times
- Per crew station: parking notes and coords (shown as a Google Maps link if lat/lng present)
- A completeness score banner at the top with the issue count

Each field is editable inline. Clicking a field switches it to an `<input>` or `<textarea>`. Changes are batched and submitted via `POST /race/<slug>/save`. The save endpoint writes the full updated race JSON to `reviewed_json` in the staging DB — it does not approve.

**Editable fields:**
- Race: `name`, `date`, `start_time`, `timezone`, `location`, `description`, `distance_miles`
- Per station: `name`, `mile`, `mile_return`, `cutoff_elapsed_minutes`, `crew_access`, `drop_bag`, `parking_notes`, `lat`, `lng`

**Non-editable in the review app** (set upstream or post-approval):
- `crew_parking_coords` (set via PRD-025 auto-fill in the main admin UI after import)
- `crew_parking_type` (human judgement, set in main admin UI)
- `gpx_source`, `_match_confidence`, `_match_score` (pipeline metadata, read-only)

**Approve / Reject buttons** appear at the top and bottom of the right panel:
- `[Approve →]` — primary action, triggers `POST /race/<slug>/approve`
- `[Reject]` — secondary, opens a small inline form for a rejection reason, then posts to `/race/<slug>/reject`

### 6.5 Approve: what happens technically (`POST /race/<slug>/approve`)

```python
@app.post("/race/{slug}/approve")
async def approve_race(slug: str):
    record = db.get_staged_race(slug)
    
    # Use reviewed_json if the reviewer made edits; fall back to original extraction
    race_data = json.loads(record.reviewed_json or record.race_json)
    
    # Strip all _-prefixed internal fields from aid stations
    payload = build_dynamo_payload(race_data)
    
    # Write Race record
    race_id = str(uuid.uuid4())
    dynamo.put_item(TableName=TABLE_NAME, Item={
        'PK': {'S': f'USER#{LIBRARY_USER_ID}'},
        'SK': {'S': f'RACE#{race_id}'},
        'raceId': {'S': race_id},
        'isLibraryRace': {'BOOL': True},
        'name': {'S': payload['race']['name']},
        'date': {'S': payload['race']['date']},
        # ... all other race fields
        'gpxData': {'S': read_gpx_as_string(slug)},
        'libraryDescription': {'S': payload['race'].get('description', '')},
        'location': {'S': payload['race'].get('location', '')},
        'createdAt': {'S': datetime.utcnow().isoformat()},
    })
    
    # Write SectionPlan records (one per aid station)
    for i, station in enumerate(payload['aid_stations']):
        section_id = str(uuid.uuid4())
        dynamo.put_item(TableName=TABLE_NAME, Item={
            'PK': {'S': f'RACE#{race_id}'},
            'SK': {'S': f'SECTION#{i:03d}'},
            'sectionId': {'S': section_id},
            'raceId': {'S': race_id},
            'name': {'S': station['name']},
            'distanceFromStart': {'N': str(station['mile'])},
            'hasCrewAccess': {'BOOL': station['crew_access']},
            'hasDropBag': {'BOOL': station['drop_bag']},
            'crewParkingCoords': marshal_coords(station.get('lat'), station.get('lng')),
            'crewParkingCoordsSource': {'S': 'gpx' if station.get('lat') else 'null'},
            'crewLocationNotes': marshal_string(station.get('parking_notes')),
            'cutoffElapsedMinutes': marshal_number(station.get('cutoff_elapsed_minutes')),
            # ... other fields defaulting to null/false
        })
    
    # Update staging DB
    db.mark_approved(slug, race_id=race_id)
    
    # Update Sheet
    sheets.update_status(slug, status='approved', approved_at=datetime.utcnow().isoformat())
    
    return {"ok": True, "race_id": race_id, "redirect": f"/race/{slug}"}
```

**The approval is not atomic.** DynamoDB doesn't support transactions across more than 25 items, and a race with 20+ stations will exceed that limit. The failure mitigation from PRD-012 §10 Issue F applies here: if any section write fails after the Race record is written, the approval endpoint deletes the Race record and returns an error. The reviewer sees a failure message and can retry. The staging DB record stays in `staged` state.

**Note on DynamoDB field names:** The exact attribute names (`distanceFromStart`, `hasCrewAccess`, etc.) must match what the existing TypeScript data layer in `src/lib/db/` expects. Before implementing the approval write, read `docs/specs/database.md` and the actual `getRacesByUser` / `getSectionPlans` query patterns to confirm the schema. The pseudocode above uses plausible names but may need adjustment.

### 6.6 Reject: what happens technically (`POST /race/<slug>/reject`)

```python
@app.post("/race/{slug}/reject")
async def reject_race(slug: str, reason: str = Form(...)):
    db.mark_rejected(slug, reason=reason)
    sheets.update_status(slug, status='rejected', rejection_reason=reason)
    return RedirectResponse(url='/', status_code=303)
```

Rejection does **not** delete the staging record. It marks `status = 'rejected'` and surfaces the reason in the list view. The race can be re-extracted (fixes races.yaml or override URLs) or re-reviewed at any time by resetting its status to `staged`.

Common rejection reasons to anticipate:
- "GPX doesn't match current course — source a newer file"
- "Aid station table in PDF is outdated (previous year)"
- "Crew access flags incorrect — race website says otherwise"
- "Duplicate of an already-approved race"

### 6.7 Partial approval and field-by-field editing

There is no "partial approval" as a distinct state. The review flow is:

1. Reviewer sees issues flagged in the sidebar.
2. Reviewer edits fields directly in the race preview.
3. If a crew station is missing coords, reviewer looks up the location on Google Maps and pastes `lat,lng` into the coord fields.
4. Reviewer continues editing until satisfied (or accepts remaining gaps — a race with a low completeness score can still be approved if the reviewer judges it acceptable).
5. Reviewer clicks Approve. Whatever is in `reviewed_json` at that point is what gets written to DynamoDB.

There is no requirement to hit a score threshold before approving — that's a policy decision, not a system enforcement. The score is informational.

### 6.8 Re-running extraction (`POST /race/<slug>/re-extract`)

Triggers a fresh run of Stages 1–3 for a specific race:
- Re-downloads GPX and PDF (bypassing the hash check for this run)
- Re-runs Claude extraction
- Overwrites `race_json` in the staging DB with the new result
- Resets `reviewed_json` to null (discards any previous edits — warns the reviewer before doing this)
- Resets `completeness_score` and `issues_json`
- Resets `status` to `staged`

Use cases:
- The race website published an updated runner's guide with corrected aid station info
- The initial Playwright scrape picked up the wrong PDF (e.g. grabbed the 2024 guide when 2025 is available)
- The GPX was community-sourced and you've now found an official one

### 6.9 Diff view (`GET /race/<slug>/diff`)

Shows a human-readable diff between the original extraction (`race_json`) and the current reviewed version (`reviewed_json`). Rendered as a unified diff in `<pre>` tags. Useful for auditing what changes were made during review before approving.

If `reviewed_json` is null (no edits made), the diff view shows "No edits — extraction will be loaded as-is."

---

## 7. GPX Waypoint Reconciliation (updated)

### Matching logic (unchanged from extract_race.py)

Fuzzy name match between GPX `<wpt>` names and extracted station names, with a mile-proximity boost. Match confidence: `high` (≥0.75), `low` (0.4–0.74), `none` (<0.4 or no GPX waypoints).

### New: coords-from-GPX for crew stations

When a station matches a GPX waypoint with confidence `high` or `low`, the waypoint's `lat`/`lng` is used as the initial `crewParkingCoords` candidate. In the review app, this appears as an editable pre-filled value rather than a blank field. The reviewer confirms or overrides it.

For wilderness races (Western States, Hardrock) where the waypoint marks the trail but crew parks on a road, the reviewer is expected to correct the coords during review. The review app shows a Google Maps link for each coord pair so the reviewer can quickly validate "is this actually a road-accessible location?"

```
Michigan Bluff  MI 55.7  [crew ✓]
Parking notes: "Parking area off Hwy 193"
Coords: 38.7982, -120.8751  [📍 View on Maps]
⚠ Auto-filled from GPX waypoint — verify road access
```

### No synthetic waypoint injection into the GPX

The GPX source file is never modified. GPS coords live in the staging DB and eventually in DynamoDB's section records. If the next pipeline run re-ingests the same GPX, it starts clean from the original file.

---

## 8. Scheduling

### launchd (macOS)

The pipeline's automated stages (1–3: discover, extract, validate) run weekly via `launchd`. The review app (Stage 4) is started manually when there are races to review.

```xml
<!-- ~/Library/LaunchAgents/com.planultra.race-ingest.plist -->
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN"
  "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key>
  <string>com.planultra.race-ingest</string>
  <key>ProgramArguments</key>
  <array>
    <string>/usr/bin/python3</string>
    <string>/Users/danrjames/Projects/PlanUltra/docs/utils/ingest.py</string>
    <string>run</string>
    <string>--all</string>
  </array>
  <key>StartCalendarInterval</key>
  <dict>
    <key>Weekday</key><integer>1</integer>   <!-- Monday -->
    <key>Hour</key><integer>8</integer>
    <key>Minute</key><integer>0</integer>
  </dict>
  <key>EnvironmentVariables</key>
  <dict>
    <key>ANTHROPIC_API_KEY</key><string>sk-ant-...</string>
    <key>AWS_PROFILE</key><string>planultra</string>
  </dict>
  <key>StandardOutPath</key>
  <string>/Users/danrjames/Projects/PlanUltra/docs/utils/logs/ingest.log</string>
  <key>StandardErrorPath</key>
  <string>/Users/danrjames/Projects/PlanUltra/docs/utils/logs/ingest-error.log</string>
</dict>
</plist>
```

Load: `launchctl load ~/Library/LaunchAgents/com.planultra.race-ingest.plist`  
Test run: `launchctl start com.planultra.race-ingest`  
View logs: `tail -f ~/Projects/PlanUltra/docs/utils/logs/ingest.log`

**Frequency:** Weekly (Monday 8am) is sufficient. Race websites typically post updated runner guides 4–8 weeks before the event. During January–March (peak runner guide season), consider temporarily changing `Weekday` to run daily or setting a second interval.

**Why launchd over cron:** Handles missed runs (if machine was off at 8am, runs when next powered on). cron silently skips missed runs.

### Manual CLI commands

```bash
# Run full pipeline for all new Sheet rows
python3 ingest.py run --all

# Run pipeline for one specific race (by slug)
python3 ingest.py run --slug western-states-100

# Just fetch (no extraction) — useful for checking if files changed
python3 ingest.py fetch --all

# Print status of all staged races
python3 ingest.py status

# Start the review web app
python3 review_app.py
# → open http://localhost:8123
```

---

## 9. File Layout

```
docs/utils/
  ingest.py              # pipeline CLI: run / fetch / status
  extract_race.py        # existing: GPX + LLM extraction (minimally modified)
  review_app.py          # new: FastAPI localhost review app
  schema.py              # new: Pydantic models (RaceExtraction, AidStation, etc.)
  dynamo_writer.py       # new: boto3 DynamoDB write logic for approval
  sheets_client.py       # new: gspread Sheet read/write
  
  templates/             # new: Jinja2 templates for review app
    base.html
    list.html
    detail.html
    diff.html
  
  cache/                 # gitignored: downloaded GPX + PDF source files
    <slug>/
      route.gpx
      packet.pdf
      hashes.json
  
  logs/                  # gitignored: launchd + manual run output
    ingest.log
    ingest-error.log
  
  test/                  # existing: test fixtures
    cruel_jewel_sample.gpx
    cruel_jewel_sample_text.txt

~/.local/share/planultra/
  staging.db             # SQLite staging database (not in repo)

~/.config/planultra/
  config.toml            # sheet_id, table_name, base_url, etc.
  gsheets-key.json       # Google service account credentials (not in repo)
```

The `approved/` directory from v1 is retired. The Google Sheet is the record of approval status. The SQLite DB holds the full staging data.

---

## 10. Dependencies

| Dependency | Status | Notes |
|---|---|---|
| `extract_race.py` | ✅ Done | Core extraction logic — minimally modified |
| `anthropic` (Python SDK) | ✅ Installed | Upgrade to version supporting tool_choice if needed |
| `pdfplumber` | ✅ Listed in README | Already in use |
| `playwright` | New | `pip install playwright && playwright install chromium` |
| `gspread` | New | `pip install gspread` + service account JSON |
| `fastapi` + `jinja2` + `uvicorn` | New | Review app |
| `boto3` | New for this pipeline | Likely already installed for app dev |
| `rapidfuzz` | Optional | Improves fuzzy match; falls back to Jaccard without it |
| PRD-025 (GPX coord auto-fill in admin UI) | Draft | This pipeline sets `crewParkingCoordsSource: 'gpx'` on approved records; PRD-025 provides the admin UI to verify them post-import |
| PRD-024 (admin station config UI) | Draft | The review app is the pre-import step; PRD-024 is still needed for post-import verification of parking types and location notes |
| DynamoDB schema confirmation | Needed | Read `docs/specs/database.md` and `src/lib/db/` before implementing `dynamo_writer.py` — attribute names must match exactly |
| Google Sheet created + service account | Needed | One-time setup before first run |
| AWS credentials (`planultra` profile) | Likely set | Confirm `~/.aws/credentials` has a profile with write access to the races table |

---

## 11. Remaining Open Questions

These are the questions from v1 that were not resolved by the confirmed decisions.

**Q1 — Year-over-year GPX versioning**  
If the pipeline detects a changed GPX hash on a race already marked `approved`, should it: (a) automatically reset to `staged` and queue a re-review, (b) flag it in the Sheet as `update_available` without overwriting the approved record, or (c) require a manual `ingest.py run --slug <x>` to trigger re-review? Option (b) is safest — it preserves the approved state and gives you the choice. Option (a) risks disrupting a race that's already in the prod DB if you're not ready to push an update.

**Q2 — Score threshold for approval**  
Should the review app hard-block approval if the completeness score is below a threshold (e.g. 60)? Or is the score purely informational and approval always available? Recommend informational-only with a warning dialog ("Score is 52 — 5 crew stations have no GPS coords. Approve anyway?"). Hard-blocking seems paternalistic for a single-admin tool.

**Q3 — How many races before Phase 1 is "done"?**  
The pivot plan targets 20–30 races before launching Phase 3 (public race view). All 13 Tier 1 + Tier 2 races from `race-library-candidates.md` is a reasonable milestone for "done enough to start Phase 2 in parallel."

---

## 12. What This Spec Does Not Cover

- **Automated coord lookup** — searching Google Maps for "{station name} parking" coords. Too unreliable without human validation. Not recommended until the review flow establishes what "good" looks like.
- **Multi-year edition management** — the 2025 vs 2026 edition of the same race. A data model question for Phase 2 (PRD-027 + slug design).
- **Elevation gain per segment** — `ele` values are already parsed from track points in `extract_race.py` but not accumulated. Needed for the Phase 2 pace model; not blocking Phase 1.
- **Race website scraping for aid station tables** — if a race has no PDF but has a structured aid station table on their website, Playwright could extract the HTML table directly. Worth adding as a fallback after the core pipeline is working.
