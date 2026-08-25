'use client'

import Script from 'next/script'
import { useEffect, useState } from 'react'

import { publicConfig } from '@/config/public'
import { useAdRuntime } from './ad-context'

/**
 * Third-party ad and consent scripts.
 *
 * Loading order matters and is deliberate:
 *   1. Consent Mode defaults are set *before* anything else runs, so Google's
 *      tags start in the denied state instead of firing once and being
 *      corrected afterwards.
 *   2. The CMP loads next and is what flips those defaults.
 *   3. The AdSense loader only mounts once ads are actually configured.
 */
export function AdScripts() {
  const runtime = useAdRuntime()
  const [consentReady, setConsentReady] = useState(false)

  useEffect(() => {
    // Mirror the CMP decision onto a small global the analytics layer reads.
    // Until a certified CMP is connected, everything optional stays denied.
    const w = window as unknown as { __lzConsent?: { analytics: boolean; ads: boolean } }
    if (!w.__lzConsent) {
      w.__lzConsent = { analytics: false, ads: false }
    }
    setConsentReady(true)
  }, [])

  const useAdsense =
    runtime.enabled && runtime.provider === 'adsense' && runtime.clientId.startsWith('ca-pub-')

  return (
    <>
      {/* Certified CMP integration point. Google Funding Choices is IAB TCF
          v2.2 certified and is delivered by the AdSense publisher id; any other
          certified CMP drops in here. See docs/ADSENSE.md. */}
      {publicConfig.cmp.provider === 'funding-choices' && publicConfig.cmp.fundingChoicesId && (
        <Script
          id="funding-choices"
          strategy="afterInteractive"
          async
          src={`https://fundingchoicesmessages.google.com/i/${publicConfig.cmp.fundingChoicesId}?ers=1`}
        />
      )}

      {useAdsense && consentReady && (
        <Script
          id="adsbygoogle"
          strategy="afterInteractive"
          async
          crossOrigin="anonymous"
          src={`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${runtime.clientId}`}
          data-overlays={runtime.autoAds ? 'bottom' : undefined}
        />
      )}

      {/* Auto Ads: lets Google add anchor + vignette formats on top of our own
          placements. This is the policy-compliant way to raise ad density —
          unlike a popunder, it is a first-party Google format. */}
      {useAdsense && runtime.autoAds && (
        <Script id="adsense-auto" strategy="afterInteractive">
          {`(adsbygoogle = window.adsbygoogle || []).push({
              google_ad_client: "${runtime.clientId}",
              enable_page_level_ads: true
            });`}
        </Script>
      )}

      {publicConfig.analytics.provider === 'ga4' && publicConfig.analytics.ga4Id && (
        <>
          <Script
            id="ga4-loader"
            strategy="afterInteractive"
            async
            src={`https://www.googletagmanager.com/gtag/js?id=${publicConfig.analytics.ga4Id}`}
          />
          <Script id="ga4-init" strategy="afterInteractive">
            {`
              window.dataLayer = window.dataLayer || [];
              function gtag(){dataLayer.push(arguments);}
              gtag('js', new Date());
              gtag('config', '${publicConfig.analytics.ga4Id}', { send_page_view: false });
            `}
          </Script>
        </>
      )}
    </>
  )
}
