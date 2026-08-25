import type { Metadata } from 'next'
import { notFound } from 'next/navigation'

import { AdSlot } from '@/components/ads/ad-slot'
import { Pagination } from '@/components/public/pagination'
import { SectionHeading } from '@/components/public/section-heading'
import {
  CompactStoryCard,
  GridStoryCard,
  HorizontalStoryCard,
  LeadStoryCard,
} from '@/components/public/story-card'
import { collectionJsonLd, breadcrumbJsonLd } from '@/server/seo/jsonld'
import { buildMetadata } from '@/server/seo/metadata'
import { getCategoryBySlug, getLatestPosts, getPopularPosts } from '@/server/services/posts'
import { getAllCategories, getSettings } from '@/server/services/site'

export const revalidate = 300

interface PageProps {
  params: Promise<{ slug: string }>
  searchParams: Promise<{ seite?: string }>
}

export async function generateStaticParams() {
  try {
    const categories = await getAllCategories()
    return categories.map((c) => ({ slug: c.slug }))
  } catch {
    return []
  }
}

export async function generateMetadata({ params, searchParams }: PageProps): Promise<Metadata> {
  const { slug } = await params
  const { seite } = await searchParams
  const category = await getCategoryBySlug(slug)
  if (!category) return { title: 'Nicht gefunden', robots: { index: false, follow: false } }

  const settings = await getSettings()
  const page = Math.max(1, Number(seite ?? '1') || 1)

  return buildMetadata({
    title: category.seoTitle || category.name,
    description: category.metaDescription || category.description || settings.description,
    // Page 2+ canonicalises to itself, so paginated results stay indexable
    // without competing with page 1 for the same query.
    path: page > 1 ? `/kategorie/${category.slug}?seite=${page}` : `/kategorie/${category.slug}`,
    siteName: settings.siteName,
    titlePattern: settings.seoTitlePattern,
  })
}

export default async function CategoryPage({ params, searchParams }: PageProps) {
  const { slug } = await params
  const { seite } = await searchParams
  const page = Math.max(1, Number(seite ?? '1') || 1)

  const category = await getCategoryBySlug(slug)
  if (!category) notFound()

  const settings = await getSettings()
  const result = await getLatestPosts({ page, perPage: settings.postsPerPage, categoryId: category.id })
  const popular = await getPopularPosts(5)

  const jsonLd = [
    collectionJsonLd({
      name: category.name,
      description: category.description,
      path: `/kategorie/${category.slug}`,
    }),
    breadcrumbJsonLd([
      { name: 'Startseite', path: '/' },
      { name: category.name, path: `/kategorie/${category.slug}` },
    ]),
  ]

  const [lead, ...rest] = page === 1 ? result.items : []
  const gridItems = page === 1 ? rest : result.items

  return (
    <div className="mx-auto max-w-[1280px] px-4 sm:px-6">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <header className="border-b border-[var(--color-border)] py-8 sm:py-10">
        <p className="eyebrow">Rubrik</p>
        <h1 className="mt-2 font-serif text-[2rem] font-semibold tracking-[-0.02em] sm:text-[2.5rem]">
          {category.name}
        </h1>
        {(category.intro || category.description) && (
          <p className="mt-3 max-w-2xl text-[0.9375rem] leading-relaxed text-[var(--color-muted)] sm:text-base">
            {category.intro || category.description}
          </p>
        )}
        <p className="mt-3 text-xs text-[var(--color-muted-soft)]">
          {result.total} {result.total === 1 ? 'Beitrag' : 'Beiträge'}
          {result.totalPages > 1 ? ` · Seite ${page} von ${result.totalPages}` : ''}
        </p>
      </header>

      <AdSlot id="CATEGORY_TOP" />

      {result.items.length === 0 ? (
        <div className="py-20 text-center">
          <p className="font-serif text-xl">In dieser Rubrik ist noch nichts erschienen.</p>
          <p className="mt-2 text-sm text-[var(--color-muted)]">
            Schauen Sie später wieder vorbei — oder stöbern Sie in den anderen Rubriken.
          </p>
        </div>
      ) : (
        <div className="lg:grid lg:grid-cols-[minmax(0,1fr)_18rem] lg:gap-12">
          <div className="min-w-0 py-8">
            {lead && (
              <div className="mb-10 border-b border-[var(--color-border)] pb-10">
                <LeadStoryCard post={lead} priority />
              </div>
            )}

            <div className="grid gap-x-6 gap-y-9 sm:grid-cols-2">
              {gridItems.slice(0, 6).map((post, index) => (
                <GridStoryCard key={post.id} post={post} priority={page === 1 && index < 2} />
              ))}
            </div>

            {gridItems.length > 6 && (
              <>
                <AdSlot id="CATEGORY_FEED" />
                <div className="space-y-6 border-t border-[var(--color-border)] pt-8">
                  {gridItems.slice(6).map((post) => (
                    <HorizontalStoryCard key={post.id} post={post} />
                  ))}
                </div>
              </>
            )}

            <Pagination
              page={page}
              totalPages={result.totalPages}
              buildHref={(p) => (p === 1 ? `/kategorie/${category.slug}` : `/kategorie/${category.slug}?seite=${p}`)}
            />
          </div>

          <aside className="border-t border-[var(--color-border)] py-8 lg:border-l lg:border-t-0 lg:pl-8">
            <SectionHeading title="Meistgelesen" />
            <div className="space-y-3">
              {popular.map((post, index) => (
                <CompactStoryCard key={post.id} post={post} index={index} />
              ))}
            </div>
            <AdSlot id="SIDEBAR" className="mt-8" />
          </aside>
        </div>
      )}
    </div>
  )
}
