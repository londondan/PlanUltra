# PRD-007: Organize by Jobs — Race Dashboard IA Redesign
**Status:** Draft
**Created:** 2026-03-18
**Amends:** PRD-002 (Plan Tab), PRD-006 (Plan Improvements)

---

## 0. Reference Mockup — Read This First

**Before implementing any part of this PRD, read the reference mockup in full:**

```
requirements/mockups/ia-v2.html
```

The mockup is a fully interactive HTML prototype. It demonstrates:
- The persistent course header (elevation strip, collapsible map)
- All four tabs (Pace, Plan, Pack, Crew) with working toggle interactions
- The collapsed and expanded states for section cards (Plan tab)
- The collapsed and expanded states for drop bag cards (Pack tab)
- The exact visual hierarchy: mile badge + time badge as primary anchors, summary chips, info cards grid, plan inputs
- The bag card structure: gear checklist → baggies → visit schedule

The written requirements in this PRD are the authoritative specification. The mockup is the visual reference that clarifies intent wherever the written spec is ambiguous. If there is a conflict between the two, the written spec takes precedence — but use the mockup to understand the design intent before asking for clarification.

---

## 1. Problem Statement

The current race dashboard mixes three distinct runner jobs onto a single undifferentiated page: planning the race (weeks out), packing drop bags (the week before), and sharing the plan with crew (the day before and during). These jobs have different information hierarchies, different actors, and different frequencies of use. Presenting them together creates a page that is neither a good planning tool nor a good packing reference.

Additionally, the current layout has no consistent anchor for "where am I in the race right now" — every section card requires the runner to mentally reconstruct their position from a station name rather than a mile marker and time of day.

This PRD defines a reorganized race dashboard with a persistent course header, a four-tab job-aware structure, and detailed requirements for each tab. It is structured as independent implementation sections so that a developer agent can take each section as a discrete unit of work.

---

## 2. Design Principles

**Mile + time are the primary anchors.** Every section, bag, and event is primarily identified by "what mile does it start at" and "what time of day does it start." Everything else (station name, distance, climb) is secondary context. This mirrors how runners think during a race — "I'm at mile 47, it's 2 PM" — not "I'm at Big Mountain."

**Collapse by default, expand to edit.** Most content is collapsed into a scannable summary row. The runner expands a section when they need to edit or review it in detail. This keeps the page readable whether a race has 3 sections or 12.

**Jobs are separated.** Planning inputs live on the Plan tab. Packing lives on the Pack tab. Crew sharing lives on the Crew tab. Data flows from Plan → Pack → Crew; inputs are only made in Plan.

**The course is always present.** The elevation profile and race stats are not part of any tab — they sit above the tab strip and are visible at all times. They are the spatial reference the runner uses while working on any tab.

---

## 3. Section Index

| Section | Title | Scope |
|---|---|---|
| §4 | Persistent Course Header | Elevation strip + map collapsible |
| §5 | Tab Strip | Four-tab navigation structure |
| §6 | Pace Tab | Finish-time input + split table |
| §7 | Plan Tab | Collapsible section cards with info + inputs |
| §8 | Pack Tab | Drop bag cards with baggies + visit schedule |
| §9 | Crew Tab | Publish flow and published view |
| §10 | Shared Layout Constraints | Width, spacing, mobile |
| §11 | Data Model Changes | DynamoDB + type changes |
| §12 | Migration and Compatibility | Handling existing data |

---

## 4. Persistent Course Header

### 4.1 Purpose

The course header is the one fixed element on the race dashboard. It is not part of any tab. It gives the runner a spatial reference — the elevation profile — that is useful while editing any tab. The runner refers to it when thinking "how long is that section really?" or "where does the night segment start?"

### 4.2 Race stats row

A single horizontal row of key facts about the race, displayed above the elevation SVG.

Required fields:
- Total distance (miles, 1 decimal)
- Total elevation gain (feet, comma-separated)
- Total elevation loss (feet, comma-separated)
- Race date (e.g. "Jun 28")
- Start time (e.g. "5:00 AM")

These are derived from the uploaded GPX and the race record. They are read-only display.

### 4.3 Elevation SVG

A responsive SVG elevation profile of the full course. Width is 100% of the container. Height is fixed at 64px.

Aid stations with drop bags are marked with a filled dot and a short station name label above or below the dot (depending on vertical position — label goes above if the station is in the lower half of the profile, below if in the upper half). The label is the station's short name, max 6 characters, truncated.

Aid stations without drop bags are not marked on the elevation strip. They appear in the Plan tab section cards only.

The profile is not interactive (no click-to-jump) in this implementation.

### 4.4 Course map (collapsible)

Immediately below the elevation SVG, a collapse toggle button renders the course map.

Default state: **collapsed.** The toggle label reads "Course map · tap to expand."

Expanded state: the GPX map renders at 160px height. Toggle label changes to "Course map · tap to collapse."

Rationale: the map is interesting on first viewing but adds no information value during planning sessions. Collapsing it by default keeps the elevation — which is useful reference — visible without the map consuming vertical space.

The collapsed/expanded state is persisted in `localStorage` keyed to the race ID so it remembers the user's preference.

---

## 5. Tab Strip

### 5.1 Structure

Four tabs, rendered as a horizontal strip immediately below the course header:

| Tab | Icon | Label |
|---|---|---|
| 1 | ⏱ | Pace |
| 2 | 📋 | Plan |
| 3 | 🎒 | Pack |
| 4 | 👥 | Crew |

Tabs are equal width. Active tab has a bottom border in `--ridge-blue` and bold label. Default active tab on first visit: **Plan**.

### 5.2 Tab content max-width

All tab content is constrained to `max-w-2xl` (672px) and centered with `mx-auto`. This applies to all four tabs. The course header above the tabs is also constrained to the same width.

### 5.3 Mobile

On viewports narrower than 480px, tab labels are hidden and only icons are shown. Tab icons must therefore be semantically clear.

---

## 6. Pace Tab

### 6.1 Purpose

The runner sets a single target finish time. The app computes a flat per-mile pace and generates a projected split table across all sections. This is the input that powers arrival time estimates throughout the Plan and Pack tabs.

The Pace tab is intentionally simple. Per-section effort multipliers are a Phase 2 concern (see PRD-002 §6.2). The current tab must not expose that complexity.

### 6.2 Finish time input

A single labeled input: **"Target finish time"** with a sub-label of "hours : minutes."

Input format: `HH:MM` (e.g. `28:00` for a 28-hour finish). Validation: must be a positive integer number of hours and 0–59 minutes. Hours can exceed 24.

This value is saved to the Race record as `targetFinishMinutes: number` (total minutes as an integer). Auto-saved on blur with no debounce required — this is a low-frequency input.

Below the input, a single line of computed context: e.g. "That's a 16:48 /mile average pace across 100.0 miles."

### 6.3 Split table

A table with one row per section. Columns:

| Column | Content |
|---|---|
| Segment | "Start → [station name]" or "[station] → [station]" |
| Start mile | Mile marker where this section begins (Geist Mono font) |
| Distance | Miles for this leg (Geist Mono) |
| Est. pace | Min/mile for this leg at flat pace (Geist Mono) |
| Arrive at | Projected clock time at the end of this leg (bold, Geist Mono, Deep Ridge color) |

The arrive-at column is the most important output — it is what the runner uses to communicate meeting times to crew. It should be visually prominent.

Odd rows have a Mist background (`rgba(219,241,250,0.3)`). Hover: Sky 30% background.

If `targetFinishMinutes` is null, the table shows "—" in the pace and arrive columns and displays a prompt: "Set your target finish time above to see projected splits."

---

## 7. Plan Tab

### 7.1 Purpose

The Plan tab is where the runner prepares their race plan in the weeks before the event. They review each segment of the course, set gear and food requirements, and write notes. This tab is the primary data-entry surface — all other tabs derive from it.

### 7.2 Calorie rate setting

At the top of the Plan tab, above the first section card, a compact settings row contains:

- Label: "Calories / hr"
- A numeric input bound to `Race.caloriesPerHour`
- Helper text: "Applied to all segments · override per-segment below"
- A save indicator ("✓ Saved") that appears for 2 seconds after auto-save

This is auto-saved with a 600ms debounce. Saved to the Race record.

### 7.3 Section card — collapsed state

Each section is rendered as a card. The collapsed state is the default. It contains a single header row:

**Left group — primary anchors (most important):**
- Mile badge: dark background pill, Geist Mono, e.g. `Mile 0`, `Mile 23.1`
- Time badge: Mist background pill, Geist Mono, e.g. `5:00 AM`, `9:22 AM`

These two badges are the primary identifiers. They answer "where does this section start and when do I get there."

**Center — section identity:**
- Section title: "Start → [Station]" or "[Station A] → [Station B]" (DM Sans, bold)
- Summary row: a horizontal list of compact chips showing key facts about this segment. Required chips:
  - Distance (e.g. `23.1 mi`)
  - Elevation gain (e.g. `+3,200 ft`)
  - Estimated duration (e.g. `~4h 22m`) — null if no pace set
  - Night/sunrise/sunset callout if applicable (see §7.5)
  - Weather summary if available (e.g. `⛅ 58°F → 78°F`)

**Right — expand icon:** `▸` rotates to `▾` when expanded.

The full header row is clickable and toggles expand/collapse.

### 7.4 Section card — expanded state

When expanded, the header gains a Mist background and a bottom border. The section body renders below it in two parts: info cards, then plan inputs.

**Part 1 — Info cards grid**

A responsive grid of small read-only cards presenting facts about this segment. Uses `auto-fit, minmax(130px, 1fr)` so it reflows gracefully on mobile.

Required info cards:

| Card | Content | Styling |
|---|---|---|
| Start | Mile marker + date/time | Standard mist card |
| Distance | Miles + elevation gain/loss sub-label | Standard mist card |
| Duration | Estimated time + estimated kcal sub-label | Standard mist card |
| Night running | Only shown if segment crosses darkness | Dark navy gradient card (see §7.5) |
| Sunrise/Sunset | Only shown if sun rises or sets during this segment | Warm orange gradient card (see §7.5) |
| Weather | Temp range + condition summary | Light blue gradient card |

The "End" card (end mile) is **not shown.** The end mile is implicit — it is the start mile of the next section.

Cards that do not apply (e.g. no night running, no weather data) are omitted entirely rather than shown in a disabled or empty state.

**Part 2 — Plan inputs**

A two-column grid of editable fields (single column on mobile):

| Field | Type | Notes |
|---|---|---|
| Drink mixes | Number input | Count of drink mix packets for this leg |
| Calories | Read-only display | Auto-computed or override value; shows "(auto)" or "(override)" indicator |
| Gear at [next station] | Pill checklist | Gear items to collect from drop bag at the end of this section. Only shown for sections ending at a drop-bag station |
| Packing list | Textarea | Placeholder: "List food to pack for this leg, e.g. 4× gel, 2× bar, 1× rice ball" |
| Notes | Textarea | Placeholder: "Reminders, crew instructions, anything else" |

Packing list and Notes span full width (both columns).

All inputs auto-save with 600ms debounce. Save indicator shown per-card.

### 7.5 Night / sunrise / sunset detection

These callouts are computed client-side using the `suncalc` library and the race's start datetime and GPS coordinates (from the GPX file's first point).

**Logic:**
1. Compute the runner's estimated clock time at the start of each section (from pace × cumulative distance).
2. Compute the runner's estimated clock time at the end of each section.
3. For each section, determine sunrise and sunset times for that calendar date at the race coordinates.
4. If the section **starts** before sunrise or **ends** after sunset, show the Night running card.
5. If sunrise falls within the section's time window, show a Sunrise card with the mile estimate where sunrise occurs.
6. If sunset falls within the section's time window, show a Sunset card with the mile estimate.

Mile estimate for sunrise/sunset: linear interpolation — `sunriseTime - sectionStartTime) / sectionDurationMinutes × sectionDistanceMiles`.

If no pace is set, these cards are omitted (cannot compute times without pace).

**Visual treatment:**
- Night running card: dark navy gradient background (`#1e1b4b → #312e81`), white text, purple accent
- Sunrise card: warm orange gradient (`#fff7ed → #fed7aa`), burnt orange text
- Sunset card: dusk purple gradient (`#faf5ff → #e9d5ff`), deep purple text

### 7.6 Section ordering and boundaries

Section boundaries are defined by drop-bag stations. The section from Station A to Station B represents "everything the runner does between picking up their bag at A and arriving at B." Refill-only stations within a section are listed in the section's summary (e.g. "2 refill stops") but do not create new sections.

This boundary logic is unchanged from PRD-002.

---

## 8. Pack Tab

### 8.1 Purpose

The Pack tab is the runner's packing reference in the week before the race. By this point, the plan is largely set. The primary job here is: **what goes in each bag, and in what order do I pack each baggie.**

The secondary job is: **when will I reach this bag during the race**, so the runner can brief their crew on timing.

All content on the Pack tab is **derived from Plan tab inputs.** There are no editable fields on the Pack tab. If the plan is incomplete, Pack tab cards show placeholder text indicating what is missing.

### 8.2 Drop bag card — collapsed state

One card per drop-bag station (including the start and finish). Cards are stacked vertically. Default state: **collapsed** for all cards except the first.

The collapsed header (dark Deep Ridge background, white text) shows:
- Station name (large, DM Sans bold)
- Station subtitle: "Mile [X] · [description]" e.g. "Mile 23.1 · first drop bag"
- Right side: a quick summary of what's packed — gear items (e.g. "Headlamp · Extra layer · Rain gear") and baggie count (e.g. "2 baggies packed")
- Expand icon `▸`

The full header row is clickable to toggle expand/collapse.

### 8.3 Drop bag card — expanded state

The expanded body has two sections:

**Section A — What to pack**

1. **Gear checklist:** each gear item flagged for this station shown as a checkbox pill. Items not flagged are not shown. Gear item labels use the full name (e.g. "Headlamp (spare)", "Rain gear", "Poles", "Shoe change"). A shoe change is flagged with a warning note: "Shoe change at mile [X] — confirm with crew."

2. **Baggies:** one baggie block per leg departing from this station. A baggie represents a zip-lock bag of food + drink mix the runner grabs for a specific leg.

Each baggie block contains:
- Destination label: "🥡 Baggie → [next station name]"
- Leg meta in Geist Mono: "[X] mi · ~[Y]h [Z]m leg"
- Items line: "[N]× drink mix · ~[kcal] kcal"
- Packing list text (from Plan tab) on the next line, if non-empty

If a station has no departing legs (e.g. the Finish), no baggie blocks are shown. A note reads "No further legs from this station."

**Section B — When do I reach this bag?**

A list of visit rows, one per time the runner passes through this station. (Most stations are visited once; loop courses may visit a station twice.)

Each visit row:
- Mile marker (Geist Mono, bold, Deep Ridge color) — left-aligned, min-width so rows align
- Estimated clock time (Geist Mono, muted) — derived from pace
- Leg description — "Arriving from [previous station]" or "Race start — pick up bag here"

If pace is not set, clock times show "—" with a note: "Set a finish time in the Pace tab to see arrival estimates."

### 8.4 Multi-visit stations

Some courses visit the same aid station more than once (e.g. an out-and-back loop). In this case:
- The station card appears **once** in the Pack tab
- The baggie section contains one baggie per departing leg (one per visit that has a subsequent leg)
- The visit schedule section lists all visits chronologically
- The collapsed summary shows the miles at which the station is visited, e.g. "Miles 60.1 & 75.4 · visited twice"

---

## 9. Crew Tab

### 9.1 Purpose

The Crew tab allows the runner to publish a read-only version of their plan, accessible to anyone with a link. No login is required to view the published plan. The crew uses this link on race day to track expected arrival times and see what the runner needs at each station.

### 9.2 Unpublished state

When the plan has not been published, the Crew tab shows:
- A brief explanation of what the crew sheet is
- A "Publish crew sheet" button
- A note indicating what is incomplete in the plan (if anything)

### 9.3 Published state

When published, the Crew tab shows:
- The public URL (copyable, with a copy button)
- A "View as crew" link that opens the published view
- An "Unpublish" option
- Last published timestamp

### 9.4 Published view (separate route)

The published view lives at `/crew/[shareToken]`. It is:
- Publicly accessible (no auth)
- Read-only
- Shows: race name, date, start time, elevation profile, and a simplified version of the Pack tab cards (bags + visit schedule + crew notes)
- Does not show plan inputs, calorie settings, or other planning internals
- Mobile-optimised (this is primarily viewed on phones at aid stations)

The published view is a future implementation item — this PRD defines the structure and requirements but does not require it to be implemented in the first pass. The publish button and URL generation must be implemented; the view route can be a stub.

---

## 10. Shared Layout Constraints

### 10.1 Page width

All race dashboard content (course header + tab content) is constrained to `max-w-2xl` (672px) and centered with `mx-auto`. Padding: `px-4` on mobile, `px-0` above 672px (let the container handle it).

### 10.2 Mobile behavior

- Tab strip: icons only below 480px viewport width
- Info cards grid: 2 columns minimum on mobile (no single-column info cards)
- Input grid: single column on mobile
- Bag cards: full width, no side-by-side layout
- Pack tab does not use a side-by-side plan+pack layout — it is a single vertical stack of bag cards

### 10.3 Spacing

- Between course header and tab strip: 10px
- Between tab strip and tab content: 0 (they visually connect)
- Between cards: 10px
- Section card body padding: 14px 16px
- Info cards grid gap: 8px

---

## 11. Data Model Changes

### 11.1 Race record

```diff
+ targetFinishMinutes: number | null   // total minutes, e.g. 1680 for 28:00
  caloriesPerHour: number | null        // already required by PRD-006
```

### 11.2 SectionPlan record

No changes beyond PRD-006. Required fields from PRD-006:
- `packingList: string`
- `crewNotes: string`
- `caloriesOverride: number | null`
- `drinkMixes: number`
- `hasHeadlamp`, `hasExtraLayer`, `hasRainGear`, `hasPoles`, `shoeChange: boolean`
- `updatedAt: string`

### 11.3 New: Share token on Race record

```diff
+ crewShareToken: string | null        // random URL-safe token, null = not published
+ crewPublishedAt: string | null       // ISO timestamp of last publish
```

### 11.4 API routes required

| Method | Route | Purpose |
|---|---|---|
| GET | `/api/races/[raceId]/sections` | Load all SectionPlan records |
| PUT | `/api/races/[raceId]/sections/[order]` | Upsert a SectionPlan record |
| PATCH | `/api/races/[raceId]` | Update race-level fields (targetFinishMinutes, caloriesPerHour) |
| POST | `/api/races/[raceId]/publish` | Generate/return crewShareToken |
| DELETE | `/api/races/[raceId]/publish` | Unpublish (nullify token) |
| GET | `/api/crew/[shareToken]` | Public — return published plan data |

---

## 12. Implementation Sections (for dev agent handoff)

This PRD is designed to be implemented as a series of discrete issues. Suggested breakdown:

### Issue A — Course Header
Implement the persistent elevation strip (§4): race stats row, elevation SVG with drop-bag markers, collapsible map toggle with localStorage persistence. No tab content required.

### Issue B — Tab Strip + Routing
Implement the four-tab strip (§5) with client-side tab switching. Each tab panel can be a stub with placeholder text. Enforce max-width layout constraint (§10).

### Issue C — Pace Tab
Implement the Pace tab (§6): finish time input, `targetFinishMinutes` persistence via PATCH, computed pace display, split table. Requires Issue B.

### Issue D — Plan Tab: Section Cards
Implement collapsible section cards (§7.3, §7.4): collapsed header with mile/time badges and summary chips; expanded state with info cards grid and plan input fields. Wire auto-save (600ms debounce) to PUT endpoint. Requires Issues B and C (for time estimates).

### Issue E — Night/Sunrise/Sunset Detection
Implement the suncalc-based light condition detection (§7.5) and the corresponding info cards (night, sunrise, sunset). Requires Issue D.

### Issue F — Pack Tab
Implement the Pack tab (§8): derive bag cards from SectionPlan data, collapsible bag headers, gear checklist, baggie blocks, visit schedule rows. No new API routes — reads from existing section and race data. Requires Issue D.

### Issue G — Crew Tab + Publish Flow
Implement the Crew tab (§9): unpublished/published states, publish button wired to POST endpoint, share URL display and copy button. Published view route (`/crew/[shareToken]`) as a stub returning race name only. Requires Issues B and F.

---

## 13. Out of Scope for This PRD

- Per-section pace multipliers (Phase 2 — PRD-002 §6.2)
- Weather API integration (PRD-004)
- Tattoo ordering (future phase)
- Crew view full implementation (stub only in Issue G)
- Native mobile app
