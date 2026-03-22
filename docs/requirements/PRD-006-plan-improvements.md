# PRD-006: Plan Tab Improvements
**Status:** Draft
**Created:** 2026-03-17
**Amends:** PRD-002 (Plan Tab)

---

## 1. Summary

Five targeted improvements to the Plan tab: persistence of plan data across navigation, a layout width constraint, a redesigned calorie input model, dual notes fields per section, and a replacement for the drop bag summary table with a card-based Packing Plan view.

---

## 2. Changes

### 2.1 Persistence

**Problem:** Plan inputs are lost when the user navigates away from the tab and returns.

**Change:** All `SectionPlan` fields are auto-saved to DynamoDB with a 600ms debounce. On page load, existing `SECTION#` records for the race are fetched and pre-populate the section cards. This mirrors the existing pattern used by arrival estimates.

**Data model — no schema changes required.** The `SECTION#` record shape from PRD-002 §8 is correct. The race-level `caloriesPerHour` field (added to the Race record by PRD-002) must also be persisted and loaded.

**Cascade delete:** When a race is deleted, the delete function must also remove all `SECTION#` records for that race, in addition to the `AID#` records already required. The delete operation queries for all `SECTION#` SK prefixes under `PK: RACE#<id>` and deletes them in the same batch. This is an **enforcement requirement** — the race delete function must not return success until all three record types have been removed.

**API routes required:**
- `GET /api/races/[raceId]/sections` — returns all `SectionPlan` records for the race
- `PUT /api/races/[raceId]/sections/[fromStationOrder]` — upserts a single `SectionPlan` record
- The existing `DELETE /api/races/[raceId]` must be updated to cascade-delete `SECTION#` records

---

### 2.2 Layout Width Constraint

**Problem:** The Plan tab renders full-width on wide viewports, making section cards difficult to read — lines are too long and the two-column card layout (context / inputs) becomes visually unwieldy.

**Change:** The Plan tab content container is constrained to `max-w-2xl` and centered with `mx-auto`. This applies to the race-level calorie rate header, the section card list, and the Packing Plan section. The Pace tab and other sibling tab content are unaffected.

---

### 2.3 Calorie Rate Redesign

**Problem:** The current design places a calories-per-hour input inside each section card. This creates repetitive data entry — most runners have a single target rate for the whole race — and makes it hard to see how the rate affects all sections at once.

**Change:**

A **race-level calories-per-hour** input is placed at the top of the Plan tab, above the first section card, inside a compact settings row. Label: "Calories / hr". This value is saved to the Race record's `caloriesPerHour` field. It applies to all sections by default.

Each section card displays a **computed calorie total** = `caloriesPerHour × sectionDurationHours`, formatted as a rounded integer (e.g. "~420 kcal"). This is read-only display.

The runner can **override** the total for a specific section via a numeric input that replaces the computed display when populated. This maps to the existing `caloriesOverride` field on `SectionPlan`. When an override is set, it is displayed with a visual indicator (e.g. a small "override" label or a different text color) so the runner knows this section deviates from the race default. Clearing the override input restores the computed value.

**No per-section cal/hr input.** The per-section calorie rate field is removed entirely. The only calorie input per section is the optional total override.

**When no pace is set:** `sectionDurationHours` is null, so the computed total shows "—" rather than a number. The race-level cal/hr input is still editable and saved.

**Type changes to `SectionPlan`:** No new fields. `caloriesOverride` remains as-is (null = use race default × section hours).

**Type changes to `Race`:** `caloriesPerHour: number | null` — null means not set, shown as empty input.

---

### 2.4 Two Notes Fields Per Section

**Problem:** A single notes field per section conflates two distinct use cases: packing logistics (what food to put in this section's baggie) and general race notes (crew instructions, reminders, context). These have different audiences and different future uses.

**Change:** Each section card has two notes fields, replacing the current single `notes` field.

**Field 1 — Packing List**
- Label: "Packing list"
- Placeholder: "List food to pack for this segment, e.g. 4× gel, 2× bar, 1× rice ball"
- Purpose: what the runner physically packs into this section's food baggie
- Saved to: `SectionPlan.packingList: string`

**Field 2 — General Notes**
- Label: "Notes"
- Placeholder: "Reminders, crew instructions, anything else"
- Purpose: freeform, intended for later use as the basis of a crew-facing plan
- Saved to: `SectionPlan.crewNotes: string`

**Data model change:** `SectionPlan.notes: string` is replaced by `SectionPlan.packingList: string` and `SectionPlan.crewNotes: string`. Both default to empty string. Migration: existing `notes` values are not migrated (the feature is pre-launch).

---

### 2.5 Replace Drop Bag Summary with Packing Plan

**Problem:** The current drop bag summary is a table. Tables are good for comparison; they are poor for physical packing. A runner packing bags before a race needs to work through one bag at a time, not scan across a table. The current layout also doesn't clearly map to the physical reality of how a drop bag is organised.

**Change:** The table is removed and replaced with a **Packing Plan** section — a vertically stacked list of cards, one per drop-bag station (including Start and Finish).

**Card structure — each card represents one drop bag:**

Header: station name + distance marker (e.g. "Chicken Out Ridge — mile 46.2")

**Gear section** (top of card body):
A compact horizontal checklist of the big gear items for the section starting at this station. Items are shown only when flagged `true` — items not needed are hidden to reduce visual noise. Items: Headlamp · Extra layer · Rain gear · Poles · Shoe change. Each shown as a small badge or pill.

If no gear items are flagged for this section, the gear row is omitted.

**Food & drink section** (below gear):
One "baggie" block per section that departs from this station. In most cases, a drop bag station starts only one section, so there is one baggie. For the Start, there may be one baggie for the pre-first-drop-bag leg.

Each baggie block shows:
- A label: "To [next drop bag station name]" (e.g. "To Chicken Out Ridge")
- Distance + estimated time for that leg (e.g. "23.1 mi · ~4h 20m")
- Drink mixes count (e.g. "3× drink mix") — shown only if > 0
- Estimated calories (computed or overridden) — shown as "~420 kcal"
- Packing list text — shown below the structured data, greyed out if empty

**Design intent:** The runner physically assembles one baggie per leg (a zip-lock bag of food + mixes), labels it "To [next station]", and drops all baggies for a station into the drop bag. The card layout mirrors this physical action.

**General notes:** If `crewNotes` is non-empty for any section starting at this station, it is shown in a separate "Notes" row at the bottom of the card, beneath the baggie(s). Label: "Notes for crew".

**This view is read-only.** No inputs — all data is derived from section card entries above.

---

## 3. Type Changes Summary

```diff
// src/types/section.ts — SectionPlan
- notes: string
+ packingList: string
+ crewNotes: string

// Race record (DynamoDB + Race type)
+ caloriesPerHour: number | null
```

---

## 4. Component Changes Summary

| Component | Change |
|---|---|
| `PlanTab.tsx` | Add race-level cal/hr input at top; constrain to `max-w-2xl mx-auto`; replace `<DropBagSummary>` with `<PackingPlan>` |
| `SectionCard.tsx` | Remove per-section cal/hr input; show computed calorie total (with override); replace single `notes` with `packingList` + `crewNotes` textareas |
| `DropBagSummary.tsx` | Delete |
| `PackingPlan.tsx` | New component — card-per-station layout as specified in §2.5 |
| `GET /api/races/[raceId]/sections` | New route |
| `PUT /api/races/[raceId]/sections/[fromStationOrder]` | New route |
| `DELETE /api/races/[raceId]` | Updated to cascade-delete `SECTION#` records |

---

## 5. What This Does Not Change

- Section boundary logic (drop-bag stations only) — unchanged from PRD-002
- Gear flag inputs (headlamp, extra layer, etc.) — unchanged
- Drink mixes input — unchanged
- Refill stop count display — unchanged
- Auto-save debounce mechanism (600ms) — unchanged, extended to cover new fields
- Tab visibility when no pace is set — unchanged (show "—" placeholders, set-pace banner)

---

## 6. Decisions Log

| Decision | Choice | Rationale |
|---|---|---|
| Cal/hr placement | Race-level only, top of plan | Most runners have one target rate; per-section entry was repetitive and obscured the total |
| Calorie override | Per-section total override retained | Edge cases exist (e.g. long exposed section) where the runner wants to deviate from the race rate |
| Notes split | Two fields: packing list + general notes | Different audiences (self vs. crew), different future uses; conflating them in one textarea creates noise |
| Packing plan layout | Cards over table | Physical packing is one bag at a time, not a comparison task; card-per-station matches the runner's mental model |
| Baggie metaphor | One baggie block per departing section | Maps directly to how runners physically pre-pack drop bags; the label "To [next station]" survives the transition from planning to physical execution |
| Cascade delete | Enforced in delete function, same batch | Orphaned SECTION# records are a data integrity problem; enforcement at application layer matches existing AID# pattern |
| Width constraint | `max-w-2xl mx-auto` | 672px max is readable for the two-column card layout; wider leads to uncomfortably long input lines |
