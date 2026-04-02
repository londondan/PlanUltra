# PRD-023 — Homepage Reposition: Crew Sheet as Hero Artifact

**Status:** Draft
**Date:** 2026-03-31
**Supersedes:** PRD-009 (Landing Page Redesign), PRD-015 (Landing Page Updates v2)
**Reference mockup:** `docs/requirements/homepage-reposition-mockup.html`
**Pre-reading:** PRD-003 (Ridge Light design system), PRD-010 (Crew Sheet), PRD-022 (Crew Travel)

---

## 0. Mandatory Pre-Reading

Before implementing, open and read:
- `docs/requirements/homepage-reposition-mockup.html` — **canonical visual spec**. Open this in a browser first. It shows every section, the crew sheet demo with real Grindstone data, the builder identity section, and the trust pills. The written spec below governs logic and data; the mockup governs visual intent.
- **PRD-003** — Ridge Light design system (colors, typography, spacing)
- **PRD-010** — Crew Sheet spec (station card structure, condition chips)
- **PRD-022** — Crew Travel (location block, QR codes, segment bridge, parking badges, Mapbox drive times)

Where this PRD conflicts with PRD-009 or PRD-015, **this PRD wins**. PRD-009 and PRD-015 are superseded in full.

---

## 1. What To Keep, What To Replace

This section exists to give the dev agent an unambiguous list. When in doubt, default to "keep" for visual/structural elements and "replace" for copy and section content.

### Keep exactly as-is (do not modify)

| Element | Location in codebase | Notes |
|---|---|---|
| SVG mountain hero background | `src/app/page.tsx` — hero section | All 5 ridge layer paths, the teal atmosphere wash, the gradient overlay. No changes to any SVG coordinates or colors. |
| Ridge Light design system | PRD-003, `tailwind.config`, `globals.css` | Colors, type scale, spacing tokens — unchanged |
| PlanUltra wordmark | Nav component | `Plan` white + `Ultra` Sky, same triangle mark |
| Sticky nav scroll behavior | Existing nav logic | Transparent over hero, Midnight on scroll |
| Bottom CTA SVG mountain echo | `src/app/page.tsx` — bottom CTA | The two faint wave paths at the bottom of the dark CTA section |
| Auth routing | `/auth/signin` | All CTAs route here unchanged |

### Replace in full

| Element | What replaces it |
|---|---|
| Hero copy (eyebrow, headline, description, CTA label) | New crew-focused copy per §4.2 |
| Hero sub-label ("Free · No credit card required") | Trust pills per §4.3 |
| All three feature rows + `<LandingFeatures />` component | Crew Sheet Demo section (§5) + Feature Cards section (§6) |
| `<SectionCard>` and `<DropBagCard>` illustration components | `<CrewSheetDemo />` component |
| Stats Bar section | Removed entirely — not replaced |
| Bottom CTA copy | New copy per §9 |
| Footer right-hand note | New copy per §10 |

### New sections (add these)

- §5 Crew Sheet Demo — the centrepiece, two-column layout
- §6 Feature Cards — 2×2 static grid
- §7 How It Works — three steps
- §8 Builder Identity — why it's free

---

## 2. Page Structure

| # | Section | Background | Status |
|---|---|---|---|
| 1 | Navigation | Midnight (transparent → sticky) | Keep, simplified copy |
| 2 | Hero | Midnight → Deep Ridge SVG (keep) | Keep background, replace copy |
| 3 | Crew Sheet Demo | White | New |
| 4 | Feature Cards | `#f8fbfe` | New |
| 5 | How It Works | White | New |
| 6 | Builder Identity | Midnight | New |
| 7 | Bottom CTA | Midnight (keep SVG echo) | Keep background + echo, replace copy |
| 8 | Footer | Midnight | Keep, update right-hand copy only |

---

## 3. Navigation

Simplified from PRD-009. Keep the existing transparent-on-hero / sticky-on-scroll behaviour and wordmark. Replace the right-side content only:

- Remove: "Sign in" ghost button
- Add: `"See an example ↗"` — `rgba(255,255,255,0.6)`, links to `https://planultrarace.com/crew/mn7jrA-wOyPOB-qk`, opens new tab
- Add: `"Build a crew plan"` — Ridge Blue filled button, `padding: 8px 18px`, links to `/auth/signin`

---

## 4. Hero Section

### 4.1 Background

**Keep the existing SVG mountain composition from PRD-009 §4.1 without any modifications.** All ridge layer paths, the teal atmosphere wash, and the gradient overlay are unchanged. This is the only part of the hero that is fully retained.

### 4.2 Copy

Replace all text content in the hero. Verbatim copy:

**Eyebrow:** `"Race day crew planning"`
Geist Sans, 11px, uppercase, letter-spacing 0.14em, Sky 70% opacity

**Headline:**
> Give your crew *one link.*
> Everything they need is in it.

DM Sans, `clamp(32px, 5vw, 54px)`, weight 800, white, letter-spacing -0.02em, line-height 1.15.
`"one link."` wrapped in `<em>` with `color: var(--sky); font-style: normal`.

**Subheadline:**
> "PlanUltra builds a shareable crew sheet your team can open on their phone, print as backup, and navigate from at every aid station — no app, no account, works without cell signal."

Geist Sans, 18px, `rgba(255,255,255,0.65)`, max-width 560px, centered, line-height 1.65.

**Primary CTA:** `"Build your crew plan — it's free"` — Ridge Blue button, `padding: 14px 28px`, 16px weight 700, links to `/auth/signin`.

**Secondary CTA:** `"See a real crew sheet ↗"` — Sky color, 15px, links to `https://planultrarace.com/crew/mn7jrA-wOyPOB-qk`, new tab.

### 4.3 Trust pills

Four pills below the CTA row. These address the AI slop / subscription-trap objection immediately.

```
[ Free forever ]  [ No subscription ]  [ No ads ]  [ Open source ]
```

- Font: Geist Mono, 11px, `rgba(255,255,255,0.35)`, letter-spacing 0.03em
- Border: `1px solid rgba(255,255,255,0.1)`, `border-radius: 20px`, `padding: 3px 12px`
- Background: transparent
- Layout: `display: flex; gap: 8px; justify-content: center; flex-wrap: wrap; margin-top: 20px`
- No hover state

If the SVG mountain background makes the pills invisible at 35% opacity, increase to 50% and retest.

---

## 5. Crew Sheet Demo Section

This is the centrepiece of the page. It replaces the feature rows entirely.

### 5.1 Layout

White background, `padding: 80px 32px`. Two-column grid on desktop:

```
[Text column — 1fr]   [Crew sheet demo — 1.8fr]
```

`display: grid; grid-template-columns: 1fr 1.8fr; gap: 64px; align-items: start; max-width: 1040px; margin: 0 auto`

On mobile (`< 640px`): single column, text first, crew sheet below.

### 5.2 Text column

**Section label:** `"The crew sheet"` — Geist Mono, 11px, uppercase, Ridge Blue, letter-spacing 0.12em

**Subtext:** `"↓ Real example: 2025 Grindstone 100"` — Geist Mono, 11px, `rgba(17,69,116,0.45)`

**Heading:** `"This is what your crew gets."` — DM Sans, `clamp(24px, 3.5vw, 36px)`, weight 800, Midnight

**Body:**
> "One URL. Open it on any phone. Print it as backup. Navigate directly from it — even without signal."

**Feature checklist** — plain list, Ridge Blue checkmarks, Geist Sans 14px, `rgba(2,7,30,0.65)`, 1px Sky-20% border between items:

- ✓ Aid station locations with Google Maps QR codes
- ✓ Drive time between each crew stop
- ✓ Parking notes and access directions
- ✓ Exactly what to have ready at each station
- ✓ Weather, sunrise, and sunset for race day
- ✓ Intermediate checkpoints so they know where you are
- ✓ Prints cleanly to A4

### 5.3 Crew sheet demo component

**Component:** `<CrewSheetDemo />` — React client component (`"use client"`) at `src/app/(marketing)/CrewSheetDemo.tsx`.

**Implementation:** Hardcoded Grindstone 100 data. Not a live fetch from the crew sheet route — the homepage must load without network dependencies on demo content.

**Scrollable container:** Wrap the demo in a `div` with `max-height: 720px; overflow-y: auto` on desktop, `max-height: 600px` on mobile. Add a `::after` fade-out gradient (`linear-gradient(to bottom, transparent, white)`) at the bottom to signal scrollability.

**Visual spec:** Follow PRD-022 exactly — station card headers, location blocks, segment bridges, parking badges, crew notes (amber border), condition chips. See the reference mockup for the rendered result.

**Interactivity:**
- Directions buttons are real `<a>` links to `https://maps.google.com/?q={lat},{lng}`, `target="_blank" rel="noopener noreferrer"`. Functional, clickable.
- QR codes are real, scannable SVGs generated via the `qrcode` npm package, encoding `https://maps.google.com/?q={lat},{lng}`. Generated at component render time as inline SVG. Must be scannable by a phone camera.
- No print button in the demo.

### 5.4 Hardcoded Grindstone 100 data

Use the following data verbatim. Coordinates and location notes are real — do not use placeholders.

**Sheet header:**
- Race name: `"2025 Grindstone 100"`
- Runner line: `"Crew sheet for Daniel James · Friday, October 3"`
- Stats: `"10 crew stations · ~36h target · Est. finish Sun 6:00 AM"`

**Station 1 — Start / Finish**
```ts
{
  mile: 0.0,
  name: "Start / Finish",
  crewAccess: true,
  eta: "6:00 PM",
  crewParkingType: "parking-lot",
  crewParkingCoords: { lat: 38.3547324, lng: -79.0864161 },
  crewLocationNotes: null,  // no location notes for this station
  gear: ["Headlamp", "Poles", "Warm layer"],
  nutrition: "10× drink mix · ~99 kcal",
  supplies: "10 gels, 12 snacks (fruit snacks, gummies, etc.)",
  crewNotes: "Make sure I changed my batteries before the start. Check that I have all my mandatory equipment. Wish me luck!",
  quitNote: null,
  conditions: [
    { type: "night", label: "Night start" }
  ]
}
```

**Bridge 1 — Start → North River Gap**
```ts
{
  drive: { time: "11 min", distance: "4.9 mi" },
  destination: "North River Gap Aid Station #5 & #14",
  checkpoints: [
    { mile: 5.7,  name: "Lick Run Aid Station #1 & #15", eta: "7:30 PM" },
    { mile: 11.5, name: "Wolf Ridge Aid Station #2",      eta: "9:07 PM" },
    { mile: 20.4, name: "Reddish Knob Aid Station #3",    eta: "12:04 AM" },
    { mile: 24.3, name: "Little Bald Aid Station #4",     eta: "1:10 AM" }
  ]
}
```

**Station 2 — North River Gap Aid Station #5 & #14**
```ts
{
  mile: 32.9,
  name: "North River Gap Aid Station #5 & #14",
  crewAccess: true,
  eta: "3:46 AM",
  crewParkingType: "trailhead",
  crewParkingCoords: { lat: 38.3646, lng: -79.16292 },
  crewLocationNotes: "Walking access to Aid Station is 300 meters after leaving camp entrance and to your left.",
  gear: null,  // no drop bag gear for this station
  nutrition: "4× drink mix · ~1,093 kcal",
  supplies: "4 gels, 4 snacks",
  crewNotes: "I'll be fresh coming in here, I don't plan to stop for very long. Keep the stop under 5 minutes — check my headlamp battery status and make sure my knee is feeling fine.",
  quitNote: null,
  conditions: []
}
```

**Trailing indicator:** `"+ 8 more crew stations · Generated by PlanUltra"` — Geist Mono, 11px, `rgba(17,69,116,0.4)`, centered.

**QR code URLs to encode:**
- Station 1: `https://maps.google.com/?q=38.3547324,-79.0864161`
- Station 2: `https://maps.google.com/?q=38.3646,-79.16292`

**Directions button hrefs:**
- Station 1: `https://www.google.com/maps/place/94+Natural+Chimneys+Ln,+Mt+Solon,+VA+22843/@38.3547324,-79.088991,17z`
- Station 2: `https://www.google.com/maps/place/38%C2%B021'52.6%22N+79%C2%B009'46.5%22W/@38.3646,-79.1654949,17z`

**Drive time source:** The bridge drive times (11 min / 4.9 mi) are hardcoded from a real Mapbox Directions lookup. Do not make API calls from the marketing component — use the hardcoded strings.

---

## 6. Feature Cards Section

Four static copy cards in a 2×2 grid. No live React components.

**Background:** `#f8fbfe`
**Heading:** `"What's in the crew sheet"` — DM Sans, weight 800, Midnight
**Subhead:** `"Built by the runner. Everything the crew needs."` — Geist Sans 16px, muted

Grid: `display: grid; grid-template-columns: 1fr 1fr; gap: 24px; max-width: 960px; margin: 0 auto`. Single column on mobile.

Each card: white bg, `border: 1px solid rgba(130,199,246,0.3)`, `border-radius: 14px`, `padding: 28px`. Number badge: Geist Mono 11px Ridge Blue. Title: DM Sans 17px weight 800. Body: Geist Sans 14px `rgba(2,7,30,0.65)`. Detail line: Ridge Blue 13px, 1px Sky-20% top border.

| # | Title | Body | Detail |
|---|---|---|---|
| 01 | Navigate to every aid station — even without signal | Each crew-accessible station includes a Google Maps link and a QR code for offline directions. Remote trailheads, forest roads, unmarked pull-offs — your crew can find them at 3am. | QR code opens Google Maps even without cell service |
| 02 | Drive time between every crew stop | The sheet tells your crew exactly how long it takes to drive to the next station, so they know whether to leave immediately or whether they have time to rest. No more guessing. | Includes intermediate checkpoints so they can track your progress |
| 03 | Exactly what to have ready — no questions | Drop bag items, gear, food, and what to do if you're talking yourself out of the race at mile 70. It's all in the plan. They read it before the race and execute it on the day. | Includes an "if I say I want to quit" note |
| 04 | Weather, sunrise, and sunset — already there | Your crew knows when to expect you to need a headlamp, what temperature to dress for, and when the sun comes up. PlanUltra pulls conditions for your race date so your crew can prepare, not react. | — |

---

## 7. How It Works Section

White background. Max-width 720px, centered. `padding: 80px 48px`.

**Heading:** `"How it works"` — DM Sans weight 800
**Subhead:** `"Built by the runner. Used by the crew."` — Geist Sans 16px, muted

Steps separated by 1px Sky-20% borders. Step number: Geist Mono, Sky. Title: DM Sans weight 700. Body: Geist Sans 14px. Note: Geist Sans 13px italic, Ridge Blue.

| Step | Title | Body | Note |
|---|---|---|---|
| 01 | Runner sets up the race | Enter your race, aid stations, and cutoff times. PlanUltra maps out the course and pulls weather and light conditions for race day. | "Takes about 20 minutes" |
| 02 | Add crew locations and notes | Drop a pin for each crew-accessible station. Add parking notes, what you'll need at each stop, and anything else your crew should know — including what to do if you want to bail at mile 70. | — |
| 03 | Share one link with your crew | Your crew gets a single URL. It works on any phone, prints cleanly, and has everything — directions, drive times, gear lists, conditions — no app, no account needed. | "As a bonus, you've also built yourself a solid race plan" |

**CTA below steps:** `"Build your crew plan — it's free"` — Ridge Blue primary button, centered, `/auth/signin`.

---

## 8. Builder Identity Section

Addresses the AI slop / subscription-trap objection. Tone: matter-of-fact, not defensive. Placed between How It Works and the Bottom CTA.

### 8.1 Background and position

`background: var(--midnight)`, `border-top: 1px solid rgba(130,199,246,0.1)`, `padding: 72px 48px`.

Flows naturally from the dark How It Works CTA band — same Midnight background, separated by a hairline.

### 8.2 Layout

Two-column grid on desktop:

```
[Identity — 1fr]   [Copy — 2fr]
```

`display: grid; grid-template-columns: 1fr 2fr; gap: 64px; align-items: start; max-width: 900px; margin: 0 auto`

On mobile (`< 640px`): single column, **copy first**, identity block below.

### 8.3 Identity column

- Name: `"Dan James"` — DM Sans 22px weight 700, white
- Tag: `"Product Manager · Ultra runner"` — Geist Mono 13px, Sky 65% opacity
- Divider: 40px × 2px, Ridge Blue, `border-radius: 2px`, `margin: 12px 0`
- Links (Geist Sans 13px, `rgba(255,255,255,0.45)`, hover `rgba(255,255,255,0.8)`):
  - `↗ LinkedIn` → `https://www.linkedin.com/in/daniel-james-45863320/`, new tab
  - `↗ GitHub (open source)` → `https://github.com/londondan/PlanUltra`, new tab
  - `✉ danrjames@gmail.com` → `mailto:danrjames@gmail.com`

### 8.4 Copy column

**Eyebrow:** `"Why this exists · Why it's free"` — Geist Mono 11px, uppercase, letter-spacing 0.12em, Sky 55% opacity

**Fact pills:**
```
[ Free forever ]  [ No subscription ]  [ No ads ]  [ Open source ]
```
Geist Mono 11px, `color: rgba(130,199,246,0.75)`, `background: rgba(130,199,246,0.07)`, `border: 1px solid rgba(130,199,246,0.15)`, `border-radius: 20px`, `padding: 4px 14px`.

**Body paragraph 1:**
> "I'm a product manager who runs ultras on weekends. PlanUltra exists because I wanted a tool like this and couldn't find one — so I built it. It's a hobby project, not a startup. There's no VC money, no growth target, no free trial leading to a paywall."

**Body paragraph 2:**
> "Running the server costs me almost nothing — AWS and Mapbox both have generous free tiers that easily cover a tool at this scale. An account is required so your plan has somewhere to live between sessions; that's the only reason it exists. The code is open source on GitHub — if you want to fork it, run your own copy, or just look under the hood, go ahead."

`"GitHub"` links to `https://github.com/londondan/PlanUltra`, new tab, Sky color.

**Body typography:** Geist Sans, 15px, `rgba(255,255,255,0.72)`, line-height 1.75, paragraph spacing 16px.

**Closing line** (below `border-top: 1px solid rgba(130,199,246,0.1)`, `padding-top: 16px`):
> *"It's also a live example of my product work. If you're curious about that side of things, find me on LinkedIn."*

Geist Sans 14px italic, `rgba(255,255,255,0.4)`. `"LinkedIn"` links to `https://www.linkedin.com/in/daniel-james-45863320/`, new tab, Sky 65% opacity.

---

## 9. Bottom CTA Section

**Keep** the existing Midnight background and the faint SVG mountain echo paths from PRD-009 §8. Replace copy only.

`padding: 80px 48px`, text-align center.

**Headline:** `"Your crew is giving up their weekend for you."` — DM Sans `clamp(24px, 4vw, 40px)` weight 800, white
**Body:** `"Give them everything they need so they can focus on being there for you."` — Geist Sans 16px, white 55% opacity
**Button:** `"Build your crew plan"` — same style as hero primary CTA, links to `/auth/signin`

---

## 10. Footer

**Keep** the existing Midnight background, Sky border-top, and left-side wordmark. Update right-hand copy only:

Old: `"Free forever · Built for ultra runners"`
New: `"Free forever · Built by a runner · No subscription"` — Geist Mono 12px, white 35% opacity

---

## 11. Copy Changes — Full Reference

All copy from PRD-009 that is explicitly retired:

| Location | Old | New |
|---|---|---|
| Hero eyebrow | "Multi-stage race planning" | "Race day crew planning" |
| Hero headline | "Because the miles are hard enough" | "Give your crew one link. Everything they need is in it." |
| Hero description | "You've done the hard training, now let's pack your drop bags..." | "PlanUltra builds a shareable crew sheet your team can open on their phone..." |
| Hero CTA | "Get Started" | "Build your crew plan — it's free" |
| Hero sub-label | "Free · No credit card required" | *(removed — replaced by trust pills)* |
| Bottom CTA headline | "Your best race starts here" | "Your crew is giving up their weekend for you." |
| Bottom CTA body | "Join runners who prep smarter, pack cleaner..." | "Give them everything they need so they can focus on being there for you." |
| Bottom CTA button | "Get Started" | "Build your crew plan" |
| Footer note | "Free forever · Built for ultra runners" | "Free forever · Built by a runner · No subscription" |

---

## 12. What Is Removed

Sections and components from PRD-009 / PRD-015 that are **not implemented**:

- Stats Bar (PRD-009 §6) — removed, not replaced
- Feature rows 1–3 with live `<SectionCard>`, `<DropBagCard>` illustrations — replaced by `<CrewSheetDemo />`
- `<LandingFeatures />` client component — replaced by `<CrewSheetDemo />`
- PRD-015 About section — superseded by §8 Builder Identity

---

## 13. Responsive Behaviour

| Breakpoint | Change |
|---|---|
| `< 1024px` | Crew sheet demo column narrows; text column compresses naturally |
| `< 640px` | Crew sheet demo section: single column (text first, demo below). Feature grid: single column. Builder Identity: copy first, identity block below. Crew sheet demo container: `max-height: 600px; overflow-y: auto`. |
| `< 480px` | Nav "See an example" link hidden. Hero padding reduces. |

---

## 14. Implementation Notes

**A — File to modify**
`src/app/page.tsx` — full replacement of page content. The SVG mountain background in the hero section and the SVG mountain echo in the bottom CTA are already in this file and must not be touched.

**B — `<CrewSheetDemo />` component**
New file: `src/app/(marketing)/CrewSheetDemo.tsx`. Mark `"use client"`. Uses the `qrcode` package (already a project dependency from PRD-022 work) to generate QR SVGs at render time. Import into `src/app/page.tsx`.

**C — QR code generation**
```ts
import QRCode from 'qrcode'
const qrSvg = await QRCode.toString(mapsUrl, {
  type: 'svg',
  color: { dark: '#114574', light: '#ffffff' },
  margin: 1,
  width: 72  // PRD-022 §5.2 spanning sidebar spec
})
```
Inline the SVG string directly. Do not use `<img>` with a data URL. QR codes must be scannable with a real phone camera — verify before shipping.

**D — Directions links**
Use real `<a>` tags, not Next.js `<Link>`:
```tsx
<a href={directionsUrl} target="_blank" rel="noopener noreferrer">
  📍 Directions to crew parking
</a>
```

**E — Drive times are hardcoded**
The 11 min / 4.9 mi drive time in the demo bridge is hardcoded from a real Mapbox lookup. Do not make API calls from the marketing page component.

**F — Scrollable demo container**
```css
.crew-sheet-demo-wrapper {
  max-height: 720px;
  overflow-y: auto;
  border-radius: 16px;
  position: relative;
}
.crew-sheet-demo-wrapper::after {
  content: '';
  position: sticky;
  bottom: 0;
  display: block;
  height: 48px;
  background: linear-gradient(to bottom, transparent, white);
  pointer-events: none;
}
```

**G — No live crew sheet fetch**
Do not fetch from `/crew/[token]` or any API route. The demo is entirely static.

---

## 15. Pre-Ship Checklist

- [ ] QR codes scanned with a real phone camera — both open Google Maps to the correct location
- [ ] Directions buttons verified — open Google Maps at the correct pin
- [ ] Demo scrolls correctly on a 375px viewport
- [ ] Trust pills visible against hero SVG background (adjust opacity if needed)
- [ ] Builder Identity links verified: LinkedIn, GitHub, email all work
- [ ] SVG mountain hero background unchanged from current implementation
- [ ] SVG mountain echo in bottom CTA unchanged
- [ ] Nav "See an example" link opens the live Hellbender crew sheet in a new tab
- [ ] Both "Build your crew plan" CTAs route to `/auth/signin`
