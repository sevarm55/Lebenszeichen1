/**
 * Central advertising placement registry.
 *
 * Every ad on the site resolves through this file. No component ever contains
 * a publisher id or an ad-unit id — swapping AdSense for another network is a
 * change here plus environment variables, nothing more.
 */

export type AdSlotId =
  | 'HOME_TOP'
  | 'HOME_FEED_1'
  | 'HOME_FEED_2'
  | 'CATEGORY_TOP'
  | 'CATEGORY_FEED'
  | 'ARTICLE_AFTER_INTRO'
  | 'ARTICLE_INLINE'
  | 'ARTICLE_END'
  | 'SIDEBAR'
  | 'SIDEBAR_STICKY'
  | 'MOBILE_STICKY'
  | 'SEARCH_TOP'

export type AdFormat = 'horizontal' | 'rectangle' | 'vertical' | 'fluid' | 'auto'

export interface AdPlacementDef {
  id: AdSlotId
  /** Shown in /admin/settings and in the editor's placement preview. */
  label: string
  format: AdFormat
  /**
   * Reserved height in px, per breakpoint. Reserving space is what keeps CLS
   * at zero when the network fills the slot late (or never).
   */
  minHeight: { mobile: number; desktop: number }
  maxWidth?: number
  /** Slots that only make sense on one form factor. */
  device?: 'all' | 'desktop' | 'mobile'
  description: string
}

export const AD_PLACEMENTS: Record<AdSlotId, AdPlacementDef> = {
  HOME_TOP: {
    id: 'HOME_TOP',
    label: 'Startseite — oben',
    format: 'horizontal',
    minHeight: { mobile: 100, desktop: 90 },
    maxWidth: 970,
    device: 'all',
    description: 'Unter dem Header, über der Leitgeschichte.',
  },
  HOME_FEED_1: {
    id: 'HOME_FEED_1',
    label: 'Startseite — im Feed (1)',
    format: 'fluid',
    minHeight: { mobile: 280, desktop: 250 },
    device: 'all',
    description: 'Zwischen "Neueste Geschichten" und "Beliebt".',
  },
  HOME_FEED_2: {
    id: 'HOME_FEED_2',
    label: 'Startseite — im Feed (2)',
    format: 'fluid',
    minHeight: { mobile: 280, desktop: 250 },
    device: 'all',
    description: 'Zwischen den Kategorie-Blöcken.',
  },
  CATEGORY_TOP: {
    id: 'CATEGORY_TOP',
    label: 'Kategorie — oben',
    format: 'horizontal',
    minHeight: { mobile: 100, desktop: 90 },
    maxWidth: 970,
    device: 'all',
    description: 'Unter der Kategorie-Beschreibung.',
  },
  CATEGORY_FEED: {
    id: 'CATEGORY_FEED',
    label: 'Kategorie — im Feed',
    format: 'fluid',
    minHeight: { mobile: 280, desktop: 250 },
    device: 'all',
    description: 'Nach jeweils sechs Beiträgen in der Liste.',
  },
  ARTICLE_AFTER_INTRO: {
    id: 'ARTICLE_AFTER_INTRO',
    label: 'Artikel — nach dem Einstieg',
    format: 'rectangle',
    minHeight: { mobile: 280, desktop: 280 },
    maxWidth: 336,
    device: 'all',
    description: 'Nach dem ersten Absatz — die stärkste Position im Artikel.',
  },
  ARTICLE_INLINE: {
    id: 'ARTICLE_INLINE',
    label: 'Artikel — im Text',
    format: 'rectangle',
    minHeight: { mobile: 280, desktop: 280 },
    maxWidth: 336,
    device: 'all',
    description: 'Automatisch verteilt, abhängig von der Artikellänge.',
  },
  ARTICLE_END: {
    id: 'ARTICLE_END',
    label: 'Artikel — Ende',
    format: 'horizontal',
    minHeight: { mobile: 280, desktop: 250 },
    device: 'all',
    description: 'Vor den Empfehlungen.',
  },
  SIDEBAR: {
    id: 'SIDEBAR',
    label: 'Sidebar — oben',
    format: 'rectangle',
    minHeight: { mobile: 0, desktop: 250 },
    maxWidth: 300,
    device: 'desktop',
    description: 'Rechte Spalte, oberhalb der beliebten Beiträge.',
  },
  SIDEBAR_STICKY: {
    id: 'SIDEBAR_STICKY',
    label: 'Sidebar — sticky',
    format: 'vertical',
    minHeight: { mobile: 0, desktop: 600 },
    maxWidth: 300,
    device: 'desktop',
    description: 'Bleibt beim Scrollen sichtbar (nur Desktop).',
  },
  MOBILE_STICKY: {
    id: 'MOBILE_STICKY',
    label: 'Mobil — Sticky unten',
    format: 'horizontal',
    minHeight: { mobile: 50, desktop: 0 },
    device: 'mobile',
    description: 'Anker am unteren Bildschirmrand, schließbar.',
  },
  SEARCH_TOP: {
    id: 'SEARCH_TOP',
    label: 'Suche — oben',
    format: 'horizontal',
    minHeight: { mobile: 100, desktop: 90 },
    maxWidth: 970,
    device: 'all',
    description: 'Über den Suchergebnissen.',
  },
}

export const AD_PLACEMENT_LIST = Object.values(AD_PLACEMENTS)
