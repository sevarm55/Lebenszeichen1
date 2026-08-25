/**
 * Generates the fallback OG image used when a post has no cover.
 * Run after changing SITE_NAME:  npx tsx --env-file=.env scripts/make-og-default.ts
 */
import { writeFile } from 'node:fs/promises'
import path from 'node:path'

import sharp from 'sharp'

const NAME = process.env.SITE_NAME?.trim() || 'Lebenszeichen'
const TAGLINE = 'Geschichten, die bleiben'

const escapeXml = (value: string) =>
  value.replace(/[<>&'"]/g, (c) =>
    ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', "'": '&apos;', '"': '&quot;' })[c]!,
  )

const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#fbfaf7"/>
      <stop offset="100%" stop-color="#e9e4da"/>
    </linearGradient>
  </defs>
  <rect width="1200" height="630" fill="url(#bg)"/>
  <circle cx="980" cy="150" r="260" fill="#9b2c2c" opacity="0.07"/>
  <circle cx="980" cy="150" r="170" fill="#9b2c2c" opacity="0.05"/>
  <rect x="90" y="238" width="72" height="3" fill="#9b2c2c"/>
  <text x="90" y="330" font-family="Georgia, 'Times New Roman', serif" font-size="86" font-weight="600" fill="#16150f">${escapeXml(NAME)}</text>
  <text x="90" y="392" font-family="Helvetica, Arial, sans-serif" font-size="27" fill="#6f6c61" letter-spacing="1.5">${escapeXml(TAGLINE)}</text>
</svg>`

async function main() {
  const buffer = await sharp(Buffer.from(svg)).png().toBuffer()
  const target = path.join(process.cwd(), 'public', 'og-default.png')
  await writeFile(target, buffer)
  console.log(`✓ public/og-default.png (${(buffer.byteLength / 1024).toFixed(0)} KB)`)
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
