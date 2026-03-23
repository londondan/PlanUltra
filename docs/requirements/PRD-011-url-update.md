# PRD-011: Production URL — www.planultrarace.com
**Status:** Draft
**Created:** 2026-03-23

---

## 1. Summary

The canonical production URL for PlanUltra is **`https://www.planultrarace.com`**. This PRD documents every location where that URL must appear or be configured, and flags any currently incorrect references that need fixing.

The URL is already recorded in `CLAUDE.md` as project-level context. This PRD exists so the dev agent has a single place to find all required changes.

---

## 2. Current State

A search of the codebase on 2026-03-23 found **no hardcoded URL references** in `src/` — the URL has not yet been embedded anywhere in the application code. This is the right time to establish the correct value before it proliferates.

The docs and mockups under `docs/requirements/` have been updated to `www.planultrarace.com` as part of this PRD.

---

## 3. Required Changes

### 3.1 Next.js metadata (`src/app/layout.tsx`)

Set the canonical URL in the root layout metadata object:

```ts
export const metadata: Metadata = {
  metadataBase: new URL('https://www.planultrarace.com'),
  title: {
    default: 'PlanUltra',
    template: '%s · PlanUltra',
  },
  description: 'Ultra marathon race planning — pace, pack, and crew from one place.',
  openGraph: {
    url: 'https://www.planultrarace.com',
    siteName: 'PlanUltra',
    locale: 'en_US',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    site: '@planultrarace',
  },
}
```

`metadataBase` is required for Next.js to resolve relative OG image URLs correctly.

### 3.2 Crew sheet page (`src/app/crew/[token]/page.tsx`)

The published-at footer line and any "share this link" copy should use the full URL:

```ts
const crewUrl = `https://www.planultrarace.com/crew/${race.crewShareToken}`
```

This is the URL shown to the runner in the Crew tab and in the crew sheet footer.

### 3.3 Crew tab — share link display (`src/app/(app)/races/[raceId]/crew/page.tsx` or similar)

The runner copies this link to share with crew. Construct it as:

```ts
`https://www.planultrarace.com/crew/${race.crewShareToken}`
```

Do not use `window.location.origin` — that breaks in server components and returns `localhost` in dev. Use the hardcoded production URL here, or pull from an environment variable (see §3.6).

### 3.4 NextAuth.js configuration (`src/auth.ts` or `src/lib/auth.ts`)

Set the `NEXTAUTH_URL` environment variable (see §3.6). NextAuth uses this for OAuth callback URLs and session cookie domains. Do not hardcode it in source — use the env var.

### 3.5 `robots.txt` and `sitemap.xml`

If these are generated statically or via Next.js route handlers, ensure the sitemap uses the correct base URL:

```ts
// src/app/sitemap.ts
export default function sitemap(): MetadataRoute.Sitemap {
  return [
    { url: 'https://www.planultrarace.com', lastModified: new Date() },
    { url: 'https://www.planultrarace.com/sign-in', lastModified: new Date() },
  ]
}

// src/app/robots.ts
export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: '*', allow: '/' },
    sitemap: 'https://www.planultrarace.com/sitemap.xml',
  }
}
```

### 3.6 Environment variables

Add to `.env.production` (not committed — set in deployment platform):

```
NEXTAUTH_URL=https://www.planultrarace.com
NEXT_PUBLIC_APP_URL=https://www.planultrarace.com
```

Add to `.env.local` for local development:

```
NEXTAUTH_URL=http://localhost:3000
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

Reference `NEXT_PUBLIC_APP_URL` anywhere the app URL is needed in client or server code:

```ts
const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://www.planultrarace.com'
const crewUrl = `${appUrl}/crew/${token}`
```

This way local dev links work correctly without hardcoding `localhost`.

---

## 4. Out of Scope

- DNS configuration, SSL certificates, and Vercel/hosting setup — these are infrastructure concerns outside the app codebase.
- Google OAuth callback URL registration — the developer must add `https://www.planultrarace.com/api/auth/callback/google` to the Google Cloud Console for the OAuth client. Not a code change.

---

## 5. Implementation Issues for Dev Agent

**Issue A — Do not use `window.location.origin` for crew URLs**
Server components cannot access `window`. Always use `process.env.NEXT_PUBLIC_APP_URL` with a hardcoded fallback of `https://www.planultrarace.com`.

**Issue B — `metadataBase` must be set before OG images work**
Any route that exports OG image metadata (`opengraph-image.tsx`) will produce broken absolute URLs until `metadataBase` is set in `layout.tsx`.

**Issue C — NEXTAUTH_URL in production**
NextAuth will silently fall back to inferring the URL from request headers if `NEXTAUTH_URL` is unset. This works in most cases but can break on edge deployments or behind proxies. Set it explicitly.
