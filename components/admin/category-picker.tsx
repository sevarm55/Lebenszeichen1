'use client'

import { Star } from 'lucide-react'

import { cn } from '@/lib/utils'

export interface CategoryOption {
  id: string
  name: string
}

interface CategoryPickerProps {
  categories: CategoryOption[]
  /** Owns the URL and the breadcrumb — exactly one. */
  primaryId: string
  /** Additional categories the article also appears under. */
  extraIds: string[]
  onChange: (primaryId: string, extraIds: string[]) => void
  disabled?: boolean
}

/**
 * Multi-select with one primary.
 *
 * An article can sit in several rubrics, but only one can own its URL — a story
 * reachable at two addresses splits its own ranking. So the checkbox list picks
 * membership and the star picks which one the address comes from.
 */
export function CategoryPicker({
  categories,
  primaryId,
  extraIds,
  onChange,
  disabled,
}: CategoryPickerProps) {
  const isChecked = (id: string) => id === primaryId || extraIds.includes(id)

  const toggle = (id: string) => {
    if (id === primaryId) {
      // Unchecking the primary promotes the first remaining one, so an article
      // is never left without an address.
      const [next, ...rest] = extraIds
      if (!next) return
      onChange(next, rest)
      return
    }
    if (extraIds.includes(id)) {
      onChange(primaryId, extraIds.filter((x) => x !== id))
      return
    }
    if (!primaryId) {
      onChange(id, extraIds)
      return
    }
    onChange(primaryId, [...extraIds, id])
  }

  const makePrimary = (id: string) => {
    if (id === primaryId) return
    const nextExtra = [...extraIds.filter((x) => x !== id), primaryId].filter(Boolean)
    onChange(id, nextExtra)
  }

  return (
    <div>
      <ul className="max-h-64 space-y-0.5 overflow-y-auto">
        {categories.map((category) => {
          const checked = isChecked(category.id)
          const primary = category.id === primaryId
          return (
            <li key={category.id}>
              <div
                className={cn(
                  'group flex items-center gap-2 rounded-sm px-1.5 py-1 transition-colors',
                  primary && 'bg-[var(--color-accent-soft)]',
                )}
              >
                <label className="flex min-w-0 flex-1 cursor-pointer items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={checked}
                    disabled={disabled}
                    onChange={() => toggle(category.id)}
                    className="shrink-0"
                  />
                  <span className={cn('truncate', primary && 'font-medium text-[var(--color-accent)]')}>
                    {category.name}
                  </span>
                </label>

                {checked && (
                  <button
                    type="button"
                    disabled={disabled || primary}
                    onClick={() => makePrimary(category.id)}
                    title={primary ? 'Основная рубрика' : 'Сделать основной'}
                    aria-label={primary ? 'Основная рубрика' : 'Сделать основной'}
                    className={cn(
                      'shrink-0 rounded-sm p-0.5 transition-colors',
                      primary
                        ? 'text-[var(--color-accent)]'
                        : 'text-[var(--color-muted-soft)] opacity-0 hover:text-[var(--color-accent)] group-hover:opacity-100',
                    )}
                  >
                    <Star className={cn('h-3.5 w-3.5', primary && 'fill-current')} />
                  </button>
                )}
              </div>
            </li>
          )
        })}
      </ul>

      <p className="mt-2 border-t border-[var(--color-border)] pt-2 text-xs text-[var(--color-muted)]">
        <Star className="mr-1 inline h-3 w-3 fill-current text-[var(--color-accent)]" />
        Основная рубрика задаёт адрес статьи и хлебные крошки. Остальные — просто дополнительные
        разделы, где материал тоже показывается.
      </p>
    </div>
  )
}
