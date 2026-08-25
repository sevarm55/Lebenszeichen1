/**
 * Analytics abstraction.
 *
 * No vendor SDK is imported anywhere else in the app. Today the only sink is
 * GA4 (and only after consent); the future central dashboard for the whole
 * network of sites can be added as a second sink here without touching a single
 * component.
 */

export type AnalyticsEvent =
  | 'page_view'
  | 'article_view'
  | 'article_25'
  | 'article_50'
  | 'article_75'
  | 'article_complete'
  | 'related_article_click'
  | 'category_click'
  | 'share_click'
  | 'search'
  | 'ad_slot_rendered'

export interface EventPayload {
  [key: string]: string | number | boolean | undefined
}

declare global {
  interface Window {
    dataLayer?: unknown[]
    gtag?: (...args: unknown[]) => void
    __lzConsent?: { analytics: boolean; ads: boolean }
  }
}

/** Consent gate. Until a CMP grants analytics consent, nothing is sent. */
export function hasAnalyticsConsent(): boolean {
  if (typeof window === 'undefined') return false
  return window.__lzConsent?.analytics === true
}

export function trackEvent(event: AnalyticsEvent, payload: EventPayload = {}): void {
  if (typeof window === 'undefined') return

  // Always push to the dataLayer — a tag manager can decide what to do with it,
  // and it makes events observable in dev without any vendor configured.
  window.dataLayer = window.dataLayer || []
  window.dataLayer.push({ event, ...payload })

  if (!hasAnalyticsConsent()) return
  window.gtag?.('event', event, payload)
}

export function trackPageView(path: string, title?: string): void {
  trackEvent('page_view', { page_path: path, page_title: title })
}
