# Lebenszeichen — German story media platform + CMS

A production-ready German editorial website with its own content management
system. First site of a planned network of ~10 independent language sites.

> **The brand name is not final.** Everywhere you see `Lebenszeichen` it comes
> from the `SITE_NAME` environment variable and the site settings row. Changing
> the brand is one env change plus one field in `/admin/settings` — nothing is
> hard-coded.

---

## 1. What this is

A magazine, not a news wire. It publishes human-interest stories — real lives,
relationships, families, animals, places, unusual events — in seven German
categories, and it is built to make money from advertising without destroying
the reading experience.

Two halves, deliberately kept apart:

| | Public site | Admin (CMS) |
|---|---|---|
| Language | German | Russian |
| Route | `/` | `/admin` |
| Look | Editorial magazine, serif, warm paper | Dense professional CMS, sans, cool grey |
| Indexed | Yes | Never (`noindex` + robots.txt + header) |

The editorial loop it supports end to end:

```
Admin login → paste a source URL → extract the article safely →
review what was extracted → choose the publication language →
AI writes an independent article → edit it → pick/generate images →
choose category → edit SEO → preview → publish →
article appears on the homepage, in its category, in the feed and the sitemap
```

## 2. Stack

- **Next.js 15.5** (App Router, React Server Components) + **React 19**
- **TypeScript** (strict)
- **Tailwind CSS v4** (CSS-first tokens)
- **PostgreSQL** + **Prisma 6**
- **Custom session auth** (bcrypt + signed JWT cookie + DB session + RBAC)
- **fal.ai** for text and image generation, behind a provider interface
- **sharp** for image processing, **cheerio** for article extraction
- **Google AdSense** behind a central ad-slot abstraction

Why custom auth instead of a library: the brief requires rate limiting,
brute-force lockout, CSRF, server-side route protection, RBAC and an audit log.
That is a thin, well-understood layer over bcrypt and a signed cookie, and it
avoids the peer-dependency friction between NextAuth v4 and React 19. See
[docs/SECURITY.md](docs/SECURITY.md).

## 3. Prerequisites

- Node.js **20.9+** (developed on 20.19)
- PostgreSQL **14+**
- ~1 GB free disk for `node_modules` and uploads

## 4. Installation

```bash
git clone <repo> lebenszeichen
cd lebenszeichen
npm install
cp .env.example .env
```

Then edit `.env`. The two values you cannot skip:

```bash
DATABASE_URL="postgresql://user:pass@localhost:5432/lebenszeichen?schema=public"
AUTH_SECRET="<openssl rand -base64 48>"
```

Every variable is documented in [docs/ENVIRONMENT.md](docs/ENVIRONMENT.md).

## 5. Database

```bash
# development — push the schema without a migration history
npm run db:push

# production — versioned migrations
npm run db:migrate      # create a migration locally
npm run db:deploy       # apply migrations on the server
```

## 6. Seed

```bash
npm run seed
```

Creates: the site row, its settings, 12 ad placements, 7 German categories,
3 demo authors, 18 published demo articles (with generated cover images), one
draft and one scheduled post, and the first OWNER account.

The seed is idempotent — running it again refreshes the demo content without
duplicating anything and without touching posts you created yourself.

Default credentials come from `SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD`,
falling back to `admin@example.com` / `AendereMich2026!`. **Change the password
immediately after the first login.**

All demo content is clearly synthetic: no real person or event is described,
demo authors are flagged `isDemo`, and the article page prints a visible notice.

## 7. Development

```bash
npm run dev          # http://localhost:3000
```

Useful checks:

```bash
npm run typecheck    # tsc --noEmit
npm run lint         # eslint
npm run check        # both
npx tsx scripts/ad-engine-check.ts   # shows ad density per article length
```

## 8. Production build

```bash
npm run build
npm start
```

`npm run build` runs `prisma generate` first, so a fresh checkout builds without
an extra step.

## 9. Creating an admin user

```bash
npm run create-admin
# or non-interactively for the fields that are not secret:
npm run create-admin -- --email you@example.com --name "Your Name" --role OWNER
```

The password is always read from stdin so it never lands in shell history.

Roles: `OWNER` > `ADMIN` > `EDITOR`.
- `EDITOR` — write, import, generate, publish
- `ADMIN` — also categories, settings, deletion
- `OWNER` — everything

## 10. Media storage

Uploads go to `public/uploads` via a storage abstraction
(`server/media/storage.ts`). Every image is re-encoded to WebP, stripped of EXIF
(GPS coordinates included), given responsive derivatives and a blur placeholder.

To move to S3/R2 later, implement `StorageDriver` and switch `STORAGE_DRIVER` —
no call site changes.

**Back up `public/uploads` separately.** It is not in git.

## 11. Deployment

Full instructions, including the nginx/PM2 setup used on the current server:
[docs/DEPLOYMENT.md](docs/DEPLOYMENT.md).

## 12. Documentation

| Document | Contents |
|---|---|
| [ARCHITECTURE.md](docs/ARCHITECTURE.md) | Layers, folder layout, data flow, rendering strategy |
| [DATABASE.md](docs/DATABASE.md) | Every model, relations, indexes, migration notes |
| [ADMIN.md](docs/ADMIN.md) | Every CMS screen and what it does |
| [CONTENT_WORKFLOW.md](docs/CONTENT_WORKFLOW.md) | Editorial process, statuses, quality gate |
| [AI_INTEGRATION.md](docs/AI_INTEGRATION.md) | Provider interface, prompts, adding a vendor |
| [URL_IMPORT.md](docs/URL_IMPORT.md) | Extraction pipeline and its SSRF defences |
| [ADSENSE.md](docs/ADSENSE.md) | Ad architecture + **step-by-step AdSense setup** |
| [FACEBOOK_ADS.md](docs/FACEBOOK_ADS.md) | **Step-by-step Facebook page-ad setup** |
| [SEO.md](docs/SEO.md) | Metadata, schema, sitemap, redirects, Search Console |
| [ANALYTICS.md](docs/ANALYTICS.md) | Event model, consent gating, future dashboard |
| [SECURITY.md](docs/SECURITY.md) | Threat model and every control in place |
| [DEPLOYMENT.md](docs/DEPLOYMENT.md) | Server setup, nginx, PM2, TLS, backups |
| [ENVIRONMENT.md](docs/ENVIRONMENT.md) | Every variable, what it does, what breaks |
| [FUTURE_MULTI_SITE.md](docs/FUTURE_MULTI_SITE.md) | Growing from one site to ten |

## 13. Before going live — checklist

- [ ] `AUTH_SECRET` generated (48+ random bytes), not the dev value
- [ ] Seed admin password changed
- [ ] Legal details filled in at `/admin/settings → Rekizity` (required by § 5 DDG)
- [ ] `NEXT_PUBLIC_SITE_URL` set to the real https domain
- [ ] `/datenschutz` reviewed by someone qualified
- [ ] A certified CMP connected before serving personalised ads in the EU
- [ ] `public/ads.txt` created with your AdSense publisher id
- [ ] Backups running for both the database and `public/uploads`
