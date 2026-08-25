import 'server-only'

import sharp from 'sharp'

import { getStorage } from './storage'

export const ALLOWED_MIME = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/avif',
  'image/gif',
] as const

export type AllowedMime = (typeof ALLOWED_MIME)[number]

/** Widths generated for every hero-capable image. */
const VARIANT_WIDTHS = [420, 768, 1200, 1920]

export interface ProcessedImage {
  filename: string
  url: string
  width: number
  height: number
  fileSize: number
  mimeType: string
  blurDataUrl: string
  variants: { width: number; url: string; format: string }[]
}

/**
 * Magic-byte sniffing. A client-declared MIME type is a suggestion, not
 * evidence — an "image/jpeg" that is actually an HTML file is a stored-XSS
 * vector the moment it is served from our own origin.
 */
export function sniffMime(buffer: Buffer): AllowedMime | null {
  if (buffer.length < 12) return null
  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) return 'image/jpeg'
  if (
    buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4e && buffer[3] === 0x47
  ) {
    return 'image/png'
  }
  if (buffer.subarray(0, 3).toString('ascii') === 'GIF') return 'image/gif'
  const riff = buffer.subarray(0, 4).toString('ascii')
  const webp = buffer.subarray(8, 12).toString('ascii')
  if (riff === 'RIFF' && webp === 'WEBP') return 'image/webp'
  const ftyp = buffer.subarray(4, 8).toString('ascii')
  if (ftyp === 'ftyp') {
    const brand = buffer.subarray(8, 12).toString('ascii')
    if (brand.startsWith('avif') || brand.startsWith('mif1')) return 'image/avif'
  }
  return null
}

function safeStem(name: string): string {
  return (
    name
      .replace(/\.[a-z0-9]+$/i, '')
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 60) || 'bild'
  )
}

/**
 * Normalises an upload: strips metadata (EXIF can carry GPS coordinates),
 * re-encodes to WebP, produces responsive derivatives and a tiny LQIP.
 * The original is preserved alongside, because re-cropping later needs it.
 */
export async function processImage(
  input: Buffer,
  originalName: string,
  options: { keepOriginal?: boolean } = {},
): Promise<ProcessedImage> {
  const mime = sniffMime(input)
  if (!mime) {
    throw new Error('Die Datei ist kein unterstütztes Bild.')
  }

  const storage = getStorage()
  const stem = safeStem(originalName)
  const unique = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`
  const base = `${stem}-${unique}`

  const image = sharp(input, { animated: mime === 'image/gif' })
  const meta = await image.metadata()
  const width = meta.width ?? 0
  const height = meta.height ?? 0
  if (!width || !height) throw new Error('Bildabmessungen konnten nicht gelesen werden.')

  // Animated GIFs are stored as-is: re-encoding them to WebP frame by frame is
  // slow and rarely what an editor wants.
  if (mime === 'image/gif') {
    const filename = `${base}.gif`
    const url = await storage.put(filename, input, mime)
    return {
      filename,
      url,
      width,
      height,
      fileSize: input.byteLength,
      mimeType: mime,
      blurDataUrl: await makeBlur(input),
      variants: [],
    }
  }

  const mainBuffer = await sharp(input)
    .rotate()
    .resize({ width: Math.min(width, 2000), withoutEnlargement: true })
    .webp({ quality: 82 })
    .toBuffer()

  const mainMeta = await sharp(mainBuffer).metadata()
  const filename = `${base}.webp`
  const url = await storage.put(filename, mainBuffer, 'image/webp')

  const variants: ProcessedImage['variants'] = []
  for (const target of VARIANT_WIDTHS) {
    if (target >= width) continue
    const buffer = await sharp(input)
      .rotate()
      .resize({ width: target, withoutEnlargement: true })
      .webp({ quality: 78 })
      .toBuffer()
    const variantName = `${base}-${target}.webp`
    const variantUrl = await storage.put(variantName, buffer, 'image/webp')
    variants.push({ width: target, url: variantUrl, format: 'webp' })
  }

  if (options.keepOriginal) {
    const ext = mime.split('/')[1]
    await storage.put(`${base}-original.${ext}`, input, mime)
  }

  return {
    filename,
    url,
    width: mainMeta.width ?? width,
    height: mainMeta.height ?? height,
    fileSize: mainBuffer.byteLength,
    mimeType: 'image/webp',
    blurDataUrl: await makeBlur(mainBuffer),
    variants,
  }
}

async function makeBlur(input: Buffer): Promise<string> {
  try {
    const buffer = await sharp(input).resize(16, 16, { fit: 'inside' }).webp({ quality: 30 }).toBuffer()
    return `data:image/webp;base64,${buffer.toString('base64')}`
  } catch {
    return ''
  }
}

/** Downloads a remote image (e.g. an AI-generated one) into our own storage. */
export async function ingestRemoteImage(
  url: string,
  originalName = 'extern',
): Promise<ProcessedImage> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), 20_000)
  try {
    const response = await fetch(url, { signal: controller.signal, cache: 'no-store' })
    if (!response.ok) throw new Error(`Bild konnte nicht geladen werden (HTTP ${response.status}).`)
    const buffer = Buffer.from(await response.arrayBuffer())
    if (buffer.byteLength > 25 * 1024 * 1024) throw new Error('Das Bild ist zu groß.')
    return await processImage(buffer, originalName)
  } finally {
    clearTimeout(timer)
  }
}
