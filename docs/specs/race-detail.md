# System Spec: Race Detail View
**Last updated:** 2026-03-25
**Status:** Shipped

---

## What it does

The race detail page (`/dashboard/<raceId>`) is the main planning screen. It assembles all the Phase 1 features onto a single page for a given race:

- **Course map** — interactive map rendering the GPX track with aid station pins
- **Elevation profile** — chart of elevation gain/loss across the course distance
- **Pace input** — runner enters their expected pace; arrival time estimates are calculated and flow into the aid station table and weather timeline
- **Aid station table** — ordered list of all stops with distances and estimated arrival times (shown once pace is entered)
- **Weather timeline** — hour-by-hour forecast aligned to the runner's estimated position (shown once pace is entered and a forecast is available)

The page is a client component that fetches race and aid station data from `/api/races/<raceId>` on mount. GPX track points are parsed client-side from the stored `gpxData` string. Weather is fetched client-side from Open-Meteo after arrival estimates are computed — weather fetch is deferred until pace is set because it needs estimated arrival times to determine the forecast end date and to align the forecast to the runner's position.

A breadcrumb and race header show name, date, start time, and total distance in miles. An "Edit stations" link returns the runner to the setup page.

## What it does not do

- Does not show the packing view or crew view (planned future screens).
- Does not allow editing race metadata (name, date, start time) from this page.
- Does not support multiple runners or sharing the view with a crew member (crew sheet is a separate shareable page — PRD-010).
- Does not show real-time or live tracking data.

## Page state and data flow

```
Mount
  → GET /api/races/<raceId>       → race metadata (incl. targetFinishMinutes) + aid stations
  → parseGPX(race.gpxData)        → trackPoints (client-side)
  → if targetFinishMinutes present → calculateArrivalTimes() → arrivalEstimates

User enters or changes pace (targetFinishMinutes)
  → calculateArrivalTimes()        → arrivalEstimates
  → AidStationTable re-renders with estimated arrival times
  → PATCH /api/races/<raceId>      → persist targetFinishMinutes

arrivalEstimates available
  → fetchForecast(startLat, startLon, raceDate, endDate, timezone)
  → alignWeatherToRace(forecasts, arrivalEstimates, trackPoints, raceStart)
  → WeatherTimeline renders
```

## Key files

| File | Role |
|---|---|
| `src/app/dashboard/[raceId]/page.tsx` | Client component: page layout, data fetching, state orchestration |
| `src/components/CourseMap.tsx` | Interactive Leaflet map with track and aid station markers |
| `src/components/ElevationProfile.tsx` | Elevation chart (Recharts) |
| `src/components/PaceInput.tsx` | Pace/finish time entry; emits `ArrivalEstimate[]` upward via callback |
| `src/components/AidStationTable.tsx` | Table of aid stations with distances and arrival estimates |
| `src/components/WeatherTimeline.tsx` | Hour-by-hour weather entries across the race window |
| `src/app/api/races/[raceId]/route.ts` | GET handler: returns race + aid stations together |

## Notes for future development

- Pace input (`targetFinishMinutes`) is persisted to the Race record in DynamoDB and restored on page load.
- The packing view and crew view are distinct screens planned for Phase 2 — they will likely live at `/dashboard/<raceId>/pack` and `/dashboard/<raceId>/crew` (or a shareable `/crew/<token>` route). They will reuse `ArrivalEstimate[]` from the pace calculator and the aid station configuration from setup.
- The weather fetch is triggered by a `useEffect` that watches `arrivalEstimates`. If pace changes, the weather is re-fetched. This could be debounced to avoid unnecessary API calls while the user is actively typing a pace value.
- The race detail page re-parses the GPX on every load. For large GPX files this is a noticeable delay. Caching the parsed track points in `sessionStorage` or computing them server-side would improve load time.
