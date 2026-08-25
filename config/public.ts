/**
 * Public (client-visible) configuration.
 *
 * Every value here is compiled into the browser bundle, so it must contain no
 * secrets. `process.env.NEXT_PUBLIC_*` is referenced literally on purpose —
 * Next.js only inlines static member expressions.
 */

const asBool = (v: string | undefined, fallback = false) => {
  const s = v?.trim().toLowerCase()
  if (!s) return fallback
  return s === 'true' || s === '1' || s === 'yes'
}

export const publicConfig = {
  siteName: process.env.NEXT_PUBLIC_SITE_NAME || 'Lebenszeichen',
  siteUrl: (process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000').replace(/\/$/, ''),

  ads: {
    enabled: asBool(process.env.NEXT_PUBLIC_ADS_ENABLED, false),
    provider: process.env.NEXT_PUBLIC_ADS_PROVIDER || 'adsense',
    adsenseClientId: process.env.NEXT_PUBLIC_ADSENSE_CLIENT_ID || '',
    adsenseAutoAds: asBool(process.env.NEXT_PUBLIC_ADSENSE_AUTO_ADS, false),
    slots: {
      HOME_TOP: process.env.NEXT_PUBLIC_AD_SLOT_HOME_TOP || '',
      HOME_FEED_1: process.env.NEXT_PUBLIC_AD_SLOT_HOME_FEED_1 || '',
      HOME_FEED_2: process.env.NEXT_PUBLIC_AD_SLOT_HOME_FEED_2 || '',
      CATEGORY_TOP: process.env.NEXT_PUBLIC_AD_SLOT_CATEGORY_TOP || '',
      CATEGORY_FEED: process.env.NEXT_PUBLIC_AD_SLOT_CATEGORY_FEED || '',
      ARTICLE_AFTER_INTRO: process.env.NEXT_PUBLIC_AD_SLOT_ARTICLE_AFTER_INTRO || '',
      ARTICLE_INLINE: process.env.NEXT_PUBLIC_AD_SLOT_ARTICLE_INLINE || '',
      ARTICLE_END: process.env.NEXT_PUBLIC_AD_SLOT_ARTICLE_END || '',
      SIDEBAR: process.env.NEXT_PUBLIC_AD_SLOT_SIDEBAR || '',
      SIDEBAR_STICKY: process.env.NEXT_PUBLIC_AD_SLOT_SIDEBAR_STICKY || '',
      MOBILE_STICKY: process.env.NEXT_PUBLIC_AD_SLOT_MOBILE_STICKY || '',
      SEARCH_TOP: process.env.NEXT_PUBLIC_AD_SLOT_SEARCH_TOP || '',
    } as Record<string, string>,
  },

  popunder: {
    enabled: asBool(process.env.NEXT_PUBLIC_POPUNDER_ENABLED, false),
    scriptUrl: process.env.NEXT_PUBLIC_POPUNDER_SCRIPT_URL || '',
    frequencyHours: Number(process.env.NEXT_PUBLIC_POPUNDER_FREQUENCY_HOURS || '12') || 12,
  },

  cmp: {
    provider: process.env.NEXT_PUBLIC_CMP_PROVIDER || 'none',
    fundingChoicesId: process.env.NEXT_PUBLIC_CMP_FUNDING_CHOICES_ID || '',
  },

  analytics: {
    provider: process.env.NEXT_PUBLIC_ANALYTICS_PROVIDER || 'none',
    ga4Id: process.env.NEXT_PUBLIC_GA4_MEASUREMENT_ID || '',
  },
} as const

/** True only when a real AdSense publisher id is configured and ads are on. */
export const adsenseReady =
  publicConfig.ads.enabled &&
  publicConfig.ads.provider === 'adsense' &&
  publicConfig.ads.adsenseClientId.startsWith('ca-pub-')
