import 'server-only'

import { cache } from 'react'

import { DEFAULT_SITE_KEY, siteConfig } from '@/config/site'
import { prisma } from '@/lib/prisma'

export type SiteWithSettings = Awaited<ReturnType<typeof loadSite>>

async function loadSite() {
  return prisma.site.findUnique({
    where: { key: DEFAULT_SITE_KEY },
    include: { settings: true },
  })
}

/**
 * The active site row. `cache()` dedupes it per request, so a page that renders
 * a header, a footer and three ad slots still hits the DB once.
 */
export const getSite = cache(loadSite)

export async function getSiteId(): Promise<string> {
  const site = await getSite()
  if (!site) {
    throw new Error(
      'Kein Site-Datensatz gefunden. Bitte `npm run seed` ausführen (siehe docs/DEPLOYMENT.md).',
    )
  }
  return site.id
}

export interface ResolvedSettings {
  siteName: string
  tagline: string
  description: string
  logoUrl: string | null
  postsPerPage: number
  seoTitlePattern: string
  organizationName: string
  adsEnabled: boolean
  adsProvider: string
  adsDensity: string
  adsSidebarEnabled: boolean
  adsMobileStickyOn: boolean
  adsMinWordsForInline: number
  adsMaxInContent: number
  adsMinWordsBetween: number
  cmpProvider: string
  analyticsProvider: string
  legal: {
    companyName: string
    managingDirector: string
    address: string
    email: string
    phone: string
    vatId: string
  }
}

/** Settings with config fallbacks applied, so callers never handle nulls. */
export const getSettings = cache(async (): Promise<ResolvedSettings> => {
  const site = await getSite()
  const s = site?.settings

  return {
    siteName: s?.siteName || siteConfig.name,
    tagline: s?.tagline || siteConfig.tagline,
    description: s?.description || siteConfig.description,
    logoUrl: s?.logoUrl ?? null,
    postsPerPage: s?.postsPerPage ?? 12,
    seoTitlePattern: s?.seoTitlePattern || '%s | {siteName}',
    organizationName: s?.organizationName || siteConfig.name,
    adsEnabled: s?.adsEnabled ?? false,
    adsProvider: s?.adsProvider ?? 'adsense',
    adsDensity: s?.adsDensity ?? 'balanced',
    adsSidebarEnabled: s?.adsSidebarEnabled ?? true,
    adsMobileStickyOn: s?.adsMobileStickyOn ?? true,
    adsMinWordsForInline: s?.adsMinWordsForInline ?? 180,
    adsMaxInContent: s?.adsMaxInContent ?? 5,
    adsMinWordsBetween: s?.adsMinWordsBetween ?? 140,
    cmpProvider: s?.cmpProvider ?? 'none',
    analyticsProvider: s?.analyticsProvider ?? 'none',
    legal: {
      companyName: s?.legalCompanyName || siteConfig.legal.companyName,
      managingDirector: s?.legalManagingDir || siteConfig.legal.managingDirector,
      address: s?.legalAddress || siteConfig.legal.address,
      email: s?.legalEmail || siteConfig.legal.email,
      phone: s?.legalPhone || siteConfig.legal.phone,
      vatId: s?.legalVatId || siteConfig.legal.vatId,
    },
  }
})

export const getNavigationCategories = cache(async () => {
  const siteId = await getSiteId()
  return prisma.category.findMany({
    where: { siteId, enabled: true, showInNav: true },
    orderBy: { order: 'asc' },
    select: { id: true, name: true, slug: true },
  })
})

export const getAllCategories = cache(async () => {
  const siteId = await getSiteId()
  return prisma.category.findMany({
    where: { siteId, enabled: true },
    orderBy: { order: 'asc' },
  })
})
