# System Spec: Weather
**Last updated:** 2026-03-15
**Status:** Shipped

---

## What it does

Weather is split across two modules with distinct responsibilities:

**`src/lib/weather-client.ts`** — fetches raw hourly forecast data from the Open-Meteo API for a given lat/lon, date range, and timezone. Returns an array of `HourlyForecast` objects (one per hour). Also exports `weatherCodeToCondition()` which maps WMO weather interpretation codes to a human-readable label and emoji.

**`src/lib/weather-timeline.ts`** — takes the raw forecast array and aligns it to the runner's race. For each forecast hour that falls within the race window (between race start and estimated finish), it interpolates the runner's position on course using their arrival time estimates and the track point array. Returns `RaceWeatherEntry[]` — weather data with lat/lon of where the runner is expected to be at that hour.

### Forecast availability

Open-Meteo's forecast endpoint supports up to 16 days out. If the race date is more than 16 days from the current date, `fetchForecast` returns `{ available: false, reason: "..." }` rather than throwing. The UI handles this gracefully by showing an unavailability message rather than an error state.

### Position interpolation

For each forecast hour, the runner's distance from start is interpolated linearly between the surrounding pair of aid station arrival estimates. That distance is then mapped to a lat/lon by walking the cumulative distance array of track points and interpolating between the two nearest track points. This means the weather forecast is keyed to where the runner actually is on the course at each hour, not just the race start location.

### Units

All values are fetched in imperial units from the Open-Meteo API: temperature in Fahrenheit, wind speed in mph. These are displayed as-is; no conversion is performed.

## What it does not do

- Does not cache weather responses. Every page load for a race fetches fresh data from Open-Meteo.
- Does not support races more than 16 days in the future (Open-Meteo limit). No historical weather fallback.
- Does not fetch weather for individual aid station locations — a single forecast is fetched for the race start coordinates and the hourly data is reused across the full course. This is an approximation; weather conditions may differ significantly between start and finish for mountain courses.
- Does not alert the runner to specific weather events (e.g. "storm expected at mile 60"). The data is presented as a timeline for the runner to interpret.
- Does not account for altitude in the forecast. Open-Meteo uses the elevation of the queried coordinates internally, but we do not pass per-waypoint elevations.

## Key files

| File | Role |
|---|---|
| `src/lib/weather-client.ts` | Open-Meteo API fetch, `HourlyForecast` type, `weatherCodeToCondition()` |
| `src/lib/weather-timeline.ts` | Aligns forecast hours to runner position on course |
| `src/components/WeatherTimeline.tsx` | Displays the aligned weather entries |
| `src/lib/__tests__/weather-client.test.ts` | Unit tests for client and code mapping |
| `src/lib/__tests__/weather-timeline.test.ts` | Unit tests for alignment and interpolation |

## Notes for future development

- Caching weather responses (e.g. in memory with a 1-hour TTL, or via a server-side cache) would reduce Open-Meteo API calls and improve page load time.
- For races more than 16 days out, historical average weather (climatology) would be a useful fallback to help with early gear planning. Open-Meteo provides a historical weather API that could serve this purpose.
- Fetching a separate forecast per aid station location (rather than one for the race start) would improve accuracy for mountain courses with significant elevation variation. This would require multiple API calls but would give per-station weather data.
- The `isNight` flag in `HourlyForecast` is derived from Open-Meteo's `is_day` field. This is used to visually differentiate night segments in the UI and will be important for the Phase 2 night gear flagging feature.
