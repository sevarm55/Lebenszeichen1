import Link from 'next/link'
import { ArrowRight } from 'lucide-react'

interface SectionHeadingProps {
  title: string
  description?: string
  href?: string
  linkLabel?: string
}

export function SectionHeading({ title, description, href, linkLabel }: SectionHeadingProps) {
  return (
    <div className="section-rule mb-6 justify-between">
      <div>
        <h2 className="font-serif text-[1.375rem] font-semibold tracking-[-0.015em] sm:text-2xl">
          {title}
        </h2>
        {description && (
          <p className="mt-1 max-w-xl text-sm text-[var(--color-muted)]">{description}</p>
        )}
      </div>
      {href && (
        <Link
          href={href}
          className="hidden shrink-0 items-center gap-1 text-[0.8125rem] font-medium text-[var(--color-muted)] transition-colors hover:text-[var(--color-accent)] sm:inline-flex"
        >
          {linkLabel ?? 'Alle ansehen'}
          <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      )}
    </div>
  )
}
