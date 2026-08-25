# Admin panel

Route `/admin`. Interface language: Russian. Never indexed — robots.txt,
`X-Robots-Tag` from `next.config.js`, and `noindex` metadata.

## Login

`/admin/login`. Email + password, bcrypt-verified. Generic error message for
every failure mode. Rate limited per IP and per account; eight consecutive
failures lock the account for 15 minutes. See [SECURITY.md](SECURITY.md).

## Dashboard `/admin`

Counts (each links to the filtered list): published, drafts, needs review,
scheduled, published in the last 7 days, categories, media files.

Panels: latest changes, latest imports, failed AI jobs.

Banners appear only when something is actually wrong: missing production
configuration, an AI provider that is selected but not ready, mock provider
active, ads switched off, legal details still unfilled.

## Materials `/admin/posts`

Table: thumbnail, title + URL, category, status (+ publication date), source,
views, updated, actions.

Filters: full-text (title, slug, excerpt, source domain), status, category,
origin, created-from date. All in the query string, so a filtered view is
shareable and survives a reload.

## Editor `/admin/posts/new` and `/admin/posts/[id]`

Left column:

**AI-перефразирование** — publication language, **Перефразировать всё**, plus
**SEO**, **Теги** and **Варианты заголовка**. The provider and its readiness are
shown; if it is not configured you get an explanation, not a dead button.

**Основные поля** — title (with per-field rewrite and a live duplicate check on
blur), cover, excerpt, tags, and the `featured` / `editor's pick` switches.
Character counters show the optimal range rather than a hard limit.

Slug and author sit behind a **Дополнительно** disclosure, collapsed by default:
the slug is generated from the title and the author rarely changes, so neither
belongs in the daily path. The collapsed row still shows the current slug.

There is no subtitle field — the public article does not render one.

**Текст материала** — the block editor (below).

**SEO и социальные сети** — SEO title, meta description, OG title/description,
social headline, canonical URL, and — for imported posts — a public source note.

Right column, sticky:

**Рубрики** — checkbox list, several may be selected. The starred one is
primary: it owns the article URL and the breadcrumb, and clicking another star
promotes it. Secondary rubrics list the article too, but requesting the article
under one of them redirects to the canonical URL, so a story never lives at two
addresses.

**Публикация** — Черновик / На проверку / Опубликовать / По расписанию, with
quick presets (+1 h, +3 h, tomorrow 09:00). Publish is refused while blocking
checklist items remain.

**Готовность к публикации** — the live quality checklist. See
[CONTENT_WORKFLOW.md](CONTENT_WORKFLOW.md).

**Происхождение** — for AI-assisted posts: origin, provider, model, source.

Below: **История версий** — the last 10 revisions, restorable.

## The body editor

TipTap (ProseMirror). An image is an image, a pull quote is a pull quote,
formatting is visible — nothing is edited as a marker in a text field.

Toolbar: bold, italic, link, H2, H3, bulleted and numbered list, image, quote,
callout, divider, explicit ad marker, undo/redo. Keyboard shortcuts work as
expected (Ctrl/Cmd+B, +I, +Z).

Editorial node types carry the metadata the CMS needs, edited in place:

| Node | Inline fields |
|---|---|
| Image | alt (highlighted amber while empty), caption, credit, aspect ratio 16:9 / 4:3 / 1:1, delete |
| Quote | attribution line |
| Callout | title, variant (context / info / warning) |
| Gallery, video, ad marker | shown as labelled cards |

Links accept only `http(s)`; anything else is refused with a message.

### Storage

Content is stored as the block array, not as ProseMirror JSON and never as HTML.
Two reasons that do not bend: the ad engine reasons about word counts and
section boundaries per block, and imported third-party markup must never become
stored markup. `server/domain/tiptap.ts` converts both ways; inline marks map to
the same closed `**bold**` / `*italic*` / `[label](url)` subset the public
renderer understands, so a paste from Word cannot smuggle markup onto the site.

Round-trip fidelity is checked by `scripts/editor-roundtrip-check.ts` — all 18
seeded articles survive three full conversions with identical block types and
word counts, and image media ids, captions, credits, ratios, quote attributions
and callout variants all survive.

## Preview `/admin/vorschau/[id]`

Renders the article exactly as production does — same typography, same reading
measure, same ad engine — behind authentication and `noindex`.

**Показать рекламные места** draws the ad boxes and prints a summary
("673 Wörter · 1 Inline-Platzierung · 3 Werbeplätze insgesamt · Дichte:
balanced"). Real ad code is never loaded here: impressions from an editor's
browser are invalid traffic.

## Import + AI `/admin/posts/import`

The main production flow. Documented in [URL_IMPORT.md](URL_IMPORT.md) and
[CONTENT_WORKFLOW.md](CONTENT_WORKFLOW.md).

## Media `/admin/media`

Grid of every asset. Detail dialog: dimensions, file size, source type, upload
date, usage count, and the editable fields — alt, caption, credit, licence.

Upload converts to WebP, strips EXIF (GPS included), generates responsive
variants and a blur placeholder. An asset still in use cannot be deleted; the
error says how many posts reference it.

The picker used inside the editor has five tabs: library, upload, **AI
generation**, external URL, and — after an import — the source's own images,
marked as unverified rights.

## Categories `/admin/categories`

CRUD with name, slug, description, intro text, SEO fields, order, enabled, show
in navigation. Reorder with the arrows.

Renaming a slug rewrites the URL of every article beneath it **and writes the
301s automatically**. A category with posts cannot be deleted.

`ADMIN` and above.

## Sources `/admin/sources`

One row per imported domain: import count, linked posts, last import, notes, and
an enabled/blocked switch. This is the editorial provenance record.

## AI tasks `/admin/ai-tasks`

Every AI call with status, provider, model, linked post, duration and error.
Counters for queued / processing / completed / failed. This is what makes an AI
failure diagnosable instead of a spinner that never resolves.

## My account `/admin/account`

Reachable from the user block at the bottom of the sidebar. Password change
(current password required, minimum 10 characters with a letter and a digit),
last login, active session count, and the last ten audit entries for this user.

Changing a password revokes **every** session for that user — that is the point
of changing it — so the browser is sent back to the login screen.

## Settings `/admin/settings`

`ADMIN` and above. Six tabs:

- **Общие** — brand name, tagline, description, logo.
- **Публикация** — posts per page, default author.
- **SEO** — title pattern, organisation name; a summary of what is generated
  automatically.
- **Реклама** — master toggle, density preset, the three numeric overrides,
  sidebar and mobile switches, and a per-placement table (on/off plus an
  optional slot id that overrides the environment).
- **Рекизиты** — the legal details required for the Impressum.
- **Интеграции** — read-only status for the AI provider, AdSense, CMP,
  analytics, Search Console, storage and the popunder loader, each listing the
  environment variables that control it.

**No secret is ever displayed or editable here.** Only status.
