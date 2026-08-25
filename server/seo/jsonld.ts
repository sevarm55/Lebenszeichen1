import { siteConfig } from '@/config/site'

/**
 * Structured data.
 *
 * Kept honest on purpose: `Article` is emitted rather than `NewsArticle`
 * (this is a human-interest magazine, not a news wire), and no `aggregateRating`
 * or fake review markup is produced anywhere.
 */

function absolute(path: string): string {
  if (/^https?:\/\//i.test(path)) return path
  return `${siteConfig.url}${path.startsWith('/') ? path : `/${path}`}`
}

export function organizationJsonLd(options: { siteName: string; logoUrl?: string | null }) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    '@id': `${siteConfig.url}/#organization`,
    name: options.siteName,
    url: siteConfig.url,
    ...(options.logoUrl
      ? { logo: { '@type': 'ImageObject', url: absolute(options.logoUrl) } }
      : {}),
    ...(siteConfig.social.facebook ? { sameAs: [siteConfig.social.facebook] } : {}),
  }
}

export function webSiteJsonLd(options: { siteName: string }) {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    '@id': `${siteConfig.url}/#website`,
    name: options.siteName,
    url: siteConfig.url,
    inLanguage: 'de-DE',
    publisher: { '@id': `${siteConfig.url}/#organization` },
    potentialAction: {
      '@type': 'SearchAction',
      target: {
        '@type': 'EntryPoint',
        urlTemplate: `${siteConfig.url}/suche?q={search_term_string}`,
      },
      'query-input': 'required name=search_term_string',
    },
  }
}

export interface ArticleJsonLdInput {
  title: string
  description: string
  path: string
  image?: string | null
  publishedAt?: Date | null
  updatedAt?: Date | null
  authorName?: string | null
  section?: string | null
  siteName: string
  wordCount?: number
}

export function articleJsonLd(input: ArticleJsonLdInput) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Article',
    mainEntityOfPage: { '@type': 'WebPage', '@id': absolute(input.path) },
    headline: input.title.slice(0, 110),
    description: input.description,
    inLanguage: 'de-DE',
    ...(input.image ? { image: [absolute(input.image)] } : {}),
    ...(input.publishedAt ? { datePublished: input.publishedAt.toISOString() } : {}),
    ...(input.updatedAt ? { dateModified: input.updatedAt.toISOString() } : {}),
    ...(input.wordCount ? { wordCount: input.wordCount } : {}),
    author: input.authorName
      ? { '@type': 'Person', name: input.authorName }
      : { '@type': 'Organization', name: input.siteName },
    publisher: { '@id': `${siteConfig.url}/#organization` },
    ...(input.section ? { articleSection: input.section } : {}),
  }
}

export function breadcrumbJsonLd(items: { name: string; path: string }[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: absolute(item.path),
    })),
  }
}

export function collectionJsonLd(input: { name: string; description: string; path: string }) {
  return {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: input.name,
    description: input.description,
    url: absolute(input.path),
    inLanguage: 'de-DE',
    isPartOf: { '@id': `${siteConfig.url}/#website` },
  }
}
