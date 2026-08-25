# Architecture

## Guiding constraints

1. **The public site and the CMS never share code paths.** They share the
   database and a handful of pure helpers, nothing else. A change to an admin
   screen cannot break an article page.
2. **Content is structured data, not markup.** Articles are typed block arrays.
   Imported third-party HTML never becomes stored HTML.
3. **Secrets stay on the server.** Anything reaching the browser lives in
   `config/public.ts` and is auditable at a glance.
4. **The second site must not require a rewrite.** Every content model already
   carries `siteId`.

## Folder layout

```
app/
  (public)/            German magazine — the route group carries the public layout
    page.tsx                   homepage
    [category]/[slug]/         article
    kategorie/[slug]/          category
    neueste/  beliebt/  suche/ feeds and search
    ueber-uns/ impressum/ …    trust and legal pages
    _components/               shells used only by those pages
  admin/               Russian CMS — separate layout, never indexed
    login/  posts/  media/  categories/  sources/  ai-tasks/  settings/
    vorschau/[id]/             authenticated preview
  api/
    admin/…                    every mutation, all guarded
    views/  redirects/  revalidate/
  layout.tsx  robots.ts  sitemap.ts  not-found.tsx  error.tsx

components/
  public/              magazine UI (cards, header, footer, article renderer)
  admin/               CMS UI (block editor, media picker, forms, tables)
  ads/                 AdSlot, script loaders, sticky, interstitial hook
  ui/                  shared primitives (button, input, select, dialog…)

server/                server-only — never imported from a client component
  domain/              block document model, shared request schemas
  services/            posts, post-editor, site, quality, duplicates, audit
  ai/                  provider interface + mock + fal.ai + prompts
  content-import/      SSRF guard, bounded fetcher, article extractor
  media/               storage abstraction, image processing
  seo/                 metadata builder, JSON-LD
  ads/                 placement registry, density engine, runtime builder
  auth/                sessions, password hashing, rate limiting, guards
  analytics/           event abstraction

config/                env.ts (server), public.ts (client), site.ts (brand)
database/              schema.prisma, seed, demo content
docs/                  this
lib/                   prisma client, utils, admin fetch helper
scripts/               create-admin, ad-engine-check
```

## Layer rules

- A **page** may import from `server/services`, `server/seo`, `server/ads`.
- A **service** may import from `lib`, `config`, other services, `server/domain`.
- A **client component** may import from `components/*`, `lib/utils`,
  `lib/admin-client`, `config/public`, and *type-only* from `server/domain`.
- Nothing outside `server/` imports `server/auth/session` or `config/env`.
  Both are marked `server-only`, so a mistake is a build error, not a leak.

## Data flow

### Reading an article

```
GET /leben-schicksale/zweiundvierzig-jahre…
  → middleware        checks the redirect map (301 if the slug moved)
  → page              getPostBySlug (React cache: one query per request)
  → parseDocument     untrusted JSON → validated Block[]
  → planAds           block list + word count → ad positions
  → ArticleBody       renders blocks, weaves <AdSlot/> in at those positions
  → AdSlot            reserves height, pushes to adsbygoogle once
```

`revalidate = 600` on the article route; `revalidatePath` on publish makes the
change appear immediately instead of waiting out the window.

### Publishing

```
PUT /api/admin/posts/[id]
  → guardApi          session + role + CSRF
  → zod               shape validation
  → updatePost        snapshot revision → write → slug redirect if needed
                      → tags → source link → audit → revalidate
```

### Import + generate

Covered in [URL_IMPORT.md](URL_IMPORT.md) and [AI_INTEGRATION.md](AI_INTEGRATION.md).

## Rendering strategy

| Route | Mode | Why |
|---|---|---|
| `/` | ISR, 300 s | Changes on every publish, read constantly |
| `/[category]/[slug]` | ISR, 600 s + `generateStaticParams` (50 newest) | Articles are the traffic; the newest are prerendered, the rest render on demand and cache |
| `/kategorie/[slug]` | ISR, 300 s, all slugs prerendered | Small, fixed set |
| `/neueste`, `/suche` | Dynamic | Read `searchParams` |
| `/beliebt` | ISR, 600 s | View counts move slowly |
| `/admin/**` | Dynamic, `force-dynamic` | Always fresh, always authenticated |

## A constraint worth knowing before adding `loading.tsx`

`loading.tsx` creates a Suspense boundary, and the streamed shell **commits a
200 before the page component resolves**. On a route that can `notFound()` or
`redirect()`, that turns a hard 404 into a *soft* one and a 301 into a
client-side hop — and Google indexes soft 404s.

So loading states live only on routes that cannot 404: `/suche` and `/neueste`.
Do not add `loading.tsx` to `app/(public)/` or to the article/category routes.

For the same reason, `notFound()` and `redirect()` on the article and category
routes are raised inside `generateMetadata`, which runs before streaming starts.
`getPostBySlug` is `React.cache`d, so this costs no extra query.

Verified:

```
/tiere/gibt-es-nicht       404
/kategorie/gibt-es-nicht   404
/erfunden/quatsch          404
```

## The block document

`server/domain/blocks.ts` defines eleven block types and `parseDocument`, which
coerces any untrusted JSON into a valid document and silently drops anything it
does not recognise. Everything that stores or reads article content goes through
it — the DB column, AI output, the importer, the editor.

Inline emphasis is a closed subset: `**bold**`, `*italic*`,
`[label](https://url)`, rendered by `components/public/rich-text.tsx` into real
React elements. There is no `dangerouslySetInnerHTML` anywhere in the article
path, and `safeHref` drops anything that is not http(s).

## Ads

Placement definitions in `server/ads/placements.ts`, density algorithm in
`server/ads/engine.ts`, runtime assembly in `server/ads/runtime.ts`, the single
UI primitive in `components/ads/ad-slot.tsx`. No component anywhere else knows a
publisher id or a slot id. See [ADSENSE.md](ADSENSE.md).

## Multi-site readiness

Every content model has `siteId`, and `getSiteId()` is the single place the
current site is resolved. Adding a second site is a row plus a resolver change,
not a schema migration. See [FUTURE_MULTI_SITE.md](FUTURE_MULTI_SITE.md).
