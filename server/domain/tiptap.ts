/**
 * TipTap (ProseMirror) document <-> our block array.
 *
 * The editor works on ProseMirror JSON, which is what makes images, links and
 * formatting render as themselves instead of as markers. Storage stays on the
 * block array: the ad engine reasons about word counts per block, and the
 * public renderer never touches stored HTML.
 *
 * Inline marks map to the same closed subset the public renderer already
 * understands — bold, italic, link. Nothing else survives the conversion, which
 * is exactly the point: a paste from Word cannot smuggle markup into the site.
 */

import { blockId, parseDocument, type ArticleDocument, type Block } from './blocks'

export interface PMMark {
  type: string
  attrs?: Record<string, unknown>
}

export interface PMNode {
  type: string
  attrs?: Record<string, unknown>
  content?: PMNode[]
  marks?: PMMark[]
  text?: string
}

export interface PMDoc {
  type: 'doc'
  content: PMNode[]
}

// ---------------------------------------------------------------- inline ----

/** Inline text + marks -> the `**bold** *italic* [label](url)` subset. */
function inlineToText(nodes: PMNode[] | undefined): string {
  if (!nodes?.length) return ''
  let out = ''

  for (const node of nodes) {
    if (node.type === 'hardBreak') {
      out += ' '
      continue
    }
    if (node.type !== 'text' || !node.text) continue

    let text = node.text
    const marks = node.marks ?? []
    const link = marks.find((m) => m.type === 'link')
    const bold = marks.some((m) => m.type === 'bold' || m.type === 'strong')
    const italic = marks.some((m) => m.type === 'italic' || m.type === 'em')

    if (bold) text = `**${text}**`
    if (italic) text = `*${text}*`
    if (link) {
      const href = String(link.attrs?.href ?? '').trim()
      if (href) text = `[${text}](${href})`
    }
    out += text
  }

  return out.replace(/\s+/g, ' ').trim()
}

const INLINE_PATTERN = /(\*\*[^*]+\*\*|\*[^*]+\*|\[[^\]]+\]\([^)]+\))/g

/** The inverse: our text subset -> ProseMirror inline nodes. */
function textToInline(text: string): PMNode[] {
  if (!text) return []
  const parts = text.split(INLINE_PATTERN).filter((p) => p !== '')
  const nodes: PMNode[] = []

  for (const part of parts) {
    if (part.startsWith('**') && part.endsWith('**') && part.length > 4) {
      nodes.push({ type: 'text', text: part.slice(2, -2), marks: [{ type: 'bold' }] })
      continue
    }
    if (part.startsWith('*') && part.endsWith('*') && part.length > 2) {
      nodes.push({ type: 'text', text: part.slice(1, -1), marks: [{ type: 'italic' }] })
      continue
    }
    const link = part.match(/^\[([^\]]+)\]\(([^)]+)\)$/)
    if (link) {
      nodes.push({
        type: 'text',
        text: link[1]!,
        marks: [{ type: 'link', attrs: { href: link[2]! } }],
      })
      continue
    }
    nodes.push({ type: 'text', text: part })
  }

  return nodes
}

// ------------------------------------------------------- blocks -> TipTap ----

export function blocksToTiptap(doc: ArticleDocument): PMDoc {
  const content: PMNode[] = []

  for (const block of doc.blocks) {
    switch (block.type) {
      case 'paragraph':
        content.push({
          type: 'paragraph',
          attrs: { lead: block.lead === true },
          content: textToInline(block.text),
        })
        break

      case 'heading2':
      case 'heading3':
        content.push({
          type: 'heading',
          attrs: { level: block.type === 'heading2' ? 2 : 3 },
          content: textToInline(block.text),
        })
        break

      case 'quote':
        content.push({
          type: 'editorialQuote',
          attrs: { attribution: block.attribution ?? '' },
          content: [{ type: 'paragraph', content: textToInline(block.text) }],
        })
        break

      case 'callout':
        content.push({
          type: 'callout',
          attrs: { title: block.title ?? '', variant: block.variant ?? 'context' },
          content: [{ type: 'paragraph', content: textToInline(block.text) }],
        })
        break

      case 'list':
        content.push({
          type: block.ordered ? 'orderedList' : 'bulletList',
          content: block.items.map((item) => ({
            type: 'listItem',
            content: [{ type: 'paragraph', content: textToInline(item) }],
          })),
        })
        break

      case 'image':
        content.push({
          type: 'image',
          attrs: {
            src: block.url,
            alt: block.alt,
            mediaId: block.mediaId ?? null,
            caption: block.caption ?? '',
            credit: block.credit ?? '',
            ratio: block.ratio ?? '16:9',
          },
        })
        break

      case 'gallery':
        content.push({
          type: 'gallery',
          attrs: { items: block.items },
        })
        break

      case 'embed':
        content.push({
          type: 'videoEmbed',
          attrs: { provider: block.provider, embedId: block.embedId, caption: block.caption ?? '' },
        })
        break

      case 'divider':
        content.push({ type: 'horizontalRule' })
        break

      case 'ad':
        content.push({ type: 'adSlot' })
        break

      default:
        break
    }
  }

  // ProseMirror refuses an empty doc.
  if (content.length === 0) content.push({ type: 'paragraph' })
  return { type: 'doc', content }
}

// ------------------------------------------------------- TipTap -> blocks ----

export function tiptapToBlocks(doc: PMDoc | null | undefined): ArticleDocument {
  if (!doc?.content) return parseDocument(null)
  const blocks: Record<string, unknown>[] = []
  let firstParagraph = true

  for (const node of doc.content) {
    switch (node.type) {
      case 'paragraph': {
        const text = inlineToText(node.content)
        if (!text) continue
        const block: Record<string, unknown> = { id: blockId(), type: 'paragraph', text }
        // Only the first paragraph can carry the lead flag.
        if (firstParagraph) {
          block.lead = node.attrs?.lead === true
          firstParagraph = false
        }
        blocks.push(block)
        break
      }

      case 'heading': {
        const text = inlineToText(node.content)
        if (!text) continue
        const level = Number(node.attrs?.level ?? 2)
        blocks.push({ id: blockId(), type: level >= 3 ? 'heading3' : 'heading2', text })
        break
      }

      case 'editorialQuote':
      case 'blockquote': {
        const text = (node.content ?? [])
          .map((child) => inlineToText(child.content))
          .filter(Boolean)
          .join(' ')
        if (!text) continue
        blocks.push({
          id: blockId(),
          type: 'quote',
          text,
          attribution: String(node.attrs?.attribution ?? ''),
        })
        break
      }

      case 'callout': {
        const text = (node.content ?? [])
          .map((child) => inlineToText(child.content))
          .filter(Boolean)
          .join(' ')
        if (!text) continue
        blocks.push({
          id: blockId(),
          type: 'callout',
          title: String(node.attrs?.title ?? ''),
          variant: String(node.attrs?.variant ?? 'context'),
          text,
        })
        break
      }

      case 'bulletList':
      case 'orderedList': {
        const items = (node.content ?? [])
          .map((li) => (li.content ?? []).map((p) => inlineToText(p.content)).join(' ').trim())
          .filter(Boolean)
        if (!items.length) continue
        blocks.push({
          id: blockId(),
          type: 'list',
          ordered: node.type === 'orderedList',
          items,
        })
        break
      }

      case 'image': {
        const url = String(node.attrs?.src ?? '')
        if (!url) continue
        blocks.push({
          id: blockId(),
          type: 'image',
          url,
          alt: String(node.attrs?.alt ?? ''),
          mediaId: node.attrs?.mediaId ? String(node.attrs.mediaId) : undefined,
          caption: String(node.attrs?.caption ?? ''),
          credit: String(node.attrs?.credit ?? ''),
          ratio: String(node.attrs?.ratio ?? '16:9'),
        })
        break
      }

      case 'gallery': {
        const items = Array.isArray(node.attrs?.items) ? node.attrs.items : []
        if (!items.length) continue
        blocks.push({ id: blockId(), type: 'gallery', items })
        break
      }

      case 'videoEmbed': {
        const embedId = String(node.attrs?.embedId ?? '')
        if (!embedId) continue
        blocks.push({
          id: blockId(),
          type: 'embed',
          provider: String(node.attrs?.provider ?? 'youtube'),
          embedId,
          caption: String(node.attrs?.caption ?? ''),
        })
        break
      }

      case 'horizontalRule':
        blocks.push({ id: blockId(), type: 'divider' })
        break

      case 'adSlot':
        blocks.push({ id: blockId(), type: 'ad' })
        break

      default:
        break
    }
  }

  return parseDocument({ version: 1, blocks })
}

/** Convenience for callers that only have a Block[]. */
export function blockListToTiptap(blocks: Block[]): PMDoc {
  return blocksToTiptap({ version: 1, blocks })
}
