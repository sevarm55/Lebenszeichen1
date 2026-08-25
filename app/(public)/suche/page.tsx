import type { Metadata } from 'next'
import Link from 'next/link'

import { AdSlot } from '@/components/ads/ad-slot'
import { Pagination } from '@/components/public/pagination'
import { HorizontalStoryCard } from '@/components/public/story-card'
import { buildMetadata } from '@/server/seo/metadata'
import { searchPosts } from '@/server/services/posts'
import { getAllCategories, getSettings } from '@/server/services/site'

export const dynamic = 'force-dynamic'

interface PageProps {
  searchParams: Promise<{ q?: string; seite?: string }>
}

export async function generateMetadata({ searchParams }: PageProps): Promise<Metadata> {
  const { q } = await searchParams
  const settings = await getSettings()
  return buildMetadata({
    title: q ? `Suche: ${q}` : 'Suche',
    description: 'Durchsuchen Sie alle veröffentlichten Geschichten.',
    path: '/suche',
    // Search result pages must never enter the index — thousands of thin,
    // near-duplicate URLs is exactly what Google penalises.
    noindex: true,
    siteName: settings.siteName,
    titlePattern: settings.seoTitlePattern,
  })
}

export default async function SearchPage({ searchParams }: PageProps) {
  const { q, seite } = await searchParams
  const query = (q ?? '').trim()
  const page = Math.max(1, Number(seite ?? '1') || 1)
  const settings = await getSettings()
  const categories = await getAllCategories()

  const result = query
    ? await searchPosts(query, page, settings.postsPerPage)
    : { items: [], total: 0, page: 1, perPage: settings.postsPerPage, totalPages: 1 }

  return (
    <div className="mx-auto max-w-[1280px] px-4 sm:px-6">
      <header className="border-b border-[var(--color-border)] py-8 sm:py-10">
        <h1 className="font-serif text-[2rem] font-semibold tracking-[-0.02em] sm:text-[2.5rem]">Suche</h1>
        <form action="/suche" method="get" className="mt-5 flex max-w-xl gap-2">
          <label htmlFor="search-input" className="sr-only">
            Suchbegriff
          </label>
          <input
            id="search-input"
            name="q"
            type="search"
            defaultValue={query}
            placeholder="Wonach suchen Sie?"
            className="h-10 flex-1 rounded-sm border border-[var(--color-border-strong)] bg-[var(--color-surface)] px-3 text-sm"
          />
          <button
            type="submit"
            className="h-10 rounded-sm bg-[var(--color-text)] px-4 text-sm font-medium text-white"
          >
            Suchen
          </button>
        </form>
        {query && (
          <p className="mt-3 text-sm text-[var(--color-muted)]">
            {result.total} {result.total === 1 ? 'Treffer' : 'Treffer'} für „{query}“
          </p>
        )}
      </header>

      <AdSlot id="SEARCH_TOP" />

      <div className="py-8">
        {!query ? (
          <div className="py-12">
            <p className="text-[var(--color-muted)]">Geben Sie einen Suchbegriff ein.</p>
            <p className="eyebrow eyebrow-muted mt-8 mb-3">Rubriken durchstöbern</p>
            <div className="flex flex-wrap gap-2">
              {categories.map((category) => (
                <Link
                  key={category.id}
                  href={`/kategorie/${category.slug}`}
                  className="rounded-sm border border-[var(--color-border-strong)] px-3 py-1.5 text-sm hover:border-[var(--color-accent)] hover:text-[var(--color-accent)]"
                >
                  {category.name}
                </Link>
              ))}
            </div>
          </div>
        ) : result.items.length === 0 ? (
          <div className="py-12">
            <p className="font-serif text-xl">Keine Treffer für „{query}“.</p>
            <p className="mt-2 text-sm text-[var(--color-muted)]">
              Versuchen Sie einen kürzeren oder allgemeineren Begriff.
            </p>
            <p className="eyebrow eyebrow-muted mt-8 mb-3">Oder stöbern Sie hier</p>
            <div className="flex flex-wrap gap-2">
              {categories.map((category) => (
                <Link
                  key={category.id}
                  href={`/kategorie/${category.slug}`}
                  className="rounded-sm border border-[var(--color-border-strong)] px-3 py-1.5 text-sm hover:border-[var(--color-accent)] hover:text-[var(--color-accent)]"
                >
                  {category.name}
                </Link>
              ))}
            </div>
          </div>
        ) : (
          <>
            <div className="space-y-6">
              {result.items.map((post) => (
                <HorizontalStoryCard key={post.id} post={post} />
              ))}
            </div>
            <Pagination
              page={page}
              totalPages={result.totalPages}
              buildHref={(p) => `/suche?q=${encodeURIComponent(query)}&seite=${p}`}
            />
          </>
        )}
      </div>
    </div>
  )
}
