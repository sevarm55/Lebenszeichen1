/**
 * Single source of truth for brand-level facts.
 *
 * The final brand name is not decided yet. `SITE_NAME` is a placeholder that is
 * read from the environment (and overridable per-site from /admin/settings).
 * Replacing the brand later = change SITE_NAME + logo + accent token here,
 * nothing else.
 */

import { publicConfig } from './public'

export const DEFAULT_SITE_KEY = 'de'

export const siteConfig = {
  /** Placeholder brand name — see docs/ENVIRONMENT.md before launch. */
  name: publicConfig.siteName,
  /** Short German strapline shown in the header and OG description fallback. */
  tagline: 'Geschichten, die bleiben',
  description:
    'Wahre Geschichten über Menschen, Familien, Tiere und Orte — sorgfältig recherchiert und ruhig erzählt.',
  url: publicConfig.siteUrl,
  locale: 'de-DE',
  language: 'de',
  timezone: 'Europe/Berlin',
  /** Same asset is used for OG fallback; replace when branding lands. */
  logoText: publicConfig.siteName,

  social: {
    facebook: '', // https://facebook.com/<page> — fill in after the page exists
    instagram: '',
    x: '',
  },

  /**
   * LEGAL PLACEHOLDERS — required by German law (§5 DDG / TMG) before the site
   * may go live. Editable at /admin/settings → Rechtliches; these are only the
   * fallbacks used when the DB row is still empty.
   */
  legal: {
    companyName: '[FIRMENNAME EINTRAGEN]',
    managingDirector: '[VERANTWORTLICHE PERSON EINTRAGEN]',
    address: '[STRASSE HAUSNUMMER, PLZ ORT, LAND]',
    email: '[KONTAKT-E-MAIL EINTRAGEN]',
    phone: '[TELEFON EINTRAGEN]',
    vatId: '[UST-IDNR. EINTRAGEN]',
  },
} as const

/** Languages the AI workspace can publish in. German is the default today. */
export const SUPPORTED_LANGUAGES = [
  { code: 'de', value: 'German', label: 'Deutsch' },
  { code: 'en', value: 'English', label: 'English' },
  { code: 'es', value: 'Spanish', label: 'Español' },
  { code: 'fr', value: 'French', label: 'Français' },
  { code: 'it', value: 'Italian', label: 'Italiano' },
  { code: 'pt', value: 'Portuguese', label: 'Português' },
  { code: 'nl', value: 'Dutch', label: 'Nederlands' },
  { code: 'pl', value: 'Polish', label: 'Polski' },
  { code: 'ru', value: 'Russian', label: 'Русский' },
  { code: 'tr', value: 'Turkish', label: 'Türkçe' },
] as const

export const DEFAULT_LANGUAGE = 'German'

/** Footer / trust pages, in the order they appear. */
export const staticPages = [
  { href: '/ueber-uns', label: 'Über uns' },
  { href: '/redaktionsrichtlinien', label: 'Redaktionsrichtlinien' },
  { href: '/korrekturen', label: 'Korrekturen' },
  { href: '/kontakt', label: 'Kontakt' },
  { href: '/impressum', label: 'Impressum' },
  { href: '/datenschutz', label: 'Datenschutz' },
  { href: '/cookie-einstellungen', label: 'Cookie-Einstellungen' },
] as const

/** Secondary nav entries that are not categories. */
export const utilityNav = [
  { href: '/neueste', label: 'Neueste' },
  { href: '/beliebt', label: 'Beliebt' },
] as const
