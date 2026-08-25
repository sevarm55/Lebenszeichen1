# SEO

## Metadata

One builder, `server/seo/metadata.ts`, used by every public page. Two things it
guarantees structurally:

- **The canonical URL never carries a query string.** UTM-tagged Facebook traffic
  therefore cannot split a page's ranking signals across a dozen URLs.
- **An OG image is always emitted**, falling back to the site default. A Facebook
  share without an image loses most of its click-through.

Per post, editable in the CMS: `seoTitle`, `metaDescription`, `canonicalUrl`,
`ogTitle`, `ogDescription`, `socialHeadline`, `slug`. AI can propose all of them
(**SEO** button); the editor always has the final word.

Title pattern is configurable (`%s | {siteName}`) and applied with
`title.absolute`, so the root template is not applied twice.

## Indexing rules

| Path | Indexed |
|---|---|
| `/`, articles, categories, `/neueste`, `/beliebt` | Yes |
| `/ueber-uns`, `/kontakt`, `/redaktionsrichtlinien`, `/korrekturen` | Yes |
| `/suche` | **No** — thousands of thin, near-duplicate pages is exactly what Google penalises |
| `/impressum`, `/datenschutz`, `/cookie-einstellungen` | **No** — no search value, and they dilute the topical profile |
| `/admin/**` | **No** — three layers: robots.txt, `X-Robots-Tag` header from `next.config.js`, and `noindex` metadata |
| `/api/**` | **No** |

## Structured data

| Type | Where |
|---|---|
| `Organization` | Every page (public layout) |
| `WebSite` + `SearchAction` | Every page |
| `Article` | Article pages |
| `BreadcrumbList` | Article and category pages |
| `CollectionPage` | Category pages |

`Article` is emitted rather than `NewsArticle` — this is a human-interest
magazine, not a news wire, and claiming otherwise invites a mismatch between the
markup and the content. No `aggregateRating` or review markup is produced
anywhere; fabricated review markup is a manual-action risk.

## Sitemap

`/sitemap.xml`, regenerated hourly. Contains the homepage, `/neueste`,
`/beliebt`, every enabled category, every published article, and the four
indexable trust pages. Articles published in the last 14 days get priority 0.9,
older ones 0.6, so recrawl budget goes where it matters.

If the database is unavailable the sitemap degrades to the static entries rather
than returning a 500 — a broken sitemap is worse than a small one.

## Redirects

Changing a published post's slug writes a `PostRedirect` row automatically.
Changing a category slug does the same for every article beneath it.

They are served as **hard 301s by `middleware.ts`**, which reads a cached map
from `/api/redirects` (refreshed at most once a minute, held in module scope).
This matters: `redirect()` inside the article page produces only a *soft*,
client-side redirect once the response has started streaming, and crawlers do not
treat that as a permanent move. Query strings are preserved, so an old link with
UTM parameters keeps its attribution.

## URLs

```
/                                homepage
/[category]/[slug]               article    → /tiere/der-hund-der-jeden-morgen…
/kategorie/[slug]                category
/kategorie/[slug]?seite=2        pagination
/neueste  /beliebt  /suche?q=
```

Article URLs carry the category, which gives Google a topical signal and reads
well when shared. Slugs are German-aware: `ä → ae`, `ö → oe`, `ü → ue`, `ß → ss`.
NFD stripping would turn "Bäckerei" into "backerei", which reads wrong to a
German speaker.

Requesting an article under the wrong category redirects to the canonical path,
so the same story never lives at two URLs.

## Pagination

Real `<a>` links, not "load more". Infinite scroll would cost indexable URLs for
everything past page one and break the back button. `rel="prev"` / `rel="next"`
are emitted, and page 2+ canonicalises to itself.

## Images

- `next/image` with AVIF and WebP, explicit `sizes` per layout.
- The hero on an article gets `priority` — it is the LCP element.
- 16 px blur placeholder from the database, so there is no flash of empty box.
- Uploads keep a descriptive filename stem derived from the original.
- Alt text is a first-class field, and the pre-publish checklist flags missing
  ones.

## Core Web Vitals

| Metric | What is done |
|---|---|
| **LCP** | Hero image prioritised; fonts `display: swap` and self-hosted by `next/font`; server-rendered HTML |
| **CLS** | Every ad slot reserves its height *before* the network answers — filled or unfilled, nothing moves. Images have intrinsic dimensions |
| **INP** | Almost everything is a server component; the client bundle is ~103 kB shared |

## Search Console

1. **https://search.google.com/search-console** → *Add property* → **Domain**.
2. Add the TXT record it gives you at your DNS provider. Domain properties cover
   http, https and every subdomain, which URL-prefix properties do not.
3. **Sitemaps → Add a new sitemap** → `sitemap.xml`.
4. **URL Inspection** on one article → *Request indexing* to seed the crawl.
5. Watch weekly: *Pages* (indexed vs excluded), *Core Web Vitals*, *Manual
   actions* (should stay empty).

Expect 2–8 weeks before meaningful organic traffic on a new domain. Facebook
traffic arrives immediately and is what makes the first months viable.

## Multi-language readiness

The metadata builder already takes a locale, and `Post.language` exists. When the
second language site launches, `hreflang` is added in one place — see
[FUTURE_MULTI_SITE.md](FUTURE_MULTI_SITE.md).
