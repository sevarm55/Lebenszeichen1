/**
 * In-content ad placement engine.
 *
 * The rule the brief insists on: a 300-word story must not carry the same ad
 * load as a 3000-word one. So placement is derived from the document, not
 * hard-coded into the template.
 *
 * Algorithm
 *   1. Walk the blocks and accumulate a running word count.
 *   2. A slot is eligible only *between* two blocks, never inside one, and
 *      never directly before/after a heading (an ad wedged under an H2 reads
 *      like a section of the article — that is the "masquerading" pattern that
 *      gets accounts banned).
 *   3. Enforce `minWordsBetween` so two ads can never stack.
 *   4. Cap the total at `maxInContent`, itself derived from the density preset
 *      and the article length.
 *
 * Output is a set of block indices — the renderer inserts an <AdSlot/> before
 * the block at each index.
 */

import type { ArticleDocument, Block } from '@/server/domain/blocks'
import { countWords } from '@/server/domain/blocks'

export type AdDensity = 'low' | 'balanced' | 'high' | 'aggressive'

export interface AdDensityRule {
  /** Article must reach this many words before any inline ad appears. */
  minWordsForInline: number
  /** Minimum words of reading between two inline ads. */
  minWordsBetween: number
  /** Hard ceiling on inline ads regardless of length. */
  maxInContent: number
  /** One extra inline ad is unlocked per this many words. */
  wordsPerAd: number
}

export const AD_DENSITY_PRESETS: Record<AdDensity, AdDensityRule> = {
  // Reading-first. Long-form only, generous spacing.
  low: { minWordsForInline: 400, minWordsBetween: 400, maxInContent: 2, wordsPerAd: 700 },
  // Default. Comfortable for the reader, still ~3 impressions on a long read.
  balanced: { minWordsForInline: 220, minWordsBetween: 220, maxInContent: 4, wordsPerAd: 420 },
  // Revenue-leaning but still policy-clean.
  high: { minWordsForInline: 150, minWordsBetween: 150, maxInContent: 6, wordsPerAd: 280 },
  // Maximum density we are willing to generate. Below ~120 words between units
  // AdSense starts treating the page as ad-heavy ("more ads than content"),
  // so this is deliberately the floor.
  aggressive: { minWordsForInline: 120, minWordsBetween: 120, maxInContent: 8, wordsPerAd: 200 },
}

export interface AdEngineOptions {
  density?: AdDensity
  /** Per-site overrides coming from SiteSettings. */
  minWordsForInline?: number
  minWordsBetween?: number
  maxInContent?: number
  /** When false the engine returns nothing at all. */
  enabled?: boolean
}

export interface AdPlan {
  /** Insert an ad *before* the block at each of these indices. */
  indices: number[]
  /** True when the article is long enough for the "after intro" unit. */
  afterIntro: boolean
  totalWords: number
  density: AdDensity
}

function blockWords(block: Block): number {
  switch (block.type) {
    case 'paragraph':
    case 'heading2':
    case 'heading3':
    case 'quote':
      return countWords(block.text)
    case 'callout':
      return countWords(`${block.title ?? ''} ${block.text}`)
    case 'list':
      return countWords(block.items.join(' '))
    default:
      return 0
  }
}

/**
 * A heading must keep the paragraph that follows it, so an ad may never sit
 * directly *after* one. Sitting directly *before* a heading is fine and in fact
 * ideal — that is a section boundary, and the ad reads as a break between two
 * parts of the article rather than as part of either.
 */
function isHeading(block: Block | undefined): boolean {
  return block?.type === 'heading2' || block?.type === 'heading3'
}

/** Visual blocks already break the flow; adding an ad next to them is noisy. */
function isVisual(block: Block | undefined): boolean {
  return (
    block?.type === 'image' ||
    block?.type === 'gallery' ||
    block?.type === 'embed' ||
    block?.type === 'ad'
  )
}

export function planAds(doc: ArticleDocument, options: AdEngineOptions = {}): AdPlan {
  const density = options.density ?? 'balanced'
  const preset = AD_DENSITY_PRESETS[density] ?? AD_DENSITY_PRESETS.balanced

  const minWordsForInline = options.minWordsForInline ?? preset.minWordsForInline
  const minWordsBetween = options.minWordsBetween ?? preset.minWordsBetween
  const hardMax = options.maxInContent ?? preset.maxInContent

  const blocks = doc.blocks
  const perBlock = blocks.map(blockWords)
  const totalWords = perBlock.reduce((a, b) => a + b, 0)

  const empty: AdPlan = { indices: [], afterIntro: false, totalWords, density }
  if (options.enabled === false) return empty

  // Very short pieces get the "after intro" unit only — or nothing at all.
  const afterIntro = totalWords >= 120

  if (totalWords < minWordsForInline) {
    return { indices: [], afterIntro, totalWords, density }
  }

  // Length-derived budget, then clamped by the preset ceiling.
  const budget = Math.min(hardMax, Math.max(1, Math.floor(totalWords / preset.wordsPerAd)))

  const indices: number[] = []
  let running = 0
  let sinceLastAd = 0
  // The lead paragraph is owned by ARTICLE_AFTER_INTRO; inline units start later.
  let passedIntro = false

  for (let i = 0; i < blocks.length; i += 1) {
    const words = perBlock[i]
    running += words
    sinceLastAd += words

    if (!passedIntro) {
      if (running >= 60) passedIntro = true
      continue
    }

    if (indices.length >= budget) break

    const next = blocks[i + 1]
    const current = blocks[i]

    // Never after the last block (ARTICLE_END covers that position).
    if (!next) break
    // Never split a heading from its body, and never crowd a visual block.
    if (isHeading(current)) continue
    if (isVisual(next) || isVisual(current)) continue
    // Never right before the closing paragraph — readers finish the story first.
    if (i + 1 >= blocks.length - 1) break

    if (sinceLastAd >= minWordsBetween) {
      indices.push(i + 1)
      sinceLastAd = 0
    }
  }

  return { indices, afterIntro, totalWords, density }
}

/** Human-readable summary for the admin preview toggle. */
export function describePlan(plan: AdPlan): string {
  const inline = plan.indices.length
  const total = inline + (plan.afterIntro ? 1 : 0) + 1 // + ARTICLE_END
  return `${plan.totalWords} Wörter · ${inline} Inline-Platzierung${
    inline === 1 ? '' : 'en'
  } · ${total} Werbeplätze insgesamt · Dichte: ${plan.density}`
}
