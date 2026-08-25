/** Quick sanity check of the ad density engine across lengths and presets. */
import { planAds, AD_DENSITY_PRESETS, type AdDensity } from '../server/ads/engine'
import { parseDocument } from '../server/domain/blocks'
import { SEED_POSTS } from '../database/seed-content'

const densities: AdDensity[] = ['low', 'balanced', 'high', 'aggressive']

console.log('Wörter   ' + densities.map((d) => d.padEnd(11)).join('') + ' Beitrag')
for (const post of [...SEED_POSTS].sort((a, b) => a.blocks.length - b.blocks.length)) {
  const doc = parseDocument({ version: 1, blocks: post.blocks.map((b, i) => ({ ...b, id: `t${i}` })) })
  const row = densities.map((density) => {
    const plan = planAds(doc, { enabled: true, density })
    const total = plan.indices.length + (plan.afterIntro ? 1 : 0) + 1
    return `${plan.indices.length}+${plan.afterIntro ? 1 : 0}+1=${total}`.padEnd(11)
  })
  const words = planAds(doc, { enabled: true }).totalWords
  console.log(String(words).padEnd(9) + row.join('') + ' ' + post.slug.slice(0, 34))
}
console.log('\nPresets:', JSON.stringify(AD_DENSITY_PRESETS, null, 0))
