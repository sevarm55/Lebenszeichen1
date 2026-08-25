# URL import

Turns a link into structured, reviewable source material. It never publishes
anything.

## Pipeline

```
URL → assertSafeUrl → fetchPage (bounded, hop-by-hop re-validated)
    → extractArticle (cheerio) → ExtractedArticle → editor review
```

## 1. `assertSafeUrl` — `server/content-import/url-guard.ts`

Rejects, with a message an editor can act on:

| Check | Rejected example |
|---|---|
| Scheme | `file:///etc/passwd`, `ftp://…`, `data:…` |
| Credentials | `https://user:pass@example.com` |
| Blocked hostnames | `localhost`, `metadata.google.internal` |
| Internal suffixes | `*.local`, `*.internal`, `*.lan`, `*.home.arpa` |
| Bare labels | `http://intranet/` |
| Ports | anything but 80, 443, 8080, 8443 |
| Literal private IPs | `192.168.1.1`, `127.0.0.1`, `[::1]` |
| DNS resolving to private space | any host with one private A/AAAA record |

The DNS check is the important one: it closes DNS rebinding, where a public
hostname resolves to `169.254.169.254` at fetch time.

## 2. `fetchPage` — `server/content-import/fetcher.ts`

- `redirect: 'manual'`. Every hop is passed back through `assertSafeUrl`.
  Following redirects automatically would hand that decision to undici and let a
  public host bounce us into the private network.
- 15 s timeout via `AbortController` (`IMPORT_TIMEOUT_MS`).
- Body streamed with a running byte count; the read is cancelled the moment it
  exceeds `IMPORT_MAX_BYTES` (3 MB). A declared `Content-Length` over the cap is
  rejected before any body is read.
- Non-HTML content types are rejected outright.
- Identifies itself honestly as `LebenszeichenBot/1.0`.

## 3. `extractArticle` — `server/content-import/extract.ts`

**Metadata**, in priority order:

- Title: `<h1>` → `og:title` → JSON-LD `headline` → `<title>` (with a trailing
  " – Site Name" trimmed). `<h1>` first because it is the headline a reader
  actually sees; JSON-LD last because some CMSs put a subtitle there.
- Date: JSON-LD `datePublished` → `article:published_time` → other meta.
- Author, site name, language, `og:image`.

**Cleaning.** Removed before any content scoring: `script`, `style`, `noscript`,
`iframe`, `svg`, `form`, `nav`, `header`, `footer`, `aside`, ARIA landmarks, and
~40 selectors covering ads (`.adsbygoogle`, `[data-ad-slot]`, `[id*=google_ads]`),
sponsored blocks, newsletter and subscription prompts, cookie banners, share
widgets, related-post rails, comments, breadcrumbs, sidebars, author boxes and
modals. Then anything `aria-hidden` or `display:none`.

**Body selection.** Readability-lite: candidate containers are scored by the
length of their real paragraph text (paragraphs ≥ 40 chars weighted higher),
with a bonus for headings and blockquotes, and a 70 % penalty when link density
exceeds 40 % — that is navigation dressed as content. Semantic selectors
(`article`, `[itemprop=articleBody]`, `.entry-content`, `main`…) are tried first;
if none scores well enough, every `div`/`section` is scored.

**Block conversion.** Paragraphs, H2/H3/H4, blockquotes and lists become typed
blocks. Paragraphs under 25 characters are dropped (captions, bylines, "Share
this" leftovers), and duplicate text is de-duplicated by a content key.

**Images** are collected as *candidates* with a role (`og` / `hero` / `inline`),
absolutised, de-duplicated, and filtered for tracking pixels (width < 200).
They are never auto-attached — see below.

## 4. What the editor sees

`/admin/posts/import` shows the extracted text on the left and, on the right:

- **Source data** — domain, publication, author, date, word count, image count.
- **Duplicate warnings** — same source URL, or ≥ 0.6 Jaccard similarity on
  content words with an existing title. If the URL was already imported, the
  existing post is linked instead of a second one being created.
- **Quality warnings** — no publication date, source too short (< 120 words),
  no usable image, redirect chain followed.
- **Publication language** and an optional editorial angle.
- **AI переработать** — generate an original article.
- **Open in the editor without AI** — use the extracted text as a starting point.

## 5. Images and rights

Candidate images from a source belong to that source. They are shown as
reference, stored with `license: "UNGEPRÜFT — Rechte vor Veröffentlichung
klären"`, and the picker carries a visible warning. Publishing someone else's
photograph without a licence is a copyright claim waiting to happen — for
production use your own images, licensed stock, or fal.ai generation.

## 6. Copyright and the editorial line

The importer exists to let an editor *understand a story*, not to copy it.
Everything downstream reinforces that:

- The AI prompt forbids reusing distinctive sentences and requires a new
  structure, headline, lead and composition.
- `sourceUrl` and `sourceDomain` are stored on the post and shown in the CMS.
- The editor can add a public attribution note, rendered under the article.
- Nothing publishes without a human pressing publish.

## Limits

- JavaScript-rendered pages (SPA news sites) yield little — there is no headless
  browser, on purpose. It would be a large attack surface for a rare case.
- Hard paywalls return the teaser only.
- Very unusual markup can confuse the scorer. The extracted text is always shown
  before generation for exactly this reason.
