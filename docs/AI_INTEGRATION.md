# AI integration

## The contract

Admin code never imports a vendor SDK. It calls `getAIProvider()` and works
against `AIProvider` (`server/ai/types.ts`):

```ts
interface AIProvider {
  readonly info: AIProviderInfo
  summarizeSource(source): Promise<SummaryResult>
  generateArticle(input): Promise<GeneratedArticle>
  rewriteSection(input): Promise<string>
  generateHeadlines(input): Promise<string[]>
  generateSEO(input): Promise<GeneratedSEO>
  generateTags(input): Promise<string[]>
  generateImage(input): Promise<GeneratedImage>
}
```

Switching vendors touches `server/ai/` and nothing else.

## Providers

### `MockAIProvider` (default)

Deterministic, offline, free. Every output is prefixed `[MOCK]` so it cannot be
mistaken for a finished article, and `generateArticle` returns a warning saying
so. This is the default because the whole editorial workflow — import, generate,
review, publish — must be exercisable in development and CI without a key,
without network calls and without cost.

### `FalAIProvider`

```bash
AI_PROVIDER=fal
FAL_KEY=<key>
AI_TEXT_MODEL=google/gemini-2.5-flash
AI_TEXT_MODEL_FAST=google/gemini-2.5-flash-lite
AI_IMAGE_MODEL=fal-ai/flux-2/turbo
```

Text goes through `fal-ai/any-llm`, which is a **model router** — changing the
underlying LLM is an environment change, not a code change. Images go through
FLUX.

`AI_TEXT_MODEL_FAST` is used for short jobs (headlines, tags, SEO, single-field
rewrites) where the larger model buys nothing.

If `AI_PROVIDER=fal` and `FAL_KEY` is empty, the provider reports
`ready: false` and every call throws `AINotConfiguredError` → HTTP 503 with a
message the editor can act on. Buttons are never silently dead.

## Prompts — `server/ai/prompts.ts`

The editorial system prompt states the non-negotiables:

- Never invent facts, names, numbers, dates or locations absent from the source.
- Never fabricate quotes.
- Never reuse distinctive sentences or phrasings — write from scratch.
- Never present another outlet's exclusive reporting as ours.
- Clarity over drama. No clickbait.
- Idiomatic target language, not translationese.

`generateArticle` additionally requires: a new structure, a new headline, a new
lead, an own composition — and a **`warnings` array**, so the model reports what
it was unsure about instead of quietly guessing. Those warnings surface in the
import workspace next to the extracted text.

This is the difference between the product and an article spinner. A spinner
does `source → synonyms → publish`. This does
`source → understanding → new article → human review → publish`.

## Output handling

`extractJson` (`server/ai/json.ts`) copes with what models actually emit: code
fences, "Here is the JSON:", trailing commas. It strips fences, tries a direct
parse, then walks the string for the outermost balanced object, then retries
after removing trailing commas. A parse failure is a clean error, not a crash.

`blocksToDocument` normalises the type aliases models invent (`h2`, `text`,
`bullet_list`, `ul`, `ol`) and hands the result to `parseDocument`, which drops
anything still unrecognised. **Model output can never introduce a block type the
renderer does not know.**

`textToDocument` handles the "rewrite the whole body" path, where prose comes
back rather than JSON: it splits on blank lines and promotes short,
punctuation-free lines to headings.

## Task tracking

Every call is one `AITask` row: type, status, provider, model, trimmed input,
output, error, duration. Written `PROCESSING` before the call and updated to
`COMPLETED` or `FAILED` after, so `/admin/ai-tasks` shows what ran, what failed
and why. Full source text is never written to the log — only its length.

## Where AI appears in the CMS

| Place | Task |
|---|---|
| Import workspace → **AI переработать** | `generateArticle` |
| Editor → **Перефразировать всё** | `rewrite` ×3 + `rewriteDocument`, sequential |
| Editor → per-field ⟲ button | `rewrite` with `kind` |
| Block editor → per-block ⟲ | `rewrite` with `kind: 'paragraph'` |
| Editor → **SEO** | `generateSEO` |
| Editor → **Теги** | `generateTags` |
| Editor → **Варианты заголовка** | `generateHeadlines` |
| Media picker → AI tab | `generateImage` |

"Перефразировать всё" runs **sequentially**, not in parallel: the provider is
rate-limited per key and a burst of four calls is the fastest way to a 429.

## Generated images

`generateImage` returns a temporary provider URL. The media picker immediately
copies it into our own storage (`POST /api/admin/media` with the URL), because a
fal.ai URL expires and must never become a published hero image. The asset is
stored with `sourceType: AI_GENERATED`, the prompt, the model, and a licence note
reminding the editor to label it.

## Adding a provider

1. Implement `AIProvider` in `server/ai/<vendor>-provider.ts`.
2. Add a case in `getAIProvider()`.
3. Add its env vars to `.env.example` and `config/env.ts`.

Nothing else changes. The admin UI reads `provider.info` for its label and
readiness state.

## Cost control

- Fast model for short jobs.
- Source text truncated before it is sent (20 k chars for summaries, 6 k for SEO).
- Rate limit: 120 AI calls per user per 10 minutes.
- `AITask.costUsd` exists for when the provider reports it.
