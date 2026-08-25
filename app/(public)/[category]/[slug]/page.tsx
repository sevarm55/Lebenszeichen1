import type { Metadata } from 'next'
import Image from 'next/image'
import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'

import { AdSlot } from '@/components/ads/ad-slot'
import { ArticleBody } from '@/components/public/article-body'
import { ReadingTracker } from '@/components/public/reading-tracker'
import { ShareBar } from '@/components/public/share-bar'
import { SectionHeading } from '@/components/public/section-heading'
import {
  CompactStoryCard,
  GridStoryCard,
  HorizontalStoryCard,
} from '@/components/public/story-card'
import { prisma } from '@/lib/prisma'
import { formatDateDe } from '@/lib/utils'
import { parseDocument } from '@/server/domain/blocks'
import type { AdDensity } from '@/server/ads/engine'
import { articleJsonLd, breadcrumbJsonLd } from '@/server/seo/jsonld'
import { buildMetadata } from '@/server/seo/metadata'
import { buildAdRuntime } from '@/server/ads/runtime'
import { getPopularPosts, getPostBySlug, getRelatedPosts } from '@/server/services/posts'
import { getSettings, getSiteId } from '@/server/services/site'
import { siteConfig } from '@/config/site'

export const revalidate = 600

interface PageProps {
  params: Promise<{ category: string; slug: string }>
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { category, slug } = await params
  const post = await getPostBySlug(slug)

  // `notFound()` and `redirect()` have to be raised here, not only in the page
  // component. By the time the component runs, metadata has resolved and the
  // response has started streaming — Next can then only emit a *soft* 404 or a
  // client-side redirect, and a soft 404 gets indexed. Raising it during
  // metadata produces a real 404 / 301. `getPostBySlug` is React-cached, so
  // this costs no extra query.
  // `return` rather than a bare call so TypeScript narrows `post` afterwards;
  // the helper's return type is `Promise<never>`.
  if (!post) return redirectOrNotFound(category, slug)

  if (post.category.slug !== category) {
    redirect(`/${post.category.slug}/${post.slug}`)
  }

  const settings = await getSettings()
  const image = post.ogImage ?? post.heroImage

  return buildMetadata({
    title: post.seoTitle || post.title,
    description: post.metaDescription || post.excerpt,
    path: `/${post.category.slug}/${post.slug}`,
    canonicalOverride: post.canonicalUrl || undefined,
    type: 'article',
    image: image ? { url: image.url, width: image.width, height: image.height, alt: post.title } : null,
    publishedAt: post.publishedAt,
    updatedAt: post.updatedAt,
    authorName: post.author?.name ?? null,
    section: post.category.name,
    tags: post.tags.map((t) => t.tag.name),
    siteName: settings.siteName,
    titlePattern: settings.seoTitlePattern,
  })
}

export async function generateStaticParams() {
  // Pre-render only the most recent stories; everything older is rendered on
  // demand and then cached. Building 10k pages on every deploy is wasted time.
  try {
    const siteId = await getSiteId()
    const posts = await prisma.post.findMany({
      where: { siteId, status: 'PUBLISHED' },
      select: { slug: true, category: { select: { slug: true } } },
      orderBy: { publishedAt: 'desc' },
      take: 50,
    })
    return posts.map((p) => ({ category: p.category.slug, slug: p.slug }))
  } catch {
    return []
  }
}

/**
 * Honours the redirect table before giving up, then 404s.
 *
 * Middleware already serves slug-change redirects as hard 301s; this is the
 * fallback for client-side navigations, which bypass middleware.
 */
async function redirectOrNotFound(categorySlug: string, slug: string): Promise<never> {
  const siteId = await getSiteId()
  const redirectRow = await prisma.postRedirect.findUnique({
    where: { siteId_fromPath: { siteId, fromPath: `/${categorySlug}/${slug}` } },
  })
  if (redirectRow) redirect(redirectRow.toPath)
  notFound()
}

export default async function ArticlePage({ params }: PageProps) {
  const { category: categorySlug, slug } = await params
  const post = await getPostBySlug(slug)

  if (!post) return redirectOrNotFound(categorySlug, slug)

  // Correct category in the URL is part of the canonical shape — a mismatch is
  // a redirect, not a second valid URL for the same story.
  if (post.category.slug !== categorySlug) {
    redirect(`/${post.category.slug}/${post.slug}`)
  }

  const settings = await getSettings()
  const adRuntime = await buildAdRuntime()
  const document = parseDocument(post.content)

  const [related, popular] = await Promise.all([
    getRelatedPosts(post, 6),
    getPopularPosts(5, [post.id]),
  ])

  const url = `${siteConfig.url}/${post.category.slug}/${post.slug}`
  const wasUpdated =
    post.publishedAt && post.updatedAt.getTime() - post.publishedAt.getTime() > 6 * 60 * 60 * 1000

  const breadcrumbs = [
    { name: 'Startseite', path: '/' },
    { name: post.category.name, path: `/kategorie/${post.category.slug}` },
    { name: post.title, path: `/${post.category.slug}/${post.slug}` },
  ]

  const jsonLd = [
    articleJsonLd({
      title: post.title,
      description: post.metaDescription || post.excerpt,
      path: `/${post.category.slug}/${post.slug}`,
      image: post.heroImage?.url ?? null,
      publishedAt: post.publishedAt,
      updatedAt: post.updatedAt,
      authorName: post.author?.name ?? null,
      section: post.category.name,
      siteName: settings.siteName,
      wordCount: post.wordCount,
    }),
    breadcrumbJsonLd(breadcrumbs),
  ]

  const contextualRecommendation = related[0] ? (
    <aside className="my-9 border-y border-[var(--color-border)] py-5">
      <p className="eyebrow eyebrow-muted mb-3">Passend dazu</p>
      <HorizontalStoryCard post={related[0]} size="compact" />
    </aside>
  ) : null

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <ReadingTracker postId={post.id} slug={post.slug} category={post.category.slug} />

      <article className="mx-auto max-w-[1280px] px-4 sm:px-6">
        <div className="lg:grid lg:grid-cols-[minmax(0,1fr)_20rem] lg:gap-12">
          <div className="min-w-0">
            {/* ------------------------------------------------ header --- */}
            <header className="pt-6 sm:pt-8">
              <nav aria-label="Brotkrumen" className="mb-4 flex flex-wrap items-center gap-1.5 text-xs text-[var(--color-muted)]">
                <Link href="/" className="hover:text-[var(--color-accent)]">
                  Startseite
                </Link>
                <span aria-hidden>›</span>
                <Link href={`/kategorie/${post.category.slug}`} className="hover:text-[var(--color-accent)]">
                  {post.category.name}
                </Link>
              </nav>

              <div className="reading-column">
                <Link href={`/kategorie/${post.category.slug}`} className="eyebrow">
                  {post.category.name}
                </Link>

                <h1 className="mt-3 font-serif text-[2rem] font-semibold leading-[1.12] tracking-[-0.02em] sm:text-[2.5rem] lg:text-[3rem]">
                  {post.title}
                </h1>

                <div className="mt-5 flex flex-wrap items-center gap-x-3 gap-y-2 border-t border-[var(--color-border)] pt-4 text-[0.8125rem] text-[var(--color-muted)]">
                  {post.author && (
                    <span className="text-[var(--color-text-soft)]">
                      Von <span className="font-medium">{post.author.name}</span>
                      {post.author.role && (
                        <span className="text-[var(--color-muted)]"> · {post.author.role}</span>
                      )}
                    </span>
                  )}
                  {post.publishedAt && (
                    <time dateTime={post.publishedAt.toISOString()}>
                      {formatDateDe(post.publishedAt, { withTime: true })}
                    </time>
                  )}
                  {wasUpdated && (
                    <span className="text-[var(--color-muted-soft)]">
                      Aktualisiert: {formatDateDe(post.updatedAt)}
                    </span>
                  )}
                  {post.readingTime > 0 && <span>{post.readingTime} Min. Lesezeit</span>}
                </div>
              </div>
            </header>

            {/* -------------------------------------------- hero image --- */}
            {post.heroImage && (
              <figure className="mt-7">
                <div className="relative aspect-[16/9] overflow-hidden bg-[var(--color-surface-sunken)]">
                  <Image
                    src={post.heroImage.url}
                    alt={post.heroImage.alt || post.title}
                    fill
                    priority
                    sizes="(max-width: 1024px) 100vw, 900px"
                    placeholder={post.heroImage.blurDataUrl ? 'blur' : 'empty'}
                    blurDataURL={post.heroImage.blurDataUrl ?? undefined}
                    className="object-cover"
                  />
                </div>
                {(post.heroImage.caption || post.heroImage.credit) && (
                  <figcaption className="mt-2 text-[0.8125rem] text-[var(--color-muted)]">
                    {post.heroImage.caption}
                    {post.heroImage.credit && (
                      <span className="text-[var(--color-muted-soft)]">
                        {post.heroImage.caption ? ' · ' : ''}
                        {post.heroImage.credit}
                      </span>
                    )}
                  </figcaption>
                )}
              </figure>
            )}

            {/* -------------------------------------------------- body --- */}
            <div className="reading-column mt-8">
              <ShareBar url={url} title={post.socialHeadline || post.title} className="mb-8" />

              <ArticleBody
                document={document}
                ads={{
                  // In preview mode (development, admin preview) the engine still
                  // runs so the placement pattern is visible without live ads.
                  enabled: adRuntime.enabled || adRuntime.preview,
                  density: settings.adsDensity as AdDensity,
                  minWordsForInline: settings.adsMinWordsForInline,
                  minWordsBetween: settings.adsMinWordsBetween,
                  maxInContent: settings.adsMaxInContent,
                }}
                midArticleSlot={contextualRecommendation}
              />

              {/* --------------------------------------- provenance ----- */}
              {(post.sourceUrl || post.aiUsed || post.author?.isDemo) && (
                <div className="mt-10 border-t border-[var(--color-border)] pt-5 text-[0.8125rem] leading-relaxed text-[var(--color-muted)]">
                  {post.sourceNote && <p className="mb-1">{post.sourceNote}</p>}
                  {post.sourceUrl && post.sourceDomain && (
                    <p>
                      Recherchehinweis: Für diesen Beitrag wurde unter anderem Material von{' '}
                      <a
                        href={post.sourceUrl}
                        target="_blank"
                        rel="noopener noreferrer nofollow"
                        className="underline underline-offset-2"
                      >
                        {post.sourceDomain}
                      </a>{' '}
                      ausgewertet.
                    </p>
                  )}
                  {post.author?.isDemo && (
                    <p className="mt-1">
                      Hinweis: Dieser Beitrag ist Demo-Inhalt und beschreibt keine realen Personen.
                    </p>
                  )}
                </div>
              )}

              {post.tags.length > 0 && (
                <div className="mt-8 flex flex-wrap gap-2">
                  {post.tags.map(({ tag }) => (
                    <span
                      key={tag.slug}
                      className="rounded-sm border border-[var(--color-border)] px-2 py-1 text-xs text-[var(--color-muted)]"
                    >
                      {tag.name}
                    </span>
                  ))}
                </div>
              )}

              <ShareBar url={url} title={post.socialHeadline || post.title} className="mt-8" />
            </div>

            <AdSlot id="ARTICLE_END" />

            {/* ---------------------------------------------- related --- */}
            {related.length > 0 && (
              <section className="mt-10 border-t border-[var(--color-border)] pt-8">
                <SectionHeading title="Das könnte dich auch interessieren" />
                <div className="grid gap-x-6 gap-y-8 sm:grid-cols-2 lg:grid-cols-3">
                  {related.slice(0, 6).map((item) => (
                    <GridStoryCard key={item.id} post={item} />
                  ))}
                </div>
              </section>
            )}

            <section className="mt-10 border-t border-[var(--color-border)] pt-8">
              <SectionHeading
                title={`Mehr aus ${post.category.name}`}
                href={`/kategorie/${post.category.slug}`}
              />
              <div className="space-y-5">
                {related.slice(0, 3).map((item) => (
                  <HorizontalStoryCard key={`more-${item.id}`} post={item} />
                ))}
              </div>
            </section>
          </div>

          {/* -------------------------------------------------- sidebar --- */}
          <aside className="mt-12 lg:mt-8 lg:border-l lg:border-[var(--color-border)] lg:pl-8">
            <div className="lg:sticky lg:top-20">
              <SectionHeading title="Beliebt" href="/beliebt" linkLabel="Mehr" />
              <div className="space-y-3">
                {popular.map((item, index) => (
                  <CompactStoryCard key={item.id} post={item} index={index} />
                ))}
              </div>
              <AdSlot id="SIDEBAR_STICKY" className="mt-8" />
            </div>
          </aside>
        </div>
      </article>
    </>
  )
}
