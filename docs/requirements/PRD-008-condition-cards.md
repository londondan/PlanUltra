# PRD-008: Condition Cards — Light and Weather Info Cards
**Status:** Draft — pending design selection
**Created:** 2026-03-19
**Depends on:** PRD-007 §7.4 (Plan Tab section card expanded state)

---

## 0. Reference Mockup — Review Before Implementing

```
requirements/mockups/condition-cards.html
```

The mockup shows three visual design options for each condition type (night, sunrise, sunset), all six weather card variants (clear, rain, storm, snow, fog, wind), and two in-context examples showing how condition cards sit alongside standard info cards inside an expanded section card.

**Design decisions pending:** Before implementation begins, the product owner must select one option per condition type from the mockup. Selections should be recorded in §6 of this PRD.

---

## 1. Overview

Section cards on the Plan tab contain a grid of small info cards presenting facts about each segment. Some of those cards are standard (start mile, distance, duration — always shown). This PRD defines a set of **condition cards** that appear only when a relevant condition applies to that segment.

There are two categories:

- **Light condition cards** — derived from the runner's estimated arrival time and the sunrise/sunset times at the race location. Computed client-side with `suncalc`. No API call required.
- **Weather condition cards** — derived from the weather forecast API (PRD-004). One card per segment, styled based on the dominant condition.

Condition cards are visually distinct from standard info cards. Each condition type has its own color treatment, gradient, and optional texture (star field, rain streaks, snow dots, etc.) so the runner can recognize a condition at a glance without reading the label.

---

## 2. Light Condition Cards

### 2.1 Triggering rules

Light condition cards are computed per segment using the runner's estimated pace and the race's GPS coordinates and start datetime.

For each segment, compute:
- `segmentStartTime`: race start + (cumulative miles to this section × pace in min/mile)
- `segmentEndTime`: segmentStartTime + (section miles × pace in min/mile)
- `sunriseTime`: suncalc `getTimes(date, lat, lng).sunrise` for the calendar date of this segment
- `sunsetTime`: suncalc `getTimes(date, lat, lng).sunset` for the calendar date of this segment

Note: for multi-day races, use the calendar date corresponding to `segmentStartTime`, not always race day.

**Night running card:** show if `segmentStartTime < sunriseTime` OR `segmentEndTime > sunsetTime`.

**Sunrise card:** show if `sunriseTime` falls between `segmentStartTime` and `segmentEndTime`.

**Sunset card:** show if `sunsetTime` falls between `segmentStartTime` and `segmentEndTime`.

A segment can show multiple light condition cards simultaneously (e.g. a very long segment that spans both sunrise and sunset of the same day, or a segment that starts in darkness and ends after sunset the next day).

If no pace is set (`targetFinishMinutes` is null), all light condition cards are omitted for that segment. Standard info cards still show.

### 2.2 Mile estimate for light events

When sunrise or sunset falls within a segment, compute the approximate mile marker:

```
lightEventMile = sectionStartMile + (
  (lightEventTime - segmentStartTime) / segmentDurationMinutes
) × sectionDistanceMiles
```

Round to one decimal place. Display as "~mile [X]" to communicate it is an estimate.

### 2.3 Night running card

**Trigger:** segment starts before sunrise OR ends after sunset (but does not contain the sunrise/sunset event itself — those get their own cards).

**Content:**
- Label: "🌙 Night running"
- Value: one of three states:
  - "Start → ~mile [X]" — if the segment starts in darkness and sunrise occurs within it (sunrise card will also be shown)
  - "~mile [X] → end" — if sunset occurs within the segment and the segment ends in darkness (sunset card will also be shown)
  - "Full segment" — if the entire segment is in darkness (no sunrise or sunset within it)
- Sub-label: "Sunrise [time] · headlamp required" / "Sunset [time] · headlamp from mile [X]" / "Entire leg in darkness"

**Design intent:** dark, cold, and spatial — communicates running in the mountains at night. See mockup options 1–3.

### 2.4 Sunrise card

**Trigger:** `sunriseTime` falls within the segment's time window.

**Content:**
- Label: "🌅 Sunrise"
- Value: "~mile [X] · [time]" e.g. "~mile 4 · 5:48 AM"
- Sub-label: contextual — "Starts dark · light by mile [X]" if the segment also starts in darkness, or "Sunrise near end of segment" if it occurs in the last 20% of the leg

**Design intent:** warm, hopeful, dawn light breaking. See mockup options 1–3.

### 2.5 Sunset card

**Trigger:** `sunsetTime` falls within the segment's time window.

**Content:**
- Label: "🌇 Sunset"
- Value: "~mile [X] · [time]" e.g. "~mile 52 · 8:24 PM"
- Sub-label: "Headlamp needed from ~mile [X]" if a headlamp is not yet in the runner's gear for this leg, or "Gets dark near end of segment" if sunset is in the last 20%

**Headlamp warning logic:** if `hasHeadlamp` is false on the SectionPlan for this segment AND a sunset card is triggered, the sub-label should read "⚠ Headlamp not packed for this leg" in amber text.

**Design intent:** dramatic, warm-to-dark transition. The specific direction (orange-to-crimson vs. purple-dusk) is TBD from mockup review. See mockup options 1–3.

---

## 3. Weather Condition Cards

### 3.1 One card per segment

Each segment shows exactly one weather card. The card style is driven by the **dominant condition** for that segment's time window, defined as the condition with the highest severity or prevalence across the segment's duration.

Condition priority (highest to lowest, for selecting the dominant condition when multiple apply):
1. Storm / lightning
2. Snow
3. Rain
4. Fog
5. Wind (sustained > 25 mph)
6. Clear / partly cloudy

### 3.2 Card content

All weather cards share the same content structure:
- Label: "[emoji] Weather"
- Value: "[low temp]°F → [high temp]°F" — the temperature range across the segment
- Sub-label: short condition description, e.g. "Clear · light wind", "Storm risk 2–5 PM", "Dense fog · low visibility"

The emoji in the label changes per condition:
- ☀️ Clear
- 🌧 Rain
- ⚡ Storm
- ❄️ Snow
- 🌫 Fog
- 💨 Wind

### 3.3 Weather card designs

Six distinct card treatments. Each has its own gradient background, border color, and optional CSS texture layer.

| Condition | Background | Texture |
|---|---|---|
| Clear | Light blue gradient (#eff6ff → #bfdbfe) | None |
| Rain | Cool gray gradient (#f0f4f8 → #94a3b8) | Subtle diagonal rain streak lines |
| Storm | Dark charcoal gradient (#1c1917 → #44403c) | Lightning glow radial overlay at top-right |
| Snow | Near-white cool gray (#f8fafc → #cbd5e1) | Small white radial dots (snowflake approximation) |
| Fog | Pale gray with soft white bands (#f1f5f9 → #e9edf2) | Horizontal semi-transparent fog layers |
| Wind | Light green gradient (#ecfdf5 → #a7f3d0) | Diagonal angled lines suggesting airflow |

All CSS — no images or SVG icons required for the textures.

### 3.4 Weather data dependency

Weather cards depend on the weather API (PRD-004). If weather data is unavailable for a segment:
- Show a standard Mist-background card with label "Weather" and value "—"
- Sub-label: "Forecast unavailable"

Weather cards are omitted entirely if the race date is more than 14 days in the future (outside forecast range). In this case, no weather card placeholder is shown — the absence is intentional to avoid cluttering the card grid with empty states.

---

## 4. Card Layout and Sizing

### 4.1 Grid placement

Condition cards sit in the same `auto-fit, minmax(130px, 1fr)` grid as standard info cards (PRD-007 §7.4). They are placed after the standard cards in this order:
1. Start (always)
2. Distance (always)
3. Duration (always)
4. Night running (if applicable)
5. Sunrise (if applicable)
6. Sunset (if applicable)
7. Weather (if available)

### 4.2 Wide weather card

When a weather card carries a storm or high-severity condition and has a longer sub-label, it may span two columns: `grid-column: span 2`. This gives the warning more visual weight. Apply span-2 only for Storm and Snow conditions. All other weather conditions use the standard single-column width.

### 4.3 Minimum height

All info cards (standard and condition) have `min-height: 80px` when inside a section card grid. This is reduced from the standalone showcase size to fit within the section card without overwhelming the plan inputs below.

### 4.4 Border radius

`border-radius: 8px` inside the section card grid (slightly less than the 10px card containers around them).

---

## 5. Accessibility

### 5.1 Color contrast

Dark condition cards (night, storm) use light text. All text combinations must meet WCAG AA (4.5:1 for body text, 3:1 for large text).

- Night card label text: `rgba(167,139,250,0.8)` on dark navy — verify contrast at implementation
- Night card value text: `#e2e8ff` on `#0a0e2a` — confirm ≥ 4.5:1

If any combination fails, lighten the text color rather than changing the background gradient.

### 5.2 Non-color indicators

Condition type is always communicated by:
1. The emoji in the label
2. The label text itself

Color and texture are visual enhancements, not the sole conveyance of meaning.

---

## 6. Design Selections (to be filled before implementation)

Once the mockup has been reviewed, record the selected option for each condition here:

| Condition | Selected option | Notes |
|---|---|---|
| Night running | **Option 1** | Deep space navy with star field (`#0a0e2a → #1a1f4e → #0d1235`), CSS radial-gradient star dots, purple label text |
| Sunrise | **Option 2** | Purple-to-amber sky gradient (`#3b1f5c → #7c3aed → #f97316 → #fbbf24`), white value text, warm sub-label |
| Sunset | **Option 3** | Dusk purple (`#fde68a → #fb923c → #9333ea → #4c1d95`), white value text, lavender sub-label |
| Weather — all | Fixed (single design per condition) | See §3.3 |

---

## 7. Implementation Notes

### 7.1 CSS-only textures

All card textures (rain streaks, snow dots, star field, fog layers, wind lines) are implemented in CSS using `background-image` with multiple `radial-gradient` or `linear-gradient` layers on a pseudo-element or a dedicated `<div>` child. No images, no canvas, no SVG.

This keeps the component purely declarative and avoids any asset loading.

### 7.2 Component structure

Each condition card is a single React component: `<ConditionCard type="night" | "sunrise" | "sunset" | "weather" data={...} />`. The `type` prop selects the visual treatment. The `data` prop carries the computed values (mile estimate, time, temperature range, condition string).

### 7.3 Computation location

Light condition calculations (§2) are performed in a pure utility function `computeLightConditions(segment, raceStartDatetime, coordinates, paceMinPerMile)` that returns an array of condition objects. This function has no side effects and is unit-testable.

Weather condition card data is derived from the existing `WeatherService` output (PRD-004), mapped to the `dominant condition` logic in §3.1 in a separate utility `getDominantWeatherCondition(hourlyForecasts, segmentStartTime, segmentEndTime)`.

---

## 8. Out of Scope

- Animated textures (rain animation, falling snow) — static CSS only in this phase
- Wind speed as a separate card — wind is subsumed into the weather card
- UV index card — future phase
- Air quality card — future phase
