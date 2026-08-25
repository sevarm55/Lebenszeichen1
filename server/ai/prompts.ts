/**
 * Prompt library.
 *
 * The editorial rule the whole product depends on: the model must produce an
 * *independent* article, not a synonym-swapped copy of the source. Every
 * generation prompt therefore states the constraints explicitly — no invented
 * facts, no fabricated quotes, no reused sentences from the source, and an
 * explicit warnings channel so the model can tell the editor what it was
 * unsure about instead of quietly guessing.
 */

import type { GenerateArticleInput, HeadlineInput, RewriteInput, SEOInput, SourceMaterial } from './types'

export const EDITORIAL_SYSTEM = `You are a senior editor at a European human-interest magazine.
You write original editorial articles about real people, families, animals, places and unusual events.
Non-negotiable rules:
- NEVER invent facts, names, numbers, dates or locations that are not in the source material.
- NEVER fabricate quotes. If the source contains a quote, you may reference that someone said something, but do not invent wording.
- NEVER reuse distinctive sentences or phrasings from the source. Write the article from scratch.
- Do not present another outlet's exclusive reporting as your own; if attribution is needed, say so in the warnings.
- Prefer clarity over drama. No clickbait, no fake urgency, no "you won't believe".
- Explain context a reader might be missing. Remove repetition.
- Write in the requested target language, natural and idiomatic, never machine-translated in feel.`

export const ARTICLE_JSON_CONTRACT = `Return ONLY a JSON object. No markdown fences, no commentary. Shape:
{
  "title": string,
  "subtitle": string,
  "excerpt": string,
  "blocks": Array<
      { "type": "paragraph", "text": string, "lead"?: boolean }
    | { "type": "heading2", "text": string }
    | { "type": "heading3", "text": string }
    | { "type": "quote", "text": string, "attribution"?: string }
    | { "type": "callout", "title"?: string, "text": string, "variant"?: "info" | "context" }
    | { "type": "list", "ordered"?: boolean, "items": string[] }
  >,
  "suggestedCategory": string,
  "suggestedTags": string[],
  "seoTitle": string,
  "metaDescription": string,
  "socialHeadline": string,
  "warnings": string[],
  "imageSuggestions": string[]
}

Inline emphasis inside "text" may use **bold**, *italic* and [label](https://url). No other markup, no HTML.
Structure: a lead paragraph (set "lead": true on the first paragraph), then 3-6 sections each opened by a heading2.
Length: 600-1100 words unless the source is too thin — in that case write less and add a warning.
"warnings" must list anything the editor has to verify: thin source, missing dates, unclear attribution, claims you could not confirm.`

export function articlePrompt(input: GenerateArticleInput): string {
  const { source, language, angle, categoryHints } = input
  return `Write an original editorial article in ${language}.

The material below is ONE source you use to understand what happened. It is reference, not a template.
Do not translate it. Do not paraphrase it sentence by sentence. Build a new article: new structure, new
headline, new lead, your own composition and narrative.

${angle ? `Editorial angle requested by the editor: ${angle}\n` : ''}${
    categoryHints?.length ? `Available categories (pick the closest for "suggestedCategory"): ${categoryHints.join(', ')}\n` : ''
  }
${ARTICLE_JSON_CONTRACT}

--- SOURCE MATERIAL ---
${source.title ? `Original headline: ${source.title}\n` : ''}${source.domain ? `Source domain: ${source.domain}\n` : ''}${
    source.publishedAt ? `Source publication date: ${source.publishedAt}\n` : ''
  }
${source.text}
--- END SOURCE MATERIAL ---`
}

export function summarizePrompt(source: SourceMaterial): string {
  return `Analyse the source material below and return ONLY JSON:
{ "summary": string, "keyPoints": string[], "entities": string[] }

"summary" — 2-3 sentences, what actually happened.
"keyPoints" — 3-6 concrete facts an editor must not lose.
"entities" — people, organisations and places named in the source.

--- SOURCE ---
${source.title ? `${source.title}\n\n` : ''}${source.text.slice(0, 20000)}
--- END SOURCE ---`
}

const REWRITE_KIND_HINT: Record<NonNullable<RewriteInput['kind']>, string> = {
  title: 'This is a headline. Keep it under 70 characters, concrete, no clickbait, no trailing punctuation.',
  excerpt: 'This is a teaser. One or two sentences, under 200 characters.',
  paragraph: 'This is a single paragraph of body text. Keep roughly the same length.',
  document:
    'This is a full article body. Keep the paragraph breaks exactly as they are — one paragraph per line, blank line between paragraphs. Do not merge or split paragraphs, do not add headings.',
}

export function rewritePrompt(input: RewriteInput): string {
  const hint = REWRITE_KIND_HINT[input.kind ?? 'paragraph']
  return `Rewrite the text below in ${input.language}.

Requirements:
- Substantially different wording: different vocabulary, different sentence structure, different rhythm.
- Same meaning, same facts. Invent nothing, drop nothing factual.
- Natural, idiomatic ${input.language}. It must not read like a translation.
- ${hint}
- Return ONLY the rewritten text. No preamble, no quotes around it, no explanation.

--- TEXT ---
${input.text}
--- END TEXT ---`
}

export function headlinePrompt(input: HeadlineInput): string {
  return `Propose ${input.count ?? 5} alternative headlines in ${input.language} for this story.
Concrete and specific, under 70 characters, no clickbait, no numbered listicle framing unless the story is one.
Return ONLY a JSON array of strings.

Current headline: ${input.title}
${input.excerpt ? `Teaser: ${input.excerpt}` : ''}`
}

export function tagsPrompt(input: HeadlineInput): string {
  return `Generate 5-8 topical tags in ${input.language} for this article.
Short (1-2 words), lowercase unless they are proper nouns, no "#" prefix, no duplicates.
Return ONLY a JSON array of strings.

Headline: ${input.title}
${input.excerpt ? `Teaser: ${input.excerpt}` : ''}`
}

export function seoPrompt(input: SEOInput): string {
  return `Write SEO and social metadata in ${input.language} for the article below. Return ONLY JSON:
{ "seoTitle": string, "metaDescription": string, "ogTitle": string, "ogDescription": string, "socialHeadline": string }

- seoTitle: max 60 characters, includes the main subject.
- metaDescription: 140-158 characters, describes the story, no clickbait, ends without ellipsis.
- ogTitle: may be slightly more emotional than seoTitle, max 70 characters.
- ogDescription: max 160 characters.
- socialHeadline: a Facebook-friendly headline, max 90 characters, curiosity without lying about the content.

Headline: ${input.title}
Teaser: ${input.excerpt}
Body (truncated):
${input.body.slice(0, 6000)}`
}

export function imagePrompt(subject: string): string {
  return `Editorial photograph for a magazine story: ${subject}. Photorealistic, natural light, documentary style, shallow depth of field, no text, no watermark, no logos, no collage.`
}
