# Security

## Authentication

Custom, deliberately. The brief requires rate limiting, account lockout, CSRF,
server-side route protection, RBAC and an audit trail; that is a thin layer over
bcrypt and a signed cookie, and it avoids the NextAuth v4 / React 19
peer-dependency friction.

**How a session works**

1. `POST /api/admin/auth/login` verifies the password with bcrypt (cost 12).
2. A 32-byte random secret is generated. Its **SHA-256 hash** is stored in the
   `Session` table — never the secret itself. A database dump cannot be replayed
   as a login.
3. A JWT (HS256, signed with `AUTH_SECRET`) carrying the user and the session id
   is set as an `HttpOnly`, `SameSite=Lax`, `Secure`-in-production cookie.
4. Every mutation re-checks: signature valid → session row exists and is unexpired
   → user still exists and is active. Server-side revocation therefore works.

`AUTH_SECRET` has no default. Signing with a predictable secret is the same as no
authentication at all, so the code throws instead.

## Brute force

| Control | Limit |
|---|---|
| Per IP | 20 login attempts / 10 min |
| Per account | 10 login attempts / 10 min |
| Account lockout | 8 consecutive failures → locked 15 min |
| URL import | 30 / 10 min per user |
| AI calls | 120 / 10 min per user |
| View counter | 60 / min per IP |

The limiter is an in-process fixed window (`server/auth/rate-limit.ts`). That is
correct for a single PM2 process behind nginx and free. If the app is ever scaled
horizontally, swap the store in that one file — every call site goes through
`consume()`.

Login failures return one generic message for "no such user", "wrong password"
and "deactivated". Anything more specific is an account-enumeration oracle.

## CSRF

Double-submit token. A non-`HttpOnly` `lz_csrf` cookie is set at login; every
admin mutation sends it back as `x-csrf-token`, and `guardApi` compares the two
with `timingSafeEqual`. `SameSite=Lax` already blocks cross-site POSTs in current
browsers; this is the second layer.

All admin requests go through `lib/admin-client.ts`, so no call site can forget
the header.

## Authorisation

`OWNER` > `ADMIN` > `EDITOR`, enforced in two places:

- **Server components**: `requireUser(minimumRole)` — redirects.
- **Route handlers**: `guardApi(request, { minimum })` — 401/403.

`middleware.ts` only checks that a session cookie is *present*. It runs on the
Edge runtime where Prisma is unavailable, so it is a cheap first gate, never the
authorisation decision.

Destructive operations require `ADMIN`: deleting posts, deleting media, editing
categories and settings.

## XSS

The single strongest control in this codebase: **article content is never
stored as HTML.**

- Articles are typed block arrays. `parseDocument` drops anything unrecognised.
- Inline markup is a closed subset — `**bold**`, `*italic*`, `[label](url)` —
  parsed into React elements by `renderInline`. React escapes the text.
- `safeHref` accepts only `http:`, `https:`, `/…` and `#…`. `javascript:`,
  `data:` and `vbscript:` are dropped.
- `embed` blocks store an **opaque id** matched against `/^[a-zA-Z0-9_-]{5,20}$/`,
  never a URL or an iframe. The iframe src is built from a hard-coded template
  (`youtube-nocookie.com`).
- `dangerouslySetInnerHTML` appears exactly twice, both times serialising
  JSON-LD we generated ourselves, plus once for the inline Consent Mode script.
  Never for user or imported content.

## SSRF — the URL importer

The importer fetches an arbitrary operator-supplied URL from inside the server's
network. Full details in [URL_IMPORT.md](URL_IMPORT.md). Summary:

- Only `http:` / `https:`. No `file:`, `ftp:`, `gopher:`, `data:`.
- No embedded credentials (`https://user:pass@host`).
- Ports restricted to 80, 443, 8080, 8443.
- Hostname must be a public FQDN — bare labels and `.local` / `.internal` /
  `.lan` / `.home.arpa` are rejected.
- DNS is resolved and **every** returned address must be public. One private A
  record is enough to reject, which closes DNS rebinding.
- Blocked ranges: `0.0.0.0/8`, `10/8`, `100.64/10`, `127/8`, `169.254/16`
  (AWS/GCP metadata), `172.16/12`, `192.168/16`, `192.0.0/24`, TEST-NETs,
  multicast, reserved; IPv6 `::`, `::1`, `fc00::/7`, `fe80::/10`, multicast,
  IPv4-mapped and NAT64.
- **Redirects are followed manually and every hop is re-validated.** A public
  host that 302s to `169.254.169.254` is the classic bypass; `redirect: 'follow'`
  would hand that decision to undici.
- Bounded in three dimensions: 15 s timeout, 3 MB (streamed and aborted on
  overflow), 3 hops.

Verified against `localhost`, `127.0.0.1:22`, `169.254.169.254`, `file://`,
`192.168.1.1`, `[::1]`, bare `intranet` and `user:pass@` — all blocked.

## File uploads

- **Magic-byte sniffing.** The declared MIME type is a suggestion; the bytes
  decide. An `image/jpeg` that is really HTML is a stored-XSS vector the moment
  it is served from our origin.
- Allowlist: JPEG, PNG, WebP, AVIF, GIF.
- Size cap from `UPLOAD_MAX_MB` (default 10 MB).
- Everything except animated GIF is **re-encoded through sharp**, which discards
  any payload hidden in the original container and strips EXIF — including GPS
  coordinates that would otherwise leak a photographer's location.
- Filenames are regenerated; the original never reaches the filesystem.
- `LocalDiskDriver.resolve` path-normalises and refuses anything escaping the
  upload root.

## Secrets

| Secret | Where | Reaches the browser? |
|---|---|---|
| `DATABASE_URL` | env, `config/env.ts` | Never |
| `AUTH_SECRET` | env, `config/env.ts` | Never |
| `FAL_KEY` | env, `server/ai/fal-provider.ts` | Never |
| `REVALIDATE_SECRET` | env | Never |
| AdSense publisher id | `NEXT_PUBLIC_*` | Yes — it is public by design |

`config/env.ts` and `server/auth/session.ts` are marked `server-only`, so
importing them from a client component is a build error rather than a leak.
`/admin/settings` displays integration *status*, never values.

## HTTP headers

Set in `next.config.js` for every response: `X-Content-Type-Options: nosniff`,
`Referrer-Policy: strict-origin-when-cross-origin`, `X-Frame-Options: SAMEORIGIN`,
`Permissions-Policy` denying camera/microphone/geolocation/browsing-topics.
`/admin/*` and `/api/*` additionally carry `X-Robots-Tag: noindex, nofollow`.

**No CSP yet.** AdSense requires a broad `script-src` and injects inline styles;
a CSP written before the ad setup is final would either break ads or be
meaningless. Add one once the ad stack is fixed — `docs/DEPLOYMENT.md` has a
starting point.

## SQL injection

Prisma parameterises everything. There is no raw SQL in the codebase.

## Known gaps

- No 2FA. Worth adding before more than a couple of people have accounts.
- No CSP (above).
- Rate limiting is per process (above).
- The built-in consent banner is **not** an IAB TCF-certified CMP and does not
  claim to be. A certified CMP is required before serving personalised ads to
  EU users — the integration point is ready. See [ADSENSE.md](ADSENSE.md).
