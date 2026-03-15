# System Spec: Pace Calculator
**Last updated:** 2026-03-15
**Status:** Shipped (Phase 1 — flat rate only)

---

## What it does

The pace calculator estimates the runner's arrival time at each aid station given a race start datetime and a pace input. It lives entirely in `src/lib/pace-calculator.ts` as a single exported function with a stable interface designed to be upgraded in Phase 2 without changing its callers.

**`calculateArrivalTimes(config, aidStations, raceStart)`** — takes a pace config, an ordered list of aid stations with `distanceFromStart` in km, and the race start `Date`. Returns an `ArrivalEstimate[]` — one entry per aid station — with the estimated arrival `Date` and elapsed minutes from race start.

The pace config (`PaceConfig`) is a discriminated union:
- `{ mode: 'pace', minutesPerMile: number }` — the runner specifies their expected pace directly.
- `{ mode: 'finish', targetMinutes: number, totalDistanceKm: number }` — the runner specifies a target finish time; pace is back-calculated from total distance.

All internal calculations use miles (the conventional unit for US ultras). Distances arrive in km from the GPX parser and are converted with `KM_TO_MI = 0.621371`.

The arrival time for each station is computed as `raceStart + (distanceMiles × minutesPerMile) × 60000ms`. This correctly produces multi-day times — a station at elapsed 1,560 minutes (26 hours) will arrive the following calendar day.

## What it does not do

- Does not account for elevation gain or loss. All stations are treated as if the course is flat, regardless of actual terrain.
- Does not model aid station time (time spent at each stop). Arrivals represent when the runner reaches the station, not when they leave.
- Does not account for fatigue, pace degradation over distance, or time of day (night running is typically slower).
- Does not validate that `aidStations` are sorted by `distanceFromStart` — callers must ensure correct ordering.
- Does not handle paces of 0 or negative values defensively — these would produce division-by-zero or nonsensical results.

## Stable interface contract

This function's signature is intentionally frozen. Phase 2 will improve the internal algorithm (e.g. grade-adjusted pace, Riegel fatigue formula) by modifying the function body only. The inputs and output type will not change. Any feature that consumes `ArrivalEstimate[]` — the weather timeline, the aid station table, crew calendar generation — should depend only on this interface, not on the implementation.

```typescript
calculateArrivalTimes(
  config: PaceConfig,
  aidStations: AidStation[],
  raceStart: Date
): ArrivalEstimate[]
```

## Key files

| File | Role |
|---|---|
| `src/lib/pace-calculator.ts` | The calculator function and its types |
| `src/components/PaceInput.tsx` | UI for entering pace; calls `calculateArrivalTimes` and lifts results up |
| `src/lib/__tests__/pace-calculator.test.ts` | Unit tests |

## Notes for future development

- Phase 2 upgrade: add `elevationGainM` to `AidStation` (already a field, currently always `0`), then implement grade-adjusted pace within the function body. Naismith's Rule adds 1 min per 10m of ascent as a starting point.
- The `mode: 'finish'` config back-calculates a flat pace from total distance. In Phase 2, a finish-time input with elevation adjustment would need to use an iterative solver since the relationship between pace and time is no longer linear.
- If the UI ever needs to display pace-per-segment (rather than a single flat pace), `ArrivalEstimate` would need a `segmentPace` field, but the current use cases don't require it.
