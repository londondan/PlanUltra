# PRD-024 — Race Library Enhancements: Aid Station Config, GPX Re-ingestion, Confirm Dialog, Sort Order

**Status:** Draft
**Date:** 2026-03-31
**Extends:** PRD-012 (Admin Screen — Race Library Management)
**Pre-reading:** PRD-012, PRD-022 (crew parking coords data model), PRD-003 (Ridge Light design system)

---

## 0. Mandatory Pre-Reading

Before implementing, read:
- **PRD-012** — full admin race library spec: data model, routes, `AdminRaceForm`, `LIBRARY_USER_ID`, `isAdmin()` pattern
- **PRD-022 §3** — `crewParkingCoords`, `crewParkingType`, `crewLocationNotes` fields on the Section record (these are the same fields used for aid station location data)
- **PRD-003** — Ridge Light design system
- `src/app/(app)/dashboard/new/page.tsx` — current user-facing race picker ("Race Library" tab) to understand the UI being changed in §4 of this PRD
- `src/lib/db/sections.ts` — Section record structure and query patterns
- `src/data/curated-races/index.ts` — static `CURATED_RACES` array (to be retired per PRD-012 §10.4)

Where this PRD conflicts with PRD-012, **this PRD wins**.

---

## 1. Summary

This PRD covers four changes, all self-contained:

| # | Change | Scope |
|---|---|---|
| 1 | **Aid station config in admin** | Admin add/edit form gains a post-GPX-upload step to configure aid station locations (parking coords, type, notes) |
| 2 | **GPX re-ingestion on edit** | Admin edit form allows replacing the GPX file, which re-ingests aid stations while preserving existing location config where possible |
| 3 | **Confirm dialog on race select** | Clicking a race in the user-facing library picker opens a confirmation dialog instead of silently loading a bottom widget |
| 4 | **Sort by race date** | The user-facing library list is sorted earliest-to-latest by race date |

---

## 2. Aid Station Configuration in Admin Add/Edit (§6 extension)

### 2.1 Overview

After a GPX file is uploaded and processed during add/edit, the admin form gains a new collapsible **"Aid Stations"** section. This lets the admin configure `crewParkingCoords`, `crewParkingType`, and `crewLocationNotes` for each aid station in the library race — so that when a user copies this race, their crew sheet already has location data pre-populated.

These are the same three fields defined in PRD-022 §3 on the Section record. No new data model fields are needed.

### 2.2 When the section appears

The Aid Stations section is only shown after a GPX file has been successfully uploaded and processed (i.e., section records exist for this race). It does not appear on a blank new-race form before GPX upload.

For the **add flow**: the form submission creates the race and sections first, then redirects to the edit screen, where the Aid Stations panel is available. Alternatively, a two-step in-page flow (upload → configure) is acceptable — see §2.5 for the UX note on this.

For the **edit flow**: the Aid Stations section is always visible if sections exist.

### 2.3 Aid station list layout

The Aid Stations section renders as a collapsible panel below the existing form fields, above the Save button.

```
┌─────────────────────────────────────────────────────────────┐
│  Aid Stations                                    [▾ expand] │
├─────────────────────────────────────────────────────────────┤
│  ┌─────────────────────────────────────────────────────┐   │
│  │  MI 0.0  Start / Finish           [crewAccess: ✓]   │   │
│  │  No location set                  [+ Set location]  │   │
│  └─────────────────────────────────────────────────────┘   │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  MI 5.7  Lick Run Aid Station     [crewAccess: —]   │   │
│  │  No crew access — skip            (no action)       │   │
│  └─────────────────────────────────────────────────────┘   │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  MI 32.9  North River Gap         [crewAccess: ✓]   │   │
│  │  🥾 Trailhead · 38.3646, -79.16292                  │   │
│  │  "Walking access is 300m..."      [Edit]            │   │
│  └─────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

**One row per section**, sorted by mile ascending. Each row shows:
- Mile badge + station name (read-only)
- Crew access indicator — `✓ Crew` (green chip) or `—` (muted, no chip)
- Location status — one of:
  - `"No location set"` + `[+ Set location]` button — if `crewAccess` and no coords set
  - Parking type icon + coords + truncated notes + `[Edit]` — if coords set
  - `"No crew access — skip"` (muted italic) — if `crewAccess === false`; no action available

Non-crew-accessible sections are shown collapsed (station name + "No crew access" label only) with no location controls.

### 2.4 Location editor per station

Clicking `[+ Set location]` or `[Edit]` opens an inline expansion of that station row (not a modal). The inline editor matches the Crew tab Location & Parking panel spec from PRD-022 §4.2, with the same three states (empty → location set → fully configured). Reuse that component directly — `<LocationParkingPanel>` or equivalent — passing the section's existing field values as initial state.

**Fields:**
- Google Maps location (paste URL or lat,lng) → extracts `crewParkingCoords`
- Parking type radio cards (`parking-lot`, `side-of-road`, `trailhead`, `drop-off`)
- Location notes textarea (max 500 chars)

**Save behaviour:** Unlike the Crew tab (which auto-saves on blur), the admin form saves all aid station location data as part of the main form Save action. Location edits within the panel are held in local state. A `[Done]` button collapses the panel and returns to the row summary view. Nothing is persisted until the admin clicks "Save to library" / "Save changes".

This avoids partial saves and is consistent with typical admin form conventions.

### 2.5 Add flow UX note

The cleanest add experience is a two-step in-page flow rather than a redirect:

**Step 1:** Admin fills in race metadata + uploads GPX → clicks "Upload & continue" → GPX is processed, sections created → form transitions to show the Aid Stations panel (still on the same page, no navigation).

**Step 2:** Admin configures aid station locations → clicks "Save to library" → race is fully saved.

If a two-step in-page flow is complex to implement, the redirect approach (Step 1 saves the race, redirects to edit, Step 2 happens on edit) is acceptable as a fallback. The redirect approach must show a clear success/continuation message: e.g. a banner reading "Race created. Now set aid station locations below." at the top of the edit page.

### 2.6 Data persistence

Aid station location fields (`crewParkingCoords`, `crewParkingType`, `crewLocationNotes`) are saved to the Section records via the existing `updateSection` / `putSection` functions. No new API routes are needed — the admin edit `PUT /api/admin/races/[raceId]` endpoint should accept a `sections` array in its body with partial section updates (coords, type, notes only — not full section rebuilds).

```ts
// PUT /api/admin/races/[raceId] body shape
{
  // existing race fields...
  name: string,
  date: string,
  // ...

  // new: partial section updates
  sectionUpdates?: Array<{
    sectionId: string
    crewParkingCoords?: { lat: number; lng: number }
    crewParkingType?: 'parking-lot' | 'side-of-road' | 'trailhead' | 'drop-off'
    crewLocationNotes?: string
  }>
}
```

The server applies each `sectionUpdate` as a partial merge (`UpdateExpression`) on the relevant Section record. Unknown `sectionId` values are silently skipped.

---

## 3. GPX Re-ingestion on Edit

### 3.1 Scope

**This feature is admin-only.** GPX re-ingestion applies exclusively to library races managed through `/admin/race-library/[raceId]/edit`. It does not apply to user-owned races — users cannot replace the GPX on a race they have created or copied from the library. User races are personal plans; the admin library is a curated template set that the admin maintains.

The `PUT /api/admin/races/[raceId]` endpoint handles re-ingestion. The user-facing `PUT /api/races/[raceId]` endpoint is not modified by this PRD.

### 3.2 Problem

Currently there is no way to replace a library race's GPX once it has been uploaded. If the route changes year-to-year, or if a better GPX file becomes available, the admin has no recourse short of deleting and re-creating the race.

### 3.3 Re-upload control

On the admin edit form (`/admin/race-library/[raceId]/edit`), the GPX field changes from a read-only display to include a **"Replace GPX"** control:

```
┌───────────────────────────────────────────────────────┐
│  GPX file                                             │
│  ✓ route-western-states.gpx (uploaded 2026-03-20)     │
│                               [Replace GPX file ↑]    │
└───────────────────────────────────────────────────────┘
```

The `[Replace GPX file ↑]` button is a secondary/outlined button (not primary — it's a destructive-adjacent action). Clicking it opens the file picker.

### 3.4 Re-ingestion behaviour

When a new GPX is selected and the admin saves the library race:

1. The new GPX is parsed and a fresh set of aid stations is derived (same ingestion logic as the initial library race upload).
2. **Matching logic:** The system attempts to match new sections to existing sections by name (case-insensitive, trimmed). For each matched pair, any existing `crewParkingCoords`, `crewParkingType`, and `crewLocationNotes` values are preserved on the new section record.
3. **Unmatched existing sections** (stations that no longer appear in the new GPX) are deleted from the library race.
4. **Unmatched new sections** (stations that didn't exist in the old GPX) are created with no location data.
5. The old GPX data is replaced in full. Mile markers, ETA calculations, and all section content (gear, notes, baggies) from the old library version are discarded — only location data is carried forward.

This operation affects only the library race record (`userId = LIBRARY_USER_ID`). User races that were previously copied from this library race are **not affected** — they are independent copies and remain unchanged.

### 3.5 Confirmation before re-ingestion

Replacing the GPX is destructive (existing section content other than location data is lost). Before saving a form that includes a new GPX, show a confirmation dialog:

```
┌──────────────────────────────────────────────────────┐
│  Replace GPX file?                                   │
│                                                      │
│  Uploading a new GPX will replace all aid stations   │
│  for this race in the library. Location data         │
│  (parking coords and notes) will be preserved where  │
│  station names match. All other section data will    │
│  be reset.                                           │
│                                                      │
│  User races already copied from this template are    │
│  not affected.                                       │
│                                                      │
│  [Cancel]                    [Replace and save]      │
└──────────────────────────────────────────────────────┘
```

"Replace and save" proceeds with the save. "Cancel" dismisses the dialog and reverts to the existing GPX (the file picker selection is discarded).

### 3.6 Post-save feedback

After a successful GPX replacement, the edit page reloads with:
- A success banner: `"GPX replaced. N aid stations re-ingested. Check location data below."`
- The Aid Stations panel (§2) is scrolled into view and expanded by default, prompting the admin to verify/update location data for any new stations.

---

## 4. Confirm Dialog on Race Select (User-Facing Picker)

### 4.1 Problem

The current flow on `src/app/(app)/dashboard/new/page.tsx`: clicking a race in the "Race Library" tab silently loads a details widget at the bottom of the page. Users do not scroll down to see it and miss the confirmation step — the race gets added without the user realising what happened, or the user does not see how to proceed.

### 4.2 New flow

Clicking a library race card opens a **confirmation dialog** immediately. The bottom widget is removed entirely.

```
┌─────────────────────────────────────────────────────────┐
│  Add this race to your dashboard?                       │
│                                                         │
│  Western States 100                                     │
│  100.2 mi · Olympic Valley → Auburn, CA                 │
│  Typical start: 5:00 AM · June                         │
│                                                         │
│  "A point-to-point 100-miler through the Sierra        │
│   Nevada from Squaw Valley to Auburn. One of the       │
│   most competitive 100s in the world."                  │
│                                                         │
│  Your race date                                         │
│  [────────────── date picker ──────────────]            │
│                                                         │
│  Your start time          Your timezone                 │
│  [── time ──]             [── timezone ──]              │
│                                                         │
│  [Cancel]                 [Add to dashboard →]          │
└─────────────────────────────────────────────────────────┘
```

**Dialog content:**
- **Heading:** `"Add this race to your dashboard?"`
- **Race name** — DM Sans, 18px, weight 800, Midnight
- **Race meta** — distance · location — Geist Sans 13px, Deep Ridge 60% opacity
- **Typical start** — Geist Sans 13px, Deep Ridge 60% opacity. Shown as a hint, not the user's actual start time.
- **Description** — `libraryDescription` field from the Race record (max 160 chars). Geist Sans 14px, line-height 1.6. Omitted if empty.
- **Date picker** — required. Label: `"Your race date"`. Standard date input, Geist Sans 14px. Pre-populated with the library race's `date` field as a hint, but editable (the library date is this year's race date; the user may be running next year's).
- **Start time** — required. Label: `"Your start time"`. Pre-populated from the library race's `startTime` field.
- **Timezone** — required. Uses the existing timezone dropdown component (PRD-013). Pre-populated from the library race's `timezone` field.
- **Cancel** — dismisses the dialog, no action.
- **"Add to dashboard →"** — primary Ridge Blue button. Disabled until date, startTime, and timezone are all set. On click, calls `POST /api/races/from-library` (PRD-012 §10.2) and redirects to `/dashboard/[newRaceId]/setup` on success.

### 4.3 Dialog component

Use the existing shadcn/Base UI `Dialog` component (same as the delete confirmation in PRD-012 §7). The dialog should be `max-width: 480px`, centred, with standard Ridge Light card styling inside.

### 4.4 Loading and error states

- While `POST /api/races/from-library` is in flight, the "Add to dashboard" button shows a spinner and is disabled. The cancel button is also disabled to prevent double-submission.
- On API error, show an inline error message below the buttons: `"Something went wrong. Please try again."` The dialog stays open.
- On success, the dialog closes and the redirect fires. No success toast needed — the redirect to setup is confirmation enough.

### 4.5 Remove the bottom widget

The existing bottom-of-page race details widget on the new-race page is removed. The confirmation dialog replaces its function entirely. Clean up any associated state (`selectedRace`, scroll-into-view logic, etc.).

---

## 5. Sort Race Library by Race Date (User-Facing Picker)

### 5.1 Current behaviour

The user-facing race library list (the "Race Library" tab on `src/app/(app)/dashboard/new/page.tsx`) is currently fetched from `GET /api/library/races` and rendered in whatever order the API returns — likely insertion order from DynamoDB.

### 5.2 Required behaviour

The library list must be sorted **ascending by race date** (earliest first). This is the most useful order for a runner browsing for their upcoming race — they can scan top-to-bottom and find races happening soon.

**Sort key:** the `date` field on the Race record (ISO 8601 date string, `YYYY-MM-DD`). Standard string comparison is sufficient since the format is consistent.

**Where to sort:** sort in the `GET /api/library/races` API handler after fetching from DynamoDB, before returning the response. Do not rely on DynamoDB's scan order.

```ts
races.sort((a, b) => a.date.localeCompare(b.date))
```

### 5.3 Admin list sort

The admin race library list (`/admin/race-library`, PRD-012 §5.1) already specifies "sorted by race date ascending" — this PRD confirms that requirement and applies the same sort to the user-facing API. Both lists use the same sort order.

---

## 6. Implementation Notes for Dev Agent

**Issue A — Aid station config reuses PRD-022 components**
The `<LocationParkingPanel>` component built for PRD-022 §4 (Crew tab) should be reused directly in the admin Aid Stations section. Pass `initialValues` from the section's existing fields. The only behavioural difference is save timing: in the Crew tab, save on blur; in admin, hold in local state and save with the form. Thread an `onChange` prop rather than wiring up a separate auto-save hook.

**Issue B — `sectionUpdates` payload on PUT**
The existing `PUT /api/admin/races/[raceId]` handler likely only handles Race-level fields. Extend it to accept and apply `sectionUpdates` (§2.6). Each update should use DynamoDB's `UpdateExpression` to patch only the three location fields — do not overwrite the full section record, as this would lose gear, notes, and baggies data.

**Issue C — GPX re-ingestion matching is name-based**
Station names from GPX files are typically reliable across years for established races (aid station names don't change). Normalise before comparing: trim whitespace, lowercase, collapse multiple spaces. If a name match is ambiguous (duplicate names in the same race), prefer the match with the closest mile marker.

**Issue D — Re-ingestion is library-only; do not touch user race routes**
Re-ingestion logic lives exclusively in `PUT /api/admin/races/[raceId]`, which is gated by `isAdmin()`. The user-facing `PUT /api/races/[raceId]` route is not modified. Do not add a GPX replace control to any user-facing race edit UI — users manage their own race details through the existing plan setup flow, not by swapping GPX files.

**Issue D2 — Re-ingestion atomicity**
Re-ingestion modifies section records for the library race only. Use the same try/catch-with-rollback pattern as PRD-012 Issue F — if any section write fails mid-re-ingestion, restore the original sections and return a 500 with a clear error message. Do not leave the library race in a partial state. User-owned copies are never touched regardless of outcome.

**Issue E — Confirm dialog date pre-population**
The library race's `date` field represents the canonical race date (likely this year's or the most recently entered date). Pre-populate the date picker with this value, but show a hint label beneath it: `"This is the library race date — update it if your race is on a different date."` This reduces confusion for users who are planning for a future year's event.

**Issue F — Removing the bottom widget**
Search for the component or state variable that renders the bottom race detail widget on the new-race page. Remove the `selectedRace` state, the scroll-to ref, and the widget render block. Ensure the race card click handler is updated to open the dialog instead.

**Issue G — Sort in API, not client**
Apply the date sort in `GET /api/library/races` server-side. Do not sort on the client — the API response should already be in the correct order so any future server-side rendering or caching of the response is consistent.

---

## 7. Out of Scope

- **GPX replacement for user-owned races** — users cannot swap GPX files on their own races. Re-ingestion is an admin-only library maintenance tool. Any future user-facing route editing is a separate PRD.
- Searching or filtering the race library — deferred, noted in the original brief as a later lifecycle item.
- Admin ability to configure non-location section data (gear, baggies, crew notes) through a dedicated UI — admins can use the existing plan-building UI for this as described in PRD-012 Issue D.
- Displaying a map preview of aid station locations in the admin UI.
- User ability to edit aid station location data during the from-library copy flow — they can edit it post-creation via the Crew tab.
- Propagating admin library edits to user races that were previously copied — user copies are independent and are never mutated by admin actions.
- Pagination of the race library list — not needed at current library scale (≤25 races).

---

## 8. Affected Files

| File | Change |
|---|---|
| `src/app/(app)/admin/race-library/new/page.tsx` | Two-step flow or redirect-to-edit after GPX upload |
| `src/app/(app)/admin/race-library/[raceId]/edit/page.tsx` | Add Aid Stations panel; add Replace GPX control + confirmation dialog |
| `src/app/api/admin/races/[raceId]/route.ts` | Accept `sectionUpdates` in PUT body; handle GPX re-ingestion |
| `src/app/(app)/dashboard/new/page.tsx` | Remove bottom widget; open confirm dialog on race card click; remove `selectedRace` state |
| `src/app/api/library/races/route.ts` | Sort results by `date` ascending before returning |
| `src/components/admin/LocationParkingPanel.tsx` (or equivalent) | Add `onChange` prop for controlled/deferred-save use in admin context |
