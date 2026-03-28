# PRD-021: Admin Screen — User Accounts & Race Activity Widgets

**Status:** Draft
**Created:** 2026-03-28
**Extends:** PRD-012 (Admin Screen — Race Library Management)

---

## 0. Mandatory Pre-Reading

Review:
- **PRD-012** — existing admin screen structure, `isAdmin()` pattern, admin route layout
- **PRD-003** — Ridge Light design system
- `src/lib/admin.ts` — `isAdmin()` and `ADMIN_EMAILS` constant
- `src/app/(app)/admin/page.tsx` — current admin landing card grid
- `src/lib/db/users.ts` (or equivalent) — existing user query patterns
- `src/lib/db/races.ts` — `Race` type, `createdAt` field availability

---

## 1. Summary

Add two new summary widgets to the admin landing screen (`/admin`):

1. **Users widget** — shows total non-admin user count and a preview list of recent sign-ups. Clicking opens a full paginated user table at `/admin/users`.
2. **Races widget** — shows a 7-day bar chart of race creation activity, excluding admin-owned races. No click-through for now — it's a read-only dashboard widget.

Both widgets follow the existing card pattern established in PRD-012 and use the Ridge Light design system.

---

## 2. Admin Dashboard Layout Update (`/admin`)

The admin landing currently has a single card (Race Library). After this PRD it will have three cards in a responsive grid.

**Updated layout (wide screen):**

```
┌──────────────────────────────────────────────────────────────────┐
│  Admin                                                           │
│  PlanUltra admin tools                                           │
├──────────────────────────────────────────────────────────────────┤
│  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────┐  │
│  │  📚 Race Library  │  │  👥 Users        │  │  🏁 Races    │  │
│  │  ...              │  │  ...             │  │  ...         │  │
│  └──────────────────┘  └──────────────────┘  └──────────────┘  │
└──────────────────────────────────────────────────────────────────┘
```

Grid: `grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4`. Cards are equal height where possible; content fills the available space.

---

## 3. Users Widget

### 3.1 Card content

```
┌──────────────────────────────────────────────────┐
│  👥 Users                                        │
│  ─────────────────────────────────────────────  │
│  Total users: 14                                 │
│                                                  │
│  Recent sign-ups                                 │
│  alice@gmail.com          Mar 27, 2026           │
│  bob@gmail.com            Mar 25, 2026           │
│  carol@gmail.com          Mar 22, 2026           │
│  ... and 11 more                                 │
│                                           →      │
└──────────────────────────────────────────────────┘
```

**Fields:**

- **Total users** — count of all user accounts, excluding admin emails defined in `ADMIN_EMAILS`.
- **Recent sign-ups list** — the 5 most recently created accounts (by `createdAt` descending), again excluding admin accounts. Each row shows:
  - Google email address (truncate at 36 chars with ellipsis if needed)
  - `createdAt` date formatted as `MMM D, YYYY`
- **"... and N more"** — shown only if total non-admin users > 5. `N = total - 5`.
- **Arrow (→)** — bottom right, indicates the card is clickable. Uses the same interactive card pattern as the Race Library card.

The entire card is a link to `/admin/users`.

### 3.2 Data source

The user list comes from the identity provider (currently NextAuth with Google). The relevant data is whatever is stored in the NextAuth session/user table — likely a DynamoDB table or adapter-managed store.

Identify where NextAuth persists user records in this project (check `src/lib/auth.ts`, the DynamoDB adapter config, and `src/lib/db/`) and query from there. If users are stored under a `USER#<id>` partition key pattern, a scan or index query will be needed.

**Admin exclusion:** filter out any user whose email is in `ADMIN_EMAILS` (from `src/lib/admin.ts`) at the data layer, not in the UI.

### 3.3 Card styling

Same card pattern as Race Library (PRD-012 §4): Mist fill, Sky border, Ridge Blue left-border on hover. DM Sans heading, Geist Sans body text.

---

## 4. Full User Table (`/admin/users`)

### 4.1 Route

`src/app/(app)/admin/users/page.tsx` — server component, protected by `isAdmin()` check (same pattern as other admin pages).

### 4.2 Layout

```
┌────────────────────────────────────────────────────────┐
│  ← Admin             Users                            │
│  All registered accounts                              │
├────────────────────────────────────────────────────────┤
│  Total: 14 users                                      │
│                                                        │
│  ┌──────────────────────────────────────────────────┐ │
│  │  Email                         Created           │ │
│  │  ─────────────────────────────────────────────  │ │
│  │  alice@gmail.com               Mar 27, 2026      │ │
│  │  bob@gmail.com                 Mar 25, 2026      │ │
│  │  ...                                             │ │
│  └──────────────────────────────────────────────────┘ │
│  [Load more]                                          │
└────────────────────────────────────────────────────────┘
```

**Back link:** "← Admin" → `/admin`. Same styling as PRD-012.

**Heading:** "Users" — DM Sans 24px weight 800.

**Subheading:** "All registered accounts" — Geist Sans 14px, Deep Ridge 60% opacity.

**Total count line:** "Total: N users" — Geist Sans 14px, shown above the table.

### 4.3 Table

A simple two-column table (not sortable in this version):

| Column | Content |
|---|---|
| Email | User's Google email, full width |
| Created | `createdAt` formatted as `MMM D, YYYY` |

- Admin accounts are excluded from this table.
- Sorted by `createdAt` descending (most recent first) as the default and only sort order.
- No actions on rows — this is read-only.
- Table uses Geist Sans 13px, standard Ridge Light table styling (light dividers, no zebra stripe).

### 4.4 Pagination

- Initial load: **100 users**.
- If more users exist, a **"Load more"** button appears below the table.
- Clicking "Load more" appends the next 100 users to the existing list (client-side append, not a full page reload).
- Button label: "Load more" (Geist Sans 14px, Ridge Blue text, no fill).
- When all users are loaded, the button disappears.

This can be implemented as a simple client component with `useState` for the loaded rows and a `GET /api/admin/users?offset=N&limit=100` endpoint, or as a server-rendered page with URL-based pagination. Client-side append is preferred for the smoother UX.

### 4.5 API endpoint

```
GET /api/admin/users?offset=0&limit=100
```

Returns:
```json
{
  "total": 14,
  "users": [
    { "email": "alice@gmail.com", "createdAt": "2026-03-27T10:22:00Z" },
    ...
  ]
}
```

- `total` always reflects the full non-admin count (used for "Total: N users" and to determine whether "Load more" is shown).
- `users` is the paginated slice.
- Admin emails excluded server-side.
- Route protected by `isAdmin()`.

---

## 5. Races Widget

### 5.1 Card content

```
┌──────────────────────────────────────────────────┐
│  🏁 Races created                                │
│  ─────────────────────────────────────────────  │
│  Last 7 days                                     │
│                                                  │
│   4 ┤              ██                           │
│   3 ┤         ██   ██                           │
│   2 ┤    ██   ██   ██   ██                      │
│   1 ┤ ██ ██   ██   ██   ██   ██                 │
│   0 └────────────────────────────               │
│      Mon Tue Wed Thu Fri Sat Sun                 │
│                                                  │
└──────────────────────────────────────────────────┘
```

**This card is not clickable.** No arrow, no link. It is a read-only widget.

**Fields:**

- **Heading:** "Races created" — DM Sans 14px weight 700.
- **Subheading:** "Last 7 days" — Geist Sans 12px, Deep Ridge 60% opacity.
- **Bar chart:** a simple 7-bar chart showing count of races created per day for the rolling 7-day window (today inclusive). Days with zero races show a zero-height bar or are visually absent.

### 5.2 Chart spec

- **X-axis:** day abbreviations (Mon, Tue, etc.), Geist Sans 11px.
- **Y-axis:** integer counts, auto-scaled to max value. If max is 0, y-axis shows 0–1. Always integer ticks.
- **Bars:** Ridge Blue (`#2B5EA7` or the design token equivalent), rounded top corners (2px radius).
- **Bar width:** equal width, evenly spaced across the card.
- **Tooltip:** on hover, show "N races" for that day (e.g. "3 races" or "1 race"). No tooltip if 0.
- **No legend** — the chart is self-explanatory in context.

Implementation: use the same charting library already in the project if one exists (check `package.json`). If none, use `recharts` — it's available in the project's dependency set and is already referenced in the design system.

### 5.3 Data source

- Query all races where `createdAt >= today - 7 days`, grouped by calendar day (in UTC is acceptable).
- **Exclude races owned by admin accounts** — filter out any race where the owning `userId` corresponds to an admin email. Because DynamoDB races are stored under `USER#<id>`, this requires either:
  - Resolving admin user IDs from their emails at query time, then excluding those IDs; or
  - Adding a flag to races at write time (not preferred — adds complexity).
  - **Recommended approach:** at page load, resolve admin user IDs once from the user store (look up `danrjames@gmail.com` → its `userId`), then exclude that ID from the race query results.
- **Exclude library races** — filter out `userId = '__LIBRARY__'` (the sentinel from PRD-012).

### 5.4 API endpoint

```
GET /api/admin/race-activity?days=7
```

Returns:
```json
{
  "days": [
    { "date": "2026-03-22", "count": 1 },
    { "date": "2026-03-23", "count": 0 },
    { "date": "2026-03-24", "count": 3 },
    { "date": "2026-03-25", "count": 2 },
    { "date": "2026-03-26", "count": 4 },
    { "date": "2026-03-27", "count": 0 },
    { "date": "2026-03-28", "count": 1 }
  ]
}
```

Always returns exactly `days` entries, one per calendar day, even if count is 0. The rolling window is calculated server-side.

Route protected by `isAdmin()`.

### 5.5 Card styling

Same card pattern as the other admin cards. No hover state change (not interactive). Cursor remains `default`.

---

## 6. Implementation Notes

### Issue A — Locating the user store
NextAuth with a DynamoDB adapter persists user records to a table. Find the table name in `src/lib/auth.ts` or the adapter config. The key schema for NextAuth DynamoDB adapter is typically `PK: USER#<id>, SK: USER#<id>`. Confirm this before writing any queries.

### Issue B — No user table scan available without a GSI
Listing all users (for the widget and full table) likely requires a DynamoDB scan or a GSI on the user table. If no GSI exists on `createdAt`, a full table scan filtered client-side is acceptable at current scale, but note this in the code with a `// TODO: add GSI when user count grows` comment.

### Issue C — Resolving admin user IDs for race exclusion
The race table stores `USER#<userId>`, not emails. To exclude admin races by email, you need to resolve `danrjames@gmail.com` → its DynamoDB user ID. Do this once per request in the API handler (a single `getUserByEmail` lookup), cache it in a module-level variable if needed. Do not hardcode the user ID directly — always derive it from `ADMIN_EMAILS`.

### Issue D — Rolling 7-day window definition
"Last 7 days" means the 7 calendar days ending with today (inclusive). Day boundaries are UTC. Today is always the rightmost bar on the chart.

### Issue E — Chart library
Check `package.json` for an existing chart library. If `recharts` is already present, use it. If a different library is in use, match it. Do not introduce a second charting dependency.

### Issue F — Widget data loading
Both widget cards on the admin landing page should load their data server-side (server components) to avoid layout shift. The full user table (`/admin/users`) uses client-side "load more" for pagination only — the first 100 rows can be server-rendered.

---

## 7. Out of Scope

- Clicking the Races widget does not navigate anywhere. No `/admin/races` detail view in this PRD.
- No user deletion or account management from the Users table — read-only.
- No sorting or filtering on the Users table in this version.
- No date range picker on the Races chart — always 7 days.
- No email or notification features triggered from either widget.
