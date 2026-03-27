# PRD-020 — FAQ Content Corrections

**Status:** Draft
**Date:** 2026-03-27
**Amends:** `marketing/08-faq-content.md` (FAQ content source of truth)
**Related:** PRD-018 (FAQ page integration)

---

## 0. Summary

Three factual corrections to the FAQ content. No structural changes — content only.

---

## 1. Changes

### 1.1 "Who built PlanUltra?" — location correction

**Current:**
> PlanUltra was built by Dan James, a product manager and ultramarathon runner based in the UK.

**Replace with:**
> PlanUltra was built by Dan James, a product manager and ultramarathon runner based in Charlotte, NC.

---

### 1.2 "How does pace estimation work?" — remove future-tense for GAP

**Current:**
> You enter a flat pace (minutes per mile or minutes per km) or a target finish time. PlanUltra uses this to estimate your arrival time at each aid station. Phase 1 uses flat-rate pace. A future update will support grade-adjusted pace (accounting for elevation gain and loss using a Naismith-style heuristic), which better matches real ultramarathon performance.

**Replace with:**
> You enter a target finish time and PlanUltra distributes that time across each segment, weighted by distance and elevation. Segments with more climbing or descending are allocated more time than flat segments of the same distance — so a short, steep climb gets more time than a long flat stretch. You can also override the estimated arrival at any aid station to act as a fixed anchor, and PlanUltra redistributes the remaining time around it.

---

### 1.3 "How accurate are the arrival time estimates?" — remove GAP Phase 2 reference

**Current:**
> Treat them as planning anchors, not predictions. Flat-pace estimation doesn't account for elevation, fatigue, or aid station stops. They're accurate enough to anchor your weather window, your crew's schedule, and your drop bag planning — which is the intended use. Grade-adjusted pace (Phase 2) will improve accuracy significantly.

**Replace with:**
> Treat them as planning anchors, not predictions. The estimates account for elevation (more time for climbs and descents) but not fatigue, technical terrain, or aid station stops. They're accurate enough to anchor your weather window, your crew's schedule, and your drop bag planning — which is the intended use. For higher accuracy, use the manual override feature to lock in your target time at a key mid-race station.

---

### 1.4 "What is grade-adjusted pace for ultramarathons?" — remove Phase 2 forward-reference

This answer in the "Ultramarathon planning (general)" section describes GAP as something PlanUltra is planning to add. It needs to reflect that it's live.

**Current:**
> Grade-adjusted pace (GAP) adjusts your per-mile pace to account for elevation change. Running uphill at 15 min/mile might feel equivalent to 10 min/mile on flat ground — GAP normalises for this. Tools like Strava display GAP for activities. PlanUltra Phase 1 uses flat pace; Phase 2 will implement a Naismith-style heuristic to produce more accurate arrival time estimates on hilly courses.

**Replace with:**
> Grade-adjusted pace (GAP) adjusts your per-mile pace to account for elevation change. Running uphill at 15 min/mile might feel equivalent to 10 min/mile on flat ground — GAP normalises for this. Tools like Strava display GAP for activities. PlanUltra's pace calculator uses a terrain-weighted model: each segment is weighted by its gross climbing and descending, so arrival time estimates automatically reflect the difficulty of each leg, not just its distance.

---

## 2. Implementation

Update `marketing/08-faq-content.md` with the four changes above. Then update `src/app/faq/page.tsx` and the `FAQPage` JSON-LD schema to match — per PRD-018 §8, the FAQ page is hardcoded from the marketing doc and must be kept in sync manually.

No other files are affected.
