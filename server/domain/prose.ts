/**
 * Prose <-> block document conversion.
 *
 * The block model is right for storage — the ad engine needs word counts per
 * block and the renderer must never touch stored HTML. But it is wrong for
 * *typing*: after an import a 1900-word article becomes 60 separate boxes, and
 * editing that is miserable.
 *
 * So the editor writes in one large text area with a small, readable syntax,
 * and this module round-trips it to blocks on every keystroke.
 *
 *   Absatz            plain text, blank line between paragraphs
 *   ## Überschrift    heading2
 *   ### Unter         heading3
 *   > Zitat           quote  (a following "— Name" line becomes the attribution)
 *   - Punkt           bulleted list
 *   1. Punkt          numbered list
 *   ---               divider
 *   !!! Titel | Text  callout
 *   [[block:3]]       anything that cannot be typed (image, gallery, embed, ad)
 *
 * Blocks that cannot be represented as text are preserved by reference: the
 * token keeps its position, and deleting the token deletes the block. That way
 * prose mode can never silently destroy an image an editor placed.
 */

import { blockId, parseDocument, type ArticleDocument, type Block } from './blocks'

const TOKEN = /^\[\[block:(\d+)\]\]$/

/** Blocks with no sensible plain-text form. */
function isOpaque(block: Block): boolean {
  return (
    block.type === 'image' ||
    block.type === 'gallery' ||
    block.type === 'embed' ||
    block.type === 'ad'
  )
}

export interface OpaqueRef {
  index: number
  block: Block
  label: string
}

export interface ProseView {
  text: string
  /** Legend rendered under the text area so tokens are not cryptic. */
  opaque: OpaqueRef[]
  /** True when the first paragraph is marked as the lead. */
  lead: boolean
}

export function documentToProse(doc: ArticleDocument): ProseView {
  const lines: string[] = []
  const opaque: OpaqueRef[] = []
  let counter = 0
  let lead = false
  let seenFirstParagraph = false

  for (const block of doc.blocks) {
    if (isOpaque(block)) {
      counter += 1
      opaque.push({ index: counter, block, label: opaqueLabel(block) })
      lines.push(`[[block:${counter}]]`)
      continue
    }

    switch (block.type) {
      case 'paragraph':
        if (!seenFirstParagraph) {
          lead = block.lead === true
          seenFirstParagraph = true
        }
        lines.push(block.text)
        break
      case 'heading2':
        lines.push(`## ${block.text}`)
        break
      case 'heading3':
        lines.push(`### ${block.text}`)
        break
      case 'quote':
        lines.push(
          block.attribution
            ? `> ${block.text}\n> — ${block.attribution}`
            : `> ${block.text}`,
        )
        break
      case 'callout':
        lines.push(block.title ? `!!! ${block.title} | ${block.text}` : `!!! ${block.text}`)
        break
      case 'list':
        lines.push(
          block.items
            .map((item, i) => (block.ordered ? `${i + 1}. ${item}` : `- ${item}`))
            .join('\n'),
        )
        break
      case 'divider':
        lines.push('---')
        break
      default:
        break
    }
  }

  return { text: lines.join('\n\n'), opaque, lead }
}

function opaqueLabel(block: Block): string {
  switch (block.type) {
    case 'image':
      return `Изображение${block.alt ? `: ${block.alt}` : ''}`
    case 'gallery':
      return `Галерея (${block.items.length})`
    case 'embed':
      return `Видео (${block.provider})`
    case 'ad':
      return 'Рекламный блок'
    default:
      return 'Блок'
  }
}

/**
 * Parses the text area back into blocks.
 *
 * `previous` supplies the opaque blocks referenced by token, so an image keeps
 * its media id, alt text and caption through any number of round trips.
 */
export function proseToDocument(
  text: string,
  previous: ArticleDocument,
  options: { lead?: boolean } = {},
): ArticleDocument {
  const opaqueByIndex = new Map<number, Block>()
  let counter = 0
  for (const block of previous.blocks) {
    if (isOpaque(block)) {
      counter += 1
      opaqueByIndex.set(counter, block)
    }
  }

  const chunks = text.split(/\n\s*\n/)
  const blocks: Record<string, unknown>[] = []
  let firstParagraphDone = false

  for (const rawChunk of chunks) {
    const chunk = rawChunk.trim()
    if (!chunk) continue

    const tokenMatch = chunk.match(TOKEN)
    if (tokenMatch) {
      const kept = opaqueByIndex.get(Number(tokenMatch[1]))
      if (kept) blocks.push(kept as unknown as Record<string, unknown>)
      continue
    }

    if (/^-{3,}$/.test(chunk)) {
      blocks.push({ id: blockId(), type: 'divider' })
      continue
    }

    if (chunk.startsWith('### ')) {
      blocks.push({ id: blockId(), type: 'heading3', text: chunk.slice(4).trim() })
      continue
    }
    if (chunk.startsWith('## ')) {
      blocks.push({ id: blockId(), type: 'heading2', text: chunk.slice(3).trim() })
      continue
    }

    if (chunk.startsWith('!!! ')) {
      const body = chunk.slice(4).trim()
      const pipe = body.indexOf('|')
      const [title, calloutText] =
        pipe > -1 ? [body.slice(0, pipe).trim(), body.slice(pipe + 1).trim()] : ['', body]
      blocks.push({ id: blockId(), type: 'callout', title, text: calloutText, variant: 'context' })
      continue
    }

    if (chunk.startsWith('>')) {
      const rows = chunk.split('\n').map((l) => l.replace(/^>\s?/, '').trim())
      // A trailing "— Name" line is the attribution, not part of the quote.
      let attribution = ''
      const last = rows[rows.length - 1] ?? ''
      if (rows.length > 1 && /^[—–-]\s*\S/.test(last)) {
        attribution = last.replace(/^[—–-]\s*/, '').trim()
        rows.pop()
      }
      blocks.push({
        id: blockId(),
        type: 'quote',
        text: rows.join(' ').trim(),
        attribution,
      })
      continue
    }

    const listRows = chunk.split('\n').map((l) => l.trim())
    const bulleted = listRows.every((l) => /^[-*•]\s+/.test(l))
    const numbered = listRows.every((l) => /^\d+[.)]\s+/.test(l))
    if ((bulleted || numbered) && listRows.length >= 1) {
      blocks.push({
        id: blockId(),
        type: 'list',
        ordered: numbered,
        items: listRows.map((l) => l.replace(/^([-*•]|\d+[.)])\s+/, '').trim()),
      })
      continue
    }

    // Everything else is a paragraph. Single newlines inside a chunk are soft
    // wraps from the text area, not paragraph breaks.
    const paragraph: Record<string, unknown> = {
      id: blockId(),
      type: 'paragraph',
      text: chunk.replace(/\n+/g, ' ').trim(),
    }
    if (!firstParagraphDone) {
      paragraph.lead = options.lead === true
      firstParagraphDone = true
    }
    blocks.push(paragraph)
  }

  return parseDocument({ version: 1, blocks })
}
