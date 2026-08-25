import Image from 'next/image'
import Link from 'next/link'

import type { PostCard } from '@/server/services/posts'
import { cn, formatDateDe } from '@/lib/utils'

/**
 * One data model, six presentations.
 *
 * The homepage stays readable because the eye can tell hierarchy at a glance —
 * that only works if cards genuinely differ in size and structure rather than
 * being the same rectangle repeated forty times.
 */

export function postHref(post: Pick<PostCard, 'slug' | 'category'>): string {
  return `/${post.category.slug}/${post.slug}`
}

function Meta({
  post,
  className,
  showCategory = true,
}: {
  post: PostCard
  className?: string
  showCategory?: boolean
}) {
  return (
    <div className={cn('flex flex-wrap items-center gap-x-2 gap-y-1 text-[0.8125rem]', className)}>
      {showCategory && (
        <Link
          href={`/kategorie/${post.category.slug}`}
          className="eyebrow hover:text-[var(--color-accent-hover)]"
        >
          {post.category.name}
        </Link>
      )}
      {post.publishedAt && (
        <>
          {showCategory && <span className="text-[var(--color-muted-soft)]">·</span>}
          <time dateTime={post.publishedAt.toISOString()} className="text-[var(--color-muted)]">
            {formatDateDe(post.publishedAt)}
          </time>
        </>
      )}
      {post.readingTime > 0 && (
        <>
          <span className="text-[var(--color-muted-soft)]">·</span>
          <span className="text-[var(--color-muted)]">{post.readingTime} Min.</span>
        </>
      )}
    </div>
  )
}

function Cover({
  post,
  sizes,
  priority,
  className,
  ratio = 'aspect-[16/10]',
}: {
  post: PostCard
  sizes: string
  priority?: boolean
  className?: string
  ratio?: string
}) {
  return (
    <div className={cn('relative overflow-hidden bg-[var(--color-surface-sunken)]', ratio, className)}>
      {post.heroImage?.url ? (
        <Image
          src={post.heroImage.url}
          alt={post.heroImage.alt || post.title}
          fill
          sizes={sizes}
          priority={priority}
          placeholder={post.heroImage.blurDataUrl ? 'blur' : 'empty'}
          blurDataURL={post.heroImage.blurDataUrl ?? undefined}
          className="object-cover transition-transform duration-500 group-hover:scale-[1.03]"
        />
      ) : (
        <div className="flex h-full w-full items-center justify-center">
          <span className="font-serif text-2xl text-[var(--color-muted-soft)]">
            {post.category.name.charAt(0)}
          </span>
        </div>
      )}
    </div>
  )
}

/** The single biggest story on a page. */
export function LeadStoryCard({ post, priority }: { post: PostCard; priority?: boolean }) {
  return (
    <article className="group">
      <Link href={postHref(post)} className="block">
        <Cover
          post={post}
          priority={priority}
          ratio="aspect-[16/9]"
          sizes="(max-width: 1024px) 100vw, 66vw"
        />
      </Link>
      <div className="mt-4">
        <Meta post={post} />
        <h2 className="mt-2 font-serif text-[1.75rem] font-semibold leading-[1.15] tracking-[-0.015em] sm:text-[2.25rem] lg:text-[2.6rem]">
          <Link href={postHref(post)} className="story-link">
            {post.title}
          </Link>
        </h2>
        {post.excerpt && (
          <p className="mt-3 max-w-2xl text-base leading-[1.65] text-[var(--color-text-soft)] sm:text-[1.0625rem]">
            {post.excerpt}
          </p>
        )}
      </div>
    </article>
  )
}

/** Image left, text right. Used in secondary rails and category lists. */
export function HorizontalStoryCard({
  post,
  size = 'default',
}: {
  post: PostCard
  size?: 'default' | 'compact'
}) {
  const isCompact = size === 'compact'
  return (
    <article className="group flex gap-4">
      <Link href={postHref(post)} className={cn('shrink-0', isCompact ? 'w-24' : 'w-32 sm:w-44')}>
        <Cover
          post={post}
          ratio="aspect-[4/3]"
          sizes={isCompact ? '96px' : '(max-width: 640px) 128px, 176px'}
        />
      </Link>
      <div className="min-w-0 flex-1">
        <Meta post={post} className="mb-1.5" />
        <h3
          className={cn(
            'font-serif font-semibold leading-snug tracking-[-0.01em]',
            isCompact ? 'text-[1.0625rem]' : 'text-[1.0625rem] sm:text-xl',
          )}
        >
          <Link href={postHref(post)} className="story-link">
            {post.title}
          </Link>
        </h3>
        {!isCompact && post.excerpt && (
          <p className="mt-1.5 hidden text-[0.9375rem] leading-[1.6] text-[var(--color-muted)] sm:line-clamp-2 sm:block">
            {post.excerpt}
          </p>
        )}
      </div>
    </article>
  )
}

/** Standard grid tile. */
export function GridStoryCard({ post, priority }: { post: PostCard; priority?: boolean }) {
  return (
    <article className="group flex flex-col">
      <Link href={postHref(post)}>
        <Cover post={post} priority={priority} sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw" />
      </Link>
      <div className="mt-3 flex flex-1 flex-col">
        <Meta post={post} className="mb-1.5" />
        <h3 className="font-serif text-xl font-semibold leading-snug tracking-[-0.01em]">
          <Link href={postHref(post)} className="story-link">
            {post.title}
          </Link>
        </h3>
        {post.excerpt && (
          <p className="mt-2 line-clamp-3 text-[0.9375rem] leading-[1.6] text-[var(--color-muted)]">
            {post.excerpt}
          </p>
        )}
      </div>
    </article>
  )
}

/** No image, numbered — for "most read" rails. */
export function CompactStoryCard({ post, index }: { post: PostCard; index?: number }) {
  return (
    <article className="group flex gap-3 border-t border-[var(--color-border)] pt-3 first:border-t-0 first:pt-0">
      {typeof index === 'number' && (
        <span className="font-serif text-2xl font-semibold leading-none text-[var(--color-border-strong)]">
          {String(index + 1).padStart(2, '0')}
        </span>
      )}
      <div className="min-w-0">
        <h3 className="font-serif text-base font-semibold leading-snug">
          <Link href={postHref(post)} className="story-link">
            {post.title}
          </Link>
        </h3>
        <Meta post={post} className="mt-1" showCategory />
      </div>
    </article>
  )
}

/** Text over image — used once per page at most, for a section opener. */
export function FeaturedStoryCard({ post }: { post: PostCard }) {
  return (
    <article className="group relative isolate overflow-hidden">
      <Link href={postHref(post)} className="block">
        <div className="relative aspect-[4/5] sm:aspect-[16/10]">
          {post.heroImage?.url ? (
            <Image
              src={post.heroImage.url}
              alt={post.heroImage.alt || post.title}
              fill
              sizes="(max-width: 1024px) 100vw, 50vw"
              placeholder={post.heroImage.blurDataUrl ? 'blur' : 'empty'}
              blurDataURL={post.heroImage.blurDataUrl ?? undefined}
              className="object-cover transition-transform duration-500 group-hover:scale-[1.03]"
            />
          ) : (
            <div className="h-full w-full bg-[var(--color-surface-sunken)]" />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/25 to-transparent" />
        </div>
        <div className="absolute inset-x-0 bottom-0 p-5 sm:p-6">
          <span className="eyebrow text-white/80">{post.category.name}</span>
          <h3 className="mt-2 max-w-xl font-serif text-xl font-semibold leading-tight text-white sm:text-2xl">
            {post.title}
          </h3>
        </div>
      </Link>
    </article>
  )
}

/** Sidebar rail item. */
export function SidebarStoryCard({ post }: { post: PostCard }) {
  return (
    <article className="group border-t border-[var(--color-border)] pt-3 first:border-t-0 first:pt-0">
      <Link href={postHref(post)} className="flex gap-3">
        <div className="min-w-0 flex-1">
          <span className="eyebrow eyebrow-muted">{post.category.name}</span>
          <h3 className="mt-1 font-serif text-base font-semibold leading-snug story-link">
            {post.title}
          </h3>
        </div>
        <div className="w-16 shrink-0">
          <Cover post={post} ratio="aspect-square" sizes="64px" />
        </div>
      </Link>
    </article>
  )
}
