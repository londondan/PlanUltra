# PRD-015 — Landing Page Updates: Crew Sheet Row + About Section

**Status:** Draft
**Date:** 2026-03-24
**Extends:** PRD-009 (Landing Page Redesign)
**Mockup:** `docs/requirements/landing-v2-updates.html`

---

## 0. Summary

Two additive changes to the landing page specified in PRD-009. Neither change modifies existing sections — they insert new content between existing sections.

1. **Feature Row 4 — Share with your crew**: A fourth feature row added to §5 of PRD-009, covering crew sheet publishing, with a live example link to a real plan.
2. **About section**: A new section between "How It Works" (formerly §5, now §6 after adding the fourth row) and the bottom CTA, credentialing the builder and signalling this is a passion project, not a SaaS product.

---

## 1. Feature Row 4 — Share with your crew

### 1.1 Position

Appended as the fourth row in the Feature Rows section (PRD-009 §5). Row direction: illustration left, text right (continuing the alternating pattern: rows 1, 3 are text-left; rows 2, 4 are illustration-left).

### 1.2 Text block

- **Feature number badge:** "04" — Geist Mono, 11px, Ridge Blue
- **Title:** "Share with your crew" — DM Sans, `clamp(20px, 3vw, 28px)`, weight 800, Midnight
- **Body:** "Publish a shareable crew sheet with a single click. Your crew gets a clean, printable page showing exactly when to expect you at each station, what to pull from your drop bag, and any notes you've left them."
- **Body 2:** "Works on any phone, prints cleanly, and needs no account to view."
- **Example link:** `"See Daniel's Hellbender plan →"` — links to `https://planultrarace.com/crew/mn7jrA-wOyPOB-qk`, opens in new tab. Style: Ridge Blue, 14px, underline on hover, with a small `↗` external link icon.

### 1.3 Illustration

A static mockup of the crew sheet UI, rendered as inline JSX (not a live component — the crew sheet is server-rendered and not importable into the landing page client component).

Build a `<CrewSheetMockup />` component in `LandingFeatures.tsx` that reproduces the visual signature of the crew sheet:

**Structure (top to bottom):**
- Dark header block (`var(--midnight)` background, `border-radius: 12px 12px 0 0`, `padding: 16px 20px`):
  - Race name: "2025 Hellbender Alternate" — DM Sans 16px weight 700, white
  - Sub-line: "Crew sheet for Daniel James · Friday, May 15 · 100 mi" — Geist Sans 12px, Sky 70% opacity
  - Stats row: "8 crew stations · ~30h target finish · Est. finish 11:00 AM" — Geist Mono 11px, Sky 50% opacity, spaced with `·` dividers
- Two aid station cards below (white background, `border: 1px solid #E2E8F0`, `border-radius: 0 0 12px 12px`):
  - **Card 1 — Start/Finish (crew access):**
    - Left: Mile badge "0.0" + station name "Start/Finish – Race HQ" in Midnight 14px weight 600
    - Right: "✓ Crew access" chip (green, small) + time "5:00 AM" in Ridge Blue weight 700
    - Below: drop bag tags "Headlamp" "Poles" — same pill style as crew sheet
    - Crew note (amber left-border): "make sure we have changed the batteries on the headlamp..."
  - **Card 2 — No crew access (muted):**
    - Mile badge "7.9" + "Kitsuma Aid 1 & 9" — text muted (`#94A3B8`)
    - Right: "No crew access" in muted gray + time "7:22 AM"
    - No sub-content (collapsed)

Same card container treatment as other illustration columns: `background: var(--mist)`, `border: 1px solid rgba(130,199,246,0.3)`, `border-radius: 16px`, `padding: 24px`.

---

## 2. About Section

### 2.1 Position

New full-width section, inserted **after** the Feature Rows section and **before** the Bottom CTA section.

### 2.2 Background + visual treatment

Background: `var(--midnight)` — same as the bottom CTA, creating a natural dark band before the final CTA. This avoids adding a third distinct background color to the page.

A faint horizontal rule (`border-top: 1px solid rgba(130,199,246,0.12)`) separates it from the Feature Rows section above.

`padding: 72px 48px`, max-width 900px, centered.

Layout: two columns on desktop (`display: grid; grid-template-columns: 1fr 2fr; gap: 64px; align-items: start`). Single column on mobile.

### 2.3 Left column — identity anchor

An identity block that keeps this concise and scannable:

- Name: "Dan James" — DM Sans 22px weight 700, white
- Tag: "Product Manager · Ultra runner" — Geist Sans 13px, `var(--sky)` 70% opacity
- Divider line: 40px, 2px, Ridge Blue, `border-radius: 2px`, `margin: 12px 0`
- Optional: a small circular avatar placeholder (40px, `background: var(--deep-ridge)`, monogram "DJ") — replace with a real photo if available. Keep it small; this is not a personal homepage.
- Links row (below divider):
  - LinkedIn icon + "LinkedIn" — href `https://www.linkedin.com/in/daniel-james-45863320/`, `rgba(255,255,255,0.5)` color, hover white
  - GitHub icon + "GitHub" — href `https://github.com/londondan/PlanUltra`, same style
  - Email icon + "danrjames@gmail.com" — href `mailto:danrjames@gmail.com`, same style
  - Use `↗` / `✉` icons, 12px, Geist Sans

### 2.4 Right column — copy

**Eyebrow:** "Why this exists" — Geist Sans 11px, `var(--sky)` 60% opacity, uppercase, letter-spacing 0.12em

**Body paragraph 1:**
> "I'm a professional product manager who runs ultras in my spare time. I DNF'd Grindstone 100 last year — and while gear wasn't the only reason, scrambling through my drop bags at 2 AM in the cold certainly didn't help."

**Body paragraph 2:**
> "I built PlanUltra because I couldn't find a tool that did what I actually needed: lay out every leg of a race, match gear to conditions, and hand my crew a plan they could actually use. It's a side project, not a startup. There's no subscription, no free trial, no catch."

**Closing line** (slightly muted, italic):
> "It's also a live sample of my product work — if you're curious about that side of things, you can find me on LinkedIn or drop me an email."

The words "LinkedIn" and "email" in the closing line should be hyperlinked inline (`https://www.linkedin.com/in/daniel-james-45863320/` and `mailto:danrjames@gmail.com` respectively), rather than relying on the reader to look left. This is more accessible and works better on mobile where the two-column layout collapses.

**Typography:** Geist Sans, 15px, `rgba(255,255,255,0.75)`, line-height 1.7. Paragraph spacing 16px.

---

## 3. Copy changes to existing sections

### 3.1 Hero description (PRD-009 §4.3)

The current hero description reads:
> "You've done the hard training, now let's pack your drop bags for success. Plan Ultra is a free tool to help ultra runners plan how to organize their gear so that they and their crew are prepared for every leg of the race."

**Replace with:**
> "You've done the hard training. Now let's make sure your gear is ready for every mile. PlanUltra is a free tool built by an ultra runner — no subscription, no account required to explore."

Rationale: the existing copy is functional but generic. The new version front-loads "free", removes the redundant "crew" mention (it has its own feature row now), and plants the "built by a runner" credibility seed early.

### 3.2 Footer (PRD-009 §9)

Update the right side copy from:
> "Free forever · Built for ultra runners"

To:
> "Free forever · Built by a runner · No subscription"

This reinforces the passion-project positioning in the smallest piece of real estate on the page.

---

## 4. Page structure (updated)

The full updated section order for `src/app/page.tsx`:

| # | Section | Background | Notes |
|---|---|---|---|
| 1 | Navigation | Transparent / Midnight on scroll | No change |
| 2 | Hero | Midnight → Deep Ridge gradient | Copy update per §3.1 |
| 3 | Feature Rows | White | Adds Row 4 (§1) |
| 4 | Stats Bar | Midnight | No change |
| 5 | About | Midnight | New — §2 |
| 6 | Bottom CTA | Midnight | No change |
| 7 | Footer | Midnight | Copy update per §3.2 |

Note: sections 4, 5, and 6 are all Midnight background. Use the `border-top` dividers described in §2.2 to prevent them merging visually into an undifferentiated dark block.

---

## 5. `LandingFeatures` additions

Add `CrewSheetMockup` to `LandingFeatures.tsx` alongside the existing three illustrations. No additional data fetching — the crew sheet mockup is hardcoded with the Hellbender data.

The About section left column (avatar, name, links) should be a separate small client component `<BuilderCard />` only if it needs interactivity (e.g., link hover states). If it's purely static, it can live in the server component.

---

## 6. Implementation notes

**A — External link**
The example crew sheet link (`https://planultrarace.com/crew/mn7jrA-wOyPOB-qk`) opens in a new tab (`target="_blank" rel="noopener noreferrer"`). Add a small `↗` icon inline. Do not use Next.js `<Link>` for this — it's an external URL.

**B — Avatar photo**
If a photo is provided, use a circular `<img>` with `width: 48px; height: 48px; border-radius: 50%; object-fit: cover`. If no photo, the monogram placeholder is fine for launch and can be swapped later without a PRD change.

**C — Links**
- LinkedIn: `https://www.linkedin.com/in/daniel-james-45863320/`
- GitHub: `https://github.com/londondan/PlanUltra`
- Email: `mailto:danrjames@gmail.com`
No TODOs needed — all confirmed.

**D — Crew sheet mockup fidelity**
The `<CrewSheetMockup />` doesn't need to be pixel-perfect — it needs to communicate the information hierarchy of the crew sheet at a glance. The amber crew note callout and the "✓ Crew access" chip are the two details that most quickly convey what the feature does; make sure those read clearly.

**E — Dark section sequencing**
When three consecutive Midnight-background sections are stacked (Stats Bar → About → Bottom CTA), use `border-top: 1px solid rgba(130,199,246,0.1)` between each. Do not use margin — the sections should be flush, with only the hairline divider providing separation.

---

## 7. Mockup

See `docs/requirements/landing-v2-updates.html` for interactive mockup showing:
- Feature Row 4 with crew sheet mockup illustration
- About section with both layout columns
- How the dark sections sequence together visually
