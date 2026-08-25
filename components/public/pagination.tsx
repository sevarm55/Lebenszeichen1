import Link from 'next/link'

import { cn } from '@/lib/utils'

interface PaginationProps {
  page: number
  totalPages: number
  /** Builder so category, search and feed can all use their own URL shape. */
  buildHref: (page: number) => string
  className?: string
}

/**
 * Real <a> links, not a client-side "load more" button.
 *
 * Infinite scroll would cost us indexable URLs for everything past page one and
 * break the back button — both of which this site's traffic depends on.
 */
export function Pagination({ page, totalPages, buildHref, className }: PaginationProps) {
  if (totalPages <= 1) return null

  const pages = pageWindow(page, totalPages)

  return (
    <nav className={cn('mt-10 flex items-center justify-center gap-1.5', className)} aria-label="Seitennavigation">
      {page > 1 ? (
        <Link
          href={buildHref(page - 1)}
          rel="prev"
          className="flex h-9 items-center rounded-sm border border-[var(--color-border-strong)] px-3 text-sm font-medium hover:border-[var(--color-accent)] hover:text-[var(--color-accent)]"
        >
          Zurück
        </Link>
      ) : (
        <span className="flex h-9 items-center rounded-sm border border-[var(--color-border)] px-3 text-sm text-[var(--color-muted-soft)]">
          Zurück
        </span>
      )}

      <ul className="flex items-center gap-1">
        {pages.map((entry, index) =>
          entry === 'gap' ? (
            <li key={`gap-${index}`} className="px-1 text-sm text-[var(--color-muted-soft)]">
              …
            </li>
          ) : (
            <li key={entry}>
              <Link
                href={buildHref(entry)}
                aria-current={entry === page ? 'page' : undefined}
                className={cn(
                  'flex h-9 w-9 items-center justify-center rounded-sm border text-sm font-medium transition-colors',
                  entry === page
                    ? 'border-[var(--color-text)] bg-[var(--color-text)] text-white'
                    : 'border-[var(--color-border-strong)] hover:border-[var(--color-accent)] hover:text-[var(--color-accent)]',
                )}
              >
                {entry}
              </Link>
            </li>
          ),
        )}
      </ul>

      {page < totalPages ? (
        <Link
          href={buildHref(page + 1)}
          rel="next"
          className="flex h-9 items-center rounded-sm border border-[var(--color-border-strong)] px-3 text-sm font-medium hover:border-[var(--color-accent)] hover:text-[var(--color-accent)]"
        >
          Weiter
        </Link>
      ) : (
        <span className="flex h-9 items-center rounded-sm border border-[var(--color-border)] px-3 text-sm text-[var(--color-muted-soft)]">
          Weiter
        </span>
      )}
    </nav>
  )
}

function pageWindow(page: number, total: number): (number | 'gap')[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1)
  const result: (number | 'gap')[] = [1]
  const start = Math.max(2, page - 1)
  const end = Math.min(total - 1, page + 1)
  if (start > 2) result.push('gap')
  for (let i = start; i <= end; i += 1) result.push(i)
  if (end < total - 1) result.push('gap')
  result.push(total)
  return result
}
