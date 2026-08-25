import { NextResponse } from 'next/server'
import { z } from 'zod'

import { env } from '@/config/env'
import { prisma } from '@/lib/prisma'
import { guardApi } from '@/server/auth/guard'
import { ALLOWED_MIME, ingestRemoteImage, processImage, sniffMime } from '@/server/media/images'
import { audit } from '@/server/services/audit'
import { getSiteId } from '@/server/services/site'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

export async function GET(request: Request) {
  const guard = await guardApi(request, { minimum: 'EDITOR' })
  if (!guard.ok) return guard.response

  const url = new URL(request.url)
  const page = Math.max(1, Number(url.searchParams.get('page') ?? '1') || 1)
  const perPage = Math.min(60, Math.max(1, Number(url.searchParams.get('perPage') ?? '24') || 24))
  const query = url.searchParams.get('q')?.trim()

  const siteId = await getSiteId()
  const where = {
    siteId,
    ...(query
      ? {
          OR: [
            { filename: { contains: query, mode: 'insensitive' as const } },
            { alt: { contains: query, mode: 'insensitive' as const } },
            { caption: { contains: query, mode: 'insensitive' as const } },
          ],
        }
      : {}),
  }

  const [items, total] = await Promise.all([
    prisma.mediaAsset.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * perPage,
      take: perPage,
    }),
    prisma.mediaAsset.count({ where }),
  ])

  return NextResponse.json({ items, total, page, perPage })
}

const remoteSchema = z.object({
  url: z.string().url().max(2000),
  alt: z.string().max(300).optional(),
  caption: z.string().max(500).optional(),
  credit: z.string().max(300).optional(),
  license: z.string().max(300).optional(),
  sourceType: z.enum(['UPLOAD', 'AI_GENERATED', 'EXTERNAL_URL', 'STOCK']).optional(),
  aiPrompt: z.string().max(1200).optional(),
  aiProvider: z.string().max(60).optional(),
  aiModel: z.string().max(120).optional(),
})

export async function POST(request: Request) {
  const guard = await guardApi(request, { minimum: 'EDITOR' })
  if (!guard.ok) return guard.response

  const siteId = await getSiteId()
  const contentType = request.headers.get('content-type') ?? ''

  // ---------------------------------------------------- remote ingest ----
  if (contentType.includes('application/json')) {
    const parsed = remoteSchema.safeParse(await request.json().catch(() => null))
    if (!parsed.success) {
      return NextResponse.json({ error: 'Некорректные данные изображения.' }, { status: 400 })
    }

    const { url, ...meta } = parsed.data
    if (!/^https:\/\//i.test(url) && !url.startsWith('data:image/')) {
      return NextResponse.json({ error: 'Разрешены только https-ссылки.' }, { status: 400 })
    }

    try {
      const processed = await ingestRemoteImage(url, meta.aiPrompt ?? 'extern')
      const asset = await prisma.mediaAsset.create({
        data: {
          siteId,
          filename: processed.filename,
          originalName: meta.aiPrompt?.slice(0, 120) ?? 'extern',
          url: processed.url,
          mimeType: processed.mimeType,
          width: processed.width,
          height: processed.height,
          fileSize: processed.fileSize,
          blurDataUrl: processed.blurDataUrl,
          variants: processed.variants as unknown as object,
          alt: meta.alt ?? '',
          caption: meta.caption ?? '',
          credit: meta.credit ?? '',
          license: meta.license ?? '',
          sourceType: meta.sourceType ?? 'EXTERNAL_URL',
          sourceUrl: url.startsWith('data:') ? null : url,
          aiPrompt: meta.aiPrompt ?? null,
          aiProvider: meta.aiProvider ?? null,
          aiModel: meta.aiModel ?? null,
          uploadedById: guard.user.id,
        },
      })
      await audit({ action: 'MEDIA_UPLOAD', userId: guard.user.id, entity: 'MediaAsset', entityId: asset.id })
      return NextResponse.json({ ok: true, asset })
    } catch (error) {
      console.error('[media] remote ingest failed', error)
      return NextResponse.json(
        { error: error instanceof Error ? error.message : 'Не удалось загрузить изображение.' },
        { status: 500 },
      )
    }
  }

  // ------------------------------------------------------- file upload ----
  const form = await request.formData().catch(() => null)
  const file = form?.get('file')
  if (!(file instanceof File)) {
    return NextResponse.json({ error: 'Файл не передан.' }, { status: 400 })
  }
  if (file.size > env.storage.maxUploadBytes) {
    return NextResponse.json(
      { error: `Файл больше ${Math.round(env.storage.maxUploadBytes / 1024 / 1024)} МБ.` },
      { status: 413 },
    )
  }

  const buffer = Buffer.from(await file.arrayBuffer())
  // The declared MIME type is not trusted — the bytes decide.
  const sniffed = sniffMime(buffer)
  if (!sniffed || !ALLOWED_MIME.includes(sniffed)) {
    return NextResponse.json(
      { error: 'Недопустимый тип файла. Разрешены JPEG, PNG, WebP, AVIF, GIF.' },
      { status: 415 },
    )
  }

  try {
    const processed = await processImage(buffer, file.name)
    const asset = await prisma.mediaAsset.create({
      data: {
        siteId,
        filename: processed.filename,
        originalName: file.name.slice(0, 200),
        url: processed.url,
        mimeType: processed.mimeType,
        width: processed.width,
        height: processed.height,
        fileSize: processed.fileSize,
        blurDataUrl: processed.blurDataUrl,
        variants: processed.variants as unknown as object,
        alt: String(form?.get('alt') ?? ''),
        caption: String(form?.get('caption') ?? ''),
        credit: String(form?.get('credit') ?? ''),
        sourceType: 'UPLOAD',
        uploadedById: guard.user.id,
      },
    })
    await audit({ action: 'MEDIA_UPLOAD', userId: guard.user.id, entity: 'MediaAsset', entityId: asset.id })
    return NextResponse.json({ ok: true, asset })
  } catch (error) {
    console.error('[media] upload failed', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Не удалось обработать изображение.' },
      { status: 500 },
    )
  }
}
