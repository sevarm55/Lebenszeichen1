import { blockId, parseDocument, type ArticleDocument } from '@/server/domain/blocks'

/**
 * Model output -> ArticleDocument.
 *
 * `parseDocument` already drops anything it does not recognise; this only has
 * to attach ids and normalise the couple of type aliases models like to invent
 * ("h2", "text", "bullet_list").
 */
const TYPE_ALIASES: Record<string, string> = {
  h2: 'heading2',
  h3: 'heading3',
  heading: 'heading2',
  subheading: 'heading3',
  text: 'paragraph',
  p: 'paragraph',
  blockquote: 'quote',
  bullet_list: 'list',
  bulleted_list: 'list',
  ul: 'list',
  ol: 'list',
}

export function blocksToDocument(input: unknown): ArticleDocument {
  if (!Array.isArray(input)) return parseDocument(null)

  const normalized = input.map((raw) => {
    if (!raw || typeof raw !== 'object') return raw
    const block = { ...(raw as Record<string, unknown>) }
    const type = typeof block.type === 'string' ? block.type.toLowerCase() : ''
    block.type = TYPE_ALIASES[type] ?? type
    if (block.type === 'list' && type === 'ol') block.ordered = true
    if (!block.id) block.id = blockId()
    return block
  })

  return parseDocument({ version: 1, blocks: normalized })
}

/**
 * Plain text (blank-line separated) -> paragraphs. Used for the "rewrite the
 * whole body" path, where the model returns prose rather than JSON.
 */
export function textToDocument(text: string): ArticleDocument {
  const paragraphs = text
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter(Boolean)

  return parseDocument({
    version: 1,
    blocks: paragraphs.map((p) => {
      // A short line ending without sentence punctuation is almost always a
      // heading the model emitted as bare text.
      const isHeading = p.length < 90 && !/[.!?…:]$/.test(p) && p.split(/\s+/).length <= 12
      return {
        id: blockId(),
        type: isHeading ? 'heading2' : 'paragraph',
        text: p.replace(/^#{1,6}\s*/, ''),
      }
    }),
  })
}
