# PRD-017: Pace — Terrain-Weighted Estimates & Arrival Time Overrides
**Status:** Draft
**Created:** 2026-03-25
**Files affected:**
- `src/lib/pace-calculator.ts` *(extend — new weight logic, anchor redistribution)*
- `src/lib/gpx-parser.ts` *(extend — compute gross climb/descent per segment)*
- `src/types/gpx.ts` *(extend `AidStation` type)*
- `src/lib/db/aid-stations.ts` *(extend — write gross climb/descent fields)*
- `src/lib/db/races.ts` *(extend — persist `paceOverrides` and `targetFinishMinutes`)*
- `src/components/PaceInput.tsx` *(extend — override UX)*
- `src/components/AidStationTable.tsx` *(extend — override cells, error states)*
- DynamoDB Race record *(new `paceOverrides`, `targetFinishMinutes` attributes)*
- DynamoDB AidStation record *(new `grossClimbM`, `grossDescentM` attributes)*

---

## 0. Mandatory Pre-Reading

Before implementing, review:
- **`docs/specs/pace-calculator.md`** — The existing pace calculator. This PRD extends it; do not replace it. The stable interface contract in that spec applies here.
- **`docs/specs/gpx-processing.md`** — The existing GPX parser. This PRD adds gross climb/descent computation to it.
- **`docs/specs/database.md`** — The existing DynamoDB schema. This PRD adds fields to the Aid Station record and the Race record.
- **PRD-013** — Timezone dropdown, specifically the auto-detected field styling (soft Ridge Blue glow on system-set values). The override shading pattern for pace cells copies this exactly.
- **PRD-007** — IA redesign (section/segment data model, Pace tab context)
- **PRD-003** — Ridge Light design system (colors, typography, spacing)

---

## 1. Summary

The Pace tab currently shows estimated arrival times based on a naive flat-distance calculation. This PRD introduces two changes:

1. **Terrain-weighted pace calculation.** Each segment's estimated duration is weighted by its gross climbing and descending, not just its distance. A short, steep segment correctly receives more time than a long, flat one.
2. **Manual arrival time overrides.** Users can override the estimated arrival time at any aid station. Overrides act as anchors; the time between any two adjacent anchors is redistributed proportionally to the weights of the segments in between. Overrides are persisted per user per race.

---

## 2. Pace Calculation

### 2.1 Inputs

The pace calculation takes two inputs from the user:

- **Target finish time** — a single "time to finish" field at the top of the Pace tab. This maps to `{ mode: 'finish', targetMinutes: number, totalDistanceKm: number }` in the existing `PaceConfig` discriminated union (see `docs/specs/pace-calculator.md`). This is the only pace input; there is no per-segment pace entry.
- **Aid station data** — the ordered list of `AidStation` records for the race. Each station already provides `distanceFromPrev` (km). This PRD adds two new fields to the `AidStation` type: `grossClimbM` and `grossDescentM` (see §2.2).

### 2.2 GPX parsing update

The existing GPX parser (`src/lib/gpx-parser.ts`) already parses `<ele>` values into track points but notes in `docs/specs/gpx-processing.md`: *"Does not compute elevation gain between stations — `elevationGain` is always returned as `0`."* This PRD activates that deferred work.

Extend `extractAidStations` to populate two new fields on each `AidStation`:
- `grossClimbM` — total metres climbed within the segment from the previous aid station to this one (gross, not net — if a segment climbs 50m, descends 20m, then climbs another 50m, the gross climb is 100m)
- `grossDescentM` — total metres descended within the same segment (gross, same logic)

The existing `elevationGain: number` field on `AidStation` (always `0`) is superseded by these two fields and should be deprecated. Do not remove it yet — leave it as `0` to avoid breaking existing callers.

### 2.3 Weight formula

Each segment (the stretch from the previous aid station to the current one) is assigned a **weight** — a proxy for the time it should take relative to a flat kilometre:

```
weight = distanceFromPrev + (grossClimbM / 100) + (grossDescentM / 500)
```

Where `distanceFromPrev` is in km and already exists on the `AidStation` record.

The constants reflect:
- 100m of climbing ≈ 1km of extra effort
- 500m of descending ≈ 1km of extra effort (descents are harder than flat for most ultra runners due to knee impact and technical terrain, but less costly than climbing)

### 2.4 Segment time allocation

Given the total finish time `T` and `n` segments each with weight `w_i`:

```
segmentTime_i = T × (w_i / Σw)
```

Each segment's estimated arrival time is then the start time plus the cumulative sum of segment times up to and including that segment.

### 2.5 Anchor-based redistribution (overrides)

When a user sets an override, the start and finish times become fixed anchors. Any override creates an additional anchor. Time between any two adjacent anchors is redistributed proportionally among the segments between them, using their weights only.

Formally: given two adjacent anchors at segment boundaries `a` and `b` with elapsed time `Δt` between them, and segments `a+1 … b` between those anchors:

```
segmentTime_i = Δt × (w_i / Σw[a+1..b])
```

This applies recursively as more anchors are added.

**The finish time is always treated as a fixed anchor.** If a user overrides a mid-race segment, the finish time does not move — only the segments between the override and the next downstream anchor (or finish) are re-weighted.

---

## 3. Pace Table

### 3.1 Structure

The pace table lists every aid station in order. Each row shows:

| Column | Content |
|---|---|
| Aid station name | From segment data |
| Distance (cumulative) | Geist Mono, right-aligned |
| Estimated arrival | Calculated or overridden time |

The first row is the race start (arrival = start time, fixed). The last row is the finish (arrival = start time + target finish time, overridable).

### 3.2 Default state

All arrival times are calculated. Calculated cells are rendered in normal style — no special treatment.

### 3.3 Overridden state

When a user overrides an arrival time, the cell takes on the **overridden field style** from PRD-013:
- Input border: `rgba(29,124,190,0.5)`
- Input box-shadow: `0 0 0 3px rgba(29,124,190,0.08)`

This signals "you set this" in the same visual language as the auto-detected timezone field. All other cells affected by the override recalculate silently.

### 3.4 Error state

If an overridden time is impossible — i.e., it is earlier than or equal to the arrival time of the preceding anchor, or later than or equal to the arrival time of the following anchor — the cell is marked as an error:
- Input border: `2px solid #ef4444` (red)
- Input box-shadow: `0 0 0 3px rgba(239,68,68,0.12)`

The user must correct the error before the table recalculates downstream times. While an error is present, downstream times remain frozen at their last valid state.

### 3.5 Clearing overrides

A **"Reset to defaults"** button appears below the pace table. Clicking it clears all overrides (including the finish time override if one exists) and recalculates all arrival times from the target finish time alone. No confirmation dialog is required — the action is reversible by re-entering times.

---

## 4. Target Finish Time Field

A single field at the top of the Pace tab:

```
┌─────────────────────────────────────────────┐
│  Target finish time                          │
│  [  28  ] hours  [  00  ] minutes            │
└─────────────────────────────────────────────┘
```

Hours and minutes are separate numeric inputs. Valid range: 1 hour to 999 hours. Changes to this field immediately recalculate all non-overridden arrival times. Overrides are not cleared when the finish time changes — they remain as anchors, and the un-anchored segments between them re-weight relative to the new total.

---

## 5. Persistence

### 5.1 Data stored

Two new attributes are added to the **Race record** in DynamoDB (see `docs/specs/database.md` for current Race record shape):

- `targetFinishMinutes: number` — the runner's target total race duration in minutes
- `paceOverrides: Record<string, string>` — a map of aid station overrides, keyed by `AidStation.order` (as a string), value is an ISO 8601 datetime string (e.g. `"2026-09-06T14:30:00"`)

Keying by `order` (not by array index) is more stable: if a GPX is replaced and stations shift, overrides at surviving station orders are preserved; overrides at orders that no longer exist are silently dropped on next load.

### 5.2 Save behaviour

Both fields save on blur (when the user leaves the input), not on every keystroke. A subtle save indicator (Geist Mono, 11px, Deep Ridge 40% opacity: `"Saved"`) appears briefly after a successful write. Save via `PATCH /api/races/<raceId>` — extend the existing API route.

### 5.3 Scope

Overrides are per user per race. If the GPX is replaced, overrides at station orders that no longer exist are silently dropped on next load. The target finish time is preserved across GPX replacements.

---

## 6. Future Considerations (deferred)

### 6.1 Segment difficulty colouring

The pace table could use subtle background shading on rows to give a visual sense of which segments are hardest (highest weight per km). For example, a light Mist (`#DBF1FA`) tint scaled by normalised weight. Deferred — implement once the base table is stable and user feedback is gathered.

### 6.2 Weight visibility

The underlying weight per segment is not surfaced in the UI. If users find the allocation confusing, a tooltip or expandable column showing the weight breakdown (`Xkm flat + Ym climb equiv + Zm descent equiv`) could be added.

---

## 7. Implementation Notes

### 7.1 Extend `src/lib/pace-calculator.ts`

Do not create a new file. Extend the existing `pace-calculator.ts` module (see `docs/specs/pace-calculator.md`). The stable interface contract — `calculateArrivalTimes(config, aidStations, raceStart): ArrivalEstimate[]` — must not change signature. The upgrade is internal:

- Add a `segmentWeight(station: AidStation): number` helper using the formula in §2.3.
- Replace the flat-distance time allocation with the weighted allocation from §2.4.
- Add an `overrides` optional parameter (or a separate `calculateArrivalTimesWithOverrides` function if the team prefers not to change the existing signature) that implements anchor-based redistribution from §2.5.

The spec note in `pace-calculator.md` anticipated this: *"Phase 2 will improve the internal algorithm by modifying the function body only."*

### 7.2 Extend `src/lib/gpx-parser.ts`

Extend `extractAidStations` to populate `grossClimbM` and `grossDescentM` on each returned `AidStation`. Track points within each segment are already available. Use a **smoothing threshold of 2m** to filter GPS noise — only accumulate a delta if `|elevation[i] - elevation[i-1]| > 2m`.

Update `src/types/gpx.ts` to add `grossClimbM: number` and `grossDescentM: number` to the `AidStation` type.

Update `src/lib/db/aid-stations.ts` to write these fields to DynamoDB and read them back.

### 7.3 Override input UX

The arrival time cells in `AidStationTable.tsx` become editable `<input type="time">` fields. When the user focuses a cell, it becomes interactive. On blur, if the value has changed, the override is recorded, the redistribution recalculates, and the value is saved via the API (§5.2).

To clear a single override, the user deletes the value in the cell — an empty value reverts to calculated. The cell returns to its default (unshaded) style.

---

## 8. Implementation Issues for Dev Agent

**Issue A — Gross climb vs. net climb**
The GPX elevation data is noisy. Use the 2m smoothing threshold described in §7.2. Without it, GPS noise inflates gross climb significantly and produces unrealistic weights.

**Issue B — Anchor redistribution edge cases**
If a user sets an override that makes the remaining finish time impossible to redistribute (e.g. they put the last mid-race segment very close to the finish time), some downstream segments may get near-zero time. This is allowed — it's the user's choice. Only flag it as an error if times go backwards (§3.4).

**Issue C — Override key stability**
Overrides are keyed by `AidStation.order` (as a string) per §5.1. This is more stable than array index but note: if a runner re-uploads a GPX where the order of stations shifts, overrides may silently apply to different stations. This is an edge case — document it as a known limitation.

**Issue D — `targetFinishMinutes` and overrides interaction**
When the user changes `targetFinishMinutes`, non-overridden times recalculate. But overrides that are now outside the new valid range (e.g. a mid-race override that is now after the new finish time) should be flagged as errors using the error style in §3.4, not silently dropped.

**Issue E — `calculateArrivalTimes` signature contract**
The existing spec (`docs/specs/pace-calculator.md`) freezes the function signature. If anchor redistribution requires passing overrides as an additional argument, add a separate `calculateArrivalTimesWithOverrides` overload rather than changing the existing signature. This preserves all existing callers (weather timeline, crew sheet) without modification.

**Issue F — `elevationGain` deprecation**
The existing `AidStation` record has `elevationGain: number` (always `0`). This field is superseded by `grossClimbM` and `grossDescentM` but must not be removed yet — write it as `0` on all new records and leave existing callers alone. Add a `// @deprecated` comment in the TypeScript type.
