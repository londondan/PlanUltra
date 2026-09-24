# PRD-030 — Crew Sheet: Print Density & Contrast Overhaul

**Status:** Draft
**Created:** 2026-09-05
**Amends:** PRD-010 §9 (Print Optimization), PRD-022 §8 (Print Stylesheet Upgrade)
**Reference mockup:** `docs/requirements/mockups/PRD-030-print-mockup.html` — canonical visual spec, rendered as two actual-size US Letter pages using the real data from the attached 2026 Grindstone crew sheet

---

## 0. Mandatory Pre-Reading

Before implementing:

- Open `docs/requirements/mockups/PRD-030-print-mockup.html` in a browser. It renders two 8.5×11in sheets at true scale (not a phone/desktop breakpoint) — what's on screen is what should print.
- Review PRD-010 §9 and PRD-022 §8 — **this PRD replaces both of those print sections**, not append to them. Where this PRD conflicts with either, this PRD wins for print.
- Reference input: a real printed crew sheet for the 2026 Grindstone (104.2 mi, 7 crew stations, 18 aid stations), printed to PDF from the current production page. It runs **4 US Letter pages**. The runner's feedback: the layout displays fine on screen, but the printed version is hard to read, doesn't have enough contrast, and takes up too much vertical space.

---

## 1. Problem

Two distinct problems here — one is a genuine bug, the other is a density problem.

### 1.1 The header likely prints unreadable — this is a bug, not a style opinion

`.crew-header` is styled for a **dark background**: white race name, `var(--sky)` runner label, and label/meta text at `rgba(255,255,255,0.28–0.5)` opacity, all meant to sit on the Midnight (`#02071E`) fill. PRD-010 §9 anticipated this needing print treatment and swaps the background to Ridge Blue to save ink — but it **never updates the text colors**, and PRD-022 §8.1's high-contrast color table (which does convert most other soft/opacity values to solid hex for print) has no row at all for `.crew-header`.

Browsers' print dialogs default **"Background graphics" to off**, and many automated print-to-PDF paths never turn it on. When that happens, `background-color` and `background-image` are dropped — but `border-color`, plain text `color`, and SVG `fill` are not affected; those are vector content, not "background graphics." So on any print path where background graphics are off, `.crew-header`'s fill disappears and its text — which was only ever pale gray/blue, never a dark solid color — is left floating on white.

This matches the attached sample exactly: "AID STATIONS," "TARGET FINISH," and the "Published" timestamp all render as faint gray-on-white, not the intended white-on-dark. It's a correctness bug, not a taste issue: the current design has no fallback dark-text variant for the one scenario (background graphics off) that browsers ship with by default.

### 1.2 Excessive vertical space per element

Independent of the contrast issue, the layout is simply too tall for paper:

- The hero header (`32px 40px 28px` padding, full race meta + a 4-stat row) costs roughly 2in on its own.
- Station cards use touch-friendly padding (`14px 18px`+) sized for a phone screen, not a printed line of text.
- Per PRD-022 §6.2, the segment bridge's drive info (destination, time, distance) is a 3-line stacked panel even though it only ever holds three short values — that panel's height, not the checkpoint rows, sets the floor for every bridge's height regardless of how many checkpoints it has.
- Bridges with **no** intermediate checkpoints still render a full bordered two-panel box — the left (drive info) panel's 3 stacked lines — just to say "No intermediate checkpoints" on the right.

Net effect on the sample race: 7 crew stations + 7 bridges across 4 pages.

---

## 2. Goals

1. A typical race (7–9 crew stations) fits in **2 pages**, US Letter and A4.
2. Everything that must be legible for crew navigation prints in dark, solid color regardless of the "background graphics" print setting: ETA, station name, mile, directions URL, crew/parking badges, location notes, crew notes.
3. QR codes stay physically scannable — minimum 0.6in (≈46px at 1x/96dpi reference) square.
4. Semantic meaning is never carried by background fill alone. Crew access, parking type, and note type are always also conveyed by a border, icon, or text label — each of which renders independent of the background-graphics setting.
5. No content is dropped. Gear lists, baggies, crew notes, conditions, location notes, and drive/checkpoint data all still appear — just condensed.

---

## 3. Root cause, restated as a rule

**Rule for all print styles going forward:** a background-color fill may be used for *decoration* (e.g., a light tint behind a location strip) but never as the sole thing making foreground content readable. Any text or icon that would be illegible on plain white paper must be a solid, sufficiently dark color on its own — not `rgba(...)` at reduced opacity, and not a color chosen assuming a colored fill underneath it.

This also generalizes past the header: at small print point sizes (7–9px), `rgba(17,69,116,0.35–0.5)`-style "muted" text reads as gray fog on paper the way it doesn't on a backlit screen. PRD-022 §8.1 already converts most of these to solid hex for body content (station cards, bridges, location blocks) — this PRD extends that same treatment to the header and closes the remaining gaps (see §10).

---

## 4. Print typography & spacing scale

Replaces the font sizes implied by PRD-010/PRD-022 print rules (which mostly just inherited screen sizes). All values approximate; implementer should verify against the reference mockup rather than treating these as exact:

| Element | Current (screen) | New print value |
|---|---|---|
| `@page` margin | browser default (~1in) | `0.4in` all sides |
| Body base text | 13–14px | ~11px (≈8.5pt) |
| Station name | 16px | ~13px (≈10pt) weight 700 |
| ETA | 15–16px | ~14px (≈10.5pt) weight 800 |
| Mile badge | 11px mono | ~9px mono |
| Eyebrow / section labels | 9–11px uppercase | ~8–9px uppercase |
| Location / crew notes body | 12–14px | ~9–10px, line-height 1.25–1.3 (was 1.5) |
| Bridge drive time | 15px | ~10px label + bold time value |
| Footer | 11–12px | ~8–9px |

Target heights to hit the 2-page budget (10.2in usable height per page after margins):

- Header strip: ≤ 0.5in (down from ~2in)
- Station card, no notes: ≤ 0.4in
- Station card, with location/crew notes: ≤ 0.7in
- Segment bridge, 0–1 checkpoints: ≤ 0.35in
- Segment bridge, 3–4 checkpoints (one row per checkpoint, per §8): ≤ 0.7in

---

## 5. Header — compact strip, not a hero block

Replace the full-bleed Midnight hero header with a compact strip:

- No background fill. A `3px solid var(--ridge-blue)` bottom border replaces the color block as the section's visual anchor (borders render regardless of the background-graphics setting).
- Single row, left/right split: race name + runner/date/distance on the left; the 4 header stats inline on the right, each as `value` (bold, Ridge Blue, solid) over `label` (small, uppercase, Deep Ridge, solid — not `rgba(255,255,255,...)`).
- Published timestamp drops to a small solid-color line under the left block, not a separate low-opacity row.
- Target total height: ≤ 0.5in.

See the reference mockup's header for the exact arrangement.

---

## 6. Station card — dense layout

- Single row header (mile badge · station name · parking badge · ETA), tightened padding (`5px 8px` vs `14px 18px`).
- Print always uses the single-row header regardless of viewport-derived mobile rules (PRD-019 §3.5 already establishes this — no change needed there, just confirming it still applies).
- Crew-access accent moves from a background tint to a `4px solid var(--ridge-blue)` left border — border-color prints reliably with or without background graphics; a background tint does not.
- **The "✓ Crew access" badge is dropped from the print header row.** Every station card that reaches print is, by construction, a crew-accessible station — non-crew stations were already collapsed into segment bridges by PRD-022 §6. The badge was telling crew members something the mile pill, the location strip, and the QR sidebar already implied. Removing it recovers a few characters of width per card and one fewer thing to scan.
- The parking-type badge stays (it's not redundant — it's the one piece of information the badge conveys that nothing else on the card does) and becomes a border-only pill with solid text color, no fill: `border: 1px solid var(--ridge-blue); color: var(--deep-ridge)` rather than a tinted background.
- Scope this removal to `@media print` only, per the request — the on-screen badge is unchanged. Worth flagging, though: since PRD-022 §6 already collapsed every non-crew station into a bridge, the same redundancy technically exists on screen too (every station card, screen or print, is a crew station). This PRD doesn't touch the screen layout — raising it here only so it's a deliberate choice to leave it if a future PRD revisits the screen card.

---

## 7. Location block & QR — dense layout, same content

- Directions link and location notes keep their current content and behavior (URL suffix rendering per PRD-022 §8.2 is unchanged and already print-safe), just tightened: smaller font, `line-height: 1.25–1.3`, notes block padding reduced to a single `2px` left border + `6px` text indent.
- QR sidebar shrinks from 72×72px to a fixed **print** size of ~46–50px (~0.5–0.55in) — still comfortably above the 0.6in-square guideline once printer margins/DPI are accounted for; verify scannability on an actual printed page before shipping, not just on screen.
- QR fill stays solid (`fill="#114574"`) as already specified in PRD-022 §9 Issue A — this part of the existing spec was already print-safe and needs no change.
- QR is never hidden on print, at any viewport width — PRD-022 §7.2 / §9 Issue A3's `@media screen and (max-width: 400px)` scoping rule stays in force.

---

## 8. Segment bridge — one-line drive header, checkpoints stay vertical

An earlier draft of this PRD collapsed intermediate checkpoints into a single wrapped line to save space. **Reverted per feedback** — the runner considers the per-checkpoint list genuinely useful information to scan at a glance, not incidental detail, so it keeps its one-row-per-checkpoint layout. The density gain in this section instead comes from tightening the existing two-panel box into a lighter single-column block:

- The drive info (destination, time, distance) collapses from a 3-line stacked left panel to **one line**: `🚗 Drive to [destination] — [time] · [distance]`. When there are no intermediate checkpoints, append it inline on the same line: `— No intermediate checkpoints`, so a checkpoint-free bridge costs one line total instead of a mostly-empty two-panel box.
- When there are checkpoints, they render **below** the drive line as a vertical list, one row per checkpoint, each row: a small dot · mile badge · station name · ETA — same structure as today's segment bridge (PRD-022 §6.2), just at the tightened print scale from §4 (smaller font, ~1.5px vertical padding per row instead of the current spacious row height).
- No more two-column drive/checkpoints panel split — both live in a single-column block now that the drive info is one line instead of three, which also removes a border and some padding that existed solely to separate the two panels.
- Drive time value stays bold/solid Ridge Blue for at-a-glance scanning; the destination name and checkpoint rows use solid Deep Ridge.

See the reference mockup's bridge blocks (both the "no checkpoints" case and the 4-checkpoint case) for the exact treatment.

---

## 9. Segment detail — gear, baggies, crew notes (dense treatment)

Not exercised by this PRD's specific data sample (the Grindstone crew sheet doesn't currently have gear/baggie/crew-notes content set), but the same density rules apply wherever these blocks render:

- Gear list ("Grab from drop bag") becomes an inline, comma-separated line instead of a bulleted list: `Poles · Headlamp · Warm layer`.
- Baggie rows keep their current one-row-per-baggie format (already dense) — just tighten padding/line-height to match §4.
- Crew notes keep the amber left-border treatment (this was already solid-color text on white, not opacity-dependent — no bug here), just tighten padding/font size to match §4.
- Condition chips: no layout change, just confirm they still `flex-wrap` at the smaller print font sizes.

---

## 10. Color rules for print — supersedes PRD-022 §8.1 for the header, extends it elsewhere

PRD-022 §8.1's table already handles most station-card, bridge, and location-block colors correctly (converts opacity values to solid hex). The gap this PRD closes is the header, plus a couple of leftover low-opacity text values elsewhere:

| Element | Screen value | Print value (new) |
|---|---|---|
| `.crew-header` background | `var(--midnight)` fill | **removed** — replaced by `border-bottom: 3px solid #1D7CBE` |
| `.crew-header .race-name` | white | `#02071E` solid |
| `.crew-header .runner-label` | `var(--sky)` | `#114574` solid |
| `.crew-header .race-meta` | `rgba(255,255,255,0.5)` | `#114574` solid |
| `.crew-header .published-at` | `rgba(255,255,255,0.28)` | `#114574` solid, ~8px |
| `.header-stat .val` | `var(--sky)` | `#1D7CBE` solid |
| `.header-stat .lbl` | `rgba(255,255,255,0.35)` | `#114574` solid, ~8px uppercase |
| Mile badge background | `rgba(219,241,250,0.7)` | none (transparent) |
| Mile badge border | `rgba(130,199,246,0.4)` | `1px solid #1D7CBE` solid |
| Crew/parking badge background | tinted fill | none (transparent), border + text only |
| Any remaining sub-9px text using `rgba(...)` opacity | varies | resolve to the nearest solid hex already in the design system; nothing below ~65% perceived black-on-white contrast at print sizes |

All rules from PRD-022 §8.1 not listed above (bridge panel colors, location strip, QR sidebar, crew notes) are unchanged and remain correct as written.

---

## 11. Page-break rules

- `.station` and `.bridge` (or their production equivalents `.station-card` / `.segment-bridge`) keep `break-inside: avoid; page-break-inside: avoid` — unchanged from PRD-010 §9 / PRD-022 §8.5.
- No other explicit page-break control needed. At the new density, a typical race's content should flow into 2 pages without manual break placement; verify against real race data (see §14) rather than hardcoding a break after a specific station count.

---

## 12. Affected files

| File | Change |
|---|---|
| `src/app/crew/[token]/page.tsx` | Replace the `@media print` block (currently minimal, per PRD-010 §9 / PRD-022 §8) with the full ruleset from this PRD — new font-size scale, header restructure, bridge drive-line collapse (checkpoints stay vertical, §8), color table from §10 |
| Reference mockup | `docs/requirements/mockups/PRD-030-print-mockup.html` — canonical visual spec for all of the above |

No data model changes. No changes to the screen (non-print) layout, mobile breakpoints, or any Crew tab admin UI — this PRD is print-only.

---

## 13. Scope boundary

| In scope | Out of scope |
|---|---|
| `@media print` rules for the crew sheet page | Screen/mobile layout (PRD-010, PRD-019, PRD-022 §4–§7 unaffected) |
| Header restructure for print | New header content or stats |
| Bridge drive-line collapse; dropping the redundant print-only crew badge | Removing or hiding any checkpoint data, or collapsing checkpoints to inline text |
| Print color/contrast rules (§10) | Screen color palette |
| Print font-size/spacing scale (§4) | Screen typography |
| QR print sizing | QR generation library/format (unchanged, PRD-022 §9 Issue A) |
| Page-count target (2 pages typical) | Server-side PDF generation (still out of scope per PRD-010 §9 — browser print dialog remains the only path) |

---

## 14. Verification before shipping

The reference mockup's layout and copy were verified against the real Grindstone data with a headless-Chromium print-to-PDF render (`page.pdf()` at US Letter, `0.4in` margins, `printBackground: true`) — confirmed **2 pages**, with the natural page break falling after the last bridge before the finish line, no element split mid-card. That's a print-engine result, not a screen-preview approximation, but it's still one data point on one race. Before calling the real implementation done, repeat the same check against the production page for at least one real race, with **both** "Background graphics" on and off in the browser print dialog, and confirm:

1. Header text is legible in both cases (this is the regression test for the bug in §1.1).
2. Total page count for a 7–9-crew-station race is 2, not 3+.
3. QR codes scan correctly from the printed paper, not just on screen.
4. No content that was present on screen (gear, baggies, crew notes, location notes, checkpoints) is missing from the printed output — only more densely laid out.
5. Try a race with more/longer crew notes or a gear/baggie-heavy plan (the Grindstone sample has neither) — that's untested by this PRD's reference data and could push page count past 2.

---

## 15. Sources

- Uploaded sample: `2026 Grindstone` crew sheet, printed to PDF from `https://planultrarace.com/crew/it858hlJawGJJX46` (4 pages, used as the before/after reference data for this PRD and its mockup)
- `docs/requirements/PRD-010-crew-sheet.md` §9 (Print Optimization) — superseded for print by this PRD
- `docs/requirements/PRD-019-crew-sheet-mobile.md` §3.5 — confirms print always uses the desktop single-row header; unchanged
- `docs/requirements/PRD-022-crew-travel.md` §8 (Print Stylesheet Upgrade) — mostly retained, extended per §10 above
