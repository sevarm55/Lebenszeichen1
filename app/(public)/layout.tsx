import { AdRuntimeProvider } from '@/components/ads/ad-context'
import { AdScripts } from '@/components/ads/ad-scripts'
import { MobileStickyAd } from '@/components/ads/mobile-sticky'
import { PopunderLoader } from '@/components/ads/popunder'
import { ConsentBanner } from '@/components/public/consent-banner'
import { SiteFooter } from '@/components/public/footer'
import { SiteHeader } from '@/components/public/header'
import { organizationJsonLd, webSiteJsonLd } from '@/server/seo/jsonld'
import { buildAdRuntime } from '@/server/ads/runtime'
import { getNavigationCategories, getSettings } from '@/server/services/site'

export default async function PublicLayout({ children }: { children: React.ReactNode }) {
  const [settings, categories, adRuntime] = await Promise.all([
    getSettings(),
    getNavigationCategories(),
    buildAdRuntime(),
  ])

  const jsonLd = [
    organizationJsonLd({ siteName: settings.siteName, logoUrl: settings.logoUrl }),
    webSiteJsonLd({ siteName: settings.siteName }),
  ]

  return (
    <AdRuntimeProvider value={adRuntime}>
      <script
        type="application/ld+json"
        // Serialised from our own data, never from user input.
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <AdScripts />
      <PopunderLoader />

      <a
        href="#inhalt"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-[70] focus:rounded-sm focus:bg-[var(--color-text)] focus:px-3 focus:py-2 focus:text-sm focus:text-white"
      >
        Zum Inhalt springen
      </a>

      <div className="flex min-h-screen flex-col">
        <SiteHeader
          siteName={settings.siteName}
          tagline={settings.tagline}
          categories={categories}
        />
        <main id="inhalt" className="flex-1">
          {children}
        </main>
        <SiteFooter
          siteName={settings.siteName}
          tagline={settings.tagline}
          categories={categories}
        />
      </div>

      <MobileStickyAd />
      <ConsentBanner />
    </AdRuntimeProvider>
  )
}
