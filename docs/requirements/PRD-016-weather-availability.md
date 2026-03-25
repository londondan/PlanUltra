# PRD-016 — Weather Availability States & Sun Condition Pre-computation

**Status:** Draft
**Date:** 2026-03-24
**Mockup:** `docs/requirements/weather-availability.html`

---

## 0. Background

The current implementation has two separate data sources for condition cards:

- **Sun conditions** (night, sunrise, sunset) — computed by `suncalc` in `sun-utils.ts`. Takes lat/lon + a date. **No API, no forecast window.** Works for any date, near or far.
- **Weather conditions** (clear, rain, storm, snow, fog, wind) — fetched from Open-Meteo in `weather-client.ts`. **Hard limit of 16 days.** Returns `{available: false}` beyond that.

The problem: both types of condition cards are currently gated on the same weather fetch. If the race is 3 months out, the user sees no condition information at all — not even the night running cards that could be computed immediately.

This PRD covers:
1. Decoupling sun conditions from weather availability so night/sunrise/sunset always show
2. "Weather coming soon" placeholder states — three design proposals to choose from
3. Consistent treatment across all surfaces where conditions appear
4. A whimsical tone for the unavailability message, consistent with the crew-sheet-not-found page

---

## 1. The fix: always compute sun conditions

### 1.1 Current behaviour

`SectionCard` and `CrewStationCard` call `computeSunConditions(section, raceLat, raceLon)` independently of weather, but the condition card grid is only rendered when the full section data (including `weatherCondition`) is available. In practice, if `forecastAvailable` is false, sections may have no `weatherCondition` set, and the grid logic may suppress the sun cards too.

### 1.2 Required change

`computeSunConditions` already works without weather data — it only needs `section.departureTime`, `section.arrivalTime`, `raceLat`, `raceLon`. These are known as soon as the user uploads a GPX and sets a start time.

**Rule:** Sun condition cards (night, sunrise, sunset) should always render whenever `departureTime` and arrival estimates are set, regardless of `forecastAvailable`. Weather cards only render when `forecastAvailable === true`.

**Implementation note:** In `SectionCard.tsx` and `CrewStationCard.tsx`, the condition card grid should split its render logic:
```ts
// Always available (suncalc, no API)
const sunConditions = computeSunConditions(section, raceLat, raceLon)

// Only available within 16-day window
const weatherCard = forecastAvailable && section.weatherCondition
  ? <ConditionCard type={`weather-${section.weatherCondition.type}`} ... />
  : <WeatherUnavailableCard daysUntilRace={daysUntilRace} />
```

The `WeatherUnavailableCard` is the subject of the design proposals in §2.

---

## 2. Design proposals: "Weather coming soon"

Three proposals for the placeholder that appears in place of a weather condition card when the race is outside the 16-day forecast window. Pick one (or mix elements).

### Proposal A — "Forecast pending" chip (minimal)

A small muted chip in the condition card grid — same size as a normal condition card, but in an empty/pending style.

**Visual:**
- Background: `rgba(130,199,246,0.06)` — barely-there mist tint
- Border: `1px dashed rgba(130,199,246,0.25)` — dashed to signal "not yet real"
- Icon: 🌤️ or a subtle animated pulse dot (CSS keyframe, no library)
- Label: "Weather" in `var(--sky)` 50% opacity, 11px uppercase
- Value: "Available in ~{N} days" — Geist Mono, 14px weight 600, `var(--sky)` 70%
- Sub-label: nothing, or a very muted "Open-Meteo · 16-day forecast"

**Tone:** purely informational. No personality. Good if the whimsy should stay contained to the WeatherTimeline level and not repeat in every section card.

---

### Proposal B — Whimsical inline card (recommended)

A proper condition card that matches the grid layout but uses a "forecast pending" theme with a bit of character. Mirrors the tone of the crew-sheet 404 page.

**Visual:**
- Background gradient: `linear-gradient(135deg, #0a1628 0%, #0d2040 100%)` — deep night sky, lighter than the night card
- Border: `1px solid rgba(130,199,246,0.2)`
- Texture: a few tiny animated stars (3–4 CSS `::before`/`::after` dots, slow `opacity` pulse) — very subtle
- Icon: 🔭
- Label: "Weather" — same as other cards
- Value (rotates on mount, pick one per section deterministically by section index % 3):
  - "Checking the clouds…"
  - "Ask me in {N} days"
  - "Still too far out"
- Sub-label (always): "Forecast opens ~{date}" — where date is raceDate minus 16 days, formatted "Jun 12"

**Tone:** friendly, a little wry. Doesn't make the user feel like something is broken — makes them feel like the app is aware and waiting with them.

**Note on deterministic rotation:** using `sectionIndex % 3` to pick the value variant means each section in a plan shows a different message without any state, which looks intentional and avoids the visual repetition of seeing "Ask me in 47 days" on every single row.

---

### Proposal C — Collapsed + banner (progressive)

Don't show a weather card in the section grid at all. Instead, show a single full-width banner once at the top of the Plan tab (above the section list) that explains weather is coming. Section cards only show sun condition cards, with no weather slot.

**Banner visual:**
- Full-width, `background: rgba(29,124,190,0.08)`, `border: 1px solid rgba(29,124,190,0.2)`, `border-radius: 10px`
- Left: 🌤️ icon
- Text: "Weather forecasts open **{date}** — about {N} days before your race. Sun and night conditions are already calculated below."
- Right: small muted "×" to dismiss for the session (not persisted — reappears on reload)

**Tone:** informational, slightly helpful. The mention of "sun and night conditions are already calculated below" actively sets the expectation and directs attention to what *is* available.

**Tradeoff:** cleaner section cards, but the user might not see the banner if they scroll past it. Also doesn't appear in the crew sheet view.

---

### Proposal comparison

| | A — Chip | B — Whimsical card | C — Banner |
|---|---|---|---|
| Effort | Low | Medium | Low |
| Personality | None | High | Low |
| Per-section | Yes | Yes | No (once) |
| Crew sheet compatible | Yes | Yes | No |
| Risk of feeling cluttered | Low | Medium | Low |

**Decision: Proposal B** for section cards and the crew sheet. Optionally add Proposal C's banner on the Plan tab as a complement — the banner explains it once at the top, and the whimsical cards reinforce it inline without repeating the N-days copy. Proposals A and C are not being pursued.

---

## 3. WeatherTimeline unavailability state

The `WeatherTimeline` component already has a basic unavailable state (lines 498–511). Update it to match the whimsical tone.

**Current copy:**
> "Forecast not yet available"
> "Weather forecasts are available up to 16 days before the race"

**Proposed copy:**

**Headline:** "The clouds aren't talking yet."

**Sub-copy:** "Open-Meteo's forecast opens about 16 days out — check back around {forecastOpenDate}. In the meantime, your sunrise and sunset times are already plotted below."

**Visual treatment:**
- Keep the existing SVG timeline structure
- Replace the grey placeholder with a faint star-field background (same dot pattern as the night condition card — reuse the CSS)
- Show a 🔭 or 🌌 icon centred above the copy
- The daylight band in the SVG (the existing amber/blue sunrise-sunset fill) should still render even when weather is unavailable — this is already computable from `suncalc` and gives the user something meaningful to look at

**Implementation note:** The daylight band rendering in `WeatherTimeline` currently depends on `entries` existing. Split it: render the daylight/night SVG band from `suncalc` data always; only suppress the temperature curve and precipitation overlay when `forecastAvailable === false`.

---

## 4. "Forecast opens" date calculation

Needed in multiple places. Add a utility to `weather-client.ts` (or a new `lib/forecast-utils.ts`):

```ts
/**
 * Returns the date when a 16-day forecast will first include the race start.
 * i.e. raceDate minus 16 days (Open-Meteo's forecast horizon).
 */
export function forecastOpenDate(raceStartDate: Date): Date {
  const d = new Date(raceStartDate)
  d.setDate(d.getDate() - 16)
  return d
}

/**
 * Days until the forecast opens. Negative means it's already open.
 */
export function daysUntilForecast(raceStartDate: Date): number {
  return Math.ceil(
    (forecastOpenDate(raceStartDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
  )
}
```

Use `daysUntilForecast` to populate the N in "Ask me in {N} days" and "Forecast opens ~{date}".

---

## 5. Sun condition pre-computation: confirmation

To be explicit: **no code change is needed** to make sun conditions work for distant races. `suncalc.getTimes(date, lat, lon)` is a pure astronomical calculation — it will correctly return sunrise/sunset for any date, including races 6 months out. The only requirement is that:

1. The race has a start date set
2. The GPX has been uploaded (lat/lon known)
3. The user has set a start time (so section departure times can be estimated)

If all three are true, the night/sunrise/sunset condition cards can render immediately, regardless of how far away the race is. This is a meaningful win for users who plan months in advance.

---

## 6. Affected surfaces

| Surface | Weather card | Sun cards | Unavailable state |
|---|---|---|---|
| `SectionCard` (Plan tab) | Proposal B card when unavailable | Always show | Per-section, rotating variant |
| `CrewStationCard` (Crew sheet) | Proposal B card when unavailable | Always show | Per-card, rotating variant |
| `WeatherTimeline` (Plan tab) | Suppress temp/precip curves | Always show daylight band | §3 whimsical state |
| Plan tab top | — | — | Optional Proposal C banner (additive) |

---

## 7. Mockup

See `docs/requirements/weather-availability.html` for interactive mockup showing:
1. Proposal A — minimal chip
2. Proposal B — whimsical card (with the three value variants)
3. Proposal C — banner + clean section cards
4. WeatherTimeline unavailable state with daylight band still visible
