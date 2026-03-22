# PRD-005: UX Fix — Contrast & Hero Legibility
**Status:** Approved
**Created:** 2026-03-16
**Depends on:** PRD-003 (Ridge Light design system)

---

## 1. Problem

The landing page hero is illegible. The subtitle text uses `text-muted-foreground`, which the PRD-003 token maps to Deep Ridge `#114574` (oklch 0.30) — a dark navy. That color is placed directly over the mountain SVG, whose layers are also dark navy and mid-blue. The result is dark-on-dark with essentially zero contrast.

### What the screenshot shows

- H1 (`text-foreground` = Midnight `#02071E`) — barely readable, also dark on dark
- Subtitle (`text-muted-foreground` = Deep Ridge `#114574`) — invisible against the blue mountains
- CTA button — black pill, legible but clashes with the Ridge Blue identity

### Root cause in PRD-003

PRD-003 defined `--muted-foreground` as Deep Ridge without accounting for the one context where it is used over a dark-bleed background: the hero. It also never defined a contrast rule — i.e., which token to use when text sits on a colored or image surface rather than a white content surface.

---

## 2. Scope

This PRD covers two things:

1. **Immediate fix** — correct the hero legibility issue on the landing page and sign-in page
2. **Style guide amendment** — add an explicit contrast rule to PRD-003 Section 3 so this class of bug cannot recur

It does not re-open the rest of PRD-003.

---

## 3. Contrast Rule (amendment to PRD-003 § 3)

Add the following to PRD-003 Section 3 "Color usage rules":

### On-surface vs on-image/fill text

The palette has two distinct usage contexts. Tokens mean different things in each:

| Context | Background | Correct text color | Token |
|---|---|---|---|
| **Content surface** | White or Mist `#DBF1FA` | Midnight `#02071E` (primary), Deep Ridge `#114574` (secondary) | `text-foreground`, `text-muted-foreground` |
| **Hero / colored fill** | Mountain SVG, Ridge Blue, Deep Ridge, any dark fill | White (#ffffff) for primary, White at 85% for secondary | `text-white`, `text-white/85` |

**Rule:** Never use `text-foreground` or `text-muted-foreground` directly on the hero component or any element whose background is a color from the palette darker than Mist. If you are in doubt, check that the text color achieves at least **4.5:1 contrast ratio** against the darkest background segment it will appear over (WCAG AA).

### Contrast reference table

| Text color | Background | Approx. contrast ratio | Pass AA? |
|---|---|---|---|
| White `#ffffff` | Ridge Blue `#1D7CBE` | 4.6:1 | ✅ |
| White `#ffffff` | Deep Ridge `#114574` | 9.1:1 | ✅ |
| White `#ffffff` | Mountain hero (mixed, darkest segment) | ~6:1 | ✅ |
| Midnight `#02071E` | White `#ffffff` | 19:1 | ✅ |
| Deep Ridge `#114574` | White `#ffffff` | 9.1:1 | ✅ |
| Deep Ridge `#114574` | Ridge Blue `#1D7CBE` | 2.1:1 | ❌ fail |
| Deep Ridge `#114574` | Mountain hero | ~1.5:1 | ❌ fail — **current bug** |
| Midnight `#02071E` | Mountain hero | ~2.5:1 | ❌ fail |

---

## 4. Hero Component Fix

### Current behavior (`MountainHero.tsx`)

The component exposes a `children` slot with no text-color guidance. Callers inherit the page's default `text-foreground` (Midnight) and `text-muted-foreground` (Deep Ridge), both of which fail contrast on the mountain background.

### Required changes

**`src/components/MountainHero.tsx`**

The component should set a white text context on its content container so that all children default to white without callers needing to override:

```tsx
<div className="relative z-10 text-center px-4 text-white">
  {children}
</div>
```

This makes white the inherited default for all text inside the hero. Individual children can still override as needed.

**`src/app/page.tsx`**

Update the hero text classes to use explicit white tokens rather than relying on semantic tokens that resolve to dark colors:

```tsx
<h1 className="text-5xl font-extrabold tracking-tight text-white">
  Plan your ultra marathon, mile by mile
</h1>
<p className="text-xl text-white/85">
  Upload a GPX file, set your pace, and get hour-by-hour weather
  forecasts aligned to your position on course. Turn a route into a
  complete race-day plan.
</p>
```

The CTA button should use the primary Ridge Blue button style (not the default black):

```tsx
<Link href="/auth/signin" className={cn(buttonVariants({ variant: 'default', size: 'lg' }))}>
  Get started free
</Link>
```

`variant: 'default'` should resolve to Ridge Blue background + white text per PRD-003. Verify this is what the button style actually renders — if `buttonVariants` default is not yet styled to Ridge Blue, that is a separate PRD-003 work item (#1 globals.css token replacement) that must be completed first.

**`src/app/auth/signin/page.tsx`**

Same treatment. Any text that sits within the `MountainHero` container should use `text-white` / `text-white/85`. The sign-in card sits below or on top of the hero — apply the white text context to the hero slot only, not to the card itself.

---

## 5. Style Guide Enforcement (forward-looking)

Add the following rule to PRD-003 § 2 Design Principles:

> **White text on colored fills.** Any time text sits over a surface that is not white or Mist, use white (`#ffffff`) as the base text color. Semantic tokens like `text-foreground` and `text-muted-foreground` are defined for white/Mist surfaces only and must not be used in hero, banner, or badge contexts with colored backgrounds.

And add a new row to the PRD-003 color usage table:

| Context | Color |
|---|---|
| Hero / banner primary text (over mountain SVG or colored fill) | White `#ffffff` |
| Hero / banner secondary text (subtitle, descriptor) | White at 85% opacity (`rgba(255,255,255,0.85)`) |
| Text on primary button (Ridge Blue bg) | White `#ffffff` |
| Text on outlined button (white bg) | Ridge Blue `#1D7CBE` |

---

## 6. Implementation Checklist

| # | File | Change | Notes |
|---|---|---|---|
| 1 | `src/components/MountainHero.tsx` | Add `text-white` to content container div | Fixes inheritance for all current and future hero consumers |
| 2 | `src/app/page.tsx` | Change h1 to `text-white`, subtitle to `text-white/85` | Explicit override; don't rely solely on #1 |
| 3 | `src/app/page.tsx` | Confirm CTA button renders Ridge Blue + white text | Depends on globals.css token replacement (PRD-003 work item #1) |
| 4 | `src/app/auth/signin/page.tsx` | Audit any text inside `MountainHero` — apply `text-white` / `text-white/85` | |
| 5 | `requirements/PRD-003.md` | Add contrast rule table to § 3 and enforcement rule to § 2 | Document the fix so future contributors have the rule |

Items 1 and 2 are the minimum viable fix for the visible bug in the screenshot. Items 3–5 are required to prevent recurrence.

---

## 7. Decisions Log

| Decision | Choice | Rationale |
|---|---|---|
| Fix approach | White text on hero, not darkening the mountain SVG | Darkening the background loses the mountain identity. White text is the standard pattern for text-over-image in every major design system. |
| `text-white/85` for subtitle | Yes | Slight opacity differentiation preserves the primary/secondary text hierarchy even in white-on-image contexts — matches Tailwind's own hero pattern recommendations. |
| Amend PRD-003 | Yes | Root cause is a missing constraint in the style guide. Fixing the component without updating the rule means the next engineer makes the same mistake. |
| WCAG AA as minimum bar | Yes | 4.5:1 for body text, 3:1 for large text (≥18px bold). H1 at 48px bold qualifies as large text; subtitle at 20px does not. Both should hit 4.5:1 to be safe. |
