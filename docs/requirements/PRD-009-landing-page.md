# PRD-009: Landing Page Redesign
**Status:** Draft
**Created:** 2026-03-21
**Replaces:** PRD-003 §7 (Landing page application notes)
**Reference mockup:** `requirements/mockups/landing-page-v2.html`

---

## 0. Reference Mockup

```
requirements/mockups/landing-page-v2.html
```

Open the mockup in a browser before starting implementation. It demonstrates the full page layout, hero SVG mountain composition, feature card hover states, step connector, and bottom CTA section. The written spec below is authoritative; the mockup clarifies intent.

---

## 1. Overview

The landing page is the first thing a prospective user sees. It has three jobs:

1. Communicate the value proposition immediately — what is PlanUltra and who is it for
2. Build enough confidence that the visitor clicks "Get Started"
3. Reflect the visual identity of the Ridge Light design system (PRD-003)

The existing landing page uses the mountain SVG hero from PRD-003. This redesign refreshes the hero imagery to use flowing, layered wave-form ridgelines inspired by the reference image supplied — multi-depth mountain layers in the Ridge palette including a teal-green atmospheric accent — while remaining fully SVG/CSS with no image assets.

---

## 2. Page Structure

| Section | Element | Notes |
|---|---|---|
| 1 | Navigation | Transparent overlay on hero |
| 2 | Hero | Full-bleed, min-height 680px |
| 3 | Feature cards | Three cards, white background |
| 4 | Stats bar | Dark bar, four statistics |
| 5 | How it works | Three-step flow, Mist background |
| 6 | Bottom CTA | Dark, mirrors hero palette |
| 7 | Footer | Minimal |

---

## 3. Navigation

The nav is positioned absolutely over the hero — transparent, no background — so the hero fills the full viewport height.

- Logo: white text + white triangle SVG icon (same mark as existing, no change to shape)
- Right: single "Sign in" ghost button — `rgba(255,255,255,0.15)` fill, `rgba(255,255,255,0.4)` border, backdrop-blur
- No other nav items on this page — this is a marketing page, not the app shell
- On scroll past the hero, nav becomes sticky with a `var(--midnight)` background and Sky border-bottom (same behavior as app nav, but dark)

---

## 4. Hero Section

### 4.1 Background — layered SVG mountain composition

The hero background is a full-bleed SVG (`viewBox="0 0 1440 680"`, `preserveAspectRatio="xMidYMax slice"`) with five wave-form ridge layers plus atmospheric elements. All colors derive from the Ridge palette.

**Layer order (back to front):**

| Layer | Description | Color | Opacity |
|---|---|---|---|
| Base rect | Sky gradient | `#0a1628 → #02071E` (vertical) | 100% |
| Atmosphere | Teal ellipse wash at top | Horizontal gradient: `#0d6e6e → #1D7CBE → #82C7F6` | 35% |
| Ridge 5 (furthest) | High, undulating path | `#1D7CBE` | 18% |
| Ridge 4 | Second back | `#0e4d6e` | 55% |
| Ridge 3 | Mid distance | Ridge Blue gradient | 70% |
| Ridge 2 | Closer | Deep-to-Midnight gradient | 85% |
| Ridge 1 | Near | Dark gradient | 92% |
| Foreground base | Ground plane | Near-Midnight gradient | 100% |

The teal atmospheric element is a deliberate nod to the green tones in the reference image. It sits at the very top of the frame as a colour wash only — it does not represent a specific landform.

All ridge paths are smooth cubic bezier curves (not polygons) to produce the flowing, wave-like quality of the reference image.

### 4.2 Overlay

A `position: absolute; inset: 0` gradient overlay sits above the SVG mountains at z-index 2:

```css
background: linear-gradient(180deg,
  rgba(29, 124, 190, 0.35) 0%,    /* Ridge Blue tint at top */
  rgba(17, 69, 116, 0.5)  35%,    /* Deep Ridge mid */
  rgba(2, 7, 30, 0.85)    100%    /* Midnight at bottom — grounds content */
);
```

This deepens the lower portion of the hero for text legibility without losing the mountain silhouettes.

### 4.3 Hero content

Centered, z-index 10, max-width 760px, padding 80px top / 60px bottom.

**Eyebrow:**
- Text: "Multi-stage race planning"
- Font: Geist Sans, 12px, weight 700, uppercase, letter-spacing 0.15em
- Color: `var(--sky)` at 90% opacity

**Headline:**
- Text: "Because the miles are hard enough"
- Font: DM Sans, `clamp(38px, 6vw, 64px)`, weight 800
- Color: white
- Letter-spacing: `-0.03em`, line-height: 1.08
- The word "hard" is wrapped in a `<span>` with `color: var(--sky)` for emphasis

**Description:**
- Text: "You've done the hard training, now let's pack your drop bags for success. Plan Ultra is a free tool to help ultra runners plan how to organize their gear so that they and their crew are prepared for every leg of the race."
- Font: Geist Sans, `clamp(15px, 2vw, 18px)`
- Color: `rgba(255,255,255,0.75)`
- Max-width: 580px, centered, line-height: 1.65

**CTA button:**
- Text: "Get Started"
- Style: primary button (PRD-003 §5) adapted for hero — larger padding (`14px 36px`), font-size 16px
- Background: `var(--ridge-blue)`, box-shadow `0 4px 20px rgba(29,124,190,0.45)`
- Hover: white background + Ridge Blue text (inverted) — ensures legibility against the dark hero on hover

**Sub-text below button:**
- "Free · No credit card required"
- Font: Geist Sans 13px
- Color: `rgba(255,255,255,0.4)`

### 4.4 Scroll hint

A subtle scroll indicator at the bottom center of the hero: "SCROLL" label (10px, uppercase, white 40% opacity) + a CSS chevron arrow. Purely decorative, no JS required.

---

## 5. Feature Rows

White background section. Max-width 1200px, `padding: 80px 48px`.

**Eyebrow:** "Everything you need" — Ridge Blue, uppercase, 11px, letter-spacing 0.12em

**Heading:** "From the start line to the finish tape" — DM Sans, `clamp(26px, 4vw, 36px)`, weight 800, Midnight

Three full-width **feature rows**, each pairing a text column with an illustration column in a 50/50 split. Rows alternate direction (text-left / illustration-right, then illustration-left / text-right, then text-left / illustration-right).

Row layout: `display: grid; grid-template-columns: 1fr 1fr; gap: 64px; align-items: center`. On mobile (< 640px) the grid collapses to a single column with the text block first regardless of `direction`.

### 5.1 Row 1 — Upload your GPX (text left, map illustration right)

**Text block:**
- Feature number badge: "01" — Geist Mono, 11px, Ridge Blue
- Title: "Upload your GPX" — DM Sans, `clamp(20px, 3vw, 28px)`, weight 800, Midnight
- Body: "Drop in your race GPX file and PlanUltra maps every aid station, calculates your elevation profile, and sets up your section boundaries automatically." — Geist Sans 15px, Deep Ridge 80% opacity
- Body 2: "Works with any race file — from Western States to UTMB." — Geist Sans 14px, Deep Ridge 55% opacity

**Illustration:** SVG topo map (see §5.4). Contained in a `border-radius: 16px` card with `background: var(--mist)`, `border: 1px solid var(--sky)` at 30% opacity, `padding: 24px`.

### 5.2 Row 2 — Build a plan (illustration left, text right)

**Text block:**
- Feature number badge: "02"
- Title: "Build a plan"
- Body: "Figure out what you'll need for each segment — guided by weather forecasts, sunset and sunrise times, and distance. Know before you go."
- Body 2: "Night segments, weather warnings, and headlamp reminders surface automatically."

**Illustration:** Two live `<SectionCard>` components rendered with mock data (see §5.5). Contained in the same card treatment as Row 1.

### 5.3 Row 3 — Pack for success (text left, bag cards right)

**Text block:**
- Feature number badge: "03"
- Title: "Pack for success"
- Body: "Get a clear plan showing what to pack in each drop bag, and how to organize your gear so you have exactly what you need for each leg of the race."
- Body 2: "Share a crew link so your support team knows exactly when to expect you and what you need."

**Illustration:** Three live `<DropBagCard>` components rendered with mock data (see §5.6). Start bag expanded; COR and Big Mountain bags collapsed. Same card container treatment.

### 5.4 Map illustration (Row 1)

A pure inline SVG (`viewBox="0 0 440 300"`) — no external assets, no Mapbox.

Elements (all in Ridge palette):
- Concentric contour ellipses for 4 hills in Deep Ridge at 15–25% opacity
- Winding route path in Ridge Blue (`stroke-width: 3`) with a subtle glow (`filter: drop-shadow(0 0 6px rgba(29,124,190,0.5))`)
- Aid station dots: filled circles (`fill: var(--ridge-blue)`, `r: 6`) + white dot center (`r: 2`) + text label in Geist Sans 10px
- Elevation mini-strip at the bottom of the SVG: a filled area path in Ridge Blue at 20% opacity with a Ridge Blue stroke on top

The SVG is self-contained in the JSX. Do not use a separate file.

### 5.5 Section card mock data (Row 2)

Render two `<SectionCard>` instances from `@/components/plan/SectionCard` with the following mock props. No data fetching — props are hardcoded in the `LandingFeatures` client component.

**Card 1:**
```ts
{
  order: 1,
  startMile: 0,
  endMile: 18.4,
  startAid: "Start",
  endAid: "Cougar Rock",
  estimatedArrival: "5:00 AM",
  conditions: [
    { type: "night", label: "Night running", value: "Full segment", sublabel: "Entire leg in darkness" },
    { type: "sunrise", label: "Sunrise", value: "~mile 4 · 5:48 AM", sublabel: "Starts dark · light by mile 4" },
    { type: "weather-clear", label: "Weather", value: "48°F → 56°F", sublabel: "Clear · light wind" }
  ]
}
```

**Card 2:**
```ts
{
  order: 5,
  startMile: 43.6,
  endMile: 62.0,
  startAid: "Big Mountain",
  endAid: "Pole Line Pass",
  estimatedArrival: "3:07 PM",
  conditions: [
    { type: "sunset", label: "Sunset", value: "~mile 52 · 8:24 PM", sublabel: "Headlamp needed from ~mile 52" },
    { type: "weather-storm", label: "Weather", value: "54°F → 61°F", sublabel: "Storm risk 2–5 PM", span2: true }
  ]
}
```

### 5.6 Drop bag card mock data (Row 3)

Render three `<DropBagCard>` instances from `@/components/pack/DropBagCard` with mock props. Start bag is `defaultOpen={true}`; others `defaultOpen={false}`.

**Start bag:**
```ts
{
  name: "Start",
  location: "Race start — mile 0",
  gear: ["Headlamp", "Extra layer"],
  baggies: [{ destination: "→ Cougar Rock", items: ["3× drink mix", "4× gels", "2× bars"], calories: 1225 }],
  visitSchedule: [{ time: "5:00 AM", crew: false }]
}
```

**COR bag (collapsed):**
```ts
{ name: "Cougar Rock", location: "Mile 18.4", gear: ["Poles", "Sunscreen"], baggieCount: 2 }
```

**Big Mountain bag (collapsed):**
```ts
{ name: "Big Mountain", location: "Mile 43.6", gear: ["Night gear", "Warm layer"], baggieCount: 3 }
```

### 5.7 `LandingFeatures` client component

The main `page.tsx` is a server component. Illustrations use real React components that may carry client-side hooks. Wrap all three illustration columns in a single `LandingFeatures` client component:

```tsx
// src/app/(marketing)/LandingFeatures.tsx
"use client"

import { MapIllustration } from "./MapIllustration"  // inline SVG wrapper
import { SectionCard } from "@/components/plan/SectionCard"
import { DropBagCard } from "@/components/pack/DropBagCard"

// Mock data constants defined here (see §5.5, §5.6)

export function LandingFeatures() {
  return (
    <>
      <MapIllustration />
      <div className="flex flex-col gap-3">
        <SectionCard {...mockCard1} />
        <SectionCard {...mockCard2} />
      </div>
      <div className="flex flex-col gap-2">
        <DropBagCard {...mockStartBag} defaultOpen />
        <DropBagCard {...mockCorBag} />
        <DropBagCard {...mockBigMtnBag} />
      </div>
    </>
  )
}
```

`page.tsx` imports `LandingFeatures` and places each exported sub-component into the appropriate row's illustration column. The text columns remain in the server component and need no `"use client"` marker.

**Why not separate client components per row?** One wrapper keeps the mock data co-located, avoids three separate hydration roots, and makes it easy to spot that these are landing-page-only mocks when the real components evolve.

---

## 6. Stats Bar

Dark band (`var(--midnight)` background), `padding: 36px 48px`. Four statistics displayed horizontally, centered, with 1px Sky-20% dividers between them.

| Stat | Value | Label |
|---|---|---|
| 1 | 100s | of miles planned |
| 2 | Free | Always |
| 3 | GPX | Any race file |
| 4 | Crew | Shareable plans |

Stat value: DM Sans 36px weight 800, `var(--sky)`, letter-spacing -0.03em.
Stat label: Geist Sans 13px, `rgba(255,255,255,0.5)`, uppercase, letter-spacing 0.07em.

On mobile (< 560px), wrap to 2×2 grid and hide the dividers.

---

## 7. ~~How It Works~~ (removed — replaced by §5 Feature Rows)

The original three-step "How It Works" section has been removed. The feature rows in §5 serve this purpose with more visual impact and live component illustrations. Do not implement this section.

---

## 8. Bottom CTA Section

Dark section (`var(--midnight)` background) mirroring the hero palette. `padding: 80px 48px`, text-align center.

A faint SVG mountain echo is positioned at the bottom of this section — two simple wave paths in white at low opacity (6%), anchored to the bottom edge. This creates a visual echo of the hero without repeating it literally.

**Eyebrow:** "Ready to plan?" — `var(--sky)` 70% opacity
**Headline:** "Your best race starts here" — DM Sans, `clamp(28px, 5vw, 48px)`, weight 800, white
**Body:** "Join runners who prep smarter, pack cleaner, and show up to the start line ready for every mile." — Geist Sans 16px, white 55% opacity
**Button:** "Get Started" — same style as hero CTA

---

## 9. Footer

Minimal. Dark background (`var(--midnight)`), Sky border-top at 12% opacity.

- Left: logo wordmark "PlanUltra ▲" in white 50% opacity, DM Sans
- Right: "Free forever · Built for ultra runners" — Geist Sans 12px, white 25% opacity

No links, no legal copy, no social icons in this phase.

---

## 10. Responsive Behavior

| Breakpoint | Changes |
|---|---|
| < 768px | Hero title font-size clamps down; hero padding reduces |
| < 640px | Feature rows collapse to single column; illustration column moves below text |
| < 560px | Stats bar wraps to 2×2 grid; illustration containers reduce padding to 16px |
| < 480px | Nav "Sign in" button hidden (replaced by CTA button in hero) |

---

## 11. Implementation Notes

### 11.1 File to modify

`src/app/page.tsx` — the existing landing page. This is a server component (no `"use client"` needed).

### 11.2 SVG mountain

The hero SVG is inline in the JSX — not an external file. This avoids an asset request and allows the colors to reference CSS variables if needed.

All path coordinates from the mockup are correct and should be copied directly. Do not regenerate or simplify the paths — the specific curve shapes produce the flowing layered quality.

### 11.3 Button action

The "Get Started" CTA button and the nav "Sign in" button both link to `/auth/signin`. Use Next.js `<Link>` component with `href="/auth/signin"`.

### 11.4 DM Sans dependency

DM Sans must be loaded in `src/app/layout.tsx` (PRD-003 work item 15). This page requires it for the hero title, section headings, step titles, feature card titles, and stat values. If work item 15 is not yet complete, implement it as part of this change.

### 11.5 No JavaScript required

The landing page has no interactive elements requiring client-side JS. The scroll hint and button hover states are CSS-only. The sticky nav behavior on scroll can be implemented with a `scroll-driven` CSS approach or a minimal `useEffect` — prefer CSS if supported, otherwise a single `IntersectionObserver` on the hero section.

---

## 12. Copy (final, verbatim)

**Hero eyebrow:** Ultra marathon race planning

**Hero headline:** Because the miles are hard enough

**Hero description:** You've done the hard training, now let's pack your drop bags for success. Plan Ultra is a free tool to help ultra runners plan how to organize their gear so that they and their crew are prepared for every leg of the race.

**Hero CTA:** Get Started

**Hero sub-label:** Free · No credit card required

**Feature section eyebrow:** Everything you need

**Feature section heading:** From the start line to the finish tape

**Feature 1 title:** Upload your GPX
**Feature 1 body:** Drop in your race GPX file and PlanUltra maps every aid station, calculates your elevation profile, and sets up your section boundaries automatically.

**Feature 2 title:** Build a plan
**Feature 2 body:** Figure out what you'll need for each segment — guided by weather forecasts, sunset and sunrise times, and distance. Know before you go.

**Feature 3 title:** Pack for success
**Feature 3 body:** Get a clear plan showing what to pack in each drop bag, and how to organize your gear so you have exactly what you need for each leg of the race.

**How it works eyebrow:** How it works

**How it works heading:** Race day prep in three steps

**Bottom CTA eyebrow:** Ready to plan?

**Bottom CTA headline:** Your best race starts here

**Bottom CTA body:** Join runners who prep smarter, pack cleaner, and show up to the start line ready for every mile.

**Bottom CTA button:** Get Started

**Footer note:** Free forever · Built for ultra runners
