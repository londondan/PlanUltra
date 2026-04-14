# PRD-025 — Aid Station Coord Auto-fill from GPX Waypoints

**Status:** Draft
**Date:** 2026-04-14
**Extends:** PRD-024 §2 (Aid Station Configuration in Admin Add/Edit)
**Pre-reading:** PRD-012, PRD-024, PRD-022 §3 (crewParkingCoords data model), PRD-003 (Ridge Light design system)

Where this PRD conflicts with PRD-024, **this PRD wins**.

---

## 1. Summary

When a GPX file is uploaded for a library race, aid station waypoints already contain latitude and longitude. This PRD specifies that `crewParkingCoords` should be **auto-populated from those waypoint coords** immediately after GPX ingestion, rather than requiring the admin to manually paste a Google Maps URL for every station.

Auto-filled coords are treated as unverified starting points. The admin can confirm or override each one. The UI distinguishes clearly between auto-filled (unverified) and manually confirmed locations.

---

## 2. Background

GPX files for ultramarathons typically encode aid stations as named waypoints with `<wpt lat="..." lon="...">` elements. These coordinates mark the physical aid station location on the trail. For many races — particularly road-accessible loop courses (Javelina, Rocky Raccoon) — the waypoint is at or very near the crew parking area.

For wilderness races (Western States, Hardrock), the waypoint marks the trail location but crew may park some distance away at a road access point. Auto-fill is still useful as a starting point, but those entries will need manual correction.

A Google Maps link can be constructed directly from any lat/lng pair:
```
https://www.google.com/maps?q=<lat>,<lng>
```

---

## 3. Auto-fill Behaviour on GPX Ingestion

### 3.1 Trigger

Auto-fill runs immediately after GPX processing creates section records — both on initial upload (new race) and on GPX re-ingestion (edit flow, PRD-024 §3).

### 3.2 What gets set

For each section where `crewAccess === true` and the source GPX waypoint includes a lat/lng:

- `crewParkingCoords` is set to `{ lat: <waypoint lat>, lng: <waypoint lon> }`
- `crewParkingCoordsSource` is set to `'gpx'` (new field — see §5)
- `crewParkingType` and `crewLocationNotes` are left null (not auto-filled — these require human judgement)

For sections where `crewAccess === false`, no coords are set (consistent with existing behaviour).

### 3.3 Re-ingestion behaviour

On GPX re-ingestion (PRD-024 §3.4), the matching logic already preserves existing `crewParkingCoords` for stations whose names match. This PRD adds a nuance:

- If an existing station has `crewParkingCoordsSource === 'admin'` (manually confirmed), the existing coords are preserved as-is.
- If an existing station has `crewParkingCoordsSource === 'gpx'` (auto-filled, not yet confirmed), the coords are **replaced** with the new GPX waypoint coords. The admin hasn't verified them yet, so using the fresh GPX data is safer.

---

## 4. Admin UI — Distinguishing Auto-filled vs. Confirmed Locations

### 4.1 Station row states

The Aid Stations panel (PRD-024 §2.3) gains a fourth location state alongside the existing three:

| State | Condition | Display |
|---|---|---|
| No location | `crewAccess` true, no coords | `"No location set"` + `[+ Set location]` |
| **Auto-filled** | `crewParkingCoordsSource === 'gpx'` | `"📍 Auto-filled · [lat, lng]"` + warning chip + `[Verify]` |
| Confirmed | `crewParkingCoordsSource === 'admin'` | Parking type icon + coords + notes + `[Edit]` |
| No crew access | `crewAccess === false` | `"No crew access — skip"` (muted) |

### 4.2 Auto-filled row appearance

```
┌─────────────────────────────────────────────────────────┐
│  MI 32.9  Michigan Bluff            [crewAccess: ✓]     │
│  ⚠ Auto-filled from GPX             [Verify]            │
│  38.3646, -120.7183                                     │
└─────────────────────────────────────────────────────────┘
```

- **Warning chip:** small amber chip reading `"Auto-filled"` — uses the Ridge Light amber/warning token, not an error red.
- **Coords display:** shown as `lat, lng` in Geist Mono, 12px, Deep Ridge 60% opacity.
- **`[Verify]` button:** same style as `[Edit]` — opens the inline location editor (PRD-024 §2.4) pre-populated with the auto-filled coords.

### 4.3 Verifying / confirming a location

When the admin opens the inline editor for an auto-filled station:

- The Google Maps location field is pre-populated with the auto-filled coords (formatted as `lat,lng` — the existing field already accepts this format per PRD-022).
- The parking type and notes fields are empty, as normal.
- A hint text appears above the map field: `"Coordinates auto-filled from GPX waypoint. Confirm the location is correct and add parking details below."`

When the admin clicks `[Done]` to close the inline editor:

- `crewParkingCoordsSource` is updated to `'admin'`.
- The row transitions from the "Auto-filled" state to the "Confirmed" state.
- The amber warning chip disappears.

The admin does not need to change the coordinates if they look correct — simply opening the editor and clicking Done is sufficient to confirm. This avoids forcing unnecessary edits while ensuring the admin has at least glanced at each location.

### 4.4 Section panel summary indicator

The Aid Stations collapsible panel header (PRD-024 §2.3) should show a count of unverified auto-filled stations when collapsed:

```
│  Aid Stations   ⚠ 4 unverified          [▾ expand] │
```

This prompts the admin to verify locations without forcing the panel open.

---

## 5. Data Model Change

### 5.1 New field: `crewParkingCoordsSource`

| Field | Type | Values | Default |
|---|---|---|---|
| `crewParkingCoordsSource` | `string \| null` | `'gpx'`, `'admin'` | `null` |

This field is stored on the Section record alongside `crewParkingCoords`. It is purely an admin-side metadata field — it is **not** copied when a user creates a race from the library template (`POST /api/races/from-library`). User copies receive `crewParkingCoords` as a plain value; the source provenance is irrelevant to them.

### 5.2 Additive change

This is an additive field. Existing section records without it are treated as `null` (no source set). The existing admin UI behaviour for such records is unchanged — they show as "No location set" or "Confirmed" based on whether `crewParkingCoords` is present, regardless of `crewParkingCoordsSource`.

---

## 6. GPX Parsing Change

### 6.1 Waypoint extraction

The existing GPX ingestion pipeline (used by `POST /api/admin/races` and `PUT /api/admin/races/[raceId]`) parses aid stations from the GPX file. This pipeline must be extended to also extract waypoint coordinates.

For each waypoint that becomes a section:

```ts
// GPX waypoint element: <wpt lat="38.3646" lon="-120.7183">
const lat = parseFloat(wpt.getAttribute('lat'))
const lng = parseFloat(wpt.getAttribute('lon'))

if (!isNaN(lat) && !isNaN(lng)) {
  section.crewParkingCoords = { lat, lng }
  section.crewParkingCoordsSource = 'gpx'
}
```

### 6.2 Fallback

If a waypoint element has no lat/lon attributes (malformed GPX), the section is created with no coords — same as the current behaviour. No error is thrown.

---

## 7. Copy-on-Add: What Users Receive

When a user copies a library race (`POST /api/races/from-library`, PRD-012 §10), the copied section records receive:

- `crewParkingCoords` — copied as-is (whether auto-filled or admin-confirmed, the value is the same)
- `crewParkingCoordsSource` — **not copied** (set to null on the user's copy)
- `crewParkingType` — copied as-is
- `crewLocationNotes` — copied as-is

The user benefits from pre-populated coordinates regardless of whether the admin has verified them. The admin should ideally verify all auto-filled coords before a library race is considered "ready", but this is a workflow convention, not a system enforcement.

---

## 8. Implementation Notes for Dev Agent

**Issue A — `crewParkingCoordsSource` is admin metadata only**
Do not expose `crewParkingCoordsSource` in any user-facing API responses. The `GET /api/library/races` and `POST /api/races/from-library` endpoints should strip this field before returning section data to clients.

**Issue B — Waypoint lat/lng vs. track point lat/lng**
GPX files have two sources of coordinates: `<wpt>` elements (named waypoints = aid stations) and `<trkpt>` elements (the route trace). Only `<wpt>` elements should be used for auto-fill. Do not attempt to snap aid stations to the nearest track point.

**Issue C — Coordinate precision**
Store lat/lng to 6 decimal places (standard GPS precision, ~0.1m). Do not round to fewer decimals — some aid station access roads are close enough together that rounding would pick the wrong one.

**Issue D — Inline editor pre-population**
The existing `<LocationParkingPanel>` (PRD-024 §2.4) accepts `initialValues`. Pass `crewParkingCoords` as the initial location value formatted as `"lat,lng"`. The panel's existing URL/coord parser already handles this format (per PRD-022).

**Issue E — `[Done]` sets source to 'admin' regardless of whether coords changed**
The intent is "admin has reviewed this location". Implement by setting `crewParkingCoordsSource = 'admin'` whenever the inline editor's Done button is clicked, even if the coord value is unchanged. This is a deliberate UX decision — confirmation is the action, not modification.

**Issue F — Panel header unverified count**
Count sections where `crewAccess === true` AND `crewParkingCoordsSource === 'gpx'`. Sections with no coords at all are not "unverified" — they are simply unconfigured and already handled by the existing "No location set" state.

---

## 9. Out of Scope

- Auto-filling `crewParkingType` or `crewLocationNotes` from any source — these require human judgement.
- Reverse geocoding coords to a human-readable address — not needed; admins will verify visually via the map.
- Surfacing `crewParkingCoordsSource` to end users in any form.
- Bulk "confirm all" button — admins should review each station individually given the wilderness parking caveat.
- Auto-fill for user-owned races (non-library) — users don't upload GPX files through an admin flow.
