import { NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'

import { prisma } from '@/lib/prisma'
import { slugify } from '@/lib/utils'
import { guardApi } from '@/server/auth/guard'
import { audit } from '@/server/services/audit'
import { getSiteId } from '@/server/services/site'
import { categorySchema } from '@/server/domain/api-schemas'

export const dynamic = 'force-dynamic'

type Params = { params: Promise<{ id: string }> }

export async function PUT(request: Request, { params }: Params) {
  const guard = await guardApi(request, { minimum: 'ADMIN' })
  if (!guard.ok) return guard.response

  const { id } = await params
  const parsed = categorySchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Проверьте поля.' }, { status: 400 })
  }

  const siteId = await getSiteId()
  const existing = await prisma.category.findUnique({ where: { id } })
  if (!existing) return NextResponse.json({ error: 'Категория не найдена.' }, { status: 404 })

  const slug = slugify(parsed.data.slug || parsed.data.name)
  if (slug !== existing.slug) {
    const clash = await prisma.category.findFirst({
      where: { siteId, slug, id: { not: id } },
      select: { id: true },
    })
    if (clash) {
      return NextResponse.json({ error: 'Категория с таким адресом уже существует.' }, { status: 409 })
    }
  }

  const category = await prisma.category.update({ where: { id }, data: { ...parsed.data, slug } })

  // Changing a category slug moves every article under it — record redirects so
  // existing links and search results keep working.
  if (slug !== existing.slug) {
    const posts = await prisma.post.findMany({
      where: { categoryId: id, status: 'PUBLISHED' },
      select: { id: true, slug: true },
    })
    for (const post of posts) {
      await prisma.postRedirect.upsert({
        where: { siteId_fromPath: { siteId, fromPath: `/${existing.slug}/${post.slug}` } },
        update: { toPath: `/${slug}/${post.slug}`, postId: post.id },
        create: {
          siteId,
          fromPath: `/${existing.slug}/${post.slug}`,
          toPath: `/${slug}/${post.slug}`,
          postId: post.id,
          permanent: true,
        },
      })
    }
    await prisma.postRedirect.upsert({
      where: { siteId_fromPath: { siteId, fromPath: `/kategorie/${existing.slug}` } },
      update: { toPath: `/kategorie/${slug}` },
      create: { siteId, fromPath: `/kategorie/${existing.slug}`, toPath: `/kategorie/${slug}`, permanent: true },
    })
  }

  await audit({ action: 'CATEGORY_CHANGE', userId: guard.user.id, entity: 'Category', entityId: id, detail: category.name })
  revalidatePath('/')
  revalidatePath(`/kategorie/${slug}`)
  return NextResponse.json({ ok: true, category })
}

export async function DELETE(request: Request, { params }: Params) {
  const guard = await guardApi(request, { minimum: 'ADMIN' })
  if (!guard.ok) return guard.response

  const { id } = await params
  const count = await prisma.post.count({ where: { categoryId: id } })
  if (count > 0) {
    return NextResponse.json(
      { error: `В категории ${count} материал(ов). Перенесите их перед удалением.` },
      { status: 409 },
    )
  }

  await prisma.category.delete({ where: { id } })
  await audit({ action: 'CATEGORY_CHANGE', userId: guard.user.id, entity: 'Category', entityId: id, detail: 'deleted' })
  revalidatePath('/')
  return NextResponse.json({ ok: true })
}
