/**
 * Structured article document.
 *
 * Articles are stored as a typed block array, never as an HTML blob. Two
 * reasons, both load-bearing:
 *
 *  1. Security — imported third-party HTML never becomes stored markup, so the
 *     XSS surface collapses to "does our renderer escape text?" (it does).
 *  2. Ad placement — the in-content ad engine needs to reason about word counts
 *     and distances between paragraphs. That is trivial over blocks and
 *     miserable over an HTML string.
 *
 * Inline emphasis inside text blocks uses a tiny, closed markup subset:
 *   **bold**, *italic*, [label](https://url)
 * parsed by `renderInline` in components/public/rich-text.tsx.
 */

export const DOC_VERSION = 1

export type BlockType =
  | 'paragraph'
  | 'heading2'
  | 'heading3'
  | 'image'
  | 'gallery'
  | 'quote'
  | 'callout'
  | 'list'
  | 'embed'
  | 'divider'
  | 'ad'

export interface BaseBlock {
  id: string
  type: BlockType
}

export interface ParagraphBlock extends BaseBlock {
  type: 'paragraph'
  text: string
  /** Renders larger — used for the article lead. */
  lead?: boolean
}

export interface HeadingBlock extends BaseBlock {
  type: 'heading2' | 'heading3'
  text: string
}

export interface ImageBlock extends BaseBlock {
  type: 'image'
  mediaId?: string
  url: string
  alt: string
  caption?: string
  credit?: string
  ratio?: '16:9' | '4:3' | '1:1'
}

export interface GalleryBlock extends BaseBlock {
  type: 'gallery'
  items: { url: string; alt: string; caption?: string; mediaId?: string }[]
}

export interface QuoteBlock extends BaseBlock {
  type: 'quote'
  text: string
  attribution?: string
}

export interface CalloutBlock extends BaseBlock {
  type: 'callout'
  title?: string
  text: string
  variant?: 'info' | 'context' | 'warning'
}

export interface ListBlock extends BaseBlock {
  type: 'list'
  ordered?: boolean
  items: string[]
}

export interface EmbedBlock extends BaseBlock {
  type: 'embed'
  provider: 'youtube' | 'vimeo'
  embedId: string
  caption?: string
}

export interface DividerBlock extends BaseBlock {
  type: 'divider'
}

/** Explicit editorial ad marker. The automatic engine adds more on top. */
export interface AdBlock extends BaseBlock {
  type: 'ad'
}

export type Block =
  | ParagraphBlock
  | HeadingBlock
  | ImageBlock
  | GalleryBlock
  | QuoteBlock
  | CalloutBlock
  | ListBlock
  | EmbedBlock
  | DividerBlock
  | AdBlock

export interface ArticleDocument {
  version: number
  blocks: Block[]
}

let idCounter = 0
export function blockId(prefix = 'b'): string {
  idCounter += 1
  return `${prefix}_${Date.now().toString(36)}_${idCounter.toString(36)}`
}

export function emptyDocument(): ArticleDocument {
  return { version: DOC_VERSION, blocks: [] }
}

const TEXT_TYPES = new Set<BlockType>(['paragraph', 'heading2', 'heading3', 'quote', 'callout'])

/** Plain text of a document — used for word counts, search and AI input. */
export function documentToPlainText(doc: ArticleDocument): string {
  return doc.blocks
    .map((block) => {
      if (TEXT_TYPES.has(block.type)) {
        const b = block as ParagraphBlock | HeadingBlock | QuoteBlock | CalloutBlock
        const title = 'title' in b && b.title ? `${b.title}\n` : ''
        return `${title}${b.text ?? ''}`
      }
      if (block.type === 'list') return block.items.join('\n')
      if (block.type === 'image') return block.caption ?? ''
      return ''
    })
    .filter(Boolean)
    .join('\n\n')
    .trim()
}

export function countWords(text: string): number {
  const trimmed = text.trim()
  if (!trimmed) return 0
  return trimmed.split(/\s+/).length
}

export function documentWordCount(doc: ArticleDocument): number {
  return countWords(documentToPlainText(doc))
}

/**
 * Coerces untrusted JSON (DB column, AI output, imported content) into a valid
 * document. Unknown block types are dropped rather than trusted.
 */
export function parseDocument(value: unknown): ArticleDocument {
  if (!value || typeof value !== 'object') return emptyDocument()
  const raw = value as { version?: unknown; blocks?: unknown }
  if (!Array.isArray(raw.blocks)) return emptyDocument()

  const blocks: Block[] = []
  for (const item of raw.blocks) {
    const block = normalizeBlock(item)
    if (block) blocks.push(block)
  }
  return { version: DOC_VERSION, blocks }
}

function s(v: unknown, fallback = ''): string {
  return typeof v === 'string' ? v : fallback
}

function normalizeBlock(input: unknown): Block | null {
  if (!input || typeof input !== 'object') return null
  const raw = input as Record<string, unknown>
  const type = raw.type as BlockType
  const id = s(raw.id) || blockId()

  switch (type) {
    case 'paragraph': {
      const text = s(raw.text)
      if (!text.trim()) return null
      return { id, type, text, lead: raw.lead === true }
    }
    case 'heading2':
    case 'heading3': {
      const text = s(raw.text)
      if (!text.trim()) return null
      return { id, type, text }
    }
    case 'image': {
      const url = s(raw.url)
      if (!url) return null
      const ratio = raw.ratio
      return {
        id,
        type,
        url,
        mediaId: s(raw.mediaId) || undefined,
        alt: s(raw.alt),
        caption: s(raw.caption) || undefined,
        credit: s(raw.credit) || undefined,
        ratio: ratio === '4:3' || ratio === '1:1' ? ratio : '16:9',
      }
    }
    case 'gallery': {
      const items = Array.isArray(raw.items)
        ? raw.items
            .map((i) => {
              const it = i as Record<string, unknown>
              const url = s(it?.url)
              if (!url) return null
              return {
                url,
                alt: s(it?.alt),
                caption: s(it?.caption) || undefined,
                mediaId: s(it?.mediaId) || undefined,
              }
            })
            .filter((i): i is NonNullable<typeof i> => Boolean(i))
        : []
      if (!items.length) return null
      return { id, type, items }
    }
    case 'quote': {
      const text = s(raw.text)
      if (!text.trim()) return null
      return { id, type, text, attribution: s(raw.attribution) || undefined }
    }
    case 'callout': {
      const text = s(raw.text)
      if (!text.trim()) return null
      const variant = raw.variant
      return {
        id,
        type,
        text,
        title: s(raw.title) || undefined,
        variant: variant === 'warning' || variant === 'context' ? variant : 'info',
      }
    }
    case 'list': {
      const items = Array.isArray(raw.items)
        ? raw.items.map((i) => s(i)).filter((i) => i.trim().length > 0)
        : []
      if (!items.length) return null
      return { id, type, items, ordered: raw.ordered === true }
    }
    case 'embed': {
      const embedId = s(raw.embedId)
      const provider = raw.provider === 'vimeo' ? 'vimeo' : 'youtube'
      // Only an opaque id is stored — never a full third-party URL or iframe.
      if (!/^[a-zA-Z0-9_-]{5,20}$/.test(embedId)) return null
      return { id, type, provider, embedId, caption: s(raw.caption) || undefined }
    }
    case 'divider':
      return { id, type }
    case 'ad':
      return { id, type }
    default:
      return null
  }
}

export function isTextBlock(block: Block): block is ParagraphBlock | HeadingBlock {
  return block.type === 'paragraph' || block.type === 'heading2' || block.type === 'heading3'
}

/** First paragraph, trimmed — the excerpt fallback. */
export function deriveExcerpt(doc: ArticleDocument, max = 200): string {
  const first = doc.blocks.find((b): b is ParagraphBlock => b.type === 'paragraph')
  if (!first) return ''
  const clean = first.text.replace(/\*\*|\*/g, '').replace(/\[(.+?)\]\(.+?\)/g, '$1')
  return clean.length <= max ? clean : `${clean.slice(0, max - 1).trimEnd()}…`
}
