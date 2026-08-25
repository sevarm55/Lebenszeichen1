import 'server-only'

import * as cheerio from 'cheerio'
import type { Element } from 'domhandler'

import { blockId, parseDocument, type ArticleDocument } from '@/server/domain/blocks'
import { domainOf } from './url-guard'

export interface ImageCandidate {
  url: string
  alt: string
  width?: number
  height?: number
  /** Where we found it — helps the editor judge licensing risk. */
  role: 'og' | 'hero' | 'inline'
}

export interface ExtractedArticle {
  title: string
  subtitle: string
  excerpt: string
  /** Cleaned body as structured blocks — no third-party HTML is ever stored. */
  document: ArticleDocument
  plainText: string
  wordCount: number
  publishedAt: string | null
  author: string
  siteName: string
  sourceUrl: string
  sourceDomain: string
  language: string
  images: ImageCandidate[]
  /** Editorial quality signals raised during extraction. */
  warnings: string[]
}

/** Containers that are never article body, regardless of what they contain. */
const STRIP_SELECTORS = [
  'script', 'style', 'noscript', 'iframe', 'svg', 'form', 'button', 'template',
  'nav', 'header', 'footer', 'aside',
  '[role="navigation"]', '[role="banner"]', '[role="contentinfo"]', '[role="complementary"]',
  '.ad', '.ads', '.advert', '.advertisement', '.adsbygoogle', 'ins.adsbygoogle',
  '[id*="google_ads"]', '[class*="-ad-"]', '[class*="_ad_"]', '[data-ad-slot]',
  '.sponsored', '.promo', '.promotion', '.banner',
  '.newsletter', '.subscribe', '.subscription', '.paywall',
  '.cookie', '.cookie-banner', '.consent', '#cookie-banner',
  '.share', '.sharing', '.social', '.social-share',
  '.related', '.related-posts', '.recommended', '.more-from', '.read-more',
  '.comments', '#comments', '.comment-list',
  '.breadcrumb', '.breadcrumbs', '.pagination', '.tags', '.tag-list',
  '.sidebar', '#sidebar', '.widget', '.author-box', '.author-bio',
  '.popup', '.modal', '.overlay', '.lightbox',
  'figure.video', '.video-player',
]

const CONTENT_SELECTORS = [
  'article',
  '[itemprop="articleBody"]',
  '[data-testid="article-body"]',
  '.article-body',
  '.article__body',
  '.article-content',
  '.post-content',
  '.entry-content',
  '.story-body',
  '.content__article-body',
  'main',
  '#content',
]

const BLOCK_TAGS = new Set(['p', 'h2', 'h3', 'h4', 'blockquote', 'ul', 'ol', 'figure', 'img', 'pre'])

function textOf($: cheerio.CheerioAPI, el: Element): string {
  return $(el)
    .text()
    .replace(/\s+/g, ' ')
    .trim()
}

/** Readability-lite: the subtree with the most real paragraph text wins. */
function scoreCandidate($: cheerio.CheerioAPI, node: cheerio.Cheerio<Element>): number {
  let score = 0
  node.find('p').each((_, p) => {
    const len = textOf($, p).length
    if (len >= 40) score += len + 25
    else if (len >= 15) score += len
  })
  node.find('h2, h3, blockquote').each(() => {
    score += 30
  })
  // Link-heavy blocks are navigation dressed as content.
  const linkText = node.find('a').text().length
  const allText = node.text().length || 1
  const linkDensity = linkText / allText
  if (linkDensity > 0.4) score *= 0.3
  return score
}

function pickContentRoot($: cheerio.CheerioAPI): cheerio.Cheerio<Element> {
  let best: cheerio.Cheerio<Element> | null = null
  let bestScore = 0

  for (const selector of CONTENT_SELECTORS) {
    $(selector).each((_, el) => {
      const node = $(el) as cheerio.Cheerio<Element>
      const score = scoreCandidate($, node)
      if (score > bestScore) {
        bestScore = score
        best = node
      }
    })
    if (bestScore > 600) break
  }

  // Nothing semantic matched — score every div and take the winner.
  if (!best || bestScore < 200) {
    $('div, section').each((_, el) => {
      const node = $(el) as cheerio.Cheerio<Element>
      if (node.find('div, section').length > 12) return // container of containers
      const score = scoreCandidate($, node)
      if (score > bestScore) {
        bestScore = score
        best = node
      }
    })
  }

  return best ?? ($('body') as cheerio.Cheerio<Element>)
}

function absolutize(src: string, base: string): string {
  try {
    return new URL(src, base).toString()
  } catch {
    return ''
  }
}

/** "Headline – Site Name" -> "Headline". Only trims a short trailing segment. */
function stripSiteSuffix(title: string): string {
  const match = title.match(/^(.{15,})\s+[–—|·-]\s+(.{2,40})$/)
  return match?.[1]?.trim() ?? title
}

function metaContent($: cheerio.CheerioAPI, names: string[]): string {
  for (const name of names) {
    const value =
      $(`meta[property="${name}"]`).attr('content') ??
      $(`meta[name="${name}"]`).attr('content') ??
      $(`meta[itemprop="${name}"]`).attr('content')
    if (value?.trim()) return value.trim()
  }
  return ''
}

/** JSON-LD is the most reliable source of author/date when a site provides it. */
function readJsonLd($: cheerio.CheerioAPI): Record<string, unknown> | null {
  let found: Record<string, unknown> | null = null
  $('script[type="application/ld+json"]').each((_, el) => {
    if (found) return
    const raw = $(el).contents().text()
    if (!raw.trim()) return
    try {
      const parsed = JSON.parse(raw) as unknown
      const list = Array.isArray(parsed)
        ? parsed
        : (parsed as { '@graph'?: unknown[] })?.['@graph'] ?? [parsed]
      for (const entry of list as Record<string, unknown>[]) {
        const type = entry?.['@type']
        const types = Array.isArray(type) ? type : [type]
        if (types.some((t) => typeof t === 'string' && /Article|NewsArticle|BlogPosting|Report/i.test(t))) {
          found = entry
          return
        }
      }
    } catch {
      // Malformed JSON-LD is extremely common — ignore and fall back to meta.
    }
  })
  return found
}

export function extractArticle(html: string, sourceUrl: string): ExtractedArticle {
  const $ = cheerio.load(html)
  const warnings: string[] = []

  const jsonLd = readJsonLd($)
  const ldString = (key: string): string => {
    const value = jsonLd?.[key]
    if (typeof value === 'string') return value.trim()
    if (Array.isArray(value) && typeof value[0] === 'string') return value[0].trim()
    if (value && typeof value === 'object' && 'name' in (value as Record<string, unknown>)) {
      const name = (value as { name?: unknown }).name
      if (typeof name === 'string') return name.trim()
    }
    return ''
  }

  // Priority matters: <h1> is the headline a reader actually sees, og:title is
  // usually the curated share headline, and JSON-LD `headline` is last because
  // some CMSs put a subtitle or a category label there.
  const h1 = $('h1').first().text().replace(/\s+/g, ' ').trim()
  const title =
    (h1.length >= 3 && h1.length <= 200 ? h1 : '') ||
    metaContent($, ['og:title', 'twitter:title']) ||
    ldString('headline') ||
    stripSiteSuffix($('title').text().trim())

  const subtitle = metaContent($, ['og:description', 'twitter:description', 'description'])
  const author = ldString('author') || metaContent($, ['author', 'article:author'])
  const siteName = metaContent($, ['og:site_name']) || domainOf(sourceUrl)
  const language = ($('html').attr('lang') ?? '').slice(0, 5)

  const rawDate =
    ldString('datePublished') ||
    metaContent($, ['article:published_time', 'publishedDate', 'date', 'dc.date.issued'])
  let publishedAt: string | null = null
  if (rawDate) {
    const parsed = new Date(rawDate)
    if (!Number.isNaN(parsed.getTime())) publishedAt = parsed.toISOString()
  }
  if (!publishedAt) warnings.push('Kein Veröffentlichungsdatum in der Quelle gefunden.')

  // Collect images before stripping — og:image usually sits in <head>.
  const images: ImageCandidate[] = []
  const ogImage = metaContent($, ['og:image', 'og:image:url', 'twitter:image'])
  if (ogImage) {
    const url = absolutize(ogImage, sourceUrl)
    if (url) images.push({ url, alt: title, role: 'og' })
  }

  $(STRIP_SELECTORS.join(',')).remove()
  // Hidden nodes are almost always cookie/consent scaffolding.
  $('[aria-hidden="true"], [hidden], [style*="display:none"], [style*="display: none"]').remove()

  const root = pickContentRoot($)

  root.find('img, source[srcset]').each((_, el) => {
    const node = $(el)
    const raw =
      node.attr('src') ??
      node.attr('data-src') ??
      node.attr('data-lazy-src') ??
      (node.attr('srcset') ?? node.attr('data-srcset') ?? '').split(',')[0]?.trim().split(' ')[0] ??
      ''
    if (!raw || raw.startsWith('data:')) return
    const url = absolutize(raw, sourceUrl)
    if (!url) return
    if (images.some((i) => i.url === url)) return
    const width = Number(node.attr('width') ?? '0') || undefined
    const height = Number(node.attr('height') ?? '0') || undefined
    // Skip tracking pixels and icon sprites.
    if (width && width < 200) return
    images.push({
      url,
      alt: node.attr('alt')?.trim() ?? '',
      width,
      height,
      role: images.length === 0 ? 'hero' : 'inline',
    })
  })

  // ------------------------------------------------------------ body ----
  const blocks: Record<string, unknown>[] = []
  const seen = new Set<string>()

  const pushText = (type: string, text: string) => {
    const clean = text.replace(/\s+/g, ' ').trim()
    if (!clean) return
    const key = `${type}:${clean.slice(0, 120)}`
    if (seen.has(key)) return
    seen.add(key)
    blocks.push({ id: blockId(), type, text: clean })
  }

  root.find('p, h2, h3, h4, blockquote, ul, ol').each((_, el) => {
    const node = $(el)
    // Skip nested lists/paragraphs already covered by an ancestor we processed.
    if (node.parents('blockquote, li').length > 0) return

    const tag = (el as Element).tagName?.toLowerCase()
    if (!tag || !BLOCK_TAGS.has(tag)) return

    if (tag === 'ul' || tag === 'ol') {
      const items: string[] = []
      node.children('li').each((_, li) => {
        const t = textOf($, li)
        if (t.length > 1) items.push(t)
      })
      if (items.length >= 2) {
        blocks.push({ id: blockId(), type: 'list', ordered: tag === 'ol', items })
      }
      return
    }

    const text = textOf($, el)
    if (!text) return

    if (tag === 'blockquote') {
      if (text.length > 20) pushText('quote', text)
      return
    }
    if (tag === 'h2' || tag === 'h3' || tag === 'h4') {
      if (text.length > 2 && text.length < 160) pushText(tag === 'h2' ? 'heading2' : 'heading3', text)
      return
    }
    // Very short paragraphs are captions, bylines and "Share this" leftovers.
    if (text.length < 25) return
    pushText('paragraph', text)
  })

  const document = parseDocument({ version: 1, blocks })

  const plainText = document.blocks
    .map((b) => ('text' in b ? b.text : 'items' in b && Array.isArray(b.items) ? b.items.join(' ') : ''))
    .filter(Boolean)
    .join('\n\n')

  const wordCount = plainText.trim() ? plainText.trim().split(/\s+/).length : 0

  if (!title) warnings.push('Es konnte keine Überschrift ermittelt werden.')
  if (wordCount < 120) {
    warnings.push(
      `Die Quelle ist sehr kurz (${wordCount} Wörter). Für einen eigenständigen Artikel reicht das meist nicht.`,
    )
  }
  if (images.length === 0) warnings.push('In der Quelle wurde kein verwendbares Bild gefunden.')

  const excerpt =
    subtitle ||
    (plainText.split(/(?<=[.!?])\s+/).slice(0, 2).join(' ') || '').slice(0, 240)

  return {
    title,
    subtitle,
    excerpt,
    document,
    plainText,
    wordCount,
    publishedAt,
    author,
    siteName,
    sourceUrl,
    sourceDomain: domainOf(sourceUrl),
    language,
    images: images.slice(0, 12),
    warnings,
  }
}
