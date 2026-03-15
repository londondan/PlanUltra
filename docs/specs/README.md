# PlanUltra — System Specs

This directory contains plain-English specifications for each system and screen in the codebase. They are updated as code ships and serve as the reference point when designing new features or reviewing PRs.

## Index

| Spec | What it covers |
|---|---|
| [auth.md](./auth.md) | Google OAuth, JWT sessions, route protection middleware |
| [database.md](./database.md) | DynamoDB single-table design, access patterns, record shapes |
| [gpx-processing.md](./gpx-processing.md) | GPX parsing, aid station extraction, proximity and loop logic |
| [pace-calculator.md](./pace-calculator.md) | Flat-rate pace model, stable interface contract, Phase 2 upgrade path |
| [weather.md](./weather.md) | Open-Meteo integration, race-window alignment, position interpolation |
| [dashboard.md](./dashboard.md) | Race list home screen |
| [race-creation.md](./race-creation.md) | New race flow: GPX upload, curated library, API |
| [race-setup.md](./race-setup.md) | Aid station review and configuration (drop bags, crew access) |
| [race-detail.md](./race-detail.md) | Main planning screen: map, elevation, pace, aid station table, weather |

## How to keep these current

When you ship code that changes a system's behaviour:
1. Update the relevant spec file in the same PR.
2. Change "What it does" and "What it does not do" to reflect the new reality.
3. Update "Notes for future development" if the work closes or changes a known gap.
4. Update the `Last updated` date at the top.

## Planned specs (not yet written)

These screens and systems are planned but not yet built. Specs should be written when development starts, not when it finishes.

| Spec | Phase | Description |
|---|---|---|
| `packing-view.md` | 2 | Per-station gear and nutrition planning screen |
| `crew-view.md` | 2 | Crew-facing view of aid station arrival estimates |
| `crew-calendar.md` | 2 | Google Calendar event generation for crew stations |
| `race-tattoo.md` | 3 | Printable forearm tattoo generator |
| `accommodation-finder.md` | 3 | Hotel/Airbnb map near crew stations |
