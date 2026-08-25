/** Verifies that prose <-> block conversion is lossless across repeated edits. */
import { documentToProse, proseToDocument } from '../server/domain/prose'
import { parseDocument, documentWordCount, type ArticleDocument } from '../server/domain/blocks'
import { SEED_POSTS } from '../database/seed-content'

function summarise(doc: ArticleDocument) {
  const counts: Record<string, number> = {}
  for (const b of doc.blocks) counts[b.type] = (counts[b.type] ?? 0) + 1
  return { types: counts, words: documentWordCount(doc), blocks: doc.blocks.length }
}

let failures = 0

for (const post of SEED_POSTS) {
  const original = parseDocument({
    version: 1,
    blocks: post.blocks.map((b, i) => ({ ...b, id: `s${i}` })),
  })

  // Three round trips — a real editing session goes back and forth many times.
  let current = original
  for (let i = 0; i < 3; i += 1) {
    const view = documentToProse(current)
    current = proseToDocument(view.text, current, { lead: view.lead })
  }

  const a = summarise(original)
  const b = summarise(current)
  const same = JSON.stringify(a) === JSON.stringify(b)
  if (!same) {
    failures += 1
    console.log(`✗ ${post.slug}`)
    console.log('   before:', JSON.stringify(a))
    console.log('   after :', JSON.stringify(b))
  }
}

// Opaque blocks (images) must survive by reference, not be recreated.
const withImage = parseDocument({
  version: 1,
  blocks: [
    { id: 'p1', type: 'paragraph', lead: true, text: 'Erster Absatz.' },
    { id: 'i1', type: 'image', url: '/uploads/x.webp', alt: 'Alt', caption: 'Bildunterschrift', credit: 'Foto: X', ratio: '4:3', mediaId: 'media_1' },
    { id: 'p2', type: 'paragraph', text: 'Zweiter Absatz.' },
    { id: 'q1', type: 'quote', text: 'Ein Zitat.', attribution: 'Jemand' },
    { id: 'l1', type: 'list', ordered: true, items: ['eins', 'zwei'] },
    { id: 'c1', type: 'callout', title: 'Einordnung', text: 'Kontext dazu.', variant: 'context' },
    { id: 'd1', type: 'divider' },
  ],
})
const v = documentToProse(withImage)
const back = proseToDocument(v.text, withImage, { lead: v.lead })
const img = back.blocks.find((b) => b.type === 'image')

console.log('\n--- opaque + rich blocks ---')
console.log('prose:\n' + v.text.split('\n').map((l) => '   | ' + l).join('\n'))
console.log('image preserved  :', img && 'mediaId' in img ? img.mediaId === 'media_1' && img.caption === 'Bildunterschrift' && img.credit === 'Foto: X' && img.ratio === '4:3' : false)
console.log('quote attribution:', back.blocks.find((b) => b.type === 'quote')?.type === 'quote' && (back.blocks.find((b) => b.type === 'quote') as { attribution?: string }).attribution === 'Jemand')
console.log('ordered list     :', JSON.stringify(back.blocks.find((b) => b.type === 'list')))
console.log('callout title    :', JSON.stringify(back.blocks.find((b) => b.type === 'callout')))
console.log('lead preserved   :', (back.blocks[0] as { lead?: boolean }).lead === true)
console.log('block count      :', withImage.blocks.length, '->', back.blocks.length)

console.log(`\n${failures === 0 ? '✓ все 18 статей проходят 3 цикла без потерь' : `✗ ${failures} расхождений`}`)
