# System Spec: Dashboard
**Last updated:** 2026-03-15
**Status:** Shipped

---

## What it does

The dashboard (`/dashboard`) is the logged-in home screen. It shows all races for the current user as a grid of cards, each displaying race name, date, timezone, and start time. Each card links to the race detail page. An "Add race" button links to the race creation flow.

If the user has no races, an empty state is shown with a prompt to add their first race.

Authentication is enforced server-side: the page calls `auth()` directly and redirects to `/auth/signin` if there is no session. Race data is fetched from DynamoDB via `getRacesByUser`. Fetch errors are caught and result in an empty race list (no error UI shown to the user).

## What it does not do

- Does not support deleting or archiving races from the dashboard. There is currently no delete affordance in the UI.
- Does not paginate. All races for the user are fetched and rendered in a single request. For users with many races this could become slow.
- Does not show race status (e.g. upcoming vs. past), course distance, or any preview of the course.
- Does not support sorting or filtering races.

## Key files

| File | Role |
|---|---|
| `src/app/dashboard/page.tsx` | Server component: auth check, data fetch, race card grid |

## Notes for future development

- Adding a race distance to the card would be straightforward — the total distance can be computed from the last aid station's `distanceFromStart`.
- A "past races" vs "upcoming races" split would be useful once users accumulate more than a few races.
- The crew view (planned future feature) will likely be a separate route (`/crew/<token>` or similar) rather than a dashboard variant, as crew members may not have accounts.
