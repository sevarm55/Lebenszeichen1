import Image from 'next/image'
import Link from 'next/link'
import { notFound } from 'next/navigation'

import { AdRuntimeProvider } from '@/components/ads/ad-context'
import { ArticleBody } from '@/components/public/article-body'
import { PreviewToolbar } from '@/components/admin/preview-toolbar'
import { formatDateDe } from '@/lib/utils'
import { parseDocument } from '@/server/domain/blocks'
import { describePlan, planAds, type AdDensity } from '@/server/ads/engine'
import { buildAdRuntime } from '@/server/ads/runtime'
import { requireUser } from '@/server/auth/guard'
import { getPostByIdForPreview } from '@/server/services/posts'
import { getSettings } from '@/server/services/site'

export const dynamic = 'force-dynamic'

/**
 * Authenticated preview.
 *
 * Renders drafts exactly as the public article page does — same typography,
 * same reading measure, same ad engine — but behind `requireUser` and with
 * `noindex`, so an unpublished piece can never be reached or crawled.
 */
export const metadata = {
  robots: { index: false, follow: false, nocache: true },
}

export default async function PreviewPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ ads?: string }>
}) {
  await requireUser()
  const { id } = await params
  const { ads } = await searchParams

  const post = await getPostByIdForPreview(id)
  if (!post) notFound()

  const settings = await getSettings()
  const document = parseDocument(post.content)
  const showAds = ads === '1'

  // Preview always renders labelled boxes, never live ad code — loading real
  // AdSense in an editor's browser generates invalid impressions.
  const runtime = await buildAdRuntime({ preview: true })
  const previewRuntime = { ...runtime, enabled: false, preview: showAds }

  const plan = planAds(document, {
    enabled: true,
    density: settings.adsDensity as AdDensity,
    minWordsForInline: settings.adsMinWordsForInline,
    minWordsBetween: settings.adsMinWordsBetween,
    maxInContent: settings.adsMaxInContent,
  })

  return (
    <AdRuntimeProvider value={previewRuntime}>
      <PreviewToolbar
        postId={post.id}
        status={post.status}
        showAds={showAds}
        adSummary={describePlan(plan)}
      />

      <div className="bg-[var(--color-background)] pb-16" style={{ colorScheme: 'light' }}>
        <article className="mx-auto max-w-[1280px] px-4 sm:px-6">
          <div className="reading-column pt-8">
            <Link href={`/kategorie/${post.category.slug}`} className="eyebrow">
              {post.category.name}
            </Link>
            <h1 className="mt-3 font-serif text-[2rem] font-semibold leading-[1.12] tracking-[-0.02em] sm:text-[2.5rem] lg:text-[3rem]">
              {post.title || '(без заголовка)'}
            </h1>
            {post.subtitle && (
              <p className="mt-4 font-serif text-lg leading-snug text-[var(--color-muted)] sm:text-xl">
                {post.subtitle}
              </p>
            )}
            <div className="mt-5 flex flex-wrap items-center gap-3 border-t border-[var(--color-border)] pt-4 text-[0.8125rem] text-[var(--color-muted)]">
              {post.author && <span>Von {post.author.name}</span>}
              <span>{formatDateDe(post.publishedAt ?? post.updatedAt, { withTime: true })}</span>
              {post.readingTime > 0 && <span>{post.readingTime} Min. Lesezeit</span>}
              <span>{post.wordCount} Wörter</span>
            </div>
          </div>

          {post.heroImage && (
            <figure className="mt-7">
              <div className="relative aspect-[16/9] overflow-hidden bg-[var(--color-surface-sunken)]">
                <Image
                  src={post.heroImage.url}
                  alt={post.heroImage.alt || post.title}
                  fill
                  sizes="(max-width: 1024px) 100vw, 900px"
                  className="object-cover"
                />
              </div>
              {(post.heroImage.caption || post.heroImage.credit) && (
                <figcaption className="mt-2 text-[0.8125rem] text-[var(--color-muted)]">
                  {post.heroImage.caption}
                  {post.heroImage.credit ? ` · ${post.heroImage.credit}` : ''}
                </figcaption>
              )}
            </figure>
          )}

          <div className="reading-column mt-8">
            <ArticleBody
              document={document}
              ads={{
                enabled: showAds,
                density: settings.adsDensity as AdDensity,
                minWordsForInline: settings.adsMinWordsForInline,
                minWordsBetween: settings.adsMinWordsBetween,
                maxInContent: settings.adsMaxInContent,
              }}
            />
          </div>
        </article>
      </div>
    </AdRuntimeProvider>
  )
}
