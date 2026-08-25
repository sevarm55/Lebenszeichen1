import type { Metadata } from 'next'
import Link from 'next/link'

import { AdSlot } from '@/components/ads/ad-slot'
import { Pagination } from '@/components/public/pagination'
import { SectionHeading } from '@/components/public/section-heading'
import {
  CompactStoryCard,
  FeaturedStoryCard,
  GridStoryCard,
  HorizontalStoryCard,
  LeadStoryCard,
} from '@/components/public/story-card'
import { buildMetadata } from '@/server/seo/metadata'
import {
  getEditorsPicks,
  getFeaturedPosts,
  getLatestPosts,
  getPopularPosts,
  type PostCard,
} from '@/server/services/posts'
import { getAllCategories, getSettings } from '@/server/services/site'
import { prisma } from '@/lib/prisma'
import { inCategory, publishedWhere } from '@/server/services/posts'
import { getSiteId } from '@/server/services/site'

export const revalidate = 300

export async function generateMetadata(): Promise<Metadata> {
  const settings = await getSettings()
  return buildMetadata({
    title: `${settings.siteName} — ${settings.tagline}`,
    description: settings.description,
    path: '/',
    siteName: settings.siteName,
    titlePattern: '%s',
  })
}

async function getCategorySections(excludeIds: string[]) {
  const siteId = await getSiteId()
  const categories = await getAllCategories()

  const sections = await Promise.all(
    categories.slice(0, 4).map(async (category) => {
      const posts = await prisma.post.findMany({
        where: {
          ...publishedWhere(siteId),
          ...inCategory(category.id),
          id: { notIn: excludeIds },
        },
        select: {
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
          heroImage: { select: { url: true, alt: true, width: true, height: true, blurDataUrl: true } },
          author: { select: { name: true, slug: true } },
        },
        orderBy: { publishedAt: 'desc' },
        take: 4,
      })
      return { category, posts: posts as PostCard[] }
    }),
  )

  return sections.filter((section) => section.posts.length >= 2)
}

export default async function HomePage() {
  const settings = await getSettings()
  const featured = await getFeaturedPosts(5)

  const lead = featured[0]
  const secondary = featured.slice(1, 5)
  const usedIds = featured.map((p) => p.id)

  const [latest, popular, picks] = await Promise.all([
    getLatestPosts({ perPage: 9, excludeIds: usedIds }),
    getPopularPosts(6, usedIds),
    getEditorsPicks(3, usedIds),
  ])

  const sectionExclude = [...usedIds, ...latest.items.map((p) => p.id)]
  const categorySections = await getCategorySections(sectionExclude)

  if (!lead) {
    return (
      <div className="mx-auto max-w-[1280px] px-4 py-24 text-center sm:px-6">
        <h1 className="font-serif text-3xl font-semibold">{settings.siteName}</h1>
        <p className="mt-3 text-[var(--color-muted)]">
          Es sind noch keine Beiträge veröffentlicht. Melden Sie sich im{' '}
          <Link href="/admin" className="underline underline-offset-2">
            Redaktionsbereich
          </Link>{' '}
          an, um zu starten.
        </p>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-[1280px] px-4 sm:px-6">
      <AdSlot id="HOME_TOP" className="mt-6 mb-2" />

      {/* ---------------------------------------------- editorial opener --- */}
      <section className="grid gap-8 border-b border-[var(--color-border)] py-8 lg:grid-cols-[1.7fr_1fr] lg:gap-10 lg:py-10">
        <LeadStoryCard post={lead} priority />

        <div className="flex flex-col gap-5 lg:border-l lg:border-[var(--color-border)] lg:pl-8">
          {secondary.map((post, index) => (
            <div key={post.id} className={index > 0 ? 'border-t border-[var(--color-border)] pt-5' : ''}>
              <HorizontalStoryCard post={post} />
            </div>
          ))}
        </div>
      </section>

      {/* ------------------------------------------------------- latest --- */}
      <section className="py-10">
        <SectionHeading
          title="Neueste Geschichten"
          description="Was zuletzt in der Redaktion fertig geworden ist."
          href="/neueste"
          linkLabel="Alle Geschichten"
        />
        <div className="grid gap-x-6 gap-y-9 sm:grid-cols-2 lg:grid-cols-3">
          {latest.items.slice(0, 6).map((post, index) => (
            <GridStoryCard key={post.id} post={post} priority={index < 3} />
          ))}
        </div>
      </section>

      <AdSlot id="HOME_FEED_1" />

      {/* ------------------------------------------- popular + picks ------ */}
      <section className="grid gap-10 border-t border-[var(--color-border)] py-10 lg:grid-cols-[1fr_20rem] lg:gap-12">
        <div>
          <SectionHeading
            title="Für dich ausgewählt"
            description="Empfehlungen der Redaktion — Geschichten, die etwas länger nachwirken."
          />
          <div className="grid gap-8 sm:grid-cols-3">
            {picks.map((post) => (
              <GridStoryCard key={post.id} post={post} />
            ))}
          </div>

          {latest.items.length > 6 && (
            <div className="mt-10 space-y-5 border-t border-[var(--color-border)] pt-8">
              {latest.items.slice(6, 9).map((post) => (
                <HorizontalStoryCard key={post.id} post={post} />
              ))}
            </div>
          )}
        </div>

        <aside className="lg:border-l lg:border-[var(--color-border)] lg:pl-8">
          <SectionHeading title="Beliebt" href="/beliebt" linkLabel="Mehr" />
          <div className="space-y-3">
            {popular.map((post, index) => (
              <CompactStoryCard key={post.id} post={post} index={index} />
            ))}
          </div>
          <AdSlot id="SIDEBAR" className="mt-8" />
        </aside>
      </section>

      <AdSlot id="HOME_FEED_2" />

      {/* ------------------------------------------------ category rails -- */}
      {categorySections.map((section, index) => {
        const [first, ...rest] = section.posts
        if (!first) return null
        return (
          <section key={section.category.id} className="border-t border-[var(--color-border)] py-10">
            <SectionHeading
              title={section.category.name}
              description={section.category.description || undefined}
              href={`/kategorie/${section.category.slug}`}
            />
            <div className="grid gap-8 lg:grid-cols-[1.2fr_1fr] lg:gap-10">
              {index % 2 === 0 ? (
                <FeaturedStoryCard post={first} />
              ) : (
                <GridStoryCard post={first} />
              )}
              <div className="flex flex-col gap-5">
                {rest.map((post, i) => (
                  <div key={post.id} className={i > 0 ? 'border-t border-[var(--color-border)] pt-5' : ''}>
                    <HorizontalStoryCard post={post} size="compact" />
                  </div>
                ))}
              </div>
            </div>
          </section>
        )
      })}

      <section className="border-t border-[var(--color-border)] py-10">
        <SectionHeading title="Weiterlesen" href="/neueste" />
        <div className="grid gap-x-6 gap-y-9 sm:grid-cols-2 lg:grid-cols-3">
          {latest.items.slice(0, 3).map((post) => (
            <GridStoryCard key={post.id} post={post} />
          ))}
        </div>
        <Pagination page={1} totalPages={latest.totalPages > 1 ? 2 : 1} buildHref={(p) => `/neueste?seite=${p}`} />
      </section>
    </div>
  )
}
