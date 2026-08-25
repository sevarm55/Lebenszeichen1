import Image from 'next/image'
import { Fragment } from 'react'

import { AdSlot } from '@/components/ads/ad-slot'
import type { ArticleDocument, Block } from '@/server/domain/blocks'
import { planAds, type AdDensity } from '@/server/ads/engine'
import { RichText } from './rich-text'

interface ArticleBodyProps {
  document: ArticleDocument
  ads?: {
    enabled: boolean
    density: AdDensity
    minWordsForInline?: number
    minWordsBetween?: number
    maxInContent?: number
  }
  /** Rendered between the ad after the intro and the rest of the body. */
  midArticleSlot?: React.ReactNode
}

/**
 * Renders the article and weaves the ad units in.
 *
 * The positions come from `planAds`, which reads the actual document — so a
 * short story gets one unit and a long read gets several, without an editor
 * having to place anything by hand.
 */
export function ArticleBody({ document, ads, midArticleSlot }: ArticleBodyProps) {
  const plan = planAds(document, {
    enabled: ads?.enabled ?? false,
    density: ads?.density ?? 'balanced',
    minWordsForInline: ads?.minWordsForInline,
    minWordsBetween: ads?.minWordsBetween,
    maxInContent: ads?.maxInContent,
  })

  const inlineAt = new Set(plan.indices)
  // The contextual recommendation goes roughly at the story's midpoint.
  const midIndex = midArticleSlot ? Math.floor(document.blocks.length / 2) : -1

  return (
    <div className="article-body">
      {document.blocks.map((block, index) => (
        <Fragment key={block.id}>
          {inlineAt.has(index) && <AdSlot id="ARTICLE_INLINE" />}
          {index === midIndex && midArticleSlot}
          <BlockView block={block} index={index} />
          {index === 0 && plan.afterIntro && <AdSlot id="ARTICLE_AFTER_INTRO" />}
        </Fragment>
      ))}
    </div>
  )
}

function BlockView({ block, index }: { block: Block; index: number }) {
  switch (block.type) {
    case 'paragraph':
      return (
        <p
          className={
            block.lead
              ? 'mb-6 text-[1.3125rem] font-medium leading-[1.6] text-[var(--color-text)] md:text-[1.4375rem]'
              : 'mb-6'
          }
        >
          <RichText text={block.text} />
        </p>
      )

    case 'heading2':
      return (
        <h2
          id={`abschnitt-${index}`}
          className="mb-4 mt-10 font-serif text-[1.5rem] font-semibold leading-tight tracking-[-0.015em] text-[var(--color-text)] md:text-[1.75rem]"
        >
          {block.text}
        </h2>
      )

    case 'heading3':
      return (
        <h3 className="mb-3 mt-8 font-serif text-xl font-semibold leading-snug text-[var(--color-text)]">
          {block.text}
        </h3>
      )

    case 'image': {
      const ratio =
        block.ratio === '1:1' ? 'aspect-square' : block.ratio === '4:3' ? 'aspect-[4/3]' : 'aspect-[16/9]'
      return (
        <figure className="my-8">
          <div className={`relative overflow-hidden bg-[var(--color-surface-sunken)] ${ratio}`}>
            <Image
              src={block.url}
              alt={block.alt}
              fill
              sizes="(max-width: 768px) 100vw, 700px"
              className="object-cover"
            />
          </div>
          {(block.caption || block.credit) && (
            <figcaption className="mt-2 font-sans text-[0.8125rem] leading-relaxed text-[var(--color-muted)]">
              {block.caption}
              {block.credit && (
                <span className="text-[var(--color-muted-soft)]">
                  {block.caption ? ' · ' : ''}
                  {block.credit}
                </span>
              )}
            </figcaption>
          )}
        </figure>
      )
    }

    case 'gallery':
      return (
        <div className="my-8 grid grid-cols-2 gap-2 sm:grid-cols-3">
          {block.items.map((item, i) => (
            <figure key={`${block.id}-${i}`} className="relative aspect-square overflow-hidden bg-[var(--color-surface-sunken)]">
              <Image
                src={item.url}
                alt={item.alt}
                fill
                sizes="(max-width: 640px) 50vw, 240px"
                className="object-cover"
              />
            </figure>
          ))}
        </div>
      )

    case 'quote':
      return (
        <figure className="my-9 border-l-2 border-[var(--color-accent)] pl-5">
          <blockquote className="font-serif text-[1.3125rem] italic leading-snug text-[var(--color-text)] md:text-[1.4375rem]">
            <RichText text={block.text} />
          </blockquote>
          {block.attribution && (
            <figcaption className="mt-2 font-sans text-[0.8125rem] text-[var(--color-muted)]">
              {block.attribution}
            </figcaption>
          )}
        </figure>
      )

    case 'callout': {
      const tone =
        block.variant === 'warning'
          ? 'border-amber-300 bg-amber-50/60'
          : block.variant === 'context'
            ? 'border-[var(--color-highlight)]/30 bg-[var(--color-highlight)]/5'
            : 'border-[var(--color-border-strong)] bg-[var(--color-surface)]'
      return (
        <aside className={`my-8 border-l-2 px-5 py-4 ${tone}`}>
          {block.title && (
            <p className="mb-1.5 font-sans text-[0.6875rem] font-semibold uppercase tracking-[0.12em] text-[var(--color-muted)]">
              {block.title}
            </p>
          )}
          <p className="font-sans text-[0.9375rem] leading-relaxed text-[var(--color-text-soft)]">
            <RichText text={block.text} />
          </p>
        </aside>
      )
    }

    case 'list': {
      const Tag = block.ordered ? 'ol' : 'ul'
      return (
        <Tag
          className={`mb-6 space-y-2 pl-5 ${block.ordered ? 'list-decimal' : 'list-disc'} marker:text-[var(--color-muted-soft)]`}
        >
          {block.items.map((item, i) => (
            <li key={`${block.id}-${i}`}>
              <RichText text={item} />
            </li>
          ))}
        </Tag>
      )
    }

    case 'embed': {
      const src =
        block.provider === 'vimeo'
          ? `https://player.vimeo.com/video/${block.embedId}`
          : `https://www.youtube-nocookie.com/embed/${block.embedId}`
      return (
        <figure className="my-8">
          <div className="relative aspect-video overflow-hidden bg-black">
            <iframe
              src={src}
              title={block.caption || 'Eingebettetes Video'}
              loading="lazy"
              allow="accelerometer; encrypted-media; gyroscope; picture-in-picture"
              referrerPolicy="strict-origin-when-cross-origin"
              allowFullScreen
              className="absolute inset-0 h-full w-full border-0"
            />
          </div>
          {block.caption && (
            <figcaption className="mt-2 font-sans text-[0.8125rem] text-[var(--color-muted)]">
              {block.caption}
            </figcaption>
          )}
        </figure>
      )
    }

    case 'divider':
      return (
        <hr className="my-10 border-0 border-t border-[var(--color-border)]" />
      )

    case 'ad':
      return <AdSlot id="ARTICLE_INLINE" />

    default:
      return null
  }
}
