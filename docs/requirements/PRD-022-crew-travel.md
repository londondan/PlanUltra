# PRD-022 — Crew Travel: Location, Navigation, and Logistics on the Crew Sheet

**Status:** Draft
**Date:** 2026-03-29 (revised 2026-03-31)
**Extends:** PRD-010 (Crew Sheet), PRD-019 (Crew Sheet Mobile)
**Fulfils:** PRD-010 §10.1 (Google Maps crew parking links — now in scope)
**Reference mockups:**
- `docs/specs/mockups/crew-travel-v3b-refined.html` — published crew sheet (canonical visual spec)
- `docs/specs/mockups/crew-parking-setup.html` — Crew tab Location & Parking UI (canonical for §4)
- `docs/specs/mockups/crew-layout-options.html` — QR layout comparison; **Option D** is the selected layout

---

## REVISION LOG — 2026-03-31

This section documents every change made in the 2026-03-31 revision. Read this before planning implementation — it tells you exactly what is new, what has changed, and what was already spec'd.

### What was already spec'd (original PRD, unchanged)

These sections are complete and should be implemented as-is with no modifications:

- **§3 Data model** — `crewParkingCoords`, `crewParkingType`, `crewLocationNotes` fields on Section. No changes.
- **§4 Runner/Admin UI (Crew tab)** — Location & Parking panel with three states (empty, location set, fully configured), auto-save on blur. No changes.
- **§5.1 Parking badge in station header** — badge placement, styling, icon/label mapping. No changes.
- **§5.3 Crew notes** — amber border, unchanged. No changes.
- **§6 Segment bridge layout** — drive info left panel, runner checkpoints right panel, timeline continuity. No changes.
- **§6.3 Mapbox Directions API** — drive time fetch, caching, fallback to `"—"`. No changes.
- **§7.1 Station header mobile (two-line)** — line 1 station name, line 2 meta row. No changes.
- **§7.3–7.6 Bridge/gear/chip mobile layout and general padding** — No changes except §7.6 padding values updated for new location strip class name (see below).
- **§8.1 Print colour rules** — mostly unchanged; two new rows added (see below).
- **§8.2 Directions link on print** — `::after` URL text, `data-lat`/`data-lng` attributes. No changes.
- **§8.5–8.6 Bridge and no-crew labels on print** — No changes.
- **§9 Issues B–H** — Mapbox, missing coords fallback, timeline continuity, mobile-first Tailwind, print stylesheet location, Location & Parking panel, no breaking changes to card body. No changes.
- **§10 Affected files** — No changes.
- **§11 Data model summary** — No changes.
- **§12 Scope boundary** — No changes.

### What has changed (revised in this session)

#### 1. QR layout — spanning sidebar (§5.2, §7.2, §8.3, §8.4, §9 Issues A/A2/A3)

**Old spec:** The location block was a self-contained strip below the station header. It used a two-column flex row internally: directions + notes on the left, QR code (80×80px) on the right.

**New spec (Option D):** The QR code is promoted out of the location strip and into a dedicated sidebar column that spans the full height of both the station header row and the location strip. A new `.station-card-top` CSS grid wrapper (`grid-template-columns: 1fr auto`) surrounds both rows. The left column contains the header and location strip stacked. The right column is the QR sidebar, vertically centred within the combined height.

**Why:** The old layout pushed the location strip taller than necessary — the QR sat below the directions link and notes, adding vertical height. The spanning layout uses horizontal space instead: the QR lives in a narrow right column and doesn't add any height beyond what the header + location strip already occupy. This reduces printed page count and removes visual clutter.

**Key implementation details:**
- New wrapper class: `.station-card-top` with `display: grid; grid-template-columns: 1fr auto`
- Left inner wrapper: `.station-card-left` with `display: flex; flex-direction: column; min-width: 0`
- QR sidebar class: `.qr-sidebar` — `display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 5px; padding: 10px 14px; background: rgba(219,241,250,0.18); border-left: 1px solid rgba(130,199,246,0.3)`
- QR frame: `72×72px` (was `80×80px`)
- QR generation `width`: `72` (was `80`)
- `.station-card-top` is only used when `crewParkingCoords` is set; when not set, the station header renders as before with no wrapper

#### 2. Responsive behaviour at very narrow widths (§7.2)

**Old spec:** At `< 640px`, the QR moved below the notes in a stacked column layout.

**New spec:** The spanning sidebar grid is retained down to 640px with the QR shrinking to `60×60px`. At `< 400px` the QR sidebar is hidden entirely (`display: none`) so the content column fills full width. Crucially, this hide rule must be scoped to `@media screen and (max-width: 400px)` — not a bare `@media (max-width: 400px)` — so it doesn't suppress the QR during printing.

#### 3. Print behaviour (§8.3, §8.4)

**Old spec:** Print rules referred to `.crew-location-block` as a single unit.

**New spec:** The `.station-card-top` grid structure is explicitly preserved on print. Two new colour rules in §8.1 cover the QR sidebar background (`rgba(219,241,250,0.18)` → `#f0f9ff`) and border-left (`rgba(130,199,246,0.3)` → `#82C7F6`). The `< 400px` hide rule must not fire during print (see point 2 above).

#### 4. Condition chips — sunrise and sunset (spec gap closed, no section number yet)

**Gap identified:** PRD-008 specifies sunrise and sunset condition chips, and PRD-010 references them, but neither PRD-022 nor the canonical crew sheet mockup (`crew-travel-v3b-refined.html`) included them in the rendered output. The `crew-layout-options.html` mockup now shows the correct visual treatment for all four chip types (night, sunrise, sunset, weather).

**Action required:** When implementing condition chips on the crew sheet, include sunrise and sunset chips per PRD-008 §2.4 and §2.5. The visual styles are:
- **Sunrise** — `background: linear-gradient(135deg, #1a1035 0%, #4a1a6a 30%, #c2410c 65%, #fbbf24 100%)`, text `#fff8f0`, with a radial glow at the bottom centre
- **Sunset** — `background: linear-gradient(135deg, #fde68a 0%, #fb923c 35%, #9333ea 70%, #4c1d95 100%)`, text `#1e0a3c`
- Trigger logic and content copy per PRD-008 §2.4–2.5 (unchanged)

This is a gap-fill, not a new feature. No data model changes required.

---

## 0. Mandatory Pre-Reading

Before implementing, open and read:
- `docs/specs/mockups/crew-travel-v3b-refined.html` — canonical visual spec for the published crew sheet
- `docs/specs/mockups/crew-parking-setup.html` — canonical visual spec for the Crew tab UI (§4); click through all three states
- **PRD-010** — full crew sheet spec (station cards, timeline, print styles, data model)
- **PRD-019** — mobile breakpoint conventions (`640px` = Tailwind `sm:`)
- **PRD-003** — Ridge Light design system

Where this PRD conflicts with PRD-010, this PRD wins.

---

## 1. Summary

This PRD adds two categories of new capability to the crew sheet:

**A. Location & navigation data per crew station.** Each crew-accessible aid station gains a Google Maps location pin, a parking type classification, and free-text location notes. On the published crew sheet, these render as a directions link, a parking badge, a QR code deeplink to Google Maps, and a visually distinct location notes block.

**B. Segment bridge layout.** Non-crew aid stations are removed as individual cards and replaced by a compact "segment bridge" block between each pair of crew stations. The bridge shows drive time/distance on the left and the runner's intermediate checkpoints on the right. This reduces vertical noise, keeps the crew's focus on action stations, and integrates logistics context directly alongside the runner's journey.

The published sheet is also fully responsive down to mobile viewport widths, and the print stylesheet is upgraded to high-contrast throughout.

---

## 2. Scope

### In scope

- New data fields on crew-accessible sections: `crewParkingCoords`, `crewParkingType`, `crewLocationNotes`
- Admin/runner UI to set these fields (Crew tab)
- Crew sheet published page: location block, parking badge, QR code, segment bridge layout
- Responsive layout: station header wrapping, bridge block stacking, QR sizing at narrow widths
- Print stylesheet upgrade: high-contrast text, borders, and QR visibility

### Out of scope

- Google Calendar events (PRD-010 §10.2 — still deferred)
- Live ETA updates (PRD-010 §10.3 — still deferred)
- Drive time computed in real time from runner's GPS position
- Pacer handoff, weigh-in, or cut-off data per station (data entry problem, separate PRD)

---

## 3. Data Model Changes

Three new optional fields on the **Section** record (DynamoDB):

```ts
crewParkingCoords?: {
  lat: number
  lng: number
}

crewParkingType?: 'parking-lot' | 'side-of-road' | 'trailhead' | 'drop-off'

crewLocationNotes?: string   // free text, max 500 chars
```

These fields are only meaningful when `crewAccess === true`. They are `null` / absent when not set.

Drive time and distance between consecutive crew stations are **not stored** — they are computed at render time from the `crewParkingCoords` values of adjacent crew-accessible sections using the existing Mapbox Directions implementation (see §8).

---

## 4. Runner/Admin UI — Crew Tab

**Reference mockup:** `docs/specs/mockups/crew-parking-setup.html` — open this and click through all three states before implementing.

Each crew-accessible station in the Crew tab gains a new **"Location & Parking"** sub-panel. It renders as a collapsible subsection sitting above the existing Crew Notes subsection, within the expanded station card.

### 4.1 Subsection header

The subsection header row follows the same pattern as other collapsible panels in the app:

```
┌─────────────────────────────────────────────────────────┐
│  📍  Location & Parking          [status]           ▾   │
└─────────────────────────────────────────────────────────┘
```

- **Icon:** 📍
- **Title:** "Location & Parking", 12px, weight 700, `var(--deep-ridge)`
- **Status chip** (right side): shows a summary of what's set, so the runner can see configuration state at a glance without opening the panel:
  - Nothing set → `"Not set"` in muted gray
  - Location + parking type set → `"✓ Set · 🛣 Side of road"` (or whichever type) in green `#15803d`
  - Location set, no parking type → `"✓ Location set"` in green
- **Chevron:** rotates on open/close
- **Default state:** closed (collapsed) on first visit; open if any field has been set

### 4.2 Panel body — three states

#### State A — Empty (nothing set)

The panel opens with a tip banner and all input fields blank.

**Tip banner** (amber, `#fffbeb` bg, `#fde68a` border):
> 💡 Add a location so crew can get directions and a QR code appears on the crew sheet. **Tip:** open Google Maps, find the parking area, and paste the link.

**Google Maps location field:**
- Label: `"GOOGLE MAPS LOCATION"`
- Input + button row: text input (flex-grow) + `"📍 Set"` button (ridge-blue, right-aligned)
- Input placeholder: `"Paste a Google Maps link or enter lat, lng…"`
- Helper text below: `"e.g. https://maps.google.com/?q=41.7442,-111.8413 · or paste a short maps.app.goo.gl link"`
- Accepts: full Google Maps URL (`?q=lat,lng` format) or raw `lat,lng` string. Scope to these two formats in v1 — do not attempt to resolve short `maps.app.goo.gl` links (requires a redirect fetch, deferred).
- On "Set": extract and store `{ lat, lng }`. Transition to State B/C.
- Validation: reject malformed input with inline error beneath the field. Do not clear the input on error.

**Parking type field:**
- Label: `"PARKING TYPE"` with `"(optional)"` suffix in muted style
- 2×2 grid of radio card options. Each card: white bg, `1.5px solid #e2e8f0` border, `border-radius: 8px`, `padding: 9px 12px`. Selected state: `border-color: var(--ridge-blue)`, `background: rgba(219,241,250,0.5)`.
- Custom radio dot (hidden native input, styled dot with inner fill on selection)
- Options:

| Value | Icon | Label | Description |
|---|---|---|---|
| `parking-lot` | 🅿 | Parking lot | Designated lot |
| `side-of-road` | 🛣 | Side of road | Roadside pull-off |
| `trailhead` | 🥾 | Trailhead | Trailhead parking area |
| `drop-off` | 🚗 | Drop-off only | Brief stop, no parking |

- No option selected by default. Field is optional — omitting it means no parking badge on the crew sheet.

**Location notes field:**
- Label: `"LOCATION NOTES"` with `"(optional)"` suffix
- `<textarea>`, min-height 72px, resizable. 500 character limit with live counter (`"0 / 500"`) below right.
- Placeholder: `"e.g. Park in the main lot on 6th Ave. After parking, walk 300 yards north on the trail to the aid station — look for the orange flags."`
- Helper text: `"Shown on the crew sheet below the directions link. Use this for anything the location pin can't convey."`

#### State B — Location set, no notes

Triggered after the runner successfully sets a location.

**Location field** replaces the input row with a confirmation row:
```
┌──────────────────────────────────────────────────────┐
│  📍  Location set    41.8812, -111.6234    [Change]  │
└──────────────────────────────────────────────────────┘
```
- Background: `#f0fdf4` (green tint), border: `1px solid #86efac`, border-radius: 6px
- "Location set" label: `#15803d`, weight 600
- Coordinates: Geist Mono 11px, `#166534`
- "Change" button: small outlined button (`border: 1px solid #86efac`). Clicking reverts to the text input pre-populated with the current coordinates, allowing correction.

**Tip banner** (mist-tinted, `rgba(219,241,250,0.5)` bg, sky border):
> ✓ Location set. Consider adding location notes to help crew find the exact spot once they're parked.

**Crew sheet preview strip** appears at the bottom of the panel once a location is set. It shows a miniature render of exactly what will appear in the location block on the published crew sheet:
- Header: `"👁 Preview — crew sheet"`, Geist Mono 10px uppercase, ridge-blue tint
- Body: directions button mock + any location notes (or italic placeholder if empty) + QR code at 56×56px
- This gives immediate feedback that the QR code is working and the directions link is present, motivating the runner to also fill in notes

#### State C — Fully configured

All fields set. Tip banner is gone. The preview strip shows the complete location block including the location notes with the sky left-border treatment, matching what crew will see on the published sheet.

The subsection header status updates to `"✓ Set · [parking icon] [parking type label]"`.

### 4.3 Save behaviour

All three fields auto-save on blur (consistent with existing Crew tab behaviour). No explicit Save button is needed. Changes take effect on the next crew sheet publish — the runner must re-publish to push updates to crew (per PRD-010 §2.3).

---

## 5. Published Crew Sheet — Station Card Changes

### 5.1 Station header row — parking badge

The parking type badge is added to the existing station header row, between the crew access badge and the ETA:

```
[MILE 43.6]  [Leatham Hollow]  [✓ Crew access]  [🛣 Side of road]  [3:07 PM]
```

**Badge styling** — matches the mile badge treatment (consistent with Ridge Light pill family):
- Font: Geist Mono, 10px
- Background: `rgba(219,241,250,0.7)` (mist tinted)
- Border: `1px solid rgba(130,199,246,0.4)` (sky)
- Border-radius: 5px
- Padding: `3px 8px`
- Color: `var(--deep-ridge)`

**Parking type label and icon mapping:**

| Value | Icon | Label |
|---|---|---|
| `parking-lot` | 🅿 | Parking lot |
| `side-of-road` | 🛣 | Side of road |
| `trailhead` | 🥾 | Trailhead parking |
| `drop-off` | 🚗 | Drop-off only |

If `crewParkingType` is not set, omit the badge entirely.

### 5.2 Location block

Immediately below the station header (and above the existing segment detail / crew content), a new **location block** renders when `crewParkingCoords` is set.

The location block uses a **spanning QR sidebar** layout: the card is split into a left content column and a right QR column. The QR column spans the full height of both the station header row and the location strip — it is a sibling of the entire `[header + location strip]` stack, not just the location strip.

#### Overall structure

```
┌────────────────────────────────────────┬──────────────┐
│  MI 43.6  Leatham Hollow  ✓ Crew  …    │              │
│  (station header row — mist bg)        │  ┌────────┐  │
├────────────────────────────────────────┤  │  [QR]  │  │
│  [📍 Directions to crew parking]       │  │ 72×72px│  │
│  ┌ Location notes ──────────────────┐  │  └────────┘  │
│  │ sky left border · white bg       │  │ Scan for     │
│  └──────────────────────────────────┘  │ directions   │
└────────────────────────────────────────┴──────────────┘
```

**Outer wrapper** — wraps both the station header and the location strip together with the QR column:

```css
.station-card-top {
  display: grid;
  grid-template-columns: 1fr auto;
}
```

- `.station-card-top` replaces the station header `<div>` as the outermost element of the card's top section.
- Left column: `min-width: 0` — contains the station header row on top and the location strip below, stacked naturally.
- Right column (`auto`): the QR sidebar. Present only when `crewParkingCoords` is set; absent (grid collapses) when it is not.

**Station header row** (left column, top):
- Unchanged from §5.1 — `display: flex`, mist background, border-bottom.
- Right padding reduced to `14px` (from `18px`) since the QR column provides visual separation on the right.
- `border-right: 1px solid rgba(130,199,246,0.35)` added to maintain edge against the QR sidebar.

**Location strip** (left column, bottom):
- Background: `rgba(219,241,250,0.25)`.
- Border-bottom: `1px solid rgba(130,199,246,0.25)`.
- Border-right: `1px solid rgba(130,199,246,0.25)`.
- Padding: `9px 0 10px 16px` — no right padding (QR sidebar provides it).
- Contains: directions link on top, location notes block below (if `crewLocationNotes` is set).

**Directions link** (inside location strip):
- Pill button: white background, `1px solid rgba(29,124,190,0.35)` border, `border-radius: 6px`, `padding: 5px 12px`.
- Text: `"📍 Directions to crew parking"`, Geist Sans 11px, weight 600, `var(--ridge-blue)`.
- `href`: `https://maps.google.com/?q={lat},{lng}` — opens Google Maps in a new tab.
- Add `data-lat` and `data-lng` attributes for print rendering (see §8.2).

**Location notes block** (inside location strip, below directions link):
- Renders only when `crewLocationNotes` is non-empty.
- `border-left: 3px solid var(--sky)`, `border-radius: 0 5px 5px 0`, white-tinted background.
- Eyebrow label: `"LOCATION NOTES"` — Geist Mono, 9px, uppercase, sky/ridge-blue tint.
- Body: Geist Sans 12px, `var(--deep-ridge)`, `line-height: 1.5`.
- Visually distinct from crew notes (amber left border, §5.3).

**QR sidebar** (right column, full height):
- `display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 5px`
- Padding: `10px 14px`
- Background: `rgba(219,241,250,0.18)` — slightly lighter than the location strip, no top/bottom border distinction needed since it spans both rows.
- Border-left: `1px solid rgba(130,199,246,0.3)`
- QR frame: `72×72px`, white background, `1.5px solid rgba(130,199,246,0.55)` border, `border-radius: 8px`, `padding: 5px`.
- QR SVG: generated via `qrcode` npm package, `fill="#114574"`, inline SVG. Encodes `https://maps.google.com/?q={lat},{lng}`.
- Caption below QR: `"Scan for directions"`, Geist Mono 8px, `rgba(17,69,116,0.45)`, centered, `width: 72px`.
- Present only when `crewParkingCoords` is set. When absent, `.station-card-top` has a single-column grid (no `auto` column) and the station header and location strip render at full card width.

**When `crewLocationNotes` is not set:** the location strip contains only the directions link (one line). The QR sidebar still spans and vertically centres alongside it — the sidebar height will be shorter, which is fine.

**When neither coords nor notes are set:** the location block is omitted entirely. The card renders exactly as PRD-010 with no `.station-card-top` wrapper.

### 5.3 Crew notes — unchanged

The existing amber-bordered crew notes block (`background: #fffbeb; border-left: 3px solid #fbbf24`) is unchanged. The sky border on location notes and the amber border on crew notes are the visual differentiator between the two note types. Do not alter either.

---

## 6. Published Crew Sheet — Segment Bridge Layout

### 6.1 Overview

Non-crew aid station cards are replaced by a **segment bridge** — a compact two-panel block that appears between every pair of adjacent crew-accessible stations (and between start/first crew station, and last crew station/finish).

The bridge replaces:
- Individual `station-card--no-crew` cards
- Their `timeline-gap` spacers

Each bridge is a single `timeline-row--bridge` grid row (same `44px` dot column + `1fr` content column as other rows). The dot is suppressed; the timeline line passes through uninterrupted.

### 6.2 Bridge block structure

```
┌─ bridge ──────────────────────────────────────────────┐
│  ┌─ Left panel ──────┐  ┌─ Right panel ─────────────┐ │
│  │ 🚗 Drive to       │  │ RUNNER CHECKPOINTS         │ │
│  │ Leatham Hollow    │  │ ● MI 18.4  Beaver Meadows  │ │
│  │ 48 min            │  │            8:52 AM         │ │
│  │ 31 mi             │  │ ● MI 30.7  Logan River     │ │
│  └───────────────────┘  │            12:14 PM        │ │
│                          └────────────────────────────┘ │
└───────────────────────────────────────────────────────┘
```

**Outer container:**
- `border: 1px solid rgba(130,199,246,0.28)`, `border-radius: 8px`, `overflow: hidden`
- Background: `#f7fafd`
- `display: flex`

**Left panel (drive info):**
- `min-width: 152px`, `flex-shrink: 0`
- `border-right: 1px solid rgba(130,199,246,0.25)`
- Background: `rgba(219,241,250,0.3)` (mist tint)
- Padding: `10px 14px`
- Content:
  - Eyebrow: `"🚗 Drive to"` — Geist Mono, 9px, uppercase, `rgba(17,69,116,0.45)`
  - Destination name: DM Sans, 12px, weight 700, `var(--deep-ridge)`
  - Drive time: DM Sans, 15px, weight 800, `var(--ridge-blue)`, `letter-spacing: -0.02em`
  - Distance: Geist Mono, 10px, `rgba(17,69,116,0.45)`

**Right panel (runner checkpoints):**
- `flex: 1`, padding `10px 14px`
- Eyebrow: `"RUNNER CHECKPOINTS"` — Geist Mono, 9px, uppercase, `rgba(17,69,116,0.38)`
- One row per non-crew station between these two crew stops:
  - Small dot (5px, sky-tinted)
  - Mile badge: same pill style as station header (Geist Mono, 10px, mist bg, sky border, 4px radius, `padding: 1px 6px`)
  - Station name: Geist Sans, 11px, weight 600, `rgba(17,69,116,0.65)`
  - ETA: Geist Mono, 10px, `rgba(29,124,190,0.6)`, right-aligned

**If there are no intermediate stations** between two consecutive crew stops, the right panel shows a single line: `"No intermediate checkpoints"` in the eyebrow style.

**If `crewParkingCoords` is not set** for the destination crew station, the drive time/distance fields show `"—"` rather than fabricating data. Drive data requires coords on both ends of the segment.

### 6.3 Drive time data source

Drive time and distance are fetched from **Mapbox Directions API** at page render time (server component), not stored in the database.

- Call: `GET https://api.mapbox.com/directions/v5/mapbox/driving/{originLng},{originLat};{destLng},{destLat}?access_token=...`
- Parse: `routes[0].duration` and `routes[0].distance`, then format to display strings in-app (for example `48 min`, `31.0 mi`)
- Cache: cache the result per `(origin, destination)` pair for 24 hours via Next.js `fetch` revalidation. Drive times between aid stations do not change often enough to justify a shorter TTL.
- Fallback: if the API call fails or coords are missing for either end, render `"—"` for both time and distance. Do not show an error state on the page.
- API token: use the existing `NEXT_PUBLIC_MAPBOX_TOKEN` server-side. No additional Google Directions key is required for bridge drive data.

---

## 7. Responsive Design

The crew sheet must be fully usable at all viewport widths from `320px` to desktop. Use Tailwind mobile-first conventions. Breakpoints follow PRD-019: `640px` = `sm:`.

### 7.1 Station header — two-line mobile layout

At `< 640px`, the station header row wraps to two lines, matching PRD-019 §3.2 conventions:

**Line 1 — Station name (full width):**
- Station name, DM Sans 16px weight 700, never truncated

**Line 2 — Meta row:**
- Mile badge (left) · crew badge · parking badge (center-left) · ETA (right)
- `display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 4px`

```
┌───────────────────────────────────┐
│ LEATHAM HOLLOW                    │  ← Line 1
│ MI 43.6  ✓ Crew  🛣 Side of road  3:07 PM │  ← Line 2
└───────────────────────────────────┘
```

Desktop (`≥ 640px`): single-row layout as shown in §5.1, unchanged.

### 7.2 Location block — mobile layout

At `< 640px`, the spanning QR sidebar layout is **retained** — the grid structure stays. However the QR sidebar narrows:

- QR frame reduces to `60×60px` (from `72×72px`)
- QR sidebar padding reduces to `8px 10px`
- Caption font drops to `7px`

The sidebar continues to span header + location strip. The header two-line layout from §7.1 applies to the left column as normal.

```
┌──────────────────────────┬──────────┐
│ LEATHAM HOLLOW           │          │
│ MI 43.6  ✓ Crew  3:07PM  │  [QR]   │
├──────────────────────────┤  60×60   │
│ [📍 Directions]          │          │
│ ┌ Location notes ──────┐ │  Scan   │
│ └──────────────────────┘ │          │
└──────────────────────────┴──────────┘
```

At `< 400px` (very narrow phones), the QR sidebar is **hidden** (`display: none`) and the station header and location strip expand to full card width. At this width the QR is unlikely to be scannable and the directions button is more useful. The `data-lat`/`data-lng` print fallback on the directions link still works if printed from a narrow device.

### 7.3 Segment bridge — stacked mobile layout

At `< 640px`, the two-panel bridge stacks vertically (drive panel on top, runner checkpoints below):

```
┌─────────────────────────────────┐
│ 🚗 Drive to Leatham Hollow      │
│ 48 min · 31 mi                  │
├─────────────────────────────────┤
│ RUNNER CHECKPOINTS              │
│ ● MI 18.4  Beaver Meadows  8:52 │
│ ● MI 30.7  Logan River  12:14   │
└─────────────────────────────────┘
```

Drive panel loses its right border; a bottom border divides the two sections instead. Both panels expand to full width.

### 7.4 Gear pills — unchanged

Gear pills already `flex-wrap` and work fine on mobile. No change.

### 7.5 Condition chips — unchanged

Condition chips already `flex-wrap`. No change.

### 7.6 General padding reduction on mobile

At `< 640px`:
- `.station-list` padding: `20px 16px` (from `32px 40px`)
- `.station-header` padding: `12px 14px` (from `14px 18px`)
- `.segment-detail` padding: `12px 14px 14px` (from `16px 18px`)
- `.location-strip` padding: `8px 0 9px 12px` (from `9px 0 10px 16px`)
- `.qr-sidebar` padding: `8px 10px` (from `10px 14px`); hidden entirely at `< 400px`

---

## 8. Print Stylesheet Upgrade

The existing `@media print` block (PRD-010 §9) is extended. All soft/low-opacity colors are replaced with high-contrast equivalents. The goal: every element on the printed page is legible at standard laser printer quality on white paper.

### 8.1 Color rules for print

| Element | Screen value | Print value |
|---|---|---|
| Mile badge background | `rgba(219,241,250,0.7)` | `#e8f4fb` (solid) |
| Mile badge border | `rgba(130,199,246,0.4)` | `#82C7F6` (solid) |
| Mile badge text | `var(--midnight)` | `#02071E` (no change) |
| "No crew access" label | `rgba(17,69,116,0.4) italic` | `#114574` weight 500, no italic |
| Timeline line | `rgba(130,199,246,0.55)` | `#82C7F6` (solid) |
| Segment bridge border | `rgba(130,199,246,0.28)` | `#82C7F6` |
| Bridge left panel bg | `rgba(219,241,250,0.3)` | `#e8f4fb` (solid) |
| Bridge drive eyebrow | `rgba(17,69,116,0.45)` | `#114574` |
| Bridge destination text | `var(--deep-ridge)` | `#114574` |
| Bridge drive time | `var(--ridge-blue)` | `#1D7CBE` |
| Bridge runner eyebrow | `rgba(17,69,116,0.38)` | `#114574` |
| Runner checkpoint name | `rgba(17,69,116,0.65)` | `#114574` |
| Runner checkpoint ETA | `rgba(29,124,190,0.6)` | `#1D7CBE` |
| Location strip bg | `rgba(219,241,250,0.25)` | `#f0f9ff` (solid) |
| QR sidebar bg | `rgba(219,241,250,0.18)` | `#f0f9ff` (solid) |
| QR sidebar border-left | `rgba(130,199,246,0.3)` | `#82C7F6` (solid) |
| Location notes eyebrow | `var(--ridge-blue) opacity 0.75` | `#1D7CBE` |
| Location notes text | `var(--deep-ridge)` | `#114574` |
| Baggie items text | `var(--deep-ridge)` | `#114574` |
| Baggie kcal text | `rgba(17,69,116,0.5)` | `#114574` |
| Parking badge text | `var(--deep-ridge)` | `#114574` |
| Parking badge bg | `rgba(219,241,250,0.6)` | `#e8f4fb` |
| Crew-access card left border | `4px solid var(--ridge-blue)` | `4px solid #1D7CBE` |

### 8.2 Directions link on print

The `[📍 Directions to crew parking]` pill button is not clickable on paper. On print:

```css
@media print {
  .maps-link::after {
    content: " — maps.google.com/?q=" attr(data-lat) "," attr(data-lng);
    font-size: 9px;
    color: #114574;
    font-weight: 400;
  }
  .maps-link {
    background: transparent !important;
    border: none !important;
    padding: 0 !important;
    color: #1D7CBE !important;
    font-size: 10px !important;
  }
}
```

Add `data-lat` and `data-lng` attributes to the `.maps-link` anchor at render time.

### 8.3 QR code on print

The QR SVG renders as-is on print — SVGs print at full resolution on laser printers. The spanning sidebar layout is preserved on print; the QR column stays to the right of the header and location strip exactly as on screen.

Ensure:
- `print-color-adjust: exact` on `.qr-sidebar` and `.qr-frame`
- QR SVG uses `fill="#114574"` (deep ridge, solid) — not opacity values which may wash out on laser printers
- `.qr-sidebar` background prints as `#f0f9ff` (solid, per §8.1)
- The QR is **never hidden** on print, even at narrow viewport widths (the `< 400px` hide rule must be `@media screen and (max-width: 400px)`, not a bare `@media (max-width: 400px)`, so it does not apply during printing)

### 8.4 Location block on print

The `.station-card-top` grid structure is preserved on print. The location strip renders with solid `#f0f9ff` background and `1px solid #82C7F6` border-bottom. The sky left border on location notes prints as `3px solid #82C7F6`. The QR sidebar border-left prints as `1px solid #82C7F6`.

### 8.5 Segment bridge on print

Bridges should `break-inside: avoid` (same as station cards). The mist-tinted drive panel prints with solid `#e8f4fb` background (`print-color-adjust: exact`).

### 8.6 No-crew labels — removed from print

Non-crew stations no longer exist as cards on the page (replaced by bridge blocks). The bridge's runner checkpoint rows must print at full contrast per §8.1.

---

## 9. Implementation Notes for Dev Agent

**Issue A — QR code library**
Use `qrcode` npm package. Generate server-side in the page component as an SVG string:
```ts
import QRCode from 'qrcode'
const qrSvg = await QRCode.toString(mapsUrl, {
  type: 'svg',
  color: { dark: '#114574', light: '#ffffff' },
  margin: 1,
  width: 72
})
```
Inline the resulting SVG directly into the HTML. Do not use an `<img>` tag with a data URL — inline SVG prints correctly and requires no external requests.

**Issue A2 — Spanning QR sidebar markup structure**
The `.station-card-top` grid wrapper must surround both the station header row and the location strip. The QR sidebar is the second grid column and spans both rows naturally via CSS grid's `align-items: stretch` default. Sketch of the DOM structure:
```tsx
<div className="station-card-top"> {/* grid: 1fr auto */}
  <div className="station-card-left"> {/* min-w-0, flex-col */}
    <div className="station-header"> … </div>      {/* mist bg */}
    <div className="location-strip"> … </div>      {/* directions + notes */}
  </div>
  {crewParkingCoords && (
    <div className="qr-sidebar"> {/* flex-col, center, full height */}
      <div className="qr-frame"> {/* 72×72 */}
        <div dangerouslySetInnerHTML={{ __html: qrSvg }} />
      </div>
      <span className="qr-caption">Scan for directions</span>
    </div>
  )}
</div>
```
The `station-card-left` flex column stretches to fill the grid row height automatically. The `qr-sidebar` also stretches to fill, so `justify-content: center` vertically centres the QR within whatever height the left column produces.

**Issue A3 — Print media query scope for QR hide**
The `< 400px` hide rule for the QR sidebar must use `@media screen and (max-width: 400px)` — not a bare `@media (max-width: 400px)` — so that it is skipped during `@media print`. Printing from a narrow phone viewport must still produce the QR column.

**Issue B — Mapbox Directions API**
Use the existing `NEXT_PUBLIC_MAPBOX_TOKEN` in the server component when fetching drive segments. No additional Google Directions API setup is required for the bridge blocks. Crew-facing links and QR codes should still point to Google Maps URLs.

Drive segment data should be fetched for all crew-station pairs in a single pass before rendering, not per-card. Pseudocode:
```ts
const crewStations = sections.filter(s => s.crewAccess && s.crewParkingCoords)
const driveSegments = await Promise.all(
  crewStations.slice(0, -1).map((s, i) =>
    getDriveSegment(s.crewParkingCoords, crewStations[i + 1].crewParkingCoords)
  )
)
```

**Issue C — Drive data when coords missing**
If either station in a pair lacks `crewParkingCoords`, skip the API call and return `null` for that segment. The bridge renders `"—"` for time and distance. Do not throw or show an error.

**Issue D — Segment bridge timeline continuity**
The `.station-list::before` pseudo-element draws the continuous vertical line. The bridge row must not interrupt this line. The bridge's dot column (`44px`) contains no dot element — the line passes straight through. Ensure the bridge row height is consistent so the line doesn't jump.

**Issue E — Mobile-first Tailwind structure**
Use mobile-first base styles for the two-line station header and stacked bridge/location block, then override at `sm:` for desktop. Do not duplicate markup for the two layouts.

**Issue F — Print stylesheet location**
Per PRD-010 §13 Issue E convention, all print styles are in a `<style>` block co-located in the page component, not in `globals.css`.

**Issue G — Location & Parking panel in Crew tab**
The new Location & Parking panel is a collapsible subsection added above the Crew Notes subsection within each crew-accessible station card. See `docs/specs/mockups/crew-parking-setup.html` for the full interactive mockup with all three states (empty, location set, fully configured). Use the same auto-save-on-blur pattern as other Crew tab fields. The panel header status chip should update reactively as fields are filled — do not require a page reload or explicit save to see the status change.

**Issue H — No breaking changes to PRD-010 card body**
The segment detail block (gear pills, baggies, crew notes, conditions) is unchanged. The location block is inserted between the station header and the existing `segment-detail` div.

---

## 10. Affected Files

| File | Change |
|---|---|
| `src/app/crew/[token]/page.tsx` | Add location block, QR, bridge layout, responsive classes, print styles |
| `src/lib/data/sections.ts` | Add `crewParkingCoords`, `crewParkingType`, `crewLocationNotes` to Section type and read/write |
| `src/lib/maps.ts` (new) | `getDriveSegment(origin, dest)` — Mapbox Directions API call + cache |
| `src/app/(app)/race/[id]/crew/page.tsx` (or equivalent) | Add Location & Parking panel to Crew tab UI (see `docs/specs/mockups/crew-parking-setup.html`) |
| DynamoDB section schema | Add 3 new optional attributes |

---

## 11. Data Model Summary

```ts
// Additions to Section type
interface Section {
  // ... existing fields ...

  // New in PRD-022
  crewParkingCoords?: { lat: number; lng: number }
  crewParkingType?:   'parking-lot' | 'side-of-road' | 'trailhead' | 'drop-off'
  crewLocationNotes?: string
}
```

No GSI changes required. These are attributes on existing Section items.

---

## 12. Scope Boundary

| In scope | Out of scope |
|---|---|
| `crewParkingCoords`, `crewParkingType`, `crewLocationNotes` fields | Cut-off times, pacer pickup, weigh-in data |
| Directions link + QR per crew station | Embedded map preview in crew sheet |
| Segment bridge (non-crew stations collapsed) | Live ETA recalculation |
| Drive time/distance via Mapbox Directions API | Runner GPS tracking |
| Responsive layout down to 320px | Crew-only native app view |
| High-contrast print stylesheet | PDF generation server-side |
| Parking type badge in station header | Calendar event generation (PRD-010 §10.2) |
