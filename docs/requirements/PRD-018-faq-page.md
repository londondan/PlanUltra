# PRD-018 — FAQ Page

**Status:** Draft
**Date:** 2026-03-27
**Extends:** PRD-009 (Landing Page), PRD-015 (Landing Page v2)
**Content source:** `marketing/08-faq-content.md`

---

## 0. Summary

Add a dedicated `/faq` page to PlanUltra. The page serves two distinct purposes:

1. **User-facing utility** — answers common questions for runners who've found the app and want to understand what it does before committing to sign in
2. **AI discoverability** — surfaces PlanUltra to ChatGPT, Perplexity, and Claude when users ask about ultramarathon planning tools

The second goal is the primary driver. LLMs that search the web (Perplexity, search-augmented Claude and ChatGPT) parse FAQ pages for Q&A content, and the `FAQPage` JSON-LD schema signals directly to search engines and LLM crawlers that this page contains structured Q&A content. A standalone `/faq` route is more crawlable and indexable than an accordion section buried on the landing page.

The FAQ page does **not** replace a FAQ accordion on the landing page — that remains a separate decision. This PRD covers the standalone route only.

---

## 1. Goals

- Make PlanUltra discoverable when someone asks an AI: "what tools can help me plan a 100-mile race?" or "how do I organise crew for an ultramarathon?"
- Reduce pre-signup friction by answering the most common objections (is it free? do I need an account? what if my race isn't in the library?)
- Create a crawlable, schema-marked page that signals PlanUltra's purpose to search engines and LLM training pipelines

## 2. Non-goals

- A landing page accordion FAQ (out of scope for this PRD — address separately)
- A user support / help centre (this is not a ticketing or search system)
- Dynamic FAQ content (content is static; no CMS needed for v1)

---

## 3. Route and file structure

| Item | Value |
|---|---|
| Route | `/faq` |
| File | `src/app/faq/page.tsx` |
| Page type | Server component (static) |
| Metadata | Title, description, and `FAQPage` JSON-LD schema |

The page is fully statically renderable — no auth required, no database reads. Next.js will build it as a static page at build time.

---

## 4. Page metadata

### 4.1 `<title>`

```
Ultramarathon Planning FAQ — PlanUltra
```

### 4.2 `<meta name="description">`

```
Common questions about PlanUltra — the free ultramarathon planning tool. Learn how to plan pacing, drop bags, crew logistics, and weather for 100-mile races.
```

### 4.3 JSON-LD schema

Inject a `<script type="application/ld+json">` block in the page `<head>` with the following structure:

```json
{
  "@context": "https://schema.org",
  "@type": "FAQPage",
  "mainEntity": [
    {
      "@type": "Question",
      "name": "What is PlanUltra?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "PlanUltra is a free web tool that helps ultramarathon runners plan their race logistics..."
      }
    },
    ...
  ]
}
```

Include all questions from `marketing/08-faq-content.md`. The `FAQPage` schema type is the primary signal to search engines and LLMs that this page is a structured Q&A resource — don't skip it.

For canonical implementation, use Next.js `generateMetadata()` or place the JSON-LD block directly in the server component using a `<Script>` component with `strategy="beforeInteractive"` (or just inline `<script>` in the JSX head via `next/head`).

---

## 5. Page structure and content

### 5.1 Visual structure

The page uses the existing design system (DM Sans, Geist, colour tokens). It does **not** introduce new components. Layout:

```
[Nav]
[Page header]
[FAQ sections — grouped by category]
[CTA strip]
[Footer]
```

### 5.2 Page header

- Background: `var(--midnight)`
- Padding: `72px 48px 64px`
- Max-width: 900px, centered

Content:
- Eyebrow: "Help & FAQ" — Geist Mono, 11px, `var(--sky)` 60% opacity, uppercase, letter-spacing 0.12em
- Heading: "Common questions" — DM Sans, `clamp(28px, 4vw, 40px)`, weight 800, white
- Subhead: "Everything you need to know before race day." — Geist Sans, 16px, `rgba(255,255,255,0.65)`

### 5.3 FAQ sections

Questions are grouped into sections matching `marketing/08-faq-content.md`:

| Section label | Slug |
|---|---|
| General | `#general` |
| Race setup | `#race-setup` |
| Planning features | `#planning-features` |
| Ultramarathon planning | `#ultramarathon-planning` |
| Technical | `#technical` |

Each section renders as:
- Section heading: DM Sans, 20px, weight 700, Midnight (`var(--midnight)`), `margin-bottom: 24px`
- Individual Q&A items (see §5.4)
- Divider line between sections: `border-top: 1px solid #E2E8F0`

Background: white. Max-width: 900px, centered. Padding: `64px 48px`.

### 5.4 Q&A item component

Each question/answer pair renders as:

```
[Q] Question text — DM Sans, 17px, weight 700, Midnight
[A] Answer text — Geist Sans, 15px, `#475569`, line-height 1.7
    margin-bottom: 32px
```

**Do not use an accordion / `<details>` pattern.** Expanding/collapsing hides content from crawlers and LLMs. All answer text must be visible in the DOM on page load — no JavaScript toggle. This is the most important implementation constraint for the discoverability goal.

### 5.5 CTA strip

A simple full-width strip at the bottom of the FAQ content, before the footer. Background `var(--deep-ridge)` (or `var(--midnight)`). Padding: `48px`.

Content:
- Heading: "Ready to plan your race?" — DM Sans, 24px, weight 800, white
- Sub: "Free, no subscription. Just upload your GPX and go." — Geist Sans, 15px, white 70% opacity
- Button: "Start planning →" — links to `/` or `/dashboard`, Ridge Blue background, white text, same button style as landing page CTA

---

## 6. Navigation

### 6.1 Footer link

Add "FAQ" as a link in the footer's nav column. Position: after any existing nav links, before the email/contact link.

### 6.2 Nav bar (optional)

Do **not** add FAQ to the primary top navigation for now — it adds weight to the nav and this page is primarily an SEO/LLM surface, not a core app screen. Re-evaluate after launch.

### 6.3 Landing page link (optional)

A small text link at the bottom of the landing page hero or feature section — "Have questions? See the FAQ →" — is worth adding alongside this work. Keep it low-profile; it should not compete visually with the primary CTA.

---

## 7. Discoverability requirements

These are non-negotiable for the AI discoverability goal:

| Requirement | Rationale |
|---|---|
| All answer text visible in DOM on load (no accordion) | Hidden content is not indexed by Perplexity or search-augmented LLMs |
| `FAQPage` JSON-LD schema with all Q&A pairs | Direct signal to Google, Bing, and LLM parsers that this is structured Q&A content |
| `<title>` contains "ultramarathon" and "planning" | Matches the query terms users type into AI search |
| `<meta description>` mentions key use cases | Appears in search result snippets; influences whether a user (or LLM) clicks through |
| Questions phrased as natural-language queries | LLMs match on the question text itself — "How do I plan a 100-mile race?" matches better than "Pace estimation" |
| Static server render (no client-only content) | Ensures Googlebot and Perplexity's crawler see the full content without executing JavaScript |
| Page included in `sitemap.xml` | Ensures crawlers discover the page without relying on a link |
| Internal linking from landing page and footer | Increases page authority signals for Perplexity and search-augmented models |

---

## 8. Content maintenance

Content lives in `marketing/08-faq-content.md` as the source of truth. When FAQ content needs to change:

1. Update `marketing/08-faq-content.md`
2. Update `src/app/faq/page.tsx` to reflect the change
3. Update the JSON-LD schema block to match

For v1, the FAQ is hardcoded in the page component. A CMS-driven FAQ is unnecessary overhead for a hobby project at this scale.

---

## 9. Feature summary

| Item | Detail | Priority |
|---|---|---|
| `/faq` route | Static server component, no auth | P0 |
| `FAQPage` JSON-LD schema | All Q&A pairs from `08-faq-content.md` | P0 |
| Page title + meta description | Keyword-optimised per §4 | P0 |
| All answers visible on load (no accordion) | Required for LLM crawlability | P0 |
| Footer nav link | "FAQ" link in footer | P0 |
| `sitemap.xml` inclusion | Add `/faq` to sitemap | P0 |
| CTA strip | "Start planning →" at bottom of page | P1 |
| Landing page text link to FAQ | Low-prominence link from hero or features section | P1 |
| Nav bar link | Skip for now | Out of scope |

---

## 10. Open questions

- **`SoftwareApplication` schema:** The AI discoverability strategy (`marketing/07-ai-discoverability-strategy.md`) also recommends adding `SoftwareApplication` JSON-LD to the homepage. That schema belongs on `page.tsx` (the landing page), not `/faq`. It should be implemented alongside this work but tracked separately — consider as a small addition to PRD-015 or a standalone micro-task.

- **FAQ link in hero copy:** PRD-015 updated the hero description. A brief "Questions? See the FAQ →" addition to the hero subhead could help — but only if it doesn't dilute the CTA. Leave to implementer's judgment.

---

## 11. Decisions log

| Decision | Choice | Rationale |
|---|---|---|
| Accordion vs. open text | Open text (no accordion) | Accordion hides content from crawlers; LLM discoverability requires visible DOM content |
| CMS vs. hardcoded | Hardcoded v1 | Zero overhead for a hobby project; content changes are infrequent |
| Standalone page vs. landing section | Standalone `/faq` | More crawlable; dedicated URL signals the page's purpose more clearly to search engines |
| Nav bar inclusion | No | FAQ is an SEO surface, not a primary app screen; footer link is sufficient |

---

*This document is a living draft. Update as implementation decisions are made.*
