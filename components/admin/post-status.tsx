import type { PostStatus } from '@prisma/client'

import type { BadgeProps } from '@/components/ui/badge'

export const STATUS_LABELS: Record<PostStatus, string> = {
  DRAFT: 'Черновик',
  AI_PROCESSING: 'AI обрабатывает',
  NEEDS_REVIEW: 'Нужна проверка',
  READY: 'Готов',
  SCHEDULED: 'Запланирован',
  PUBLISHED: 'Опубликован',
  ARCHIVED: 'В архиве',
  FAILED: 'Ошибка',
}

export const STATUS_ORDER: PostStatus[] = [
  'DRAFT',
  'AI_PROCESSING',
  'NEEDS_REVIEW',
  'READY',
  'SCHEDULED',
  'PUBLISHED',
  'ARCHIVED',
  'FAILED',
]

export function statusVariant(status: PostStatus): BadgeProps['variant'] {
  switch (status) {
    case 'PUBLISHED':
      return 'success'
    case 'SCHEDULED':
      return 'info'
    case 'NEEDS_REVIEW':
    case 'AI_PROCESSING':
      return 'warning'
    case 'FAILED':
      return 'danger'
    case 'READY':
      return 'accent'
    default:
      return 'neutral'
  }
}

export const ORIGIN_LABELS: Record<string, string> = {
  MANUAL: 'Вручную',
  URL_IMPORT: 'Импорт URL',
  AI_GENERATED: 'AI',
  SEED: 'Демо',
}
