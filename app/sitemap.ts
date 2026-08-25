import type { MetadataRoute } from 'next'

import { siteConfig, staticPages } from '@/config/site'
import { prisma } from '@/lib/prisma'
import { getPublishedSlugs } from '@/server/services/posts'
import { getSiteId } from '@/server/services/site'

export const revalidate = 3600

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = siteConfig.url

  const entries: MetadataRoute.Sitemap = [
    { url: base, lastModified: new Date(), changeFrequency: 'hourly', priority: 1 },
    { url: `${base}/neueste`, lastModified: new Date(), changeFrequency: 'hourly', priority: 0.8 },
    { url: `${base}/beliebt`, lastModified: new Date(), changeFrequency: 'daily', priority: 0.6 },
  ]

  try {
    const siteId = await getSiteId()

    const categories = await prisma.category.findMany({
      where: { siteId, enabled: true },
      select: { slug: true, updatedAt: true },
    })
    for (const category of categories) {
      entries.push({
        url: `${base}/kategorie/${category.slug}`,
        lastModified: category.updatedAt,
        changeFrequency: 'daily',
        priority: 0.7,
      })
    }

    const posts = await getPublishedSlugs()
    for (const post of posts) {
      entries.push({
        url: `${base}/${post.category.slug}/${post.slug}`,
        lastModified: post.updatedAt,
        changeFrequency: 'weekly',
        // Recent stories are the ones worth recrawling often.
        priority: isRecent(post.publishedAt) ? 0.9 : 0.6,
      })
    }
  } catch (error) {
    // A sitemap that 500s is worse than a small one — degrade, do not fail.
    console.error('[sitemap] could not load content', error)
  }

  // Legal pages carry noindex; only the trust pages belong in the sitemap.
  const indexable = new Set(['/ueber-uns', '/kontakt', '/redaktionsrichtlinien', '/korrekturen'])
  for (const page of staticPages) {
    if (!indexable.has(page.href)) continue
    entries.push({
      url: `${base}${page.href}`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.4,
    })
  }

  return entries
}

function isRecent(date: Date | null): boolean {
  if (!date) return false
  return Date.now() - date.getTime() < 14 * 24 * 60 * 60 * 1000
}
