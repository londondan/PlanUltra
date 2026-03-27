# PRD-019 — Crew Sheet: Mobile Station Card Layout

**Status:** Draft
**Date:** 2026-03-27
**Amends:** PRD-010 (Crew Sheet) §6.1 and §6.2

---

## 0. Summary

The crew sheet station card header row breaks on narrow viewports. The station name is squeezed between the mile pill (left) and the ETA + crew access pill (right), and truncates or wraps awkwardly on phones — exactly the device most crew members will be using on race day.

This PRD specifies a **mobile-only layout change** to the station card header row. On screens below `640px`, the station name moves to its own line at the top of the card, with mile, ETA, and crew access indicator dropped to a second row beneath it. The desktop layout (≥640px) is unchanged.

No other changes to the crew sheet are in scope.

---

## 1. Problem

**Desktop/browser layout (works fine, do not change):**

```
┌──────────────────────────────────────────────┐
│  MILE 18.4        COUGAR ROCK        5:48 AM  │
│                                    No crew    │
└──────────────────────────────────────────────┘
```

Three items in a single flex row: mile pill (left) · station name (center, takes remaining space) · ETA + access label (right). On a wide viewport this is spacious. On a 375px phone, station names like "Twin Lakes Outbound" or "Winfield Out/Back" have nowhere to go.

**Mobile (current, broken):**

```
┌───────────────────────────────┐
│  MILE 18.4  COUGAR…  5:48 AM  │
│              No crew          │
└───────────────────────────────┘
```

The name truncates or wraps mid-word. Crew members in the field may not recognise a truncated aid station name.

---

## 2. Solution

On mobile (`< 640px`), restructure the station header into two rows:

**Row 1 — Station name (full width):**
```
┌───────────────────────────────┐
│  COUGAR ROCK                  │
│  MILE 18.4              5:48 AM│
│                       No crew │
└───────────────────────────────┘
```

**Row 1 — Station name:** Full width. Allowed to wrap to two lines if necessary. Never truncated.

**Row 2 — Mile · ETA · Access:** The mile pill, ETA, and crew access indicator share a single row. Mile is left-aligned; ETA is right-aligned; crew access label sits below ETA (or inline, see §3.2).

Desktop layout (≥640px) is identical to the current implementation as specified in PRD-010 §6.1 and §6.2. No changes above that breakpoint.

---

## 3. Detailed specification

### 3.1 Desktop layout (≥640px) — unchanged

```
[MILE PILL]  [STATION NAME — flex-grow: 1]  [ETA]
             [                           ]  [crew access label]
```

Single flex row. Station name takes remaining space. ETA and crew access label are stacked in a right-aligned column. No changes from PRD-010.

### 3.2 Mobile layout (<640px)

**Station header structure changes to a two-row block:**

**Row 1 — Name:**
```css
/* Row 1 */
display: block;
width: 100%;
```
- Station name — DM Sans, 16px, weight 700, Midnight
- No truncation (`white-space: normal`, `overflow: visible`)
- `margin-bottom: 6px`

**Row 2 — Meta:**
```css
/* Row 2 */
display: flex;
justify-content: space-between;
align-items: center;
```
- **Left:** mile pill — Geist Mono, 11px, Deep Ridge 60% opacity (same as desktop)
- **Right:** ETA and crew access label in a right-aligned column
  - ETA: DM Sans, 15px, weight 700, Ridge Blue
  - Crew access label: Geist Sans, 11px, Deep Ridge 40% opacity italic (no crew) or green weight 500 (crew access) — sits below ETA, `text-align: right`

The crew access pill/badge — if it is a styled chip rather than plain text — renders at its normal size. Do not reduce the chip below its designed minimum size to make it fit; the two-row layout gives it room.

### 3.3 Breakpoint

Use `640px` as the breakpoint, matching the `sm` breakpoint in the Tailwind scale. This is the same breakpoint used elsewhere in the app.

```css
@media (max-width: 639px) {
  /* mobile station header layout */
}
```

Or using Tailwind: `sm:` prefix for the desktop styles, with mobile-first base styles for the mobile layout.

### 3.4 Card body (crew access cards) — unchanged

The body content of crew-access cards (segment label, grab from drop bag, baggies, crew notes, conditions) is not changed by this PRD. The layout changes are scoped to the station header row only.

### 3.5 Print — unchanged

The `@media print` styles from PRD-010 §9 apply on top of the desktop layout. Print always renders the desktop (single-row) layout regardless of viewport width — printers always produce the desktop view. No print-specific changes needed.

---

## 4. Affected components

The change is localised to the station card header row. Based on PRD-010 §3:

- `src/app/crew/[token]/page.tsx` — the crew sheet server component

If the station card has been extracted to a child component (e.g. `StationCard.tsx`, `CrewStationCard.tsx`), the change belongs in that component's header section.

No other files are affected.

---

## 5. Visual reference

### Before (mobile, broken):
```
┌─────────────────────────────────┐
│ MI 18.4  TWIN LAKES OUT…  5:48  │
│                       No crew   │
└─────────────────────────────────┘
```

### After (mobile, fixed):
```
┌─────────────────────────────────┐
│ TWIN LAKES OUTBOUND             │
│ MILE 18.4               5:48 AM │
│                         No crew │
└─────────────────────────────────┘
```

### After (crew access card, mobile):
```
┌─────────────────────────────────┐
│ BIG MOUNTAIN                    │
│ MILE 43.6               3:07 PM │
│                      ✓ Crew     │
├─────────────────────────────────┤
│ NEXT SEGMENT: Big Mountain →    │
│ ...                             │
└─────────────────────────────────┘
```

### Desktop (unchanged):
```
┌──────────────────────────────────────────────┐
│  MILE 43.6        BIG MOUNTAIN        3:07 PM │
│                                  ✓ Crew access│
└──────────────────────────────────────────────┘
```

---

## 6. Implementation notes

**A — Tailwind approach (preferred)**

Use Tailwind's mobile-first responsive utilities. Define the two-row mobile layout as the base style, then override to the single-row layout at `sm:`:

```jsx
// Station header wrapper
<div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1">

  {/* Name — full width on mobile, flex-1 on desktop */}
  <span className="order-first sm:order-none sm:flex-1 sm:mx-3 font-bold text-midnight">
    {station.name}
  </span>

  {/* Mile pill — below name on mobile, leftmost on desktop */}
  <span className="order-2 sm:order-first text-xs font-mono text-deep-ridge/60">
    MILE {station.mile}
  </span>

  {/* ETA + access — right-aligned on both */}
  <div className="order-3 sm:order-last text-right flex-shrink-0">
    <div className="font-bold text-ridge-blue">{station.eta}</div>
    <div className={crewAccess ? 'text-green-600 text-xs' : 'text-xs italic text-deep-ridge/40'}>
      {crewAccess ? '✓ Crew access' : 'No crew access'}
    </div>
  </div>

</div>
```

The `order-*` utilities handle the visual reordering between mobile and desktop without duplicating markup.

**B — CSS-only fallback**

If not using Tailwind for this component, a `@media (max-width: 639px)` block in the page's `<style>` tag (co-located, per PRD-010 §9 Issue E convention) is acceptable.

**C — No JavaScript required**

This is a pure CSS layout change. No state, no `useMediaQuery`, no `ResizeObserver`. Keep it in CSS.

**D — Test with long station names**

Test with: "Twin Lakes Outbound (Crew)", "Hope Pass Outbound", "Winfield Checkpoint Out", "Fish Hatchery / Halfmoon Road Crew". These are the realistic worst cases. The name must never be truncated on mobile.

---

## 7. Scope boundary

| In scope | Out of scope |
|---|---|
| Station card header row layout on mobile | Card body content (baggies, notes, conditions) |
| Both card types (crew access + no crew access) | Finish card (§7 of PRD-010) — apply same mobile treatment if it uses the same header component |
| `< 640px` breakpoint | Any layout changes above 640px |
| Screen styles | Print styles |
