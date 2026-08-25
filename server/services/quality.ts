import type { ArticleDocument } from '@/server/domain/blocks'
import { documentWordCount } from '@/server/domain/blocks'

/**
 * Pre-publish checklist.
 *
 * Deliberately not a "SEO score out of 100" — a number like that is theatre.
 * These are concrete, actionable statements an editor can either fix or
 * consciously ignore. `blocking` items are the ones that make a published page
 * measurably worse (no description in Google, no image on Facebook).
 */

export type CheckLevel = 'ok' | 'warn' | 'blocking'

export interface QualityCheck {
  id: string
  label: string
  level: CheckLevel
  hint?: string
}

export interface QualityReport {
  checks: QualityCheck[]
  blocking: number
  warnings: number
  /** "Готово к публикации" vs "Нужно проверить" — the only two states shown. */
  readyToPublish: boolean
}

export interface QualityInput {
  title: string
  subtitle?: string
  /** The value that will actually be stored — typed, or derived from the body. */
  excerpt: string
  /** True when nothing was typed and the excerpt came from the first paragraph. */
  excerptIsDerived?: boolean
  document: ArticleDocument
  categoryId?: string | null
  heroImageId?: string | null
  heroImageAlt?: string
  metaDescription?: string
  seoTitle?: string
  sourceUrl?: string | null
  aiUsed?: boolean
}

export function evaluateQuality(input: QualityInput): QualityReport {
  const checks: QualityCheck[] = []
  const words = documentWordCount(input.document)

  const push = (id: string, label: string, level: CheckLevel, hint?: string) =>
    checks.push({ id, label, level, hint })

  // --- Заголовок
  const titleLen = input.title.trim().length
  if (!titleLen) push('title', 'Заголовок не заполнен', 'blocking')
  else if (titleLen > 90)
    push('title', `Заголовок слишком длинный (${titleLen} симв.)`, 'warn', 'Оптимум — до 70 символов.')
  else if (titleLen < 20)
    push('title', `Заголовок очень короткий (${titleLen} симв.)`, 'warn')
  else push('title', 'Заголовок в порядке', 'ok')

  // --- Анонс
  // Not blocking: an empty field falls back to the first paragraph on save, so
  // the card is never left blank. It only fails when there is no body either.
  const excerpt = input.excerpt.trim()
  if (!excerpt) {
    push('excerpt', 'Нет анонса и нет текста, из которого его взять', 'blocking')
  } else if (excerpt.length < 60) {
    push('excerpt', 'Анонс слишком короткий', 'warn', 'Оптимум — 80–220 символов.')
  } else if (input.excerptIsDerived) {
    push('excerpt', 'Анонс взят из первого абзаца', 'ok')
  } else {
    push('excerpt', 'Анонс в порядке', 'ok')
  }

  // --- Объём
  if (words === 0) push('body', 'Текст статьи пуст', 'blocking')
  else if (words < 250)
    push('body', `Очень короткая статья (${words} слов)`, 'warn', 'Меньше 250 слов плохо ранжируется и почти не даёт рекламных мест.')
  else push('body', `Объём текста: ${words} слов`, 'ok')

  // --- Структура
  const headings = input.document.blocks.filter(
    (b) => b.type === 'heading2' || b.type === 'heading3',
  ).length
  if (words > 500 && headings === 0)
    push('headings', 'В длинной статье нет подзаголовков', 'warn', 'Добавьте H2 каждые 250–350 слов.')
  else if (headings > 0) push('headings', `Подзаголовков: ${headings}`, 'ok')

  // --- Категория
  if (!input.categoryId) push('category', 'Категория не выбрана', 'blocking')
  else push('category', 'Категория выбрана', 'ok')

  // --- Обложка
  if (!input.heroImageId) {
    push('hero', 'Нет обложки', 'blocking', 'Без обложки ссылка в Facebook выглядит пустой.')
  } else if (!input.heroImageAlt?.trim()) {
    push('hero-alt', 'У обложки нет alt-текста', 'warn', 'Alt нужен для доступности и Google Images.')
  } else {
    push('hero', 'Обложка и alt в порядке', 'ok')
  }

  // --- Изображения в тексте
  const imagesWithoutAlt = input.document.blocks.filter(
    (b) => b.type === 'image' && !b.alt.trim(),
  ).length
  if (imagesWithoutAlt > 0)
    push('img-alt', `Изображений без alt: ${imagesWithoutAlt}`, 'warn')

  // --- SEO
  const meta = input.metaDescription?.trim() ?? ''
  if (!meta) push('meta', 'Нет meta description', 'blocking')
  else if (meta.length < 100 || meta.length > 165)
    push('meta', `Meta description ${meta.length} симв.`, 'warn', 'Оптимум — 140–158 символов.')
  else push('meta', 'Meta description в порядке', 'ok')

  const seoTitle = input.seoTitle?.trim() ?? ''
  if (seoTitle && seoTitle.length > 65)
    push('seo-title', `SEO-заголовок длинный (${seoTitle.length} симв.)`, 'warn')

  // --- Происхождение
  if (input.aiUsed && !input.sourceUrl)
    push('source', 'AI использован, но источник не сохранён', 'warn', 'Источник нужен для редакционного контроля.')
  else if (input.sourceUrl) push('source', 'Источник сохранён', 'ok')

  const blocking = checks.filter((c) => c.level === 'blocking').length
  const warnings = checks.filter((c) => c.level === 'warn').length

  return { checks, blocking, warnings, readyToPublish: blocking === 0 }
}
