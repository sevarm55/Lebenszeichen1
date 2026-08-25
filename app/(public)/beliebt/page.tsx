import type { Metadata } from 'next'

import { AdSlot } from '@/components/ads/ad-slot'
import { GridStoryCard, HorizontalStoryCard } from '@/components/public/story-card'
import { buildMetadata } from '@/server/seo/metadata'
import { getPopularPosts } from '@/server/services/posts'
import { getSettings } from '@/server/services/site'

export const revalidate = 600

export async function generateMetadata(): Promise<Metadata> {
  const settings = await getSettings()
  return buildMetadata({
    title: 'Beliebte Geschichten',
    description: 'Die Beiträge, die unsere Leserinnen und Leser in den letzten Wochen am häufigsten gelesen haben.',
    path: '/beliebt',
    siteName: settings.siteName,
    titlePattern: settings.seoTitlePattern,
  })
}

export default async function PopularPage() {
  const posts = await getPopularPosts(24)

  return (
    <div className="mx-auto max-w-[1280px] px-4 sm:px-6">
      <header className="border-b border-[var(--color-border)] py-8 sm:py-10">
        <p className="eyebrow">Meistgelesen</p>
        <h1 className="mt-2 font-serif text-[2rem] font-semibold tracking-[-0.02em] sm:text-[2.5rem]">
          Beliebte Geschichten
        </h1>
        <p className="mt-3 max-w-2xl text-[0.9375rem] text-[var(--color-muted)]">
          Was in den vergangenen Wochen am häufigsten gelesen wurde.
        </p>
      </header>

      <AdSlot id="CATEGORY_TOP" />

      {posts.length === 0 ? (
        <p className="py-20 text-center text-[var(--color-muted)]">Noch keine Beiträge veröffentlicht.</p>
      ) : (
        <div className="py-8">
          <div className="grid gap-x-6 gap-y-9 sm:grid-cols-2 lg:grid-cols-3">
            {posts.slice(0, 6).map((post, index) => (
              <GridStoryCard key={post.id} post={post} priority={index < 3} />
            ))}
          </div>
          {posts.length > 6 && (
            <>
              <AdSlot id="CATEGORY_FEED" />
              <div className="space-y-6 border-t border-[var(--color-border)] pt-8">
                {posts.slice(6).map((post) => (
                  <HorizontalStoryCard key={post.id} post={post} />
                ))}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  )
}
