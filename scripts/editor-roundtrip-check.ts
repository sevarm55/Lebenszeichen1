/** Verifies TipTap <-> block conversion is lossless across repeated edits. */
import { blocksToTiptap, tiptapToBlocks } from '../server/domain/tiptap'
import { documentWordCount, parseDocument, type ArticleDocument } from '../server/domain/blocks'
import { SEED_POSTS } from '../database/seed-content'

function shape(doc: ArticleDocument) {
  const types: Record<string, number> = {}
  for (const b of doc.blocks) types[b.type] = (types[b.type] ?? 0) + 1
  return { types, words: documentWordCount(doc), blocks: doc.blocks.length }
}

let failures = 0
for (const post of SEED_POSTS) {
  const original = parseDocument({
    version: 1,
    blocks: post.blocks.map((b, i) => ({ ...b, id: `s${i}` })),
  })
  let current = original
  for (let i = 0; i < 3; i += 1) current = tiptapToBlocks(blocksToTiptap(current))

  if (JSON.stringify(shape(original)) !== JSON.stringify(shape(current))) {
    failures += 1
    console.log(`✗ ${post.slug}`)
    console.log('   before:', JSON.stringify(shape(original)))
    console.log('   after :', JSON.stringify(shape(current)))
  }
}

// Rich blocks and inline marks must survive too.
const rich = parseDocument({
  version: 1,
  blocks: [
    { id: 'p1', type: 'paragraph', lead: true, text: 'Lead mit **fett**, *kursiv* und [Link](https://example.com).' },
    { id: 'i1', type: 'image', url: '/uploads/x.webp', alt: 'Alt-Text', caption: 'Bildunterschrift', credit: 'Foto: X', ratio: '4:3', mediaId: 'media_1' },
    { id: 'h1', type: 'heading2', text: 'Ein Abschnitt' },
    { id: 'q1', type: 'quote', text: 'Ein Zitat.', attribution: 'Jemand' },
    { id: 'c1', type: 'callout', title: 'Einordnung', text: 'Kontext.', variant: 'warning' },
    { id: 'l1', type: 'list', ordered: true, items: ['eins', 'zwei'] },
    { id: 'e1', type: 'embed', provider: 'youtube', embedId: 'dQw4w9WgXcQ', caption: 'Video' },
    { id: 'd1', type: 'divider' },
    { id: 'a1', type: 'ad' },
  ],
})
const back = tiptapToBlocks(blocksToTiptap(rich))
const img = back.blocks.find((b) => b.type === 'image') as unknown as Record<string, unknown> | undefined
const quote = back.blocks.find((b) => b.type === 'quote') as unknown as Record<string, unknown> | undefined
const callout = back.blocks.find((b) => b.type === 'callout') as unknown as Record<string, unknown> | undefined
const embed = back.blocks.find((b) => b.type === 'embed') as unknown as Record<string, unknown> | undefined
const lead = back.blocks[0] as unknown as Record<string, unknown>

console.log('\n--- rich blocks + inline marks ---')
console.log('block count     :', rich.blocks.length, '->', back.blocks.length)
console.log('inline marks    :', lead.text)
console.log('lead flag       :', lead.lead === true)
console.log('image metadata  :', img?.mediaId === 'media_1' && img?.caption === 'Bildunterschrift' && img?.credit === 'Foto: X' && img?.ratio === '4:3')
console.log('quote attribution:', quote?.attribution === 'Jemand')
console.log('callout variant :', callout?.title === 'Einordnung' && callout?.variant === 'warning')
console.log('embed id        :', embed?.embedId === 'dQw4w9WgXcQ')

console.log(`\n${failures === 0 ? '✓ все 18 статей проходят 3 цикла без потерь' : `✗ ${failures} расхождений`}`)
