# Environment variables

Copy `.env.example` to `.env`. Never commit the filled file.

Two families:

- **Server-only** — read through `config/env.ts`, never reach the browser.
- **`NEXT_PUBLIC_*`** — compiled into the client bundle. Treat every one as
  public. Changing any of them **requires a rebuild**, not just a restart.

---

## Required

| Variable | Example | Notes |
|---|---|---|
| `DATABASE_URL` | `postgresql://user:pass@localhost:5432/lebenszeichen?schema=public` | |
| `AUTH_SECRET` | `openssl rand -base64 48` | **No default.** Signing with a predictable secret is the same as no authentication; the code throws instead |
| `NEXT_PUBLIC_SITE_URL` | `https://yourdomain.de` | No trailing slash. Used for canonical URLs, OG tags, sitemap |

## Brand

| Variable | Default | Notes |
|---|---|---|
| `SITE_NAME` | `Lebenszeichen` | Placeholder until the brand is decided |
| `NEXT_PUBLIC_SITE_NAME` | `Lebenszeichen` | Keep in sync with `SITE_NAME` |
| `SITE_URL` | — | Server-side twin of `NEXT_PUBLIC_SITE_URL` |

Changing the brand: these two variables plus `/admin/settings → Общие`. Nothing
else contains the name.

## Auth

| Variable | Default | Notes |
|---|---|---|
| `AUTH_SESSION_HOURS` | `12` | Session lifetime |

## Storage

| Variable | Default | Notes |
|---|---|---|
| `STORAGE_DRIVER` | `local` | Only `local` is implemented; the abstraction is ready for S3/R2 |
| `STORAGE_LOCAL_DIR` | `public/uploads` | Relative to the project root |
| `STORAGE_PUBLIC_PREFIX` | `/uploads` | Public URL prefix |
| `UPLOAD_MAX_MB` | `10` | Per-file cap |

## AI

| Variable | Default | Notes |
|---|---|---|
| `AI_PROVIDER` | `mock` | `mock` \| `fal` |
| `FAL_KEY` | — | Required when `AI_PROVIDER=fal` |
| `AI_TEXT_MODEL` | `google/gemini-2.5-flash` | Routed through `fal-ai/any-llm`, so this is a model swap without code changes |
| `AI_TEXT_MODEL_FAST` | `google/gemini-2.5-flash-lite` | Short jobs: headlines, tags, SEO |
| `AI_IMAGE_MODEL` | `fal-ai/flux-2/turbo` | |

`mock` is the default so the whole workflow runs in development and CI with no
key, no network and no cost. Its output is prefixed `[MOCK]` and carries a
warning so it cannot be mistaken for a finished article.

## Advertising

| Variable | Default | Notes |
|---|---|---|
| `ADS_ENABLED` | `false` | **Master kill switch.** With this off, no ad script loads anywhere, whatever the CMS says |
| `NEXT_PUBLIC_ADS_ENABLED` | `false` | Client-side twin |
| `NEXT_PUBLIC_ADS_PROVIDER` | `adsense` | |
| `NEXT_PUBLIC_ADSENSE_CLIENT_ID` | — | `ca-pub-XXXXXXXXXXXXXXXX` |
| `NEXT_PUBLIC_ADSENSE_AUTO_ADS` | `false` | Lets Google add anchor + vignette formats on top of ours |
| `NEXT_PUBLIC_AD_SLOT_*` | — | One numeric ad-unit id per placement — see [ADSENSE.md](ADSENSE.md) |

Ads render only when **all** of: `ADS_ENABLED`, the CMS toggle, a valid
`ca-pub-…` id, and a slot id for that placement. Otherwise nothing renders for a
real reader — placeholder boxes appear in development and the admin preview only.

## Interstitial / popunder (not AdSense)

| Variable | Default |
|---|---|
| `NEXT_PUBLIC_POPUNDER_ENABLED` | `false` |
| `NEXT_PUBLIC_POPUNDER_SCRIPT_URL` | — |
| `NEXT_PUBLIC_POPUNDER_FREQUENCY_HOURS` | `12` |

Off by default and deliberately so. Popunders violate AdSense policy; the loader
refuses to run while an AdSense client id is configured. Read
[ADSENSE.md](ADSENSE.md) Part 3 before enabling.

## Consent

| Variable | Default | Notes |
|---|---|---|
| `NEXT_PUBLIC_CMP_PROVIDER` | `none` | `none` \| `funding-choices` \| `custom` |
| `NEXT_PUBLIC_CMP_FUNDING_CHOICES_ID` | — | `ca-pub-…` from AdSense Privacy & messaging |

With anything other than `none`, the built-in banner stops rendering so there are
never two consent dialogs.

## Analytics

| Variable | Default |
|---|---|
| `NEXT_PUBLIC_ANALYTICS_PROVIDER` | `none` |
| `NEXT_PUBLIC_GA4_MEASUREMENT_ID` | — |

## URL importer

| Variable | Default | Notes |
|---|---|---|
| `IMPORT_TIMEOUT_MS` | `15000` | |
| `IMPORT_MAX_BYTES` | `3000000` | Streamed and aborted on overflow |
| `IMPORT_MAX_REDIRECTS` | `3` | Every hop is re-validated against the SSRF guard |

## Operations

| Variable | Default | Notes |
|---|---|---|
| `REVALIDATE_SECRET` | — | Shared secret for `POST /api/revalidate`. Unset ⇒ the endpoint refuses rather than running open |
| `SEED_ADMIN_EMAIL` | `admin@example.com` | Seed only |
| `SEED_ADMIN_PASSWORD` | `AendereMich2026!` | Seed only — change after first login |

---

## Rebuild vs restart

| Change | Action |
|---|---|
| Any `NEXT_PUBLIC_*` | **Rebuild** (`npm run build`) then restart |
| `DATABASE_URL`, `AUTH_SECRET`, `FAL_KEY`, `ADS_ENABLED` | Restart |
| CMS settings | Neither — they are read per request |

## Production sanity check

`assertProductionEnv()` runs on the dashboard and reports missing
`DATABASE_URL`, a short or absent `AUTH_SECRET`, and `AI_PROVIDER=fal` with an
empty `FAL_KEY`, as a red banner in `/admin`.
