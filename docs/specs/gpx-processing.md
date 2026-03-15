# System Spec: GPX Processing
**Last updated:** 2026-03-15
**Status:** Shipped

---

## What it does

GPX processing converts a raw GPX XML string into structured race data: an ordered list of track points (the course route) and an ordered list of aid stations (the stops along the route).

The entry point is `src/lib/gpx-parser.ts`. It exposes three functions:

**`parseGPX(gpxString)`** — parses raw GPX XML into `{ trackPoints, waypoints }`. Handles multiple tracks and multiple segments within a track by concatenating them into a single flat array of track points. Throws on invalid XML or missing `<gpx>` / `<trk>` elements.

**`extractAidStations(waypoints, trackPoints)`** — the main planning function. Returns every visit to every waypoint in course order. If the course passes through the same aid station twice (e.g. on an out-and-back or a loop with a shared section), that station appears twice in the output with different `distanceFromStart` values and a `visitNumber` to distinguish them. Synthetic `Start` and `Finish` markers are added if no waypoint exists at the course start or end. On loop courses, the synthetic marker is `Start/Finish`. Start/Finish locations are automatically flagged with `hasCrewAccess: true` and `hasDropBag: true`.

**`extractUniqueAidStations(waypoints, trackPoints)`** — returns one entry per unique physical location (by `physicalName`), sorted by first visit. Used on the setup/edit screen where the runner configures flags once per location rather than per visit.

## Proximity and clustering logic

Aid stations are matched to the track by proximity, not by exact coordinate match. A waypoint is considered "visited" by the runner when the track passes within `PROXIMITY_THRESHOLD_KM` (0.2 km / ~200m) of it.

Multiple nearby track points within this radius are clustered: a new cluster begins when the cumulative track distance between adjacent near-points exceeds `MIN_VISIT_SEPARATION_KM` (1.0 km). Each cluster represents one visit; the representative track point is the one closest to the waypoint.

Loop detection uses `LOOP_DETECTION_THRESHOLD_KM` (0.5 km): if the last track point is within 0.5 km of the first, the course is treated as a loop.

Waypoints that are within `PROXIMITY_THRESHOLD_KM` of each other are deduplicated by merging their names with `/` (e.g. `"AS5 / Turnaround"`).

## What it does not do

- Does not parse `<rte>` (route) elements — only `<trk>` (track) elements are used. Some race GPX files use routes rather than tracks; these will fail with "no `<trk>` element found."
- Does not compute elevation gain between stations — `elevationGain` is always returned as `0`. Elevation data from `<ele>` tags is parsed into track points but not yet aggregated.
- Does not infer whether a station has crew access or drop bag availability from the GPX — those flags default to `false` and must be set by the runner on the setup screen (except Start/Finish, which auto-flags to `true`).
- Does not validate waypoint coordinates or handle malformed `lat`/`lon` attributes gracefully (they will produce `NaN`).
- Does not handle GPX files without any waypoints — the result will be an aid station list containing only the synthetic Start/Finish markers.

## Key files

| File | Role |
|---|---|
| `src/lib/gpx-parser.ts` | All GPX parsing and aid station extraction logic |
| `src/lib/geo-utils.ts` | `haversineDistance` and `cumulativeDistances` used by the parser |
| `src/types/gpx.ts` | TypeScript types: `TrackPoint`, `Waypoint`, `AidStation`, `ParsedGPX` |
| `src/lib/__tests__/gpx-parser.test.ts` | Unit tests for parsing and extraction |
| `src/lib/__tests__/gpx-parser-real.test.ts` | Integration test against a real race GPX file |
| `src/lib/__tests__/fixtures/` | Fixture GPX files used in tests |

## Notes for future development

- The biggest assumption to validate early: not all race GPX files have waypoints. If a GPX has no `<wpt>` elements, the output will only contain Start/Finish. A fallback flow for manual aid station entry should be added before launch.
- Elevation gain per segment is the key input for the Phase 2 grade-adjusted pace model. The track point `ele` values are already parsed — the missing piece is accumulating gain per aid station segment.
- If `<rte>` support is needed, the parser would need a second extraction path since route points use `<rtept>` instead of `<trkpt>`.
