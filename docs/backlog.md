# PlanUltra Backlog

Low-priority items deferred from PRDs. Pick these up when the time is right.

---

## Admin

### Add admin user ID to env vars
**From:** PRD-021
Currently, excluding the admin account from race counts requires a runtime lookup of `danrjames@gmail.com` → its DynamoDB user ID. Add `ADMIN_USER_IDS` as a companion env var to `ADMIN_EMAILS` so the exclusion can be done without a DB lookup. Populate it once from the user store and set it in `.env.local` and the deployment environment.

### Optimise user table query with a GSI
**From:** PRD-021
The `/admin/users` endpoint currently uses a DynamoDB full table scan to list all users. Fine at <10 users, but will degrade at scale. When user count grows meaningfully, add a GSI on `createdAt` to support efficient paginated queries sorted by sign-up date.
