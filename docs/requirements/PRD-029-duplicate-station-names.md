# PRD-029 — Duplicate Aid Station Disambiguation

**Status:** Draft
**Date:** 2026-04-23
**Amends:** PRD-010 (Crew Sheet) §6.1, §6.2; PRD-019 (Crew Sheet Mobile) §2
**Related:** PRD-027 (Race Data Model), `specs/database.md`

---

## 0. Mandatory Pre-Reading

Before implementing, read:
- **PRD-010** — Crew Sheet spec (station card layout, §6.1 and §6.2)
- **PRD-019** — Mobile station card layout
- **PRD-027 §2.2** — AidStation Race Facts field list (`name`, `physicalName`)
- **`specs/database.md`** — AidStation record shape

Where this PRD conflicts with PRD-010 or PRD-019, **this PRD wins** for station name display logic.

---

## 1. Summary

Some ultramarathon courses visit the same physical location more than once. Common patterns:

- **Out-and-back legs:** "Twin Lakes Outbound" and "Twin Lakes Inbound" — same aid station, two visits separated by many miles (e.g. Leadville 100: Twin Lakes at mile ~39 and ~60).
- **Loop courses:** A central start/finish aid station that the runner passes through multiple times.
- **Multi-lap races:** The same aid station appears every lap.

When two or more crew sheet cards carry identical station names, crew members cannot tell which visit they are looking at — especially under stress and on a small phone screen. Scott (a runner who used PlanUltra in a recent race) reported this as a real pain point: identical names made it hard to know whether they'd already passed a station.

This PRD defines how PlanUltra detects duplicate station names and how it labels them to make each visit unambiguous.

---

## 2. Problem Statement

### 2.1 Current behaviour

The crew sheet renders station names as-is from the `name` field on the AidStation record. If two stations share the same `name`, the crew sheet shows two cards with identical headers — no visual distinction beyond mileage.

### 2.2 Why mileage alone isn't enough

The mile marker is present in both cards (e.g. "MILE 39.4" and "MILE 60.2"). However:

- Crew members scanning quickly often anchor on the station name, not the mile number.
- On a printed crew sheet, page breaks can separate the two cards — a crew member may not have both in view simultaneously.
- At a noisy, chaotic aid station, crew may glance at a card name and assume it's the right one without cross-checking mileage.

The name must be self-evidently unique at a glance.

### 2.3 Scope

This problem exists in two surfaces:
1. **The crew sheet** (`/crew/[token]`) — the primary fix target.
2. **The runner's plan view** (aid station table in `/dashboard/[raceId]`) — secondary; apply the same logic for consistency.

The fix is a **display-layer transform**. It does not change stored data. The `name` field on AidStation records is not modified.

---

## 3. Solution

### 3.1 Detection: identify duplicate names

At render time (server-side for the crew sheet, since it is a server component), scan the ordered list of aid stations for name collisions:

```ts
// Pseudo-code
function indexDuplicateNames(stations: AidStation[]): Map<string, number[]> {
  const seen = new Map<string, number[]>()  // name → [indices]
  stations.forEach((s, i) => {
    const key = s.name.trim().toLowerCase()
    const existing = seen.get(key) ?? []
    seen.set(key, [...existing, i])
  })
  // Return only names that appear more than once
  return new Map([...seen].filter(([, indices]) => indices.length > 1))
}
```

A "duplicate" is any name that appears two or more times in the ordered station list. Comparison is case-insensitive and trim-normalised.

### 3.2 Labelling: what to show

When a station name is a duplicate, append a visit ordinal to distinguish it. The ordinal is computed as the 1-based position of this visit among all visits to that name:

| Visit | Display format |
|---|---|
| First visit | `Station Name (1 of 2)` |
| Second visit | `Station Name (2 of 2)` |
| Third visit | `Station Name (3 of 3)` |

The total count is always shown alongside the ordinal so crew can immediately see how many times the runner visits this location.

**Example — Leadville 100 Twin Lakes:**
- MILE 39.4 → `Twin Lakes (1 of 2)` — Outbound
- MILE 60.2 → `Twin Lakes (2 of 2)` — Inbound

**Example — loop race with repeated start/finish:**
- MILE 0.0 → `Start/Finish` (no suffix — unique name at mile 0)
- MILE 25.0 → `Elk Meadows (1 of 2)`
- MILE 50.0 → `Elk Meadows (2 of 2)`
- MILE 75.0 → `Finish` (no suffix)

**Non-duplicate names are not affected.** Do not append `(1 of 1)` to unique names.

### 3.3 Where the label renders

The disambiguated display name replaces the station name in **all locations on the crew sheet**:

- Station card header (§6.1 and §6.2 of PRD-010)
- The "NEXT SEGMENT: [startAid] → [endAid]" line within crew-access cards
- The finish card (§7 of PRD-010) — if the finish shares a name with a prior station

On the **runner's plan view** (AidStation table), apply the same transform to the "Station" column.

### 3.4 Visual treatment of the ordinal suffix

**Chosen design: Mockup C — Stacked sub-label.** Reference file: `docs/requirements/mockups/PRD-029-mockup-C.html`.

The station name renders on its own line, unchanged. Directly beneath it, for duplicate stations only, a second line shows the visit ordinal as a sub-label:

```
TWIN LAKES
VISIT 1 OF 2
```

**Sub-label CSS spec:**

```css
.visit-sublabel {
  display: block;
  font-family: 'Geist Mono', monospace;
  font-size: 12px;
  font-weight: 700;
  color: var(--ridge-blue);       /* #1D7CBE — full opacity */
  letter-spacing: 0.06em;
  text-transform: uppercase;
  margin-top: 3px;
}
```

The sub-label is only rendered when `disambiguateStationNames` returns a modified name (i.e. the station is a duplicate). Unique stations render no sub-label and no extra vertical space.

**JSX structure for a duplicate station header:**

```jsx
<div className="station-name-wrap">
  <div className="station-name">{station.name}</div>
  {isDuplicate && (
    <span className="visit-sublabel">Visit {visitIndex} of {visitTotal}</span>
  )}
</div>
```

The `(N of M)` string form is used in the segment line and utility function output (plain text contexts). The `Visit N of M` form is used in the visual sub-label only.

### 3.5 Implementation location

The transform function lives in a shared utility:

```
src/lib/utils/station-display.ts

export function disambiguateStationNames(
  stations: { name: string }[]
): string[]
// Returns an array of display names, same length and order as input.
// Non-duplicates are returned unchanged.
// Duplicates are returned as "Name (N of M)".
```

This function is pure (no side effects, no DB calls) and unit-testable. It should be used anywhere station names are rendered.

---

## 4. Edge Cases

### 4.1 Three or more visits to the same station

The formula scales: visit 2 of 3 shows `Station Name (2 of 3)`. No special casing needed.

### 4.2 Names that differ only in whitespace or capitalisation

The duplicate detection normalises names (trim + lowercase) for matching. The **display** name uses the original casing from the first occurrence of that name. Do not alter the runner's chosen capitalisation.

### 4.3 Names that are already disambiguated by the race data

Some races store distinct names for the same physical location (e.g. "Twin Lakes Outbound" and "Twin Lakes Inbound"). These are not duplicates — they have different `name` values. No suffix is added. This is the preferred state; the auto-suffix is a fallback for races that don't bother.

### 4.4 The `physicalName` field (PRD-027)

PRD-027 §2.2 lists a `physicalName` field on AidStation records (the common name of the physical location, separate from the race-specific name). If `physicalName` is present, duplicate detection should use `name` (not `physicalName`) for collision checks — the `name` is what the race uses to identify the station, and that is what appears on the crew sheet. `physicalName` is not rendered on the crew sheet at this time.

### 4.5 Start and finish stations

The start and finish stations are typically named "Start" / "Finish" or the race name. If a race defines an unusual start/finish naming that collides with an aid station, the suffix logic still applies. No special-casing for start/finish unless explicitly flagged.

### 4.6 Very long station names

Some station names are already long (e.g. "Fish Hatchery / Halfmoon Road Crew Access"). Appending `(2 of 2)` adds 8 characters. The mobile layout (PRD-019) allows the name to wrap — this is acceptable. Do not truncate the suffix.

---

## 5. Data Model Changes

**None.** This is a pure display-layer change. The `name` field on AidStation records is not modified. No new DynamoDB fields.

---

## 6. Design

**Selected: Mockup C — Stacked sub-label.** See `docs/requirements/mockups/PRD-029-mockup-C.html` for the reference rendering.

Alternative proposals (A, B, D) are retained in `docs/requirements/mockups/` for reference but are not selected. The visual spec in §3.4 is authoritative.

---

## 7. Out of Scope

- **Renaming stored station names:** Runners cannot currently rename aid stations after setup. If they want "Twin Lakes Outbound" and "Twin Lakes Inbound" as distinct names, that requires editing the race setup. Allowing in-place rename of aid station names from the crew tab is a separate backlog item.
- **Admin library deduplication:** If a library race has duplicate station names, the admin can fix them in the race library editor (PRD-012, PRD-024). This PRD does not add admin tooling for that.
- **Live race mode disambiguation:** Future live-race features (PRD-010 §10.3) should carry forward the `disambiguateStationNames` utility without modification.

---

## 8. Acceptance Criteria

- [ ] A race with two stations named "Twin Lakes" renders them as "Twin Lakes (1 of 2)" and "Twin Lakes (2 of 2)" on the crew sheet.
- [ ] A race with three stations named "Turnaround" renders them as "Turnaround (1 of 3)", "Turnaround (2 of 3)", "Turnaround (3 of 3)".
- [ ] Stations with unique names render without any suffix.
- [ ] The "NEXT SEGMENT: [start] → [end]" line uses the disambiguated name.
- [ ] The `disambiguateStationNames` utility has unit tests covering: no duplicates, two duplicates, three duplicates, case/whitespace normalisation.
- [ ] The same logic is applied to the AidStation table on the runner's plan view.
- [ ] Print layout is not broken by the suffix (test with browser print preview).
