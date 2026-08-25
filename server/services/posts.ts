import 'server-only'

import { Prisma } from '@prisma/client'
import { cache } from 'react'

import { prisma } from '@/lib/prisma'
import { getSiteId } from './site'

/**
 * Public-facing post queries.
 *
 * All of them go through `publishedWhere`, which is the single definition of
 * "visible to a reader": published status, a publication date in the past.
 * Scheduled posts become visible without a cron job because the comparison is
 * evaluated per request.
 */

export const POST_CARD_SELECT = {
  id: true,
  title: true,
  subtitle: true,
  slug: true,
  excerpt: true,
  readingTime: true,
  publishedAt: true,
  views: true,
  featured: true,
  category: { select: { id: true, name: true, slug: true, color: true } },
  heroImage: {
    select: { url: true, alt: true, width: true, height: true, blurDataUrl: true },
  },
  author: { select: { name: true, slug: true } },
} satisfies Prisma.PostSelect

export type PostCard = Prisma.PostGetPayload<{ select: typeof POST_CARD_SELECT }>

export function publishedWhere(siteId: string): Prisma.PostWhereInput {
  return {
    siteId,
    status: 'PUBLISHED',
    publishedAt: { lte: new Date() },
  }
}

export interface PageResult<T> {
  items: T[]
  total: number
  page: number
  perPage: number
  totalPages: number
}

export async function getLatestPosts(options: {
  page?: number
  perPage?: number
  categoryId?: string
  excludeIds?: string[]
} = {}): Promise<PageResult<PostCard>> {
  const siteId = await getSiteId()
  const page = Math.max(1, options.page ?? 1)
  const perPage = Math.min(48, Math.max(1, options.perPage ?? 12))

  const where: Prisma.PostWhereInput = {
    ...publishedWhere(siteId),
    ...(options.categoryId ? { categoryId: options.categoryId } : {}),
    ...(options.excludeIds?.length ? { id: { notIn: options.excludeIds } } : {}),
  }

  const [items, total] = await Promise.all([
    prisma.post.findMany({
      where,
      select: POST_CARD_SELECT,
      orderBy: { publishedAt: 'desc' },
      skip: (page - 1) * perPage,
      take: perPage,
    }),
    prisma.post.count({ where }),
  ])

  return {
    items,
    total,
    page,
    perPage,
    totalPages: Math.max(1, Math.ceil(total / perPage)),
  }
}

export async function getPopularPosts(limit = 6, excludeIds: string[] = []): Promise<PostCard[]> {
  const siteId = await getSiteId()
  // "Popular" = views, but only inside a recent window so an old viral piece
  // does not permanently own the block.
  const since = new Date(Date.now() - 45 * 24 * 60 * 60 * 1000)
  const recent = await prisma.post.findMany({
    where: {
      ...publishedWhere(siteId),
      publishedAt: { lte: new Date(), gte: since },
      ...(excludeIds.length ? { id: { notIn: excludeIds } } : {}),
    },
    select: POST_CARD_SELECT,
    orderBy: [{ views: 'desc' }, { publishedAt: 'desc' }],
    take: limit,
  })
  if (recent.length >= limit) return recent

  // Not enough recent material yet (new site) — top up from all time.
  const fill = await prisma.post.findMany({
    where: {
      ...publishedWhere(siteId),
      id: { notIn: [...excludeIds, ...recent.map((p) => p.id)] },
    },
    select: POST_CARD_SELECT,
    orderBy: [{ views: 'desc' }, { publishedAt: 'desc' }],
    take: limit - recent.length,
  })
  return [...recent, ...fill]
}

export async function getFeaturedPosts(limit = 5): Promise<PostCard[]> {
  const siteId = await getSiteId()
  const featured = await prisma.post.findMany({
    where: { ...publishedWhere(siteId), featured: true },
    select: POST_CARD_SELECT,
    orderBy: { publishedAt: 'desc' },
    take: limit,
  })
  if (featured.length >= limit) return featured

  const fill = await prisma.post.findMany({
    where: {
      ...publishedWhere(siteId),
      id: { notIn: featured.map((p) => p.id) },
    },
    select: POST_CARD_SELECT,
    orderBy: { publishedAt: 'desc' },
    take: limit - featured.length,
  })
  return [...featured, ...fill]
}

export async function getEditorsPicks(limit = 4, excludeIds: string[] = []): Promise<PostCard[]> {
  const siteId = await getSiteId()
  const picks = await prisma.post.findMany({
    where: {
      ...publishedWhere(siteId),
      isEditorsPick: true,
      ...(excludeIds.length ? { id: { notIn: excludeIds } } : {}),
    },
    select: POST_CARD_SELECT,
    orderBy: { publishedAt: 'desc' },
    take: limit,
  })
  if (picks.length >= limit) return picks

  const fill = await prisma.post.findMany({
    where: {
      ...publishedWhere(siteId),
      id: { notIn: [...excludeIds, ...picks.map((p) => p.id)] },
    },
    select: POST_CARD_SELECT,
    orderBy: [{ readingTime: 'desc' }, { publishedAt: 'desc' }],
    take: limit - picks.length,
  })
  return [...picks, ...fill]
}

export const POST_FULL_INCLUDE = {
  category: { select: { id: true, name: true, slug: true, description: true, color: true } },
  author: {
    select: {
      id: true,
      name: true,
      slug: true,
      role: true,
      bio: true,
      isDemo: true,
      avatar: { select: { url: true, alt: true } },
    },
  },
  heroImage: {
    select: {
      id: true,
      url: true,
      alt: true,
      caption: true,
      credit: true,
      width: true,
      height: true,
      blurDataUrl: true,
    },
  },
  ogImage: { select: { url: true, width: true, height: true } },
  tags: { include: { tag: { select: { name: true, slug: true } } } },
  source: { select: { name: true, domain: true } },
} satisfies Prisma.PostInclude

export type FullPost = Prisma.PostGetPayload<{ include: typeof POST_FULL_INCLUDE }>

export const getPostBySlug = cache(async (slug: string): Promise<FullPost | null> => {
  const siteId = await getSiteId()
  return prisma.post.findFirst({
    where: { ...publishedWhere(siteId), slug },
    include: POST_FULL_INCLUDE,
  })
})

/** Admin/preview path — no status filter. Never used by a public route. */
export async function getPostByIdForPreview(id: string): Promise<FullPost | null> {
  return prisma.post.findUnique({ where: { id }, include: POST_FULL_INCLUDE })
}

/**
 * Related stories. Same category first (the strongest relevance signal we have
 * without an embedding index), topped up with shared tags, then recency.
 */
export async function getRelatedPosts(post: {
  id: string
  categoryId: string
  tags?: { tag: { slug: string } }[]
}, limit = 6): Promise<PostCard[]> {
  const siteId = await getSiteId()
  const exclude = [post.id]

  const sameCategory = await prisma.post.findMany({
    where: {
      ...publishedWhere(siteId),
      categoryId: post.categoryId,
      id: { notIn: exclude },
    },
    select: POST_CARD_SELECT,
    orderBy: { publishedAt: 'desc' },
    take: limit,
  })
  if (sameCategory.length >= limit) return sameCategory
  exclude.push(...sameCategory.map((p) => p.id))

  const tagSlugs = post.tags?.map((t) => t.tag.slug) ?? []
  let byTag: PostCard[] = []
  if (tagSlugs.length) {
    byTag = await prisma.post.findMany({
      where: {
        ...publishedWhere(siteId),
        id: { notIn: exclude },
        tags: { some: { tag: { slug: { in: tagSlugs } } } },
      },
      select: POST_CARD_SELECT,
      orderBy: { publishedAt: 'desc' },
      take: limit - sameCategory.length,
    })
    exclude.push(...byTag.map((p) => p.id))
  }

  const remaining = limit - sameCategory.length - byTag.length
  if (remaining <= 0) return [...sameCategory, ...byTag]

  const recent = await prisma.post.findMany({
    where: { ...publishedWhere(siteId), id: { notIn: exclude } },
    select: POST_CARD_SELECT,
    orderBy: { publishedAt: 'desc' },
    take: remaining,
  })
  return [...sameCategory, ...byTag, ...recent]
}

export async function getCategoryBySlug(slug: string) {
  const siteId = await getSiteId()
  return prisma.category.findFirst({ where: { siteId, slug, enabled: true } })
}

export async function searchPosts(query: string, page = 1, perPage = 12): Promise<PageResult<PostCard>> {
  const siteId = await getSiteId()
  const term = query.trim()
  if (!term) {
    return { items: [], total: 0, page: 1, perPage, totalPages: 1 }
  }

  const where: Prisma.PostWhereInput = {
    ...publishedWhere(siteId),
    OR: [
      { title: { contains: term, mode: 'insensitive' } },
      { subtitle: { contains: term, mode: 'insensitive' } },
      { excerpt: { contains: term, mode: 'insensitive' } },
      { tags: { some: { tag: { name: { contains: term, mode: 'insensitive' } } } } },
      { category: { name: { contains: term, mode: 'insensitive' } } },
    ],
  }

  const [items, total] = await Promise.all([
    prisma.post.findMany({
      where,
      select: POST_CARD_SELECT,
      orderBy: [{ publishedAt: 'desc' }],
      skip: (page - 1) * perPage,
      take: perPage,
    }),
    prisma.post.count({ where }),
  ])

  return { items, total, page, perPage, totalPages: Math.max(1, Math.ceil(total / perPage)) }
}

/**
 * View counter. Fire-and-forget: a failed increment must never break a page
 * render, and an approximate number is fine for an editorial "popular" block.
 */
export async function incrementViews(postId: string): Promise<void> {
  try {
    await prisma.post.update({
      where: { id: postId },
      data: { views: { increment: 1 } },
    })
  } catch {
    // ignored on purpose
  }
}

export async function getPublishedSlugs() {
  const siteId = await getSiteId()
  return prisma.post.findMany({
    where: publishedWhere(siteId),
    select: {
      slug: true,
      updatedAt: true,
      publishedAt: true,
      category: { select: { slug: true } },
    },
    orderBy: { publishedAt: 'desc' },
  })
}
