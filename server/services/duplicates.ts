import 'server-only'

import { prisma } from '@/lib/prisma'
import { getSiteId } from './site'

export interface DuplicateHit {
  id: string
  title: string
  slug: string
  status: string
  reason: 'same-source-url' | 'similar-title'
  publishedAt: Date | null
}

/** Normalised title fingerprint — stopwords out, order preserved. */
const STOPWORDS = new Set([
  'der', 'die', 'das', 'den', 'dem', 'des', 'ein', 'eine', 'einen', 'einem', 'einer',
  'und', 'oder', 'aber', 'für', 'von', 'mit', 'auf', 'aus', 'bei', 'nach', 'über',
  'im', 'in', 'am', 'an', 'zu', 'zum', 'zur', 'ist', 'sind', 'war', 'waren',
  'the', 'a', 'an', 'of', 'and', 'to', 'in', 'on', 'for', 'with',
])

function tokens(title: string): string[] {
  return title
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .split(/\s+/)
    .filter((t) => t.length > 2 && !STOPWORDS.has(t))
}

function similarity(a: string, b: string): number {
  const ta = new Set(tokens(a))
  const tb = new Set(tokens(b))
  if (!ta.size || !tb.size) return 0
  let shared = 0
  for (const token of ta) if (tb.has(token)) shared += 1
  // Jaccard over content words — cheap, and good enough to catch a re-import.
  return shared / (ta.size + tb.size - shared)
}

/**
 * Runs before an import creates anything. Catching a duplicate here is the
 * difference between an editor seeing "this is already in the CMS" and the
 * site publishing the same story twice under two URLs.
 */
export async function findDuplicates(input: {
  sourceUrl?: string
  title?: string
  excludePostId?: string
}): Promise<DuplicateHit[]> {
  const siteId = await getSiteId()
  const hits: DuplicateHit[] = []

  if (input.sourceUrl) {
    const normalized = input.sourceUrl.replace(/[?#].*$/, '').replace(/\/$/, '')
    const bySource = await prisma.post.findMany({
      where: {
        siteId,
        sourceUrl: { startsWith: normalized },
        ...(input.excludePostId ? { id: { not: input.excludePostId } } : {}),
      },
      select: { id: true, title: true, slug: true, status: true, publishedAt: true },
      take: 5,
    })
    hits.push(
      ...bySource.map((p) => ({ ...p, status: String(p.status), reason: 'same-source-url' as const })),
    )
  }

  if (input.title && input.title.trim().length > 10) {
    const recent = await prisma.post.findMany({
      where: {
        siteId,
        ...(input.excludePostId ? { id: { not: input.excludePostId } } : {}),
        ...(hits.length ? { id: { notIn: hits.map((h) => h.id) } } : {}),
      },
      select: { id: true, title: true, slug: true, status: true, publishedAt: true },
      orderBy: { createdAt: 'desc' },
      take: 300,
    })
    for (const post of recent) {
      if (similarity(input.title, post.title) >= 0.6) {
        hits.push({ ...post, status: String(post.status), reason: 'similar-title' })
        if (hits.length >= 8) break
      }
    }
  }

  return hits
}
