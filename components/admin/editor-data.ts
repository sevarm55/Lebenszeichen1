import 'server-only'

import { prisma } from '@/lib/prisma'
import { parseDocument } from '@/server/domain/blocks'
import { getSiteId } from '@/server/services/site'
import type { PostEditorInitial } from '@/components/admin/post-editor'

/** Categories, authors and the tag vocabulary the editor form needs. */
export async function loadEditorOptions() {
  const siteId = await getSiteId()
  const [categories, authors, tagRows] = await Promise.all([
    prisma.category.findMany({
      where: { siteId },
      orderBy: { order: 'asc' },
      select: { id: true, name: true },
    }),
    prisma.author.findMany({
      where: { siteId, enabled: true },
      orderBy: { name: 'asc' },
      select: { id: true, name: true },
    }),
    // Most-used tags, so an editor picks from the existing vocabulary instead of
    // inventing a near-duplicate ("hunde" next to "hund") every time.
    prisma.tag.findMany({
      where: { siteId },
      select: { name: true, _count: { select: { posts: true } } },
      orderBy: { posts: { _count: 'desc' } },
      take: 30,
    }),
  ])

  const popularTags = tagRows.filter((t) => t._count.posts > 0).map((t) => t.name)
  return { categories, authors, popularTags }
}

export function emptyInitial(defaultCategoryId: string): PostEditorInitial {
  return {
    title: '',
    subtitle: '',
    slug: '',
    excerpt: '',
    document: { version: 1, blocks: [] },
    status: 'DRAFT',
    language: 'de',
    categoryId: defaultCategoryId,
    authorId: null,
    hero: null,
    seoTitle: '',
    metaDescription: '',
    canonicalUrl: '',
    ogTitle: '',
    ogDescription: '',
    socialHeadline: '',
    sourceUrl: null,
    sourceNote: '',
    aiUsed: false,
    aiProvider: null,
    aiModel: null,
    featured: false,
    isEditorsPick: false,
    tags: [],
    scheduledAt: null,
    origin: 'MANUAL',
  }
}

export async function loadPostForEditor(id: string): Promise<PostEditorInitial | null> {
  const post = await prisma.post.findUnique({
    where: { id },
    include: {
      heroImage: { select: { id: true, url: true, alt: true } },
      category: { select: { slug: true } },
      tags: { include: { tag: { select: { name: true } } } },
    },
  })
  if (!post) return null

  return {
    id: post.id,
    title: post.title,
    subtitle: post.subtitle,
    slug: post.slug,
    excerpt: post.excerpt,
    document: parseDocument(post.content),
    status: post.status,
    language: post.language,
    categoryId: post.categoryId,
    authorId: post.authorId,
    hero: post.heroImage
      ? { mediaId: post.heroImage.id, url: post.heroImage.url, alt: post.heroImage.alt }
      : null,
    seoTitle: post.seoTitle,
    metaDescription: post.metaDescription,
    canonicalUrl: post.canonicalUrl,
    ogTitle: post.ogTitle,
    ogDescription: post.ogDescription,
    socialHeadline: post.socialHeadline,
    sourceUrl: post.sourceUrl,
    sourceNote: post.sourceNote,
    aiUsed: post.aiUsed,
    aiProvider: post.aiProvider,
    aiModel: post.aiModel,
    featured: post.featured,
    isEditorsPick: post.isEditorsPick,
    tags: post.tags.map((t) => t.tag.name),
    scheduledAt: post.scheduledAt?.toISOString() ?? null,
    origin: post.origin,
    categorySlug: post.category.slug,
  }
}
