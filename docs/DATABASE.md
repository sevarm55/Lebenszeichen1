# Database

PostgreSQL, managed with Prisma. Schema: `database/schema.prisma`.

## Models

### Site / SiteSettings

`Site` is the tenant row (`key = "de"` today). `SiteSettings` holds everything an
editor may change without a deploy: brand name, posts per page, SEO title
pattern, ad switches and density, CMP/analytics providers, and the legal details
required for the Impressum.

Deliberately **not** stored here: AdSense publisher id, `FAL_KEY`, analytics
secrets. Credentials live in the environment only.

### User / Session

`User` carries `role` (`OWNER` | `ADMIN` | `EDITOR`), `failedLogins` and
`lockedUntil` for brute-force lockout. `Session` stores a SHA-256 hash of an
opaque token — never the token itself — so a database dump cannot be replayed as
a login. See [SECURITY.md](SECURITY.md).

### Category / Tag / PostTag / Author

Standard taxonomy, all scoped by `siteId`. `Category` carries its own SEO fields,
an `order` for navigation, and `enabled` / `showInNav` switches.
`Author.isDemo` marks seed personas so the article page can label them.

### Post

The centre of the schema.

| Group | Fields |
|---|---|
| Content | `title` `subtitle` `slug` `excerpt` `content` (Json blocks) |
| State | `status` `origin` `language` `publishedAt` `scheduledAt` |
| Relations | `categoryId` `authorId` `heroImageId` `ogImageId` `sourceId` |
| SEO | `seoTitle` `metaDescription` `canonicalUrl` `ogTitle` `ogDescription` `socialHeadline` |
| Provenance | `sourceUrl` `sourceDomain` `sourceNote` `aiUsed` `aiProvider` `aiModel` |
| Editorial | `featured` `isEditorsPick` `readingTime` `wordCount` `views` |
| Audit | `createdAt` `updatedAt` `createdById` `updatedById` `publishedById` |

`content` is `Json`, always shaped `{ version: 1, blocks: Block[] }` and always
read through `parseDocument`.

**Statuses**: `DRAFT` → `AI_PROCESSING` → `NEEDS_REVIEW` → `READY` → `SCHEDULED`
→ `PUBLISHED` → `ARCHIVED`, plus `FAILED`. Only `PUBLISHED` with
`publishedAt <= now()` is publicly visible — that single predicate lives in
`publishedWhere()` and nothing bypasses it.

**Indexes**, chosen from the queries that actually run:

```prisma
@@unique([siteId, slug])                                     // URL lookup
@@index([siteId, status, publishedAt(sort: Desc)])           // feeds, homepage
@@index([siteId, categoryId, status, publishedAt(sort: Desc)]) // category pages
@@index([siteId, status, views(sort: Desc)])                 // popular rail
@@index([siteId, status, scheduledAt])                       // scheduler sweep
@@index([sourceUrl])                                         // duplicate check
@@index([siteId, featured, status])                          // homepage lead
```

### PostRevision

A snapshot of the editable fields, written *before* every update, capped at 20
per post. Restoring snapshots the current state first, so a restore is itself
undoable.

### PostRedirect

`fromPath → toPath`. Written automatically when a published post's slug changes
or a category slug changes (which moves every article beneath it). Served as a
hard 301 by `middleware.ts` via `/api/redirects`. This is what stops a headline
edit from throwing away the article's search ranking.

### MediaAsset

Files plus the rights metadata that matters: `sourceType`
(`UPLOAD` | `AI_GENERATED` | `EXTERNAL_URL` | `STOCK`), `sourceUrl`, `license`,
`credit`, `copyrightInfo`. `variants` holds responsive derivatives,
`blurDataUrl` a 16px LQIP.

### Source

One row per imported domain, with `importCount`, `lastImportAt`, notes and an
`ENABLED`/`BLOCKED` status. Every imported post links to its source, which is
what makes editorial provenance auditable.

### AITask

Every AI call: type, status, provider, model, trimmed input, output, error,
duration and cost. This is what makes `/admin/ai-tasks` a real operations view
instead of a spinner.

### AdPlacement

Per-site, per-slot `enabled` flag and an optional network slot id that overrides
the environment value.

### AuditLog

Login, failed login, publish, delete, settings change, AI generation, import.
Writes never throw — an audit failure must not take down the action it records.

## Migrations

```bash
npm run db:migrate    # development: create + apply
npm run db:deploy     # production: apply only
npm run db:push       # prototyping: no migration history
```

Use `db:deploy` on the server. `db:push` can silently drop columns.

## Backups

```bash
pg_dump -Fc lebenszeichen > lebenszeichen-$(date +%F).dump
```

Back up `public/uploads` at the same time — the database references files that
live only on disk.
