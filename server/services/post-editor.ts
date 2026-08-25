import 'server-only'

import { revalidatePath, revalidateTag } from 'next/cache'
import type { PostStatus, PostOrigin } from '@prisma/client'

import { prisma } from '@/lib/prisma'
import { readingTimeFromWords, slugify } from '@/lib/utils'
import {
  documentWordCount,
  parseDocument,
  deriveExcerpt,
  type ArticleDocument,
} from '@/server/domain/blocks'
import { audit } from './audit'
import { getSiteId } from './site'

export interface PostInput {
  title: string
  subtitle?: string
  slug?: string
  excerpt?: string
  document: ArticleDocument
  status: PostStatus
  origin?: PostOrigin
  language?: string
  categoryId: string
  /** Additional rubrics the article also appears under. */
  extraCategoryIds?: string[]
  authorId?: string | null
  heroImageId?: string | null
  ogImageId?: string | null
  seoTitle?: string
  metaDescription?: string
  canonicalUrl?: string
  ogTitle?: string
  ogDescription?: string
  socialHeadline?: string
  sourceUrl?: string | null
  sourceNote?: string
  aiUsed?: boolean
  aiProvider?: string | null
  aiModel?: string | null
  featured?: boolean
  isEditorsPick?: boolean
  tags?: string[]
  scheduledAt?: Date | null
}

/**
 * Slug uniqueness within a site. Appends -2, -3 … rather than a random suffix,
 * because a human-readable URL is worth the extra query.
 */
export async function uniqueSlug(
  siteId: string,
  desired: string,
  excludePostId?: string,
): Promise<string> {
  const base = slugify(desired)
  let candidate = base
  let counter = 2

  for (;;) {
    const clash = await prisma.post.findFirst({
      where: { siteId, slug: candidate, ...(excludePostId ? { id: { not: excludePostId } } : {}) },
      select: { id: true },
    })
    if (!clash) return candidate
    candidate = `${base}-${counter}`
    counter += 1
    if (counter > 200) return `${base}-${Date.now().toString(36)}`
  }
}


/**
 * Rewrites the secondary-category rows.
 *
 * The primary category is filtered out — it lives on `Post.categoryId` and
 * duplicating it here would make every category listing return the article
 * twice.
 */
async function syncExtraCategories(
  postId: string,
  primaryId: string,
  extraIds: string[] | undefined,
) {
  if (!extraIds) return
  const clean = Array.from(new Set(extraIds.filter((id) => id && id !== primaryId)))
  await prisma.postCategory.deleteMany({ where: { postId } })
  if (clean.length) {
    await prisma.postCategory.createMany({
      data: clean.map((categoryId) => ({ postId, categoryId })),
      skipDuplicates: true,
    })
  }
}

async function resolveTags(siteId: string, names: string[]) {
  const clean = Array.from(
    new Set(
      names
        .map((n) => n.trim().replace(/^#/, ''))
        .filter((n) => n.length > 1 && n.length <= 40),
    ),
  ).slice(0, 12)

  const ids: string[] = []
  for (const name of clean) {
    const slug = slugify(name, 50)
    const tag = await prisma.tag.upsert({
      where: { siteId_slug: { siteId, slug } },
      update: {},
      create: { siteId, slug, name },
      select: { id: true },
    })
    ids.push(tag.id)
  }
  return ids
}

function publicationTimestamps(status: PostStatus, scheduledAt?: Date | null, existing?: Date | null) {
  if (status === 'PUBLISHED') {
    return { publishedAt: existing ?? new Date(), scheduledAt: null }
  }
  if (status === 'SCHEDULED' && scheduledAt) {
    // Scheduled posts carry publishedAt too: the public query filters on
    // `publishedAt <= now`, so a future date makes them appear on their own.
    return { publishedAt: scheduledAt, scheduledAt }
  }
  return { publishedAt: status === 'ARCHIVED' ? existing ?? null : null, scheduledAt: null }
}

export async function createPost(input: PostInput, userId: string) {
  const siteId = await getSiteId()
  const document = parseDocument(input.document)
  const words = documentWordCount(document)
  const slug = await uniqueSlug(siteId, input.slug || input.title)
  const excerpt = (input.excerpt || deriveExcerpt(document)).slice(0, 400)
  const times = publicationTimestamps(input.status, input.scheduledAt)

  const post = await prisma.post.create({
    data: {
      siteId,
      title: input.title.trim(),
      subtitle: input.subtitle?.trim() ?? '',
      slug,
      excerpt,
      content: document as unknown as object,
      status: input.status,
      origin: input.origin ?? 'MANUAL',
      language: input.language ?? 'de',
      categoryId: input.categoryId,
      authorId: input.authorId ?? null,
      heroImageId: input.heroImageId ?? null,
      ogImageId: input.ogImageId ?? null,
      seoTitle: input.seoTitle?.trim() ?? '',
      metaDescription: input.metaDescription?.trim() ?? '',
      canonicalUrl: input.canonicalUrl?.trim() ?? '',
      ogTitle: input.ogTitle?.trim() ?? '',
      ogDescription: input.ogDescription?.trim() ?? '',
      socialHeadline: input.socialHeadline?.trim() ?? '',
      sourceUrl: input.sourceUrl || null,
      sourceDomain: input.sourceUrl ? safeDomain(input.sourceUrl) : null,
      sourceNote: input.sourceNote ?? '',
      aiUsed: input.aiUsed ?? false,
      aiProvider: input.aiProvider ?? null,
      aiModel: input.aiModel ?? null,
      featured: input.featured ?? false,
      isEditorsPick: input.isEditorsPick ?? false,
      wordCount: words,
      readingTime: readingTimeFromWords(words),
      createdById: userId,
      updatedById: userId,
      publishedById: input.status === 'PUBLISHED' ? userId : null,
      ...times,
    },
    include: { category: { select: { slug: true } } },
  })

  if (input.tags?.length) {
    const tagIds = await resolveTags(siteId, input.tags)
    await prisma.postTag.createMany({
      data: tagIds.map((tagId) => ({ postId: post.id, tagId })),
      skipDuplicates: true,
    })
  }

  await syncExtraCategories(post.id, post.categoryId, input.extraCategoryIds)
  await snapshotRevision(post.id, userId, 'Erstellt')
  await linkSource(siteId, post.id, input.sourceUrl)
  await audit({
    action: 'POST_CREATE',
    userId,
    entity: 'Post',
    entityId: post.id,
    detail: post.title,
  })
  await revalidatePost(post.category.slug, post.slug)
  return post
}

export async function updatePost(id: string, input: PostInput, userId: string) {
  const siteId = await getSiteId()
  const existing = await prisma.post.findUnique({
    where: { id },
    include: { category: { select: { slug: true } } },
  })
  if (!existing) throw new Error('Beitrag nicht gefunden.')

  // Snapshot the *previous* state before overwriting it.
  await snapshotRevision(id, userId, 'Vor Änderung')

  const document = parseDocument(input.document)
  const words = documentWordCount(document)
  const desiredSlug = slugify(input.slug || input.title)
  const slug =
    desiredSlug === existing.slug ? existing.slug : await uniqueSlug(siteId, desiredSlug, id)

  const times = publicationTimestamps(input.status, input.scheduledAt, existing.publishedAt)

  const post = await prisma.post.update({
    where: { id },
    data: {
      title: input.title.trim(),
      subtitle: input.subtitle?.trim() ?? '',
      slug,
      excerpt: (input.excerpt || deriveExcerpt(document)).slice(0, 400),
      content: document as unknown as object,
      status: input.status,
      language: input.language ?? existing.language,
      categoryId: input.categoryId,
      authorId: input.authorId ?? null,
      heroImageId: input.heroImageId ?? null,
      ogImageId: input.ogImageId ?? null,
      seoTitle: input.seoTitle?.trim() ?? '',
      metaDescription: input.metaDescription?.trim() ?? '',
      canonicalUrl: input.canonicalUrl?.trim() ?? '',
      ogTitle: input.ogTitle?.trim() ?? '',
      ogDescription: input.ogDescription?.trim() ?? '',
      socialHeadline: input.socialHeadline?.trim() ?? '',
      sourceUrl: input.sourceUrl || null,
      sourceDomain: input.sourceUrl ? safeDomain(input.sourceUrl) : null,
      sourceNote: input.sourceNote ?? '',
      aiUsed: input.aiUsed ?? existing.aiUsed,
      aiProvider: input.aiProvider ?? existing.aiProvider,
      aiModel: input.aiModel ?? existing.aiModel,
      featured: input.featured ?? false,
      isEditorsPick: input.isEditorsPick ?? false,
      wordCount: words,
      readingTime: readingTimeFromWords(words),
      updatedById: userId,
      publishedById:
        input.status === 'PUBLISHED' ? existing.publishedById ?? userId : existing.publishedById,
      ...times,
    },
    include: { category: { select: { slug: true } } },
  })

  // A published URL that changes must keep working — otherwise every inbound
  // link and every Google result for the old slug 404s.
  if (slug !== existing.slug && existing.status === 'PUBLISHED') {
    const fromPath = `/${existing.category.slug}/${existing.slug}`
    const toPath = `/${post.category.slug}/${post.slug}`
    if (fromPath !== toPath) {
      await prisma.postRedirect.upsert({
        where: { siteId_fromPath: { siteId, fromPath } },
        update: { toPath, postId: id },
        create: { siteId, fromPath, toPath, postId: id, permanent: true },
      })
    }
  }

  if (input.tags) {
    const tagIds = await resolveTags(siteId, input.tags)
    await prisma.postTag.deleteMany({ where: { postId: id } })
    if (tagIds.length) {
      await prisma.postTag.createMany({
        data: tagIds.map((tagId) => ({ postId: id, tagId })),
        skipDuplicates: true,
      })
    }
  }

  await syncExtraCategories(id, post.categoryId, input.extraCategoryIds)
  await linkSource(siteId, id, input.sourceUrl)
  await audit({
    action: input.status === 'PUBLISHED' ? 'POST_PUBLISH' : 'POST_UPDATE',
    userId,
    entity: 'Post',
    entityId: id,
    detail: `${post.title} → ${input.status}`,
  })
  await revalidatePost(post.category.slug, post.slug, existing.category.slug, existing.slug)
  await revalidateExtraCategories(id)
  return post
}

export async function setPostStatus(id: string, status: PostStatus, userId: string) {
  const existing = await prisma.post.findUnique({
    where: { id },
    include: { category: { select: { slug: true } } },
  })
  if (!existing) throw new Error('Beitrag nicht gefunden.')

  const times = publicationTimestamps(status, existing.scheduledAt, existing.publishedAt)
  const post = await prisma.post.update({
    where: { id },
    data: {
      status,
      updatedById: userId,
      publishedById: status === 'PUBLISHED' ? existing.publishedById ?? userId : existing.publishedById,
      ...times,
    },
    include: { category: { select: { slug: true } } },
  })

  await audit({
    action: status === 'PUBLISHED' ? 'POST_PUBLISH' : 'POST_UNPUBLISH',
    userId,
    entity: 'Post',
    entityId: id,
    detail: `${post.title} → ${status}`,
  })
  await revalidatePost(post.category.slug, post.slug)
  return post
}

export async function deletePost(id: string, userId: string) {
  const post = await prisma.post.findUnique({
    where: { id },
    include: { category: { select: { slug: true } } },
  })
  if (!post) return
  await prisma.post.delete({ where: { id } })
  await audit({ action: 'POST_DELETE', userId, entity: 'Post', entityId: id, detail: post.title })
  await revalidatePost(post.category.slug, post.slug)
}

export async function duplicatePost(id: string, userId: string) {
  const siteId = await getSiteId()
  const source = await prisma.post.findUnique({
    where: { id },
    include: { tags: { include: { tag: true } } },
  })
  if (!source) throw new Error('Beitrag nicht gefunden.')

  const slug = await uniqueSlug(siteId, `${source.slug}-kopie`)
  const copy = await prisma.post.create({
    data: {
      siteId,
      title: `${source.title} (Kopie)`,
      subtitle: source.subtitle,
      slug,
      excerpt: source.excerpt,
      content: source.content as object,
      status: 'DRAFT',
      origin: source.origin,
      language: source.language,
      categoryId: source.categoryId,
      authorId: source.authorId,
      heroImageId: source.heroImageId,
      seoTitle: source.seoTitle,
      metaDescription: source.metaDescription,
      sourceUrl: source.sourceUrl,
      sourceDomain: source.sourceDomain,
      aiUsed: source.aiUsed,
      aiProvider: source.aiProvider,
      aiModel: source.aiModel,
      wordCount: source.wordCount,
      readingTime: source.readingTime,
      createdById: userId,
      updatedById: userId,
    },
  })

  if (source.tags.length) {
    await prisma.postTag.createMany({
      data: source.tags.map((t) => ({ postId: copy.id, tagId: t.tagId })),
      skipDuplicates: true,
    })
  }
  return copy
}

export async function snapshotRevision(postId: string, userId: string, note = '') {
  const post = await prisma.post.findUnique({ where: { id: postId } })
  if (!post) return
  await prisma.postRevision.create({
    data: {
      postId,
      createdById: userId,
      note,
      snapshot: {
        title: post.title,
        subtitle: post.subtitle,
        slug: post.slug,
        excerpt: post.excerpt,
        content: post.content,
        categoryId: post.categoryId,
        heroImageId: post.heroImageId,
        seoTitle: post.seoTitle,
        metaDescription: post.metaDescription,
        status: post.status,
      } as object,
    },
  })

  // Keep the last 20 revisions per post — enough to undo a bad session.
  const old = await prisma.postRevision.findMany({
    where: { postId },
    orderBy: { createdAt: 'desc' },
    skip: 20,
    select: { id: true },
  })
  if (old.length) {
    await prisma.postRevision.deleteMany({ where: { id: { in: old.map((r) => r.id) } } })
  }
}

export async function restoreRevision(revisionId: string, userId: string) {
  const revision = await prisma.postRevision.findUnique({ where: { id: revisionId } })
  if (!revision) throw new Error('Version nicht gefunden.')

  await snapshotRevision(revision.postId, userId, 'Vor Wiederherstellung')

  const snap = revision.snapshot as Record<string, unknown>
  const document = parseDocument(snap.content)
  const words = documentWordCount(document)

  const post = await prisma.post.update({
    where: { id: revision.postId },
    data: {
      title: String(snap.title ?? ''),
      subtitle: String(snap.subtitle ?? ''),
      excerpt: String(snap.excerpt ?? ''),
      content: document as unknown as object,
      seoTitle: String(snap.seoTitle ?? ''),
      metaDescription: String(snap.metaDescription ?? ''),
      heroImageId: (snap.heroImageId as string | null) ?? null,
      wordCount: words,
      readingTime: readingTimeFromWords(words),
      updatedById: userId,
    },
    include: { category: { select: { slug: true } } },
  })

  await audit({
    action: 'POST_RESTORE',
    userId,
    entity: 'Post',
    entityId: post.id,
    detail: `Version vom ${revision.createdAt.toISOString()}`,
  })
  await revalidatePost(post.category.slug, post.slug)
  return post
}

/** Secondary rubrics also list the article, so their pages must be refreshed. */
async function revalidateExtraCategories(postId: string) {
  try {
    const rows = await prisma.postCategory.findMany({
      where: { postId },
      select: { category: { select: { slug: true } } },
    })
    for (const row of rows) revalidatePath(`/kategorie/${row.category.slug}`)
  } catch {
    // Outside a request scope (seed script) — nothing to revalidate.
  }
}

function safeDomain(url: string): string | null {
  try {
    return new URL(url).hostname.replace(/^www\./, '').toLowerCase()
  } catch {
    return null
  }
}

async function linkSource(siteId: string, postId: string, sourceUrl?: string | null) {
  if (!sourceUrl) return
  const domain = safeDomain(sourceUrl)
  if (!domain) return

  const source = await prisma.source.upsert({
    where: { siteId_domain: { siteId, domain } },
    update: { importCount: { increment: 1 }, lastImportAt: new Date() },
    create: {
      siteId,
      domain,
      name: domain,
      url: `https://${domain}`,
      importCount: 1,
      lastImportAt: new Date(),
    },
    select: { id: true },
  })
  await prisma.post.update({ where: { id: postId }, data: { sourceId: source.id } })
}

/**
 * Targeted cache invalidation. Publishing one story must not force a rebuild of
 * the whole site — only the pages that actually changed are revalidated.
 */
export async function revalidatePost(
  categorySlug: string,
  slug: string,
  oldCategorySlug?: string,
  oldSlug?: string,
) {
  try {
    revalidatePath('/')
    revalidatePath('/neueste')
    revalidatePath('/beliebt')
    revalidatePath(`/kategorie/${categorySlug}`)
    revalidatePath(`/${categorySlug}/${slug}`)
    if (oldCategorySlug && oldSlug && (oldCategorySlug !== categorySlug || oldSlug !== slug)) {
      revalidatePath(`/kategorie/${oldCategorySlug}`)
      revalidatePath(`/${oldCategorySlug}/${oldSlug}`)
    }
    revalidateTag('posts')
    revalidatePath('/sitemap.xml')
  } catch {
    // revalidatePath throws outside a request scope (e.g. seed script) — fine.
  }
}
