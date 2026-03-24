# PRD-013: Timezone Dropdown — Race Creator
**Status:** Draft
**Created:** 2026-03-24
**Reference mockup:** `docs/requirements/mockups/timezone-dropdown.html`
**Files affected:**
- `src/app/(app)/dashboard/new/page.tsx`
- `src/components/admin/AdminRaceForm.tsx`
- `src/components/ui/timezone-select.tsx` *(new)*

---

## 1. Summary

The timezone field on the race creation form is currently a plain text input requiring the user to type an IANA timezone string (e.g. `America/Los_Angeles`). This is unfriendly and error-prone. Replace it with a **dropdown select** that:

- Shows only the abbreviated label when collapsed (e.g. `PST`, `EST`, `MDT`)
- Auto-selects the correct timezone based on the race's GPX start coordinates when a GPX is uploaded
- Falls back to a sensible default (`America/Los_Angeles`) when no coordinates are available
- Covers all timezones relevant to ultra marathon locations (primarily US + key international)

---

## 2. Layout Change

**Current layout:**

```
[Race name                          ]
[Date        ] [Start time ]
[Timezone                           ]
```

**New layout:**

```
[Race name                          ]
[Date        ] [Start time ] [TZ ▾  ]
```

Start time and timezone sit on the same row. The timezone dropdown is narrower than the start time field — it only needs to show a short abbreviation when collapsed (e.g. `PST`). Suggested column widths: `date` 1fr, `start time` 1fr, `timezone` auto (min ~80px, max ~110px).

On mobile (< 480px), the three fields stack to two rows: date alone on the first, start time + timezone on the second.

---

## 3. Dropdown Behaviour

### 3.1 Collapsed state

Shows the **short abbreviation** for the currently selected timezone, e.g.:
- `PST` (UTC−8, winter) / `PDT` (UTC−7, summer)
- `MST` / `MDT`
- `CST` / `CDT`
- `EST` / `EDT`
- `AKST` / `AKDT`
- `HST`
- `UTC` (fallback for international)

The abbreviation is computed at render time based on the IANA string + current date using `Intl.DateTimeFormat`. This means the label automatically reflects DST correctly — the dropdown shows `PDT` in summer and `PST` in winter without any manual mapping.

```ts
function tzAbbr(ianaTimezone: string): string {
  try {
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone: ianaTimezone,
      timeZoneName: 'short',
    }).formatToParts(new Date())
    return parts.find(p => p.type === 'timeZoneName')?.value ?? ianaTimezone
  } catch {
    return ianaTimezone
  }
}
```

### 3.2 Open state

The dropdown opens a list grouped by region. Each option shows:
- Full timezone name (e.g. "Pacific Time")
- Current abbreviation (e.g. `PDT`)
- UTC offset (e.g. `UTC−7`)

```
┌────────────────────────────────┐
│ ── United States ──────────── │
│  Pacific Time       PDT  −7   │
│  Mountain Time      MDT  −6   │
│  Mountain Time (AZ) MST  −7   │  ← Arizona doesn't observe DST
│  Central Time       CDT  −5   │
│  Eastern Time       EDT  −4   │
│  Alaska Time        AKDT −8   │
│  Hawaii Time        HST  −10  │
│ ── International ──────────── │
│  UTC                UTC   0   │
│  Western Europe     CEST +2   │
│  …                            │
└────────────────────────────────┘
```

### 3.3 Auto-detect from GPX coordinates

When a GPX file is loaded (or a library race is selected), the component should attempt to infer the timezone from the start coordinates. Since timezone-from-coordinates requires either a lookup table or an API, use the **browser's Geolocation API as a proxy** — no, that's wrong. Instead use a **lightweight coordinate-to-timezone lookup**.

**Implementation:** Use the `@vvo/tzdb` package (or equivalent) which provides a JSON lookup of timezone boundaries — no API call needed, runs entirely client-side.

Alternatively, use a simpler heuristic for US races based on longitude ranges:

```ts
function guessTimezoneFromCoords(lat: number, lon: number): string {
  // US longitude heuristics (rough but correct for most ultra venues)
  if (lon < -168) return 'Pacific/Honolulu'          // Hawaii
  if (lon < -140) return 'America/Anchorage'          // Alaska
  if (lon < -115) return 'America/Los_Angeles'        // Pacific
  if (lon < -104) return 'America/Denver'             // Mountain
  if (lon < -87)  return 'America/Chicago'            // Central
  if (lon < -52)  return 'America/New_York'           // Eastern
  // International fallback — use UTC offset from longitude
  return 'UTC'
}
```

This is intentionally simple. It will be wrong for edge cases (western Texas in Mountain time, etc.) but correct for the vast majority of ultra marathon venues. The user can always override manually.

**When auto-detect fires:**
1. GPX file uploaded → parse → extract `trackPoints[0].lat/lon` → call `guessTimezoneFromCoords` → set timezone
2. Library race selected → if `race.timezone` is set, use it directly (library races have known timezones)
3. No GPX → leave at current default (`America/Los_Angeles`)

Auto-detect should not override a timezone the user has already manually selected. Add a `userHasManuallySetTz` flag that gets set to `true` on any manual dropdown interaction.

---

## 4. Timezone Option List

The dropdown should cover every timezone where a significant ultra marathon scene exists. The list is static and hardcoded in the component — no runtime API needed.

### US timezones

| IANA string | Display name | Notes |
|---|---|---|
| `America/Los_Angeles` | Pacific Time | CA, OR, WA, NV |
| `America/Denver` | Mountain Time | CO, UT, WY, ID, MT, NM |
| `America/Phoenix` | Mountain Time (Arizona) | AZ — no DST |
| `America/Chicago` | Central Time | TX, IL, MN, WI, MO, KS |
| `America/New_York` | Eastern Time | VA, VT, NC, TN, GA, PA |
| `America/Anchorage` | Alaska Time | AK |
| `Pacific/Honolulu` | Hawaii Time | HI — no DST |

### International timezones

| IANA string | Display name | Notes |
|---|---|---|
| `UTC` | UTC | Fallback / international |
| `Europe/London` | Greenwich / BST | UK ultras |
| `Europe/Paris` | Central European Time | UTMB, France, Italy, Alps |
| `Europe/Helsinki` | Eastern European Time | Nordic ultras |
| `Australia/Sydney` | Australian Eastern Time | Oceanian ultras |
| `Pacific/Auckland` | New Zealand Time | Tarawera etc. |
| `Asia/Tokyo` | Japan Standard Time | UTMF, Hoka Hokkaido etc. |

---

## 5. Component API

Create a new shared component `src/components/ui/timezone-select.tsx` used by both the user new-race form and `AdminRaceForm`:

```tsx
interface TimezoneSelectProps {
  value: string                    // IANA timezone string
  onChange: (tz: string) => void
}

export function TimezoneSelect({ value, onChange }: TimezoneSelectProps)
```

The component is a `"use client"` component. It uses the Base UI `Select` (shadcn v4 pattern, not Radix) internally.

The collapsed trigger renders the abbreviation only:
```tsx
<SelectTrigger className="w-[90px]">
  <SelectValue>{tzAbbr(value)}</SelectValue>
</SelectTrigger>
```

---

## 6. Files to Update

### `src/app/(app)/dashboard/new/page.tsx`

1. Replace the standalone `<Input>` timezone field with `<TimezoneSelect>`.
2. Move timezone to the same grid row as start time: `grid-cols-[1fr_1fr_auto]`.
3. After `parseGPX`, call `guessTimezoneFromCoords(trackPoints[0].lat, trackPoints[0].lon)` and call `setTimezone` only if `!userHasManuallySetTz`.
4. When a library race is selected and `race.timezone` is set, apply it (library races have known correct timezones).

### `src/components/admin/AdminRaceForm.tsx`

Same swap — replace the `<Input>` with `<TimezoneSelect>`. The admin form already has a `timezone` field at line ~196; it's a simple drop-in replacement.

---

## 7. Implementation Notes

### 7.1 No external API dependency

The auto-detect heuristic is pure client-side math. No network request is needed. The full timezone list is ~15 entries hardcoded in the component. Keep it simple — this is not a general-purpose world timezone picker.

### 7.2 DST-awareness

The abbreviation shown in the collapsed trigger reflects the current DST state (computed live via `Intl.DateTimeFormat`), not the race date's DST state. This is a deliberate simplification — computing the abbreviation for an arbitrary future date would require more logic and is not worth it for a label that's primarily a hint.

### 7.3 The `America/Phoenix` edge case

Arizona (except the Navajo Nation) does not observe DST. `America/Phoenix` always returns `MST`. Include it as a distinct option rather than folding it into `America/Denver`, since several prominent ultras are in Arizona (Javelina Jundred, Black Canyon 100K, Zion 100 is just over the border).

---

## 8. Implementation Issues for Dev Agent

**Issue A — Base UI Select vs. native `<select>`**
The Base UI `Select` component (shadcn v4) has a different API from Radix. Use `onClick` not `onSelect` on items, and `data-*` attributes for state styling. See CLAUDE.md for the Base UI pattern reference.

**Issue B — `guessTimezoneFromCoords` lives in a shared util**
Put it in `src/lib/timezone.ts` alongside `tzAbbr`. Both functions are pure and have no dependencies — they can be used in any client component without import concerns.

**Issue C — Don't break `AdminRaceForm`**
`AdminRaceForm` currently accepts a `race` prop with `race.timezone` pre-populated. The `TimezoneSelect` swap must preserve this — initialise from `race?.timezone ?? 'America/Los_Angeles'` as before, just rendering a `TimezoneSelect` instead of an `Input`.

**Issue D — Coordinate extraction timing**
In `new/page.tsx`, the GPX parse already extracts `trackPoints` before storing the preview. The `guessTimezoneFromCoords` call should happen in `handleFile`, immediately after `parseGPX` returns, using `result.trackPoints[0]`. Don't wait for form submit.
