# PRD-028 — Crew Home Base: Hotel/Camp Location + Dual Transit Mode on Crew Sheet

**Status:** Draft
**Date:** 2026-04-18
**Extends:** PRD-022 (Crew Travel), PRD-010 (Crew Sheet)
**Pre-reading:** PRD-022 §3 (data model), PRD-022 §4 (Location & Parking UI), PRD-022 §6 (segment bridge layout), PRD-010 §5 (crew sheet header)

---

## 0. Mandatory Pre-Reading

Before implementing, read:
- **PRD-022 §3** — Section data model: `crewParkingCoords`, `crewParkingType`, `crewLocationNotes`
- **PRD-022 §4** — Location & Parking panel UI (the component pattern this PRD reuses)
- **PRD-022 §6** — Segment bridge layout: drive time/distance between crew stations
- **PRD-022 §6.3** — Mapbox Directions API integration and caching pattern
- **`docs/specs/mockups/crew-travel-v3b-refined.html`** — canonical visual reference for the published crew sheet

Where this PRD conflicts with PRD-022, **this PRD wins**.

---

## 1. Summary

Crew members at long ultras often have 4–8 hours between runner checkpoints, with aid stations only 15 minutes apart. The existing crew sheet shows drive time station-to-station — useful when crew are leapfrogging, but not when they're heading back to a hotel to sleep. What they actually need to know is: "How long does it take me to get from the hotel to the *next* station I need to be at?"

This PRD adds:

1. **Crew Home Base** — an optional location field on the Race (runner-side) representing the crew's hotel, campsite, or staging area.
2. **Dual transit mode on the crew sheet** — a toggle that switches drive time/distance display between:
   - **Station → Station** (existing behaviour, leapfrog mode)
   - **Base → Station** (new, return-to-base mode)

The crew sheet toggle is a client-side interaction only — no re-fetch required. Both sets of transit data are pre-computed at page render time and swapped in via JavaScript.

---

## 2. Data Model

### 2.1 New field on the Race record

```ts
crewHomeBase?: {
  lat: number
  lng: number
  label?: string   // optional display name, e.g. "Best Western Auburn" — max 80 chars
}
```

- Stored on the Race record in DynamoDB (Runner Plan data per PRD-027 §2.2 — this is runner-specific, not a Race Fact).
- Optional and nullable. If not set, the toggle does not appear on the crew sheet.
- `label` is a free-text display name for the location. If omitted, the crew sheet renders "Home base" as the default label.

### 2.2 Transit data computation

The segment bridge between two crew stations currently shows one drive time/distance value: station A → station B (computed via Mapbox Directions, PRD-022 §6.3).

When `crewHomeBase` is set, a second transit value is computed per segment: Home Base → station B (the destination station for that segment).

Both values are computed server-side at crew sheet render time. The page renders with both sets of data embedded in the HTML (as data attributes or inline JSON in a `<script>` tag), so the client-side toggle requires no network call.

```
// Data shape embedded in page HTML per segment bridge
{
  segmentId: string,
  stationToStation: { driveMins: number | null, distanceMiles: number | null },
  baseToStation:    { driveMins: number | null, distanceMiles: number | null }
}
```

`null` values indicate the Mapbox call failed or coords are missing — render as `"—"` per PRD-022 §6.3 fallback behaviour.

### 2.3 Mapbox call volume

Adding Home Base transit doubles the Mapbox Directions calls per crew sheet render (one additional call per crew station segment). The existing caching pattern (PRD-022 §6.3) applies — cache by `(originLat, originLng, destLat, destLng)` tuple. Since the Home Base coords are fixed across all segments, many calls may hit cache after the first render.

---

## 3. Runner UI — Setting the Home Base

### 3.1 Location in the app

The Crew Home Base field lives in the **Crew tab**, in a new **"Crew Home Base"** section at the top of the tab — above the per-station crew cards. It follows the same collapsible panel pattern as the Location & Parking panel (PRD-022 §4).

```
┌──────────────────────────────────────────────────────────┐
│  🏠  Crew Home Base                  [Not set]       ▾   │
└──────────────────────────────────────────────────────────┘
```

- **Icon:** 🏠
- **Title:** "Crew Home Base", 12px, weight 700, `var(--deep-ridge)`
- **Status chip:** `"Not set"` (muted) or `"✓ Set · [label]"` (green) — same pattern as PRD-022 §4.1
- **Default state:** collapsed if not set, expanded if set

### 3.2 Panel body

The panel body mirrors the Location & Parking panel (PRD-022 §4.2) with two fields:

**Google Maps location field:**
- Label: `"HOME BASE LOCATION"`
- Same input + button row as PRD-022 §4.2: paste a Google Maps link or `lat,lng` string
- Placeholder: `"Paste a Google Maps link or enter lat, lng…"`
- Helper text: `"e.g. your hotel, campsite, or staging area"`
- Accepts same formats as PRD-022 §4.2 (full Maps URL or raw coords)
- On set: stores `{ lat, lng }` in `crewHomeBase`

**Label field:**
- Label: `"LOCATION LABEL"` with `"(optional)"` suffix
- Single-line text input, max 80 chars
- Placeholder: `"e.g. Best Western Auburn, Camp Site B"`
- Helper: `"This name appears on the crew sheet when base-to-station drive times are shown"`
- If left blank, defaults to `"Home base"` on the crew sheet

**No parking type field** — not relevant for a home base.

### 3.3 Save behaviour

Auto-save on blur, consistent with the Location & Parking panel (PRD-022 §4.3). Runner must re-publish the crew sheet to push changes to crew.

### 3.4 Tip banner

When the panel is first opened (nothing set):

> 🏠 Add your crew's hotel or campsite so the crew sheet can show drive times from base to each station. Useful when there's a long gap and crew might head back between checkpoints.

---

## 4. Published Crew Sheet — Toggle

### 4.1 Toggle control

When `crewHomeBase` is set on the race, a **transit mode toggle** appears on the crew sheet, positioned in the header block below the RD contact info (PRD-027 §3.4) and above the station list.

```
┌──────────────────────────────────────────────────────────┐
│         Drive times:  [Station → Station]  [Base → Station] │
└──────────────────────────────────────────────────────────┘
```

- A two-option pill toggle (not a checkbox). Both options are always visible.
- Default selected: **Station → Station** (existing behaviour, familiar to crew who have used the sheet before)
- Selected state: Ridge Blue background, white text
- Unselected state: white background, Deep Ridge text, `1px solid var(--sky)` border
- Font: Geist Sans, 13px
- Label prefix: `"Drive times:"` in Geist Sans 12px, Deep Ridge 50% opacity, `margin-right: 8px`

The toggle is **hidden on print** (`@media print { .transit-toggle { display: none; } }`). Print always renders Station → Station drive times (the default). Base → Station times are a screen-only interactive feature.

If `crewHomeBase` is not set, the toggle does not render and the segment bridge shows Station → Station times as before — no change to existing behaviour.

### 4.2 Segment bridge — transit display

The existing segment bridge (PRD-022 §6) shows drive time and distance in the left panel. This display updates when the toggle changes.

**Station → Station mode (default):**
```
┌──────────────────────────────────────────────────┐
│  🚗 Drive                                        │
│  42 min · 31 mi                                  │
│  Station → Station                               │
└──────────────────────────────────────────────────┘
```

**Base → Station mode:**
```
┌──────────────────────────────────────────────────┐
│  🚗 From base                                    │
│  18 min · 12 mi                                  │
│  Best Western Auburn → Big Mountain              │
└──────────────────────────────────────────────────┘
```

**Changes in Base → Station mode:**
- Label changes from `"Drive"` to `"From base"`
- The sub-label below the time/distance changes from `"Station → Station"` to `"[baseLabel] → [destinationStationName]"` (truncated if long)
- Drive time and distance values swap to the pre-computed base-to-station values
- If `baseToStation` data is `null` (Mapbox failed), render `"—"` for both values with a muted `"Route unavailable"` sub-label

### 4.3 Client-side toggle implementation

The toggle swaps data already present in the page — no fetch on toggle. Implementation:

1. Server renders the page with both `stationToStation` and `baseToStation` data embedded per segment in `data-` attributes on each bridge element:
   ```html
   <div class="segment-bridge"
        data-s2s-mins="42" data-s2s-miles="31"
        data-b2s-mins="18" data-b2s-miles="12"
        data-base-label="Best Western Auburn"
        data-dest-label="Big Mountain">
   ```
2. A small `<script>` block (inline, no external file) handles the toggle click: reads `data-` attributes and updates the displayed text nodes.
3. The script is minimal — no framework dependency. A `querySelectorAll('.segment-bridge')` loop with `textContent` updates is sufficient.
4. Toggle state is not persisted (no localStorage). It resets to Station → Station on page reload — the default is always the safe choice.

### 4.4 Print behaviour

On print, the crew sheet always renders **Station → Station** drive times regardless of the current toggle state. This is the conservative default — crew printing at the hotel in the morning will get the standard leapfrog times, not times relative to a base they may be leaving.

Implement via `@media print`: directly render the station-to-station values in visible text nodes, and use CSS to hide the base-to-station text nodes (or use the data attributes and a print-specific render pass in the script).

---

## 5. Implementation Notes for Dev Agent

**Issue A — Home Base is Runner Plan data**
Per PRD-027 §2.2, `crewHomeBase` is Runner Plan data. It is never copied from library races. Do not add it to library race records. The `from-library` copy handler must explicitly exclude it (it should be absent or `null` on the new user race).

**Issue B — Mapbox call budget**
Adding one Mapbox Directions call per crew station per render (for base-to-station) may increase costs at scale. Apply the same caching as PRD-022 §6.3. Additionally: if two adjacent segments share the same destination station and the same home base, the base-to-station call is the same — de-duplicate before fetching.

**Issue C — Null handling on toggle**
If `baseToStation` data is null for a segment (Mapbox failed), the toggle should still work — clicking "Base → Station" shows `"—"` for that segment's drive time with a `"Route unavailable"` label. Do not disable the toggle globally because one segment failed.

**Issue D — Toggle hidden when no home base**
If `crewHomeBase` is null, the toggle must not render. Do not render an empty/disabled toggle — omit it entirely. The segment bridge shows Station → Station times as before with no change to existing appearance.

**Issue E — Label truncation**
The `"[baseLabel] → [destStation]"` sub-label in the bridge can get long. Truncate with `overflow: hidden; text-overflow: ellipsis; white-space: nowrap` on the sub-label element. Max display width is constrained by the left panel of the bridge (roughly 200px on desktop).

**Issue F — Script placement**
Place the toggle `<script>` block at the end of `<body>`, after all bridge elements are in the DOM. Do not use `defer` or `async` — inline script at end of body is sufficient and avoids the flash of uninitialized toggle state.

---

## 6. Out of Scope

- Multiple home base locations (e.g. crew using different hotels mid-race) — single base only for now.
- Showing home base location on the crew sheet map or as a QR code — the base is for drive time calculation only, not a crew sheet destination card.
- Persisting the toggle state across page loads (localStorage) — resets to default on reload.
- Computing base-to-station times in real time as the runner progresses — this is a static pre-computed value based on the stored home base coords.
- Notifying crew when they should leave the base to make it to the next station in time — a future feature that would require live ETA updates (PRD-010 §10.3).

---

## 7. Affected Files

| File | Change |
|---|---|
| `src/lib/db/races.ts` | Add `crewHomeBase` to Race type |
| `src/app/(app)/dashboard/[raceId]/crew/page.tsx` | Add Crew Home Base panel at top of Crew tab |
| `src/app/api/races/[raceId]/route.ts` | Accept and persist `crewHomeBase` on PUT |
| `src/app/crew/[token]/page.tsx` | Compute base-to-station Mapbox calls; embed data attributes; render toggle; add toggle script |
