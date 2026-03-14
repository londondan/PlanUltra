# Product Requirements Document
## PlanUltra — Ultra Marathon Race Planner

**Version:** 0.4 (Draft)
**Last Updated:** 2026-03-13
**Status:** Work in Progress

---

## 1. Who Is This For?

**Primary User: The ultra marathon runner.**

Specifically, runners who:

- Are registered for an upcoming ultra marathon (50K, 50mi, 100K, 100mi, or similar)
- Need to understand the course layout, terrain, and aid station positions before race day
- Want to plan logistics around pacing, gear, nutrition, and crew access points
- May be running their first ultra and feel overwhelmed by the planning complexity, or experienced runners who want a faster, more structured planning workflow

**Secondary User: The crew member or pacer.**

People supporting a runner who need to know where and when to be at crew-accessible aid stations. They benefit from the output of the runner's plan but are not the primary driver of the planning workflow.

This is **not** designed for road marathon runners, casual joggers, or race directors. The specific demands of multi-hour (often 20–30+ hour) events in remote terrain are what make this product valuable and differentiated.

---

## 2. What Value Does This Deliver?

Ultra marathon planning today is fragmented. Runners piece together information from race websites, PDFs, spreadsheets, and word of mouth. The core problems this product solves:

**Centralised course intelligence.** A runner uploads a GPX file (or selects a known race) and immediately gets a clear, interactive map with aid stations marked, distances between stations calculated, and elevation context — without hunting across multiple sources. Aid stations are parsed directly from waypoints embedded in the GPX file; the runner only needs to confirm which stations have drop bag access.

**Weather-aware preparation.** Hour-by-hour weather forecasts aligned to the race timeline mean a runner can anticipate when they'll hit exposed ridgelines at night, or whether a storm is likely to roll in at mile 60. This directly informs gear and pacing decisions.

**Structured logistics planning** *(Phase 2).* By layering estimated pace onto the course, the product helps runners calculate projected arrival times at each aid station — enabling precise decisions about what to carry (calories, headlamp, extra layers) and when crews need to be where. Because most ultras run through at least one night, the system is multi-day by design: time estimates, weather, and gear recommendations all account for darkness and overnight conditions.

**Crew coordination** *(Phase 2).* Auto-generated calendar events at crew-accessible stations, keyed to estimated arrival times, remove the logistical burden from both the runner and their crew.

**Race-day reference tattoo** *(Phase 3).* A printable temporary tattoo — designed to go on the runner's forearm — showing the elevation profile, aid stations, and expected arrival times in a compact, waterproof format. Runners today do this manually with paper wristbands or tape; this automates the layout and enables print-on-demand ordering.

**Crew accommodation finder** *(Phase 3).* For races in remote areas, finding accommodation near crew-accessible stations is a frustrating manual process. A future phase will plot nearby hotels and Airbnbs on a map relative to crew stations, helping crew members find the best base of operations during a 24–30 hour race.

The value proposition in one sentence: **turn a GPX file and a race date into a complete race-day plan.**

---

## 3. How Will People Use It?

### 3.1 Core Workflow (Phase 1)

1. **Sign in** via Google OAuth. No password to manage; the runner likely already has a Google account.

2. **Add a race.** The runner either:
   - Selects from a curated library of known ultras (pre-loaded GPX + verified aid station data), or
   - Uploads a GPX file — aid stations are parsed from embedded waypoints automatically

3. **Confirm drop bag stations.** After aid stations are parsed from the GPX, the runner reviews the list and flags which stations have drop bag access. Crew access flags may also be set here. This is the only required manual step in the setup flow.

4. **View the course map.** An interactive map renders the full course route. Aid stations are pinned and labelled. The runner can zoom, pan, and inspect individual segments.

5. **Review the aid station table.** A structured list shows each aid station in order, with:
   - Distance from start
   - Distance from previous station
   - Crew access (yes/no)
   - Drop bag availability (yes/no)

6. **Set expected pace.** The runner inputs a flat pace (min/mile or min/km) or a target finish time. The system uses this to estimate arrival times at each aid station and to anchor the weather forecast to the right points on the course. Pace estimation is implemented as an isolated, single-responsibility function so the model can be upgraded in Phase 2 (e.g. to account for elevation) without touching the rest of the application.

7. **Check the weather forecast.** An hour-by-hour, multi-day forecast is displayed for the race start date and location, covering the full expected race window (which may span one or more nights). The forecast surfaces temperature, precipitation probability, wind, and conditions. It is anchored to the race start time and keyed to where the runner is likely to be on course at each hour, using the estimated arrival times from step 6. Weather data is sourced from Open-Meteo (free, open-source API).

### 3.2 Future Workflow (Phase 2 — Roadmap)

8. **Refine pace model.** The pace estimation function is upgraded to account for elevation gain/loss (e.g. Naismith's Rule or a grade-adjusted pace heuristic). Because pace estimation is isolated in Phase 1, this upgrade only requires changing the model function — all downstream features (arrival times, weather anchoring, gear flags, crew calendar events) automatically benefit without code changes elsewhere.

9. **Plan gear and nutrition per station.** For each station, the runner specifies what they want in their drop bag or what they'll carry to the next leg — calories, fluids, night gear (headlamp, batteries), weather gear (extra layer, rain jacket), and medical items. The system uses estimated arrival time to flag when night gear will be needed.

10. **Coordinate crew.** For crew-accessible stations, the product generates Google Calendar events with the estimated arrival window. Crew members can be invited directly so they know exactly where to be and when.

11. **Live race updates** *(stretch / Phase 3).* A future capability where the runner or a crew member manually updates actual arrival times, which cascades to adjust downstream estimates and crew calendar events.

### 3.3 Future Workflow (Phase 3 — Roadmap)

12. **Generate race tattoo.** After completing their plan, the runner generates a compact tattoo graphic showing the elevation profile with aid stations marked, distances, and estimated arrival times. The layout is optimised for a forearm-width format (roughly 7" × 2"). The runner can download a print-ready file or order a temporary tattoo directly through a print-on-demand partner. This replaces the manual paper wristband or tape-and-marker approach many ultra runners use today.

13. **Find crew accommodation.** For each crew-accessible station, the product surfaces nearby hotels and Airbnbs on a map. Crew members can see at a glance which options are closest to multiple stations, helping them choose a central base for the race rather than scrambling to find lodging in unfamiliar terrain.

---

## 4. What We Want to Avoid

**Feature creep into social / community.** This is a personal planning tool. We are not building Strava, a leaderboard, or a public race results database. Adding social features early will dilute focus and complicate the data model.

**Becoming a race database.** Maintaining a comprehensive, up-to-date library of every ultra in the world is a content operations problem, not a product problem. The GPX upload path must remain a first-class option so the product is useful even without a pre-loaded race library. Pre-loaded races are a convenience layer, not the core.

**Over-engineering the weather integration.** Weather at a specific point on a mountain 4 weeks from now is inherently uncertain. The product should present forecasts clearly and without false precision — not try to build a sophisticated micro-climate model. We use Open-Meteo (free, open-source) and present the data honestly, including its limitations at longer forecast horizons.

**Replacing race-specific guidance.** Aid station volunteers, race directors, and experienced coaches provide nuanced, situational advice that no app can replicate. This product helps with logistics and planning — it should not position itself as a training coach or medical advisor.

**Complex onboarding.** If a new user can't see their course map within 3 minutes of signing in, the onboarding is broken. Complexity of the planning features must not bleed into the initial experience.

**Locking users into a proprietary format.** GPX is the universal standard. All data the user inputs should be exportable. We don't trap runner data.

---

## 5. Phase 1 Feature Summary

| Feature | Description | Priority |
|---|---|---|
| Google OAuth login | Sign in / sign out via Google account | P0 |
| Race selection | Choose from curated library or upload a GPX file | P0 |
| GPX aid station parsing | Auto-extract waypoints from GPX as aid stations | P0 |
| Drop bag / crew flag confirmation | Runner reviews parsed stations and sets drop bag and crew access flags | P0 |
| Course map | Interactive map with route and aid station pins | P0 |
| Aid station table | Ordered list with distances, crew access, drop bag flags | P0 |
| Flat-rate pace input | Runner enters pace or finish time; isolated function returns per-station arrival times | P0 |
| Weather forecast (multi-day) | Hour-by-hour forecast via Open-Meteo covering full race window including overnight | P0 |

---

## 6. Future Roadmap

### Phase 2

| Feature | Description |
|---|---|
| Grade-adjusted pace model | Upgrade the isolated pace function to factor in elevation gain/loss; all downstream features update automatically |
| Per-station gear & nutrition planning | Drop bag planner with night gear (flagged by estimated arrival time), weather gear, calorie tracking |
| Crew calendar integration | Auto-generate Google Calendar events for crew at crew-accessible stations with estimated arrival windows |
| Manual progress updates | Runner/crew updates actual arrival times mid-race; downstream estimates and calendar events cascade |
| Race scraping / auto-import | Automated sourcing of race GPX files to grow the curated library |

### Phase 3

| Feature | Description |
|---|---|
| Race tattoo generator | Print-ready forearm tattoo showing elevation profile, aid stations, distances, and estimated arrival times; download or order via print-on-demand |
| Crew accommodation finder | Map of hotels and Airbnbs near crew-accessible stations to help crew choose a base of operations |

---

## 7. Decisions Log

Decisions made during PRD review:

| Decision | Choice | Rationale |
|---|---|---|
| Aid station data source | Parse from GPX waypoints; user confirms drop bag flags | Most race GPX files include waypoints; avoids manual re-entry |
| Race library sourcing | Manual curation to start | Low overhead for a hobby project; scraping is a future phase |
| Weather API | Open-Meteo (free, open-source) | No cost, no API key required, sufficient resolution for this use case |
| Live tracking | Not in scope | Deferred; manual progress updates (Phase 2) are sufficient for v1 crew coordination |
| Multi-day support | Required from day one | Virtually all ultras span at least one night; must be a first-class assumption, not a bolt-on |

## 8. Open Questions

- **GPX waypoint reliability:** Not all race organisers embed aid stations as named waypoints. We should validate this assumption against a sample of real race GPX files early in development and have a fallback manual entry flow ready if needed.
- **Open-Meteo forecast horizon:** Open-Meteo's free forecast is reliable to ~7 days and available up to 16 days. For races more than 16 days out, we'll need to decide whether to show a placeholder, use historical weather as a proxy, or simply note the limitation to the user.
- **Pace model sophistication:** Phase 1 uses flat-rate pace. Phase 2 will upgrade to grade-adjusted pace (e.g. Naismith's Rule). The function signature should be designed upfront so the swap is a drop-in replacement with no interface changes.

---

*This document is a living draft. Sections should be revised as decisions are made on open questions.*
