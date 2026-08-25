import type { Metadata } from 'next'

import { siteConfig } from '@/config/site'
import { truncate } from '@/lib/utils'

export interface SeoInput {
  title: string
  description: string
  path: string
  image?: { url: string; width?: number; height?: number; alt?: string } | null
  type?: 'website' | 'article'
  publishedAt?: Date | string | null
  updatedAt?: Date | string | null
  authorName?: string | null
  section?: string | null
  tags?: string[]
  noindex?: boolean
  canonicalOverride?: string
  siteName?: string
  titlePattern?: string
}

function absolute(path: string): string {
  if (/^https?:\/\//i.test(path)) return path
  return `${siteConfig.url}${path.startsWith('/') ? path : `/${path}`}`
}

function applyPattern(pattern: string, title: string, siteName: string): string {
  if (!pattern) return title
  return pattern.replace('%s', title).replace('{siteName}', siteName)
}

/**
 * One metadata builder for every public page.
 *
 * Two things it deliberately guarantees:
 *  - the canonical URL never carries query strings, so UTM-tagged Facebook
 *    traffic cannot split a page's ranking signals across a dozen URLs;
 *  - an OG image is always emitted, falling back to the site default, because a
 *    Facebook share without an image loses most of its click-through.
 */
export function buildMetadata(input: SeoInput): Metadata {
  const siteName = input.siteName ?? siteConfig.name
  const rawTitle = input.title.trim() || siteName
  const fullTitle = applyPattern(input.titlePattern ?? '%s | {siteName}', rawTitle, siteName)
  const description = truncate(input.description.trim() || siteConfig.description, 300)
  const canonical = input.canonicalOverride?.trim() || absolute(input.path)

  const image = input.image?.url
    ? {
        url: absolute(input.image.url),
        width: input.image.width || 1200,
        height: input.image.height || 675,
        alt: input.image.alt || rawTitle,
      }
    : {
        url: absolute('/og-default.png'),
        width: 1200,
        height: 630,
        alt: siteName,
      }

  const metadata: Metadata = {
    // `absolute` stops the root layout's `%s | {siteName}` template from being
    // applied a second time on top of our own pattern.
    title: { absolute: fullTitle },
    description,
    alternates: { canonical },
    openGraph: {
      type: input.type ?? 'website',
      siteName,
      title: rawTitle,
      description,
      url: canonical,
      locale: 'de_DE',
      images: [image],
    },
    twitter: {
      card: 'summary_large_image',
      title: rawTitle,
      description,
      images: [image.url],
    },
  }

  if (input.noindex) {
    metadata.robots = { index: false, follow: false, nocache: true }
  } else {
    metadata.robots = {
      index: true,
      follow: true,
      googleBot: {
        index: true,
        follow: true,
        'max-image-preview': 'large',
        'max-snippet': -1,
        'max-video-preview': -1,
      },
    }
  }

  if (input.type === 'article') {
    metadata.openGraph = {
      ...metadata.openGraph,
      type: 'article',
      publishedTime: toIso(input.publishedAt),
      modifiedTime: toIso(input.updatedAt),
      section: input.section ?? undefined,
      tags: input.tags,
      authors: input.authorName ? [input.authorName] : undefined,
    }
  }

  return metadata
}

function toIso(value?: Date | string | null): string | undefined {
  if (!value) return undefined
  const date = typeof value === 'string' ? new Date(value) : value
  return Number.isNaN(date.getTime()) ? undefined : date.toISOString()
}
