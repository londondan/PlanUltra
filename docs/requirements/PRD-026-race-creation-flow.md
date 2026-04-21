# PRD-026 — Race Creation Flow: GPX Import + Aid Station Setup

**Status:** Draft
**Date:** 2026-04-03
**Replaces:** PRD-025 (Bulk Race Import — deleted, not implemented)
**Extends:** Existing race creation flow (`/dashboard/new`), race setup page (`/dashboard/<raceId>/setup`)
**Pre-reading:** `specs/race-creation.md`, `specs/race-setup.md`, PRD-022 §3 (crew parking fields), PRD-003 (Ridge Light design system)

---

## 0. Mandatory Pre-Reading

Before implementing, read:
- `specs/race-creation.md` — current race creation flow, GPX parsing, POST /api/races
- `specs/race-setup.md` — current setup page, aid station table, PUT /api/races/<raceId>/aid-stations
- **PRD-022 §3** — `crewParkingCoords`, `crewParkingType`, `crewLocationNotes` on the Section record
- **PRD-003** — Ridge Light design system

---

## 1. Summary

This PRD restructures the race creation flow into a two-step wizard:

| Step | Screen | What happens |
|---|---|---|
| 1 | **Create race** | User uploads GPX, enters name/date/start time/timezone. Submits → race and aid stations are created. |
| 2 | **Configure aid stations** | User sees a **unique** list of aid stations. For each, they set drop bag and crew access flags. For crew-access stations, they can optionally add parking and location data. |

Step 2 replaces the existing `/dashboard/<raceId>/setup` page. It is reached automatically after Step 1, and also reachable from the race detail page for any existing race.

The key design principle for Step 2: **show each physical aid station once**, not once per visit. A station that appears at miles 12 and 68 on an out-and-back course shows as a single row. Settings are applied to all visits of that station.

---

## 2. Step 1 — Create Race (GPX Upload)

No structural changes to the existing race creation form at `/dashboard/new`. This step is already shipped.

For reference, the current flow:
1. User provides a GPX file (upload or curated library selection)
2. User enters race name, date, start time, timezone
3. Submit → POST /api/races → redirect to setup page

The only change here is the redirect destination: after creation, redirect to the new Step 2 page (`/dashboard/<raceId>/setup`) rather than the old setup page. Since the route is the same, no redirect change is needed — this PRD replaces the contents of that page.

---

## 3. Step 2 — Aid Station Setup

### 3.1 Route

`/dashboard/<raceId>/setup` — same route as the existing setup page. This PRD replaces the existing page implementation.

### 3.2 Page header

```
← My races     [Race name]     Setup
```

The back link goes to `/dashboard` (race list), not to Step 1. There is no "go back to GPX upload" from this screen — the GPX is already saved.

A progress indicator shows the user where they are:

```
  [1] Create race  ──●──  [2] Set up aid stations
```

Step 1 is shown as complete. Step 2 is active.

### 3.3 Unique aid station list

The page renders **one row per unique physical location**, not one row per visit.

Uniqueness is determined by `physicalName` (the field already used to group visits on the current setup page — see `specs/race-setup.md`). If a station appears at miles 12.0 and 67.8, it shows as one row displaying both distances.

Rows are sorted by the **first** (lowest) mile of each station.

Start and Finish are shown but locked — they are always crew-accessible with drop bag, and their flags cannot be changed. They do not show parking/location inputs.

### 3.4 Row layout

Each non-locked station row:

```
┌──────────────────────────────────────────────────────────────┐
│  MI 12.0 · 67.8    Visitor Center Aid Station                │
│                                                              │
│  Drop bag   [toggle]     Crew access   [toggle]             │
│                                                              │
│  ▼ Parking & location  (only shown when Crew access is ON)  │
└──────────────────────────────────────────────────────────────┘
```

- **Mile badge** — shows all visit miles, comma-separated, e.g. `MI 12.0 · 67.8`. Single visit shows `MI 12.0`.
- **Station name** — editable inline text field. Editing the name here updates `physicalName` for all visits of this station.
- **Drop bag toggle** — checkbox or toggle switch. Default: off.
- **Crew access toggle** — checkbox or toggle switch. Default: off.
- **Parking & location panel** — collapsible, only visible when crew access is on. Hidden and cleared when crew access is turned off.

### 3.5 Parking & location panel

Shown inline below the flags when crew access is enabled. Does not expand into a modal. The section header acts as a toggle to collapse/expand — collapsed by default when crew access is first turned on, so the user can choose to expand it or skip it.

Fields (all optional, independently):
- **Parking coordinates** — two number inputs: Lat, Lng (decimal degrees). Optional.
- **Parking type** — dropdown with a blank default. Options: `Parking lot`, `Side of road`, `Trailhead`, `Drop-off only`. Optional.
- **Location notes** — free text, max 500 chars. Placeholder: "e.g. Main lot at the campground, walk 200m to aid station." Optional.

These map to `crewParkingCoords`, `crewParkingType`, `crewLocationNotes` on the Section record (PRD-022 §3).

```
┌──────────────────────────────────────────────────────────────┐
│  MI 12.0 · 67.8    Visitor Center Aid Station                │
│                                                              │
│  Drop bag   [✓]          Crew access   [✓]                  │
│                                                              │
│  ▼ Parking & location  (tap to expand)                       │
│  ┌────────────────────────────────────────────────────────┐  │
│  │  Lat  [ 38.3646 ]   Lng  [ -79.1629 ]                 │  │
│  │  Type  [Trailhead ▾]                                   │  │
│  │  Notes  [___________________________________]          │  │
│  └────────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────┘
```

### 3.5.1 Partial data rules

All three fields are independent — any combination of filled/empty is valid and saves as-is:

| Coords | Type | Notes | Outcome |
|---|---|---|---|
| Set | Set | Set | Full location data — ideal |
| Set | Set | Empty | Valid — saves coords + type, null notes |
| Set | Empty | Empty | Valid — saves coords only, null type and notes |
| Empty | Empty | Set | Valid — notes only (e.g. "Look for the blue flags on the left") |
| Empty | Set | Empty | Valid — type only |
| Empty | Empty | Empty | Valid — no location data, all three fields null |

There is no required field within the parking panel. A station with crew access can be saved with the panel completely empty.

### 3.5.2 Coordinate validation

Lat and Lng inputs accept decimal numbers only. Client-side validation:
- Lat must be between -90 and 90
- Lng must be between -180 and 180
- Non-numeric input shows an inline error: `"Must be a number"` and prevents save
- Out-of-range values show: `"Lat must be between -90 and 90"` / `"Lng must be between -180 and 180"`

**Partial coordinates:** If the user enters Lat but not Lng (or vice versa), this is a validation error: `"Enter both lat and lng, or leave both blank"`. The user cannot save with only one coordinate set.

If both coordinate fields are empty, `crewParkingCoords` is saved as null — this is valid.

### 3.5.3 Crew access toggled off

When the user turns crew access OFF on a station that has parking panel data entered:
- The parking panel is hidden immediately
- The entered data is **retained in local UI state** — it is not cleared
- If the user turns crew access back ON, the panel re-appears with the previously entered data intact
- On save, if `hasCrewAccess` is false, the three parking fields are saved as null regardless of what was in the UI state. Data entered but not saved with crew access on is discarded.

This means: toggling crew access off and saving explicitly clears parking data for that station. The UI retains data in-session only as a convenience in case of accidental toggle.

### 3.5.4 Start / Finish and the parking panel

Start and Finish rows are locked (crew access always on, cannot be changed). They **do** show the parking & location panel — the start/finish location is useful crew information. The panel behaves identically to non-locked rows.

The only thing locked on these rows is the flags (drop bag and crew access). The name and parking data are editable.

### 3.6 Locked rows (Start / Finish)

Start and Finish rows have their flags locked — drop bag and crew access are always on and shown as read-only chips. The name and parking data are fully editable. The parking panel is shown expanded by default on these rows (since crew access is always on and location info is particularly useful for Start/Finish).

```
┌──────────────────────────────────────────────────────────────┐
│  MI 0.0    [ Start / Finish          ]             🔒        │
│  Drop bag ✓   Crew ✓                                         │
│                                                              │
│  ▼ Parking & location                                        │
│  ┌────────────────────────────────────────────────────────┐  │
│  │  Lat  [        ]   Lng  [        ]                    │  │
│  │  Type  [— select — ▾]                                  │  │
│  │  Notes  [___________________________________]          │  │
│  └────────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────┘
```

### 3.7 Page footer actions

```
[Skip for now]                        [Save & continue →]
```

- **Skip for now** — saves nothing, redirects to `/dashboard/<raceId>`. Aid stations can be configured later via the race detail page. Any data entered on this screen is discarded. No confirmation dialog — the skip is intentional and the screen is easily reachable again.
- **Save & continue** — validates (see §3.5.2), saves all changes (see §4), then redirects to `/dashboard/<raceId>`.

**Save is disabled** only when there is an active validation error (invalid coordinate input). It is never disabled just because fields are empty — partial data and fully empty saves are both valid.

**Skip is always enabled** — even if the user has entered data. This is intentional: the user may want to come back later. The button label makes the consequence clear ("Skip for now", not "Discard").

---

## 4. Data Saving

### 4.1 What gets saved

On `[Save & continue →]`, the client sends one request:

```
PUT /api/races/<raceId>/aid-stations
```

The existing endpoint already accepts the full aid station list. This PRD extends the payload to include parking/location fields per station.

### 4.2 Payload extension

The existing payload sends `aidStations` as an array with `name`, `hasDropBag`, `hasCrewAccess`, `order`, etc. per visit. This PRD adds the three parking fields to each aid station record:

```ts
{
  aidStations: Array<{
    // existing fields
    name: string
    physicalName: string
    hasDropBag: boolean
    hasCrewAccess: boolean
    order: number
    distanceFromStart: number
    lat: number
    lon: number

    // new fields (nullable)
    crewParkingCoords?: { lat: number; lng: number } | null
    crewParkingType?: 'parking-lot' | 'side-of-road' | 'trailhead' | 'drop-off' | null
    crewLocationNotes?: string | null
  }>
}
```

Since the UI works on unique stations but the API saves per-visit, the client must **fan out** each unique station's settings to all its visits before sending. A station appearing at miles 12 and 68 produces two records in the payload, both with the same flags and parking data.

### 4.3 API changes

The `PUT /api/races/<raceId>/aid-stations` handler must be updated to:
- Accept and persist the three parking fields on each AidStation record
- These fields are optional/nullable — omitting them is valid and leaves existing values unchanged

---

## 5. Edit Mode

The setup screen doubles as the edit screen for aid station configuration. A user can return to it at any time from their race detail page.

### 5.1 Entry point

A link on `/dashboard/<raceId>` provides access:

```
[⚙ Edit aid stations]
```

### 5.2 How the page differs in edit mode

The page is identical in structure, with these differences:

| Element | New race (post-creation) | Edit (returning) |
|---|---|---|
| Progress indicator | Shown — step 1 complete, step 2 active | Hidden |
| Page heading | "Set up aid stations" | "Aid stations" |
| Footer primary button | `[Save & continue →]` → redirects to race detail | `[Save changes]` → redirects back to race detail |
| Footer secondary button | `[Skip for now]` → redirects to race detail, saves nothing | `[Cancel]` → redirects to race detail, saves nothing |

"Cancel" in edit mode discards any unsaved changes made in this session, the same as "Skip for now" — no confirmation dialog.

### 5.3 Pre-populating existing data

On load, the page fetches the current aid station records and pre-fills all fields:
- Drop bag and crew access toggles reflect saved values
- If a station has `hasCrewAccess: true`, the parking panel is rendered — and if any parking fields have saved values, the panel is expanded by default (not collapsed) so the user can see the existing data
- If a station has `hasCrewAccess: true` but all three parking fields are null, the panel is collapsed by default (same as new-race behaviour)
- If a station has `hasCrewAccess: false`, the parking panel is hidden regardless of whether parking data exists in the database (stale data from a previous save is not shown)

### 5.4 Saving over existing data

On save, the PUT replaces all aid station records. The fan-out logic (§4.2) applies identically. There is no partial update — the full station list is sent every time.

Implications:
- Clearing a field (e.g. deleting lat/lng values) and saving explicitly sets that field to null in the database. This is intentional — edit mode is a full replace, not a patch.
- A station previously saved with parking data, then edited with crew access turned off, will have its parking fields set to null on save (per §3.5.3). This is permanent until the user turns crew access back on and re-enters the data.

### 5.5 No unsaved-changes warning

The page does not show a browser "leave page?" warning if the user navigates away without saving. This is consistent with the new-race flow and avoids complexity. The user is responsible for saving before navigating away.

---

## 6. Station Name Editing

Editing a station name in this UI updates `physicalName` for all visits. The client must send all visits with the updated `physicalName` in the save payload. The server replaces all aid station records on PUT (existing behaviour), so no special server-side handling is needed.

---

## 7. Out of Scope

- Adding or deleting aid stations on this screen. Use the existing add/delete functionality on the current setup page if needed, or defer to a future PRD.
- Reordering stations or editing distances.
- Map view for entering parking coordinates (plain lat/lng inputs are sufficient for now).
- Validating that parking coordinates fall within a reasonable distance of the race course.
- Cutoff time configuration (separate feature, existing PRD-017 covers pace; cutoffs are a future concern).

---

## 8. Affected Files

| File | Change |
|---|---|
| `src/app/dashboard/[raceId]/setup/page.tsx` | Replace existing setup page with new unique-station list UI; handles both new-race and edit modes via query param |
| `src/app/api/races/[raceId]/aid-stations/route.ts` | Accept and persist `crewParkingCoords`, `crewParkingType`, `crewLocationNotes` on PUT |
| `src/app/dashboard/[raceId]/page.tsx` | Add `[⚙ Edit aid stations]` link to `/dashboard/<raceId>/setup` |

No new routes. No new database fields beyond the three parking fields already defined in PRD-022 §3.
