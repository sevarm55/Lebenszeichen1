import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * German-aware slugify.
 *
 * Umlauts are transliterated the way German readers expect in URLs
 * (ä → ae, ö → oe, ü → ue, ß → ss) rather than stripped by NFD, which would
 * turn "Bäckerei" into "backerei" and read wrong.
 */
const TRANSLITERATION: Record<string, string> = {
  ä: 'ae', ö: 'oe', ü: 'ue', Ä: 'ae', Ö: 'oe', Ü: 'ue', ß: 'ss',
  à: 'a', á: 'a', â: 'a', ã: 'a', å: 'a', æ: 'ae',
  è: 'e', é: 'e', ê: 'e', ë: 'e',
  ì: 'i', í: 'i', î: 'i', ï: 'i',
  ò: 'o', ó: 'o', ô: 'o', õ: 'o', ø: 'o',
  ù: 'u', ú: 'u', û: 'u',
  ç: 'c', ñ: 'n', ý: 'y', œ: 'oe',
  а: 'a', б: 'b', в: 'v', г: 'g', д: 'd', е: 'e', ё: 'e', ж: 'zh', з: 'z',
  и: 'i', й: 'i', к: 'k', л: 'l', м: 'm', н: 'n', о: 'o', п: 'p', р: 'r',
  с: 's', т: 't', у: 'u', ф: 'f', х: 'h', ц: 'c', ч: 'ch', ш: 'sh', щ: 'sch',
  ъ: '', ы: 'y', ь: '', э: 'e', ю: 'yu', я: 'ya',
}

export function slugify(input: string, maxLength = 80): string {
  const transliterated = input
    .split('')
    .map((ch) => TRANSLITERATION[ch] ?? TRANSLITERATION[ch.toLowerCase()] ?? ch)
    .join('')

  const slug = transliterated
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, maxLength)
    .replace(/-+$/g, '')

  return slug || 'beitrag'
}

const DE_MONTHS = [
  'Januar', 'Februar', 'März', 'April', 'Mai', 'Juni',
  'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember',
]

/** Deterministic German date, identical on server and client (no locale drift). */
export function formatDateDe(date: Date | string, opts: { withTime?: boolean } = {}): string {
  const d = typeof date === 'string' ? new Date(date) : date
  if (Number.isNaN(d.getTime())) return ''
  const parts = `${d.getUTCDate()}. ${DE_MONTHS[d.getUTCMonth()]} ${d.getUTCFullYear()}`
  if (!opts.withTime) return parts
  const hh = String(d.getUTCHours()).padStart(2, '0')
  const mm = String(d.getUTCMinutes()).padStart(2, '0')
  return `${parts}, ${hh}:${mm} Uhr`
}

export function formatDateTimeInput(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(
    date.getHours(),
  )}:${pad(date.getMinutes())}`
}

/** "vor 3 Stunden" style relative label, used in admin lists only. */
export function relativeDe(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date
  const diff = Date.now() - d.getTime()
  const min = Math.round(diff / 60000)
  if (min < 1) return 'gerade eben'
  if (min < 60) return `vor ${min} Min.`
  const h = Math.round(min / 60)
  if (h < 24) return `vor ${h} Std.`
  const days = Math.round(h / 24)
  if (days < 30) return `vor ${days} Tg.`
  return formatDateDe(d)
}

export function truncate(text: string, max: number): string {
  if (text.length <= max) return text
  return `${text.slice(0, max - 1).trimEnd()}…`
}

/** Words-per-minute used for the "x Min. Lesezeit" badge. */
export const READING_WPM = 200

export function readingTimeFromWords(words: number): number {
  return Math.max(1, Math.round(words / READING_WPM))
}

export function absoluteUrl(path: string, base: string): string {
  if (/^https?:\/\//i.test(path)) return path
  return `${base.replace(/\/$/, '')}${path.startsWith('/') ? path : `/${path}`}`
}
