import type { Metadata } from 'next'

import { AdSlot } from '@/components/ads/ad-slot'
import { Pagination } from '@/components/public/pagination'
import { GridStoryCard, HorizontalStoryCard } from '@/components/public/story-card'
import { buildMetadata } from '@/server/seo/metadata'
import { getLatestPosts } from '@/server/services/posts'
import { getSettings } from '@/server/services/site'

export const revalidate = 120

interface PageProps {
  searchParams: Promise<{ seite?: string }>
}

export async function generateMetadata({ searchParams }: PageProps): Promise<Metadata> {
  const { seite } = await searchParams
  const page = Math.max(1, Number(seite ?? '1') || 1)
  const settings = await getSettings()
  return buildMetadata({
    title: page > 1 ? `Neueste Geschichten — Seite ${page}` : 'Neueste Geschichten',
    description:
      'Alle Veröffentlichungen in chronologischer Reihenfolge — die zuletzt erschienenen Geschichten zuerst.',
    path: page > 1 ? `/neueste?seite=${page}` : '/neueste',
    siteName: settings.siteName,
    titlePattern: settings.seoTitlePattern,
  })
}

export default async function LatestPage({ searchParams }: PageProps) {
  const { seite } = await searchParams
  const page = Math.max(1, Number(seite ?? '1') || 1)
  const settings = await getSettings()
  const result = await getLatestPosts({ page, perPage: settings.postsPerPage })

  return (
    <div className="mx-auto max-w-[1280px] px-4 sm:px-6">
      <header className="border-b border-[var(--color-border)] py-8 sm:py-10">
        <p className="eyebrow">Chronologisch</p>
        <h1 className="mt-2 font-serif text-[2rem] font-semibold tracking-[-0.02em] sm:text-[2.5rem]">
          Neueste Geschichten
        </h1>
        <p className="mt-3 text-xs text-[var(--color-muted-soft)]">
          {result.total} Beiträge{result.totalPages > 1 ? ` · Seite ${page} von ${result.totalPages}` : ''}
        </p>
      </header>

      <AdSlot id="CATEGORY_TOP" />

      {result.items.length === 0 ? (
        <p className="py-20 text-center text-[var(--color-muted)]">Noch keine Beiträge veröffentlicht.</p>
      ) : (
        <div className="py-8">
          <div className="grid gap-x-6 gap-y-9 sm:grid-cols-2 lg:grid-cols-3">
            {result.items.slice(0, 6).map((post, index) => (
              <GridStoryCard key={post.id} post={post} priority={page === 1 && index < 3} />
            ))}
          </div>

          {result.items.length > 6 && (
            <>
              <AdSlot id="CATEGORY_FEED" />
              <div className="space-y-6 border-t border-[var(--color-border)] pt-8">
                {result.items.slice(6).map((post) => (
                  <HorizontalStoryCard key={post.id} post={post} />
                ))}
              </div>
            </>
          )}

          <Pagination
            page={page}
            totalPages={result.totalPages}
            buildHref={(p) => (p === 1 ? '/neueste' : `/neueste?seite=${p}`)}
          />
        </div>
      )}
    </div>
  )
}
