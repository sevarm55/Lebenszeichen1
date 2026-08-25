# Content workflow

## Statuses

| Status | Meaning | Public? |
|---|---|---|
| `DRAFT` | Being written | No |
| `AI_PROCESSING` | Generation in flight | No |
| `NEEDS_REVIEW` | Waiting for an editor | No |
| `READY` | Approved, not yet scheduled | No |
| `SCHEDULED` | Will appear at `publishedAt` | No, until then |
| `PUBLISHED` | Live | Yes |
| `ARCHIVED` | Withdrawn, kept | No |
| `FAILED` | Import or generation failed | No |

Visibility is one predicate — `status = PUBLISHED AND publishedAt <= now()` —
defined once in `publishedWhere()`. Nothing bypasses it, which is why a draft
cannot leak through a feed, a search result or the sitemap.

## The two routes in

### A. Import + AI

1. `/admin/posts/import`, paste a URL, **Получить материал**.
2. Review the extracted text, source data, duplicate and quality warnings.
3. Pick the publication language (German by default) and optionally an angle.
4. **AI переработать** — the model writes an independent article.
5. The editor opens with the generated draft, the source panel above it, and the
   source's images available as reference candidates.
6. Edit, choose a cover, category and tags, check SEO.
7. Preview → publish.

There is **no** URL → automatic publish path, by design.

### B. Manual

`/admin/posts/new` — the same editor, empty. AI tools are available per field
but nothing runs on its own.

## Scheduling

Choose **По расписанию** and a date. The post is stored `SCHEDULED` with
`publishedAt` in the future, so it becomes visible on its own the moment that
timestamp passes — no cron required for correctness. `POST /api/revalidate`
flips the stored status so the admin list matches reality; run it from cron if
you want the status column to be exact.

Times are entered in the browser's timezone and stored as UTC.

## Quality gate

`server/services/quality.ts` produces a live checklist in the editor sidebar.
Deliberately not a score out of 100 — that is theatre. Two states only:
**Готово к публикации** or **Нужно проверить**.

**Blocking** (publish is refused):
- no title, empty body
- no excerpt *and* no body to derive one from
- no category
- no cover image — a Facebook share without an image loses most of its clicks
- no meta description

**Warnings** (publish allowed):
- headline over 90 characters
- article under 250 words
- long article with no H2s
- images without alt text
- meta description outside 140–158 characters
- AI used but no source recorded

## Duplicate protection

Before an import creates anything, `findDuplicates` checks:

1. **Same source URL** — normalised, query and trailing slash stripped.
2. **Similar title** — Jaccard similarity ≥ 0.6 over content words, German and
   English stopwords removed, against the 300 most recent posts.

Hits are shown with links to the existing post. The editor decides.

## Revisions

A snapshot is written before every update, capped at 20 per post. Restoring
snapshots the current state first, so a restore is itself undoable. Shown at the
bottom of the editor.

## Slug changes

Changing a published post's slug writes a `PostRedirect` row automatically, and
`middleware.ts` serves it as a **301**. Changing a category slug does the same
for every article beneath it. This is what stops a headline edit from discarding
the article's accumulated ranking.

## Cache invalidation

Publishing revalidates: `/`, `/neueste`, `/beliebt`, the category page, the
article, the sitemap — and the old paths too when a slug changed. No global
rebuild.

## Provenance on the page

When a post has `sourceUrl`, the article renders a research note linking the
source domain (`rel="nofollow"`). The editor can replace the wording with their
own in **Примечание об источнике**. Demo authors carry a visible notice that the
piece is demonstration content.

## Editorial rules the product enforces

From `/redaktionsrichtlinien`, and matched by the code:

- No post publishes automatically. Every text passes a human.
- AI does not invent facts, names, numbers or quotes (prompt-level constraint).
- AI-generated images must be labelled (the picker says so, the licence field
  records it).
- Editorial responsibility always sits with a person, never the model.
