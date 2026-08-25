import { NextResponse } from 'next/server'

import { prisma } from '@/lib/prisma'
import { slugify } from '@/lib/utils'
import { guardApi } from '@/server/auth/guard'
import { categorySchema } from '@/server/domain/api-schemas'
import { audit } from '@/server/services/audit'
import { getSiteId } from '@/server/services/site'
import { revalidatePath } from 'next/cache'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  const guard = await guardApi(request, { minimum: 'EDITOR' })
  if (!guard.ok) return guard.response

  const siteId = await getSiteId()
  const categories = await prisma.category.findMany({
    where: { siteId },
    orderBy: { order: 'asc' },
    include: { _count: { select: { posts: true } } },
  })
  return NextResponse.json({ categories })
}

export async function POST(request: Request) {
  const guard = await guardApi(request, { minimum: 'ADMIN' })
  if (!guard.ok) return guard.response

  const parsed = categorySchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? 'Проверьте поля.' },
      { status: 400 },
    )
  }

  const siteId = await getSiteId()
  const slug = slugify(parsed.data.slug || parsed.data.name)

  const clash = await prisma.category.findFirst({ where: { siteId, slug }, select: { id: true } })
  if (clash) {
    return NextResponse.json({ error: 'Категория с таким адресом уже существует.' }, { status: 409 })
  }

  const maxOrder = await prisma.category.aggregate({ where: { siteId }, _max: { order: true } })

  const category = await prisma.category.create({
    data: {
      siteId,
      ...parsed.data,
      slug,
      order: parsed.data.order ?? (maxOrder._max.order ?? 0) + 1,
    },
  })

  await audit({ action: 'CATEGORY_CHANGE', userId: guard.user.id, entity: 'Category', entityId: category.id, detail: `created ${category.name}` })
  revalidatePath('/')
  return NextResponse.json({ ok: true, category })
}
