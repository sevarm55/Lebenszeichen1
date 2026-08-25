# From one site to ten

Today: one German site. Planned: Spanish, Italian, French, English and more, plus
a shared business dashboard.

The brief says explicitly **do not build the multi-tenant SaaS now**. This
document records what was done so that it stays cheap later, and what
deliberately was not.

## What is already in place

### `siteId` everywhere

Every content model carries it: `Post`, `Category`, `Tag`, `Author`,
`MediaAsset`, `Source`, `AdPlacement`, `PostRedirect`, `SiteSettings`.
Uniqueness is scoped: `@@unique([siteId, slug])`, not `@@unique([slug])`.

Adding a site is a row, not a migration.

### One resolver

`getSiteId()` in `server/services/site.ts` is the only place the current site is
determined. Today it looks up `key = 'de'`. Multi-site means changing that one
function — by hostname, by path prefix, or from a header set by the proxy.

### Settings per site

`SiteSettings` already holds brand, SEO pattern, ad density, CMP and analytics
choice, and legal details. Two sites with different ad densities and different
legal entities need no schema change.

### Placements per site

`AdPlacement` is keyed `[siteId, key]` with an optional `networkSlot` override.
Different AdSense accounts per site work already.

### Language on content

`Post.language` exists and the AI workspace publishes in any of ten languages
today. The German site is simply the one whose `SiteSettings.defaultLanguage` is
`de`.

### Vendor-neutral abstractions

`AIProvider`, `StorageDriver`, `trackEvent`, `AdSlot` — each already isolates a
vendor behind an interface, so per-site differences (different AI models,
different storage buckets, different ad networks) do not fan out into components.

## What was deliberately not built

- **Per-request tenant resolution.** One extra lookup on every request, for one
  site. `getSiteId()` is where it goes.
- **Cross-site admin.** The CMS assumes one site. Later: a site switcher plus a
  `siteId` in the session.
- **Shared media across sites.** Assets are site-scoped. Sharing is a join table.
- **`hreflang`.** Meaningless with one language, and wrong `hreflang` is worse
  than none.
- **The business dashboard.** Explicitly out of scope.

## When site #2 arrives

### 1. Resolve the site from the request

```ts
// server/services/site.ts
export const getSite = cache(async () => {
  const host = (await headers()).get('host') ?? ''
  const key = SITE_BY_HOST[host] ?? DEFAULT_SITE_KEY
  return prisma.site.findUnique({ where: { key }, include: { settings: true } })
})
```

Everything downstream already calls `getSiteId()`, so nothing else changes.

Deployment choice: one process serving several domains (cheapest, shared cache,
one failure domain) versus one process per site (isolated, more resources). For
up to ~5 sites the single process is usually right.

### 2. Admin site switcher

Add `siteId` to the session, a switcher in the shell, and pass it through
`getSiteId()`. Scope the role check per site if editors should not see every
site.

### 3. hreflang

Once two languages cover the same story, add a `translationGroupId` to `Post`
and emit `alternates.languages` from `buildMetadata`. One place.

### 4. Business dashboard

A separate project, per the brief. What this codebase already gives it:

| Need | Already recorded |
|---|---|
| Traffic per site | GA4 property per site, or the `trackEvent` sink |
| Revenue | AdSense API per publisher account |
| Cost | `AITask.costUsd`, `durationMs` |
| Content volume | `Post` grouped by `siteId`, `status` |
| Top posts | `Post.views` |
| Provenance | `Post.sourceUrl`, `Source.importCount` |
| Who did what | `AuditLog` |

The one thing to add is a read-only aggregation endpoint per site, secured by a
service token. Nothing in the current design blocks it.

## What would be expensive to change later — and was therefore decided now

| Decision | Why it is hard to reverse |
|---|---|
| `siteId` on every content model | Retrofitting means backfilling every table and rewriting every unique constraint |
| Blocks instead of HTML | Migrating a corpus of stored HTML into structured blocks is lossy and manual |
| Slug uniqueness scoped per site | Global uniqueness would force ugly slugs the moment two sites cover the same topic |
| Ads behind one primitive | Ad code sprinkled through components is the single hardest thing to unpick when the network changes |
| Secrets out of the database | Once credentials live in a settings table, every backup and every admin session becomes a leak path |
