# PRD-025 — Bulk Race Import: CSV Metadata + GPX Upload

**Status:** Draft
**Date:** 2026-04-02
**Extends:** PRD-012 (Admin Race Library), PRD-024 (Aid Station Config, GPX Re-ingestion)
**Pre-reading:** PRD-012, PRD-024, PRD-022 §3 (crew parking fields), PRD-003 (Ridge Light design system)

---

## 0. Mandatory Pre-Reading

Before implementing, read:
- **PRD-012** — admin library data model, `LIBRARY_USER_ID`, `isAdmin()`, `POST /api/admin/races`
- **PRD-024 §2** — Aid Stations collapsible panel, `LocationParkingPanel`, `sectionUpdates` payload shape
- **PRD-022 §3** — `crewParkingCoords`, `crewParkingType`, `crewLocationNotes` on Section records
- **PRD-003** — Ridge Light design system
- `docs/utils/README.md` — existing `extract_race.py` pipeline (this PRD is the UI counterpart)
- `src/app/(app)/admin/race-library/new/page.tsx` — current single-race add flow being extended

Where this PRD conflicts with PRD-012 or PRD-024, **this PRD wins**.

---

## 1. Summary

This PRD adds an **Import Race** flow to the admin race library — a single-screen workflow that lets the admin add a new library race by combining:

1. A **GPX file** — the course route and waypoints
2. A **CSV metadata file** — race-level fields and per-aid-station flags/parking data
3. An **inline review step** — on the same screen, immediately after processing, the admin can adjust crew/drop-bag flags, add parking coordinates, and fix anything before saving

The goal is to replace the current clunky one-field-at-a-time add flow with something closer to the `extract_race.py` CLI pipeline, but entirely in-browser. The admin should be able to open a race PDF in one window, fill in a short CSV, drop both files into the import screen, and have a fully configured library race in a single session.

---

## 2. Entry Point

### 2.1 Button placement

On `/admin/race-library`, the existing `[+ Add race]` button is joined by a second button:

```
┌─────────────────────────────────────────────────────┐
│  ← Admin   Race Library   [+ Add race]  [↑ Import]  │
└─────────────────────────────────────────────────────┘
```

`[↑ Import]` is a secondary/outlined button (not primary). It links to `/admin/race-library/import`.

### 2.2 Route

`GET /admin/race-library/import` — new page. Protected by `isAdmin()`.

---

## 3. Import Screen Layout

The import screen is a single-page, three-stage flow. All three stages live on the same URL — no navigation between them. Stage transitions are in-page state changes.

```
Stage 1: Upload → Stage 2: Review & configure → Stage 3: Saved
```

The page heading is always:

```
← Race Library    Import race
```

Back link returns to `/admin/race-library`.

---

## 4. Stage 1 — Upload

### 4.1 Layout

```
┌─────────────────────────────────────────────────────────────┐
│  ← Race Library     Import race                             │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌─────────────────────────┐  ┌──────────────────────────┐  │
│  │  GPX file               │  │  CSV metadata            │  │
│  │  ┌───────────────────┐  │  │  ┌────────────────────┐  │  │
│  │  │  Drop .gpx here   │  │  │  │  Drop .csv here    │  │  │
│  │  │  or click to      │  │  │  │  or click to       │  │  │
│  │  │  browse           │  │  │  │  browse            │  │  │
│  │  └───────────────────┘  │  │  └────────────────────┘  │  │
│  │  No file selected       │  │  No file selected         │  │
│  └─────────────────────────┘  └──────────────────────────┘  │
│                                                             │
│  [Download CSV template]                                    │
│                                                             │
│  [Process →]   (disabled until both files selected)        │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### 4.2 GPX drop zone

Standard drag-and-drop zone. Accepts `.gpx` only. On drop/select:
- File name is shown below the zone: `✓ route-cruel-jewel.gpx`
- Client-side GPX parse runs immediately (same `parseGPX()` call as the existing add flow) to validate the file and show a quick summary: `"20 waypoints · 104.3 mi track"`
- If parse fails, show an inline error: `"Could not read GPX file. Check it is a valid .gpx."` File is cleared.

### 4.3 CSV drop zone

Accepts `.csv` only. On drop/select:
- File name is shown: `✓ cruel_jewel_2025.csv`
- Client-side CSV parse runs to validate structure (see §5 for the CSV schema). If required columns are missing, show a specific error: `"CSV is missing required columns: name, date"`
- A row count summary is shown: `"1 race · 20 aid stations"`

### 4.4 CSV template download

A `[Download CSV template]` link is always visible. It downloads a pre-filled template file (`planultra-race-import-template.csv`) with all columns, one example header row, and one example data row. The template is a static asset at `/templates/race-import-template.csv`.

### 4.5 Process button

Enabled only when both files are selected and individually valid. Label: `"Process →"`. On click, the client:

1. Parses the GPX (already done client-side for validation).
2. Parses the CSV.
3. Matches CSV aid station rows to GPX waypoints by name (fuzzy, same logic as `extract_race.py` — see §6.1).
4. Renders Stage 2 in-page.

No server call is made during Stage 1. All processing is client-side.

---

## 5. CSV Schema

### 5.1 Race metadata row

The first data section of the CSV is a **single race row**. Column names are case-insensitive and trimmed.

| Column | Required | Type | Notes |
|---|---|---|---|
| `name` | ✓ | string | Race name, e.g. `Cruel Jewel 100` |
| `date` | ✓ | string | `YYYY-MM-DD` |
| `start_time` | ✓ | string | `HH:MM` 24h |
| `timezone` | ✓ | string | IANA, e.g. `America/New_York` |
| `location` | ✓ | string | City/state, e.g. `Blairsville, GA` |
| `distance_miles` | | number | Overrides GPX-derived distance if provided |
| `description` | | string | ≤ 160 chars, shown in race picker |

The race row is the **first non-header row** of the CSV.

### 5.2 Aid station rows

Aid station rows follow the race row, each representing one station. They are matched to GPX waypoints by the `name` column.

| Column | Required | Type | Notes |
|---|---|---|---|
| `name` | ✓ | string | Matches against GPX waypoint names |
| `crew_access` | | boolean | `true`/`false`/`1`/`0`/`yes`/`no` |
| `drop_bag` | | boolean | Same boolean encoding |
| `cutoff_elapsed_minutes` | | number | Minutes from race start to cutoff; omit or leave blank if none |
| `parking_lat` | | number | Decimal degrees |
| `parking_lng` | | number | Decimal degrees |
| `parking_type` | | string | One of: `parking-lot`, `side-of-road`, `trailhead`, `drop-off` |
| `parking_notes` | | string | Free text; max 500 chars |

### 5.3 Section separator

The race row and aid station rows are separated by a blank line or by a `type` column with values `race` and `aid_station`. Both formats are accepted. If a `type` column is present, use it; otherwise, treat the first non-header row as the race row and all subsequent non-blank rows as aid station rows.

### 5.4 Lenient parsing

Unknown columns are silently ignored. Boolean fields accept `true`, `false`, `1`, `0`, `yes`, `no` (case-insensitive). Number fields with non-numeric values are treated as null. The parser never rejects a row for unexpected columns.

---

## 6. Stage 2 — Review & Configure

Stage 2 renders immediately after `[Process →]` is clicked. It shows the merged race data derived from both files, and lets the admin make final adjustments before saving.

### 6.1 Matching logic (client-side)

Before rendering Stage 2, the client attempts to match each CSV aid station row to a GPX waypoint:

- **Normalise** both sides: lowercase, trim, collapse multiple spaces, strip punctuation.
- **Exact match** first (normalised string equality).
- **Fuzzy match** fallback: Levenshtein distance ≤ 3, or longest-common-subsequence ratio > 0.8. If no match is found within these thresholds, the station is marked `unmatched`.

Each CSV row gets a match result: `matched`, `unmatched`, or `gpx_only` (a GPX waypoint with no CSV row). These are shown in Stage 2 with visual indicators so the admin can review them.

### 6.2 Layout

```
┌──────────────────────────────────────────────────────────────┐
│  ← Race Library     Import race                              │
├──────────────────────────────────────────────────────────────┤
│  Race details                                                │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  Name         Cruel Jewel 100                  [Edit] │   │
│  │  Date         2025-05-16                             │   │
│  │  Start time   12:00 AM                               │   │
│  │  Timezone     America/New_York                       │   │
│  │  Location     Blairsville, GA                        │   │
│  │  Distance     104.3 mi  (from GPX)                   │   │
│  │  Description  "104-mile loop through..."       [Edit] │   │
│  └──────────────────────────────────────────────────────┘   │
│                                                              │
│  Aid Stations  (20 matched · 0 unmatched · 0 GPX-only)      │
│  ┌──────────────────────────────────────────────────────┐   │
│  │ ✓  MI 0.0  Camp Morganton Start/Finish               │   │
│  │    🎒 Drop bag · 👥 Crew  ·  🥾 Trailhead · 34.87, -84.01│
│  │    "Main lot at the campground."           [Edit]     │   │
│  └──────────────────────────────────────────────────────┘   │
│  ┌──────────────────────────────────────────────────────┐   │
│  │ ⚠  MI 5.7  Benton MacKaye (unmatched)                │   │
│  │    No GPX match found             [Fix match]         │   │
│  └──────────────────────────────────────────────────────┘   │
│  ┌──────────────────────────────────────────────────────┐   │
│  │ ○  MI 14.2  GPX: "AS3_Skeenah"  (GPX-only)           │   │
│  │    Not in CSV — crew/drop bag unknown    [Set flags]  │   │
│  └──────────────────────────────────────────────────────┘   │
│                                                              │
│  [← Back to upload]          [Save to library →]            │
└──────────────────────────────────────────────────────────────┘
```

### 6.3 Race details block

Displays all race-level fields from the merged CSV + GPX data. All fields are editable inline via `[Edit]` — clicking `[Edit]` next to a field (or the whole block) expands an inline editor with standard inputs. Fields retain their edited values when collapsed.

No separate save step for the race block — it saves as part of the final `[Save to library →]` action.

**Distance** shows the source: `(from GPX)` if derived from track points, `(from CSV)` if overridden by the CSV. Either is editable.

### 6.4 Aid station list

One row per aid station, sorted by mile ascending. The list combines:
- All matched CSV+GPX stations
- All unmatched CSV stations (no GPX coordinates)
- All GPX-only waypoints (no CSV data)

Each row shows:
- **Match status indicator** — `✓` (matched), `⚠` (unmatched CSV row), `○` (GPX-only)
- **Mile badge** — from GPX if matched, from CSV if unmatched CSV, `?` if unknown
- **Station name** — from CSV if matched/unmatched-CSV, from GPX if GPX-only
- **Flags summary** — crew access, drop bag, cutoff (if set) shown as small chips
- **Parking summary** — type icon + truncated coords + truncated notes (if set)
- **Action** — `[Edit]` (matched/GPX-only with flags set), `[Fix match]` (unmatched CSV), `[Set flags]` (GPX-only with no data)

### 6.5 Inline station editor

Clicking `[Edit]` or `[Set flags]` on a station row expands an inline editor for that row (same pattern as PRD-024 §2.4 — not a modal):

**Flags section:**
- `Crew access` toggle (checkbox)
- `Drop bag` toggle (checkbox)
- `Cutoff` — time text input, format `HH:MM`, auto-converts to elapsed minutes from race start time

**Parking section** (only shown if `crew_access` is true):
- Reuses `<LocationParkingPanel>` from PRD-022/PRD-024
- Pre-populated with any values from the CSV (`parking_lat`, `parking_lng`, `parking_type`, `parking_notes`)
- `[Done]` collapses the panel; edits are held in local state

### 6.6 Fix match flow

For `⚠ unmatched` CSV rows, `[Fix match]` opens an inline dropdown listing all GPX waypoints that haven't already been matched. The admin selects the correct waypoint — the row is updated to `✓ matched` with the GPX coordinates applied. If the station genuinely has no GPX match (not in the route), the admin can dismiss without selecting, keeping the station as unmatched (it will be created with null coordinates).

### 6.7 Match status summary

A one-line summary above the aid station list: `"N matched · N unmatched · N GPX-only"`.

- If there are any `unmatched` CSV rows with no manual fix applied, show a yellow banner: `"⚠ Some aid stations couldn't be matched to the GPX. Review before saving."`
- If all stations are either matched or have been manually reviewed (any `[Fix match]` dismissed), the banner clears and `[Save to library →]` is fully enabled.
- `[Save to library →]` is never blocked by unmatched stations — the admin can save with nulls if they choose to. The banner is advisory, not a blocker.

### 6.8 Back to upload

`[← Back to upload]` returns to Stage 1. All uploaded files are cleared; the admin must re-upload. (Destructive, but not a significant loss — files are local and this is an admin flow.)

---

## 7. Stage 3 — Saved

After `[Save to library →]` succeeds, the page shows a simple confirmation:

```
┌──────────────────────────────────────────────────────┐
│  ✓  Cruel Jewel 100 added to the library             │
│                                                      │
│  [← Back to library]   [Import another race →]       │
└──────────────────────────────────────────────────────┘
```

`[Import another race →]` resets to Stage 1. `[← Back to library]` navigates to `/admin/race-library`.

---

## 8. API

### 8.1 No new API routes

Stage 1 and Stage 2 processing is entirely client-side. Stage 2 save uses the **existing** `POST /api/admin/races` endpoint defined in PRD-012 §9.

The request body is extended slightly to carry the per-station location data (same `sectionUpdates` extension from PRD-024 §2.6). However, since this is a new race (not an edit), the server cannot refer to existing `sectionId`s. Instead, for the import flow, the client sends an `aidStationMetadata` array alongside the race creation payload:

```ts
// POST /api/admin/races — extended body for import flow
{
  name: string,
  date: string,
  startTime: string,
  timezone: string,
  location: string,
  distance?: number,
  description?: string,
  gpx: string,              // raw GPX XML string

  // New for import: per-station metadata keyed by station name (normalised)
  aidStationMetadata?: Array<{
    name: string,           // normalised station name — matched server-side to created sections
    hasDropBag?: boolean,
    hasCrewAccess?: boolean,
    cutoffElapsedMinutes?: number | null,
    crewParkingCoords?: { lat: number; lng: number } | null,
    crewParkingType?: 'parking-lot' | 'side-of-road' | 'trailhead' | 'drop-off' | null,
    crewLocationNotes?: string | null,
  }>
}
```

**Server-side matching for `aidStationMetadata`:** After creating aid station and section records from the GPX, the server iterates `aidStationMetadata` and applies each entry to the section whose `fromStationName` normalised-matches the `name` field. Unknown names are silently skipped (same pattern as PRD-024's `sectionUpdates`).

### 8.2 `POST /api/admin/races` — changes required

- Accept the `aidStationMetadata` array in the request body.
- After creating sections, apply the metadata: for each entry, find the matching section by normalised name and apply `hasDropBag`, `hasCrewAccess`, `cutoffElapsedMinutes`, and the three parking fields via `UpdateExpression`.
- This is a single additional pass after section creation — no structural change to the existing race creation logic.

---

## 9. Client-Side GPX + CSV Processing

### 9.1 GPX processing

Reuse `parseGPX()` and `extractAidStations()` from `src/lib/gpx-parser.ts` directly. These are already available client-side (they're pure functions with no Node or DynamoDB dependencies). No new parsing code needed.

### 9.2 CSV processing

A new client-side utility: `src/lib/import/parse-race-csv.ts`.

```ts
export interface RaceCsvRow {
  name: string
  date: string
  startTime: string
  timezone: string
  location: string
  distanceMiles?: number
  description?: string
}

export interface AidStationCsvRow {
  name: string
  crewAccess?: boolean
  dropBag?: boolean
  cutoffElapsedMinutes?: number | null
  parkingLat?: number | null
  parkingLng?: number | null
  parkingType?: ParkingType | null
  parkingNotes?: string | null
}

export interface ParsedRaceCsv {
  race: RaceCsvRow
  aidStations: AidStationCsvRow[]
  errors: string[]   // non-fatal parse warnings
}

export function parseRaceCsv(csvText: string): ParsedRaceCsv
```

The parser uses a minimal CSV library (Papa Parse is already in the project's dependency set — confirm in `package.json`). It does not need to be a heavy dependency.

### 9.3 Matching utility

A new client-side utility: `src/lib/import/match-aid-stations.ts`.

```ts
export type MatchResult =
  | { status: 'matched'; csvRow: AidStationCsvRow; gpxStation: AidStation }
  | { status: 'unmatched'; csvRow: AidStationCsvRow }
  | { status: 'gpx_only'; gpxStation: AidStation }

export function matchAidStations(
  csvRows: AidStationCsvRow[],
  gpxStations: AidStation[]
): MatchResult[]
```

Normalisation function: `normalise(s: string) => s.toLowerCase().trim().replace(/\s+/g, ' ').replace(/[^\w\s]/g, '')`

Matching priority:
1. Exact normalised match → `matched`
2. Levenshtein distance ≤ 3 → `matched`
3. LCS ratio > 0.8 → `matched`
4. No match found → `unmatched` (CSV) or `gpx_only` (GPX)

Use a lightweight Levenshtein implementation (< 20 lines inline, or the `fastest-levenshtein` package if already in `package.json`). Do not introduce a new fuzzy-match dependency for this feature — implement the distance check inline if no suitable library is present.

---

## 10. CSV Template

The downloadable template (`/public/templates/race-import-template.csv`) contains:

```
# PlanUltra Race Import Template
# Row 1: race metadata. Row 3+: aid stations (one per row).
# Delete this comment row before importing.
name,date,start_time,timezone,location,distance_miles,description,type
Cruel Jewel 100,2025-05-16,12:00,America/New_York,"Blairsville, GA",104.3,"104-mile loop through the Chattahoochee National Forest.",race
name,crew_access,drop_bag,cutoff_elapsed_minutes,parking_lat,parking_lng,parking_type,parking_notes,type
Camp Morganton Start/Finish,true,true,,34.8734,-84.0123,trailhead,"Main lot at the campground.",aid_station
Skeenah Gap,false,false,,,,,, aid_station
```

The template ships with two example aid station rows — one with full data, one minimal. Comments (lines starting with `#`) are stripped by the parser.

---

## 11. Implementation Notes for Dev Agent

**Issue A — Reuse existing client-side GPX parser**
`parseGPX()` and `extractAidStations()` in `src/lib/gpx-parser.ts` are already used client-side in the existing race creation form. Import them directly in the import page component. No new parsing code needed.

**Issue B — Papa Parse for CSV**
Check `package.json` for Papa Parse (`papaparse`). If present, use it. If absent, check for any other CSV library. As a last resort, implement a minimal RFC 4180 CSV parser (handles quoted fields with commas/newlines). Do not add a new npm dependency solely for CSV parsing if one is already available.

**Issue C — Levenshtein distance**
Check `package.json` for `fastest-levenshtein`, `leven`, or similar. If none is present, implement inline:

```ts
function levenshtein(a: string, b: string): number {
  const m = a.length, n = b.length
  const d: number[][] = Array.from({ length: m + 1 }, (_, i) => [i, ...Array(n).fill(0)])
  for (let j = 0; j <= n; j++) d[0][j] = j
  for (let i = 1; i <= m; i++)
    for (let j = 1; j <= n; j++)
      d[i][j] = a[i-1] === b[j-1] ? d[i-1][j-1] : 1 + Math.min(d[i-1][j], d[i][j-1], d[i-1][j-1])
  return d[m][n]
}
```

**Issue D — `aidStationMetadata` server-side matching**
The server applies `aidStationMetadata` after creating sections. It uses the same normalisation function as the client to match names. This is a best-effort operation — the normalised matching will cover the vast majority of cases for well-formed import data. Mismatches are silent (skipped), not fatal.

**Issue E — `hasDropBag` and `hasCrewAccess` on Aid Station records vs Section records**
These flags live on the **Aid Station** record (`AID#<order>`), not the Section record. The `aidStationMetadata` handler must update the Aid Station record, not the Section record, for these two fields. The parking fields (`crewParkingCoords`, `crewParkingType`, `crewLocationNotes`) live on the **Section** record. Both updates are applied in the same post-creation pass.

**Issue F — File processing is entirely client-side**
No server-side file upload during Stage 1 or Stage 2. The GPX string and the merged station metadata are serialised and sent to the server only on final save (Stage 2 → `POST /api/admin/races`). This keeps the import flow stateless — no partial-upload cleanup needed.

**Issue G — Static template asset**
The CSV template is a static file in `/public/templates/`. The `[Download CSV template]` link is a standard `<a href="/templates/race-import-template.csv" download>` — no API call needed.

**Issue H — Stage persistence**
If the admin accidentally navigates away mid-Stage 2, all work is lost. This is acceptable — it's an admin tool and the admin can re-upload. Do not add `beforeunload` warnings or local storage persistence in this version. Note this as a future improvement.

---

## 12. Out of Scope

- Importing multiple races from a single CSV (one race per import session).
- Automatic PDF parsing in-browser (the existing `extract_race.py` CLI handles that; this PRD is for when the admin has already produced the CSV).
- Drag-and-drop ordering of aid stations in Stage 2.
- Map preview of aid station coordinates during import.
- Editing `cutoffElapsedMinutes` in Stage 2 (it is set via CSV and shown read-only; edit post-import via the standard edit flow).
- Importing races with `<rte>` (route) elements rather than `<trk>` (track) elements — same limitation as the existing GPX parser.
- Undo/redo within Stage 2.

---

## 13. Affected Files

| File | Change |
|---|---|
| `src/app/(app)/admin/race-library/page.tsx` | Add `[↑ Import]` button linking to `/admin/race-library/import` |
| `src/app/(app)/admin/race-library/import/page.tsx` | New page — Stage 1/2/3 import flow |
| `src/lib/import/parse-race-csv.ts` | New — CSV parser utility |
| `src/lib/import/match-aid-stations.ts` | New — GPX/CSV matching utility |
| `src/app/api/admin/races/route.ts` | Accept `aidStationMetadata` in POST body; apply flags and parking fields post-creation |
| `public/templates/race-import-template.csv` | New — downloadable CSV template |
