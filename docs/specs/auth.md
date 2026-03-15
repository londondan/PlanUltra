# System Spec: Authentication
**Last updated:** 2026-03-15
**Status:** Shipped

---

## What it does

Authentication is handled entirely by NextAuth.js v5 using Google OAuth as the sole provider. There are no passwords, no email/magic-link flows, and no other OAuth providers. Sessions are stored as JWTs (not in a database). The Google user ID (`sub` from the JWT) is propagated into `session.user.id` and used as the user identifier throughout the app.

Route protection is enforced globally via Next.js middleware (`src/middleware.ts`). Any route that is not `/`, `/auth/*`, or `/api/auth/*` redirects unauthenticated users to `/auth/signin`. This means protection is opt-out (all routes are protected by default) rather than opt-in.

The sign-in page lives at `/auth/signin` and is a custom page (not NextAuth's default UI).

## What it does not do

- Does not support any provider other than Google.
- Does not store session data in DynamoDB or any other database — sessions are stateless JWTs.
- Does not implement role-based access control (RBAC). All authenticated users have the same permissions.
- Does not support account linking, profile editing, or email verification.
- Does not support API key or token-based auth for programmatic access.
- Does not have a sign-up flow distinct from sign-in — Google OAuth handles both in one step.

## Key files

| File | Role |
|---|---|
| `src/lib/auth.ts` | NextAuth config: Google provider, JWT session strategy, `session.user.id` callback |
| `src/middleware.ts` | Route guard: redirects unauthenticated requests to `/auth/signin` |
| `src/app/api/auth/[...nextauth]/route.ts` | NextAuth catch-all API route handler |
| `src/app/auth/signin/page.tsx` | Custom sign-in UI |

## Data model

No auth-specific table. The user identifier is `token.sub` from the Google JWT — a stable, opaque string like `"118204...abc"`. This string is used as the DynamoDB partition key prefix (`USER#<id>`) for all user-owned data.

## Notes for future development

- If a second auth provider is added, the `session.user.id` propagation logic in `auth.ts` will need to handle provider-specific ID namespacing to avoid collisions.
- If admin or crew views are added with different permissions, RBAC would need to be layered on top — currently there is no mechanism for this.
- The middleware matcher excludes `_next/static`, `_next/image`, and `favicon.ico` — any new public static asset paths would need to be added to the exclusion list.
