'use client'

import Script from 'next/script'
import { useEffect, useState } from 'react'

import { publicConfig } from '@/config/public'

const STORAGE_KEY = 'lz_pu_last'

/**
 * Interstitial / popunder network integration point.
 *
 * ────────────────────────────────────────────────────────────────────────────
 *  READ THIS BEFORE ENABLING
 *
 *  Google AdSense forbids popunders, pop-ups triggered by page clicks, and any
 *  layout that provokes accidental clicks. Running one on a page that also
 *  serves AdSense is not a grey area — it gets the AdSense account terminated,
 *  usually without warning and without payout of the current balance.
 *
 *  So this component:
 *   • is disabled by default (NEXT_PUBLIC_POPUNDER_ENABLED=false);
 *   • refuses to run at all while an AdSense client id is configured;
 *   • loads the *network's own* script (Adsterra, Monetag, PropellerAds, …)
 *     rather than hand-rolling a click hijacker;
 *   • applies a frequency cap so one visitor is not hit on every page view.
 *
 *  Recommended setup if both revenue streams are wanted: AdSense on this
 *  domain, popunder network on a separate domain. See docs/ADSENSE.md.
 * ────────────────────────────────────────────────────────────────────────────
 */
export function PopunderLoader() {
  const [allowed, setAllowed] = useState(false)

  const configured = publicConfig.popunder.enabled && Boolean(publicConfig.popunder.scriptUrl)
  const conflictsWithAdsense = Boolean(publicConfig.ads.adsenseClientId)

  useEffect(() => {
    if (!configured || conflictsWithAdsense) return
    try {
      const last = Number(window.localStorage.getItem(STORAGE_KEY) ?? '0')
      const gapMs = publicConfig.popunder.frequencyHours * 60 * 60 * 1000
      if (Date.now() - last < gapMs) return
      window.localStorage.setItem(STORAGE_KEY, String(Date.now()))
      setAllowed(true)
    } catch {
      // Private mode / storage blocked — do not run rather than run unbounded.
    }
  }, [configured, conflictsWithAdsense])

  if (configured && conflictsWithAdsense && process.env.NODE_ENV !== 'production') {
    console.warn(
      '[ads] Popunder ist aktiviert, aber eine AdSense-Client-ID ist gesetzt. ' +
        'Das verstößt gegen die AdSense-Richtlinien — der Loader bleibt deaktiviert.',
    )
  }

  if (!allowed) return null

  return (
    <Script
      id="interstitial-network"
      strategy="lazyOnload"
      src={publicConfig.popunder.scriptUrl}
      data-cfasync="false"
    />
  )
}
