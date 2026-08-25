import { NextResponse } from 'next/server'
import { revalidatePath, revalidateTag } from 'next/cache'

import { env } from '@/config/env'
import { prisma } from '@/lib/prisma'
import { getSiteId, getSettings } from '@/server/services/site'

export const dynamic = 'force-dynamic'

/**
 * External revalidation hook.
 *
 * Two uses: a cron that flips scheduled posts live on the minute they are due,
 * and a manual "rebuild the caches" trigger. Protected by a shared secret; when
 * REVALIDATE_SECRET is unset the endpoint refuses rather than running open.
 */
export async function POST(request: Request) {
  if (!env.revalidateSecret) {
    return NextResponse.json({ error: 'REVALIDATE_SECRET ist nicht gesetzt.' }, { status: 503 })
  }

  const provided =
    request.headers.get('x-revalidate-secret') ??
    new URL(request.url).searchParams.get('secret') ??
    ''
  if (provided !== env.revalidateSecret) {
    return NextResponse.json({ error: 'Nicht autorisiert.' }, { status: 401 })
  }

  const siteId = await getSiteId()
  const now = new Date()

  // Scheduled posts already become visible on their own (the public query
  // filters on publishedAt <= now); this only flips the stored status so the
  // admin list reflects reality.
  const due = await prisma.post.findMany({
    where: { siteId, status: 'SCHEDULED', publishedAt: { lte: now } },
    select: { id: true, slug: true, category: { select: { slug: true } } },
  })

  for (const post of due) {
    await prisma.post.update({
      where: { id: post.id },
      data: { status: 'PUBLISHED', scheduledAt: null },
    })
    revalidatePath(`/${post.category.slug}/${post.slug}`)
    revalidatePath(`/kategorie/${post.category.slug}`)
  }

  revalidatePath('/')
  revalidatePath('/neueste')
  revalidatePath('/beliebt')
  revalidatePath('/sitemap.xml')
  revalidateTag('posts')

  const settings = await getSettings()
  return NextResponse.json({ ok: true, site: settings.siteName, publishedNow: due.length })
}
