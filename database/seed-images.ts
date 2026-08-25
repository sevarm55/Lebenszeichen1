import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'

import sharp from 'sharp'

/**
 * Demo cover generator.
 *
 * Seed data must not ship stock photos we have no licence for, and it must not
 * pretend to be photography of real people. So covers are generated: muted,
 * abstract, paper-toned compositions that read as editorial placeholders at a
 * glance. Real images arrive through the media library or fal.ai.
 */

const PALETTES: [string, string, string][] = [
  ['#e8dfd2', '#c9b8a1', '#6f5f4c'],
  ['#dfe4e0', '#adbdb4', '#4c6157'],
  ['#eee2e0', '#d3b3ad', '#7b5148'],
  ['#e3e2ea', '#b3b2c6', '#4f4e68'],
  ['#eeeadc', '#cfc48f', '#6d6438'],
  ['#e0e6ea', '#a9bfcd', '#3f5a6b'],
  ['#efe6e2', '#cdb5a4', '#7a5f4c'],
]

function coverSvg(seed: number, width = 1600, height = 900): string {
  const palette = PALETTES[seed % PALETTES.length]!
  const [light, mid, dark] = palette
  const angle = (seed * 41) % 180
  const cx = 0.2 + ((seed * 13) % 60) / 100
  const cy = 0.25 + ((seed * 29) % 50) / 100
  const r1 = 0.18 + ((seed * 7) % 20) / 100
  const r2 = 0.32 + ((seed * 11) % 22) / 100
  const bandY = 0.55 + ((seed * 19) % 30) / 100

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  <defs>
    <linearGradient id="bg" gradientTransform="rotate(${angle} 0.5 0.5)">
      <stop offset="0%" stop-color="${light}"/>
      <stop offset="55%" stop-color="${mid}"/>
      <stop offset="100%" stop-color="${dark}"/>
    </linearGradient>
    <radialGradient id="glow" cx="${cx * 100}%" cy="${cy * 100}%" r="58%">
      <stop offset="0%" stop-color="${light}" stop-opacity="0.85"/>
      <stop offset="70%" stop-color="${light}" stop-opacity="0"/>
    </radialGradient>
    <filter id="soft"><feGaussianBlur stdDeviation="${28 + (seed % 20)}"/></filter>
    <filter id="grain">
      <feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="3" seed="${seed}"/>
      <feColorMatrix type="saturate" values="0"/>
      <feComponentTransfer><feFuncA type="linear" slope="0.07"/></feComponentTransfer>
    </filter>
  </defs>

  <rect width="100%" height="100%" fill="url(#bg)"/>

  <g filter="url(#soft)" opacity="0.5">
    <ellipse cx="${cx * width}" cy="${cy * height}" rx="${r2 * width}" ry="${r2 * height * 0.85}" fill="${light}"/>
    <ellipse cx="${(1 - cx) * width}" cy="${(1 - cy) * height}" rx="${r1 * width}" ry="${r1 * height}" fill="${dark}" opacity="0.55"/>
  </g>

  <rect width="100%" height="100%" fill="url(#glow)"/>

  <g opacity="0.22" fill="none" stroke="${dark}" stroke-width="1.5">
    <circle cx="${cx * width}" cy="${cy * height}" r="${r1 * width}"/>
    <circle cx="${cx * width}" cy="${cy * height}" r="${r1 * width * 1.75}"/>
    <line x1="0" y1="${bandY * height}" x2="${width}" y2="${bandY * height - 60}"/>
  </g>

  <rect width="100%" height="100%" filter="url(#grain)"/>
</svg>`
}

export interface GeneratedCover {
  filename: string
  url: string
  width: number
  height: number
  fileSize: number
  blurDataUrl: string
}

export async function generateCover(seed: number, slug: string): Promise<GeneratedCover> {
  const dir = path.join(process.cwd(), 'public', 'uploads')
  await mkdir(dir, { recursive: true })

  const svg = Buffer.from(coverSvg(seed))
  const webp = await sharp(svg).webp({ quality: 84 }).toBuffer()
  const filename = `demo-${slug}.webp`
  await writeFile(path.join(dir, filename), webp)

  const blur = await sharp(webp).resize(16, 9).webp({ quality: 30 }).toBuffer()

  return {
    filename,
    url: `/uploads/${filename}`,
    width: 1600,
    height: 900,
    fileSize: webp.byteLength,
    blurDataUrl: `data:image/webp;base64,${blur.toString('base64')}`,
  }
}
