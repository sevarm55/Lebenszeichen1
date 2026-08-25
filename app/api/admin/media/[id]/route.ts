import { NextResponse } from 'next/server'
import { z } from 'zod'

import { prisma } from '@/lib/prisma'
import { guardApi } from '@/server/auth/guard'
import { getStorage } from '@/server/media/storage'
import { audit } from '@/server/services/audit'

export const dynamic = 'force-dynamic'

type Params = { params: Promise<{ id: string }> }

const patchSchema = z.object({
  alt: z.string().max(300).optional(),
  caption: z.string().max(500).optional(),
  credit: z.string().max(300).optional(),
  license: z.string().max(300).optional(),
  copyrightInfo: z.string().max(500).optional(),
})

export async function PATCH(request: Request, { params }: Params) {
  const guard = await guardApi(request, { minimum: 'EDITOR' })
  if (!guard.ok) return guard.response

  const { id } = await params
  const parsed = patchSchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) {
    return NextResponse.json({ error: 'Некорректные данные.' }, { status: 400 })
  }

  const asset = await prisma.mediaAsset.update({ where: { id }, data: parsed.data })
  return NextResponse.json({ ok: true, asset })
}

export async function DELETE(request: Request, { params }: Params) {
  const guard = await guardApi(request, { minimum: 'ADMIN' })
  if (!guard.ok) return guard.response

  const { id } = await params
  const asset = await prisma.mediaAsset.findUnique({
    where: { id },
    include: { _count: { select: { heroFor: true, ogFor: true, categories: true, authors: true } } },
  })
  if (!asset) return NextResponse.json({ error: 'Файл не найден.' }, { status: 404 })

  const uses =
    asset._count.heroFor + asset._count.ogFor + asset._count.categories + asset._count.authors
  if (uses > 0) {
    return NextResponse.json(
      { error: `Изображение используется в ${uses} материал(ах). Сначала замените его.` },
      { status: 409 },
    )
  }

  const storage = getStorage()
  await storage.remove(asset.filename)
  const variants = (asset.variants as { url?: string }[] | null) ?? []
  for (const variant of variants) {
    if (variant.url) await storage.remove(variant.url.split('/').pop() ?? '')
  }

  await prisma.mediaAsset.delete({ where: { id } })
  await audit({ action: 'MEDIA_DELETE', userId: guard.user.id, entity: 'MediaAsset', entityId: id })
  return NextResponse.json({ ok: true })
}
