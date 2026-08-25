import Link from 'next/link'

import { siteConfig, staticPages } from '@/config/site'

interface FooterProps {
  siteName: string
  tagline: string
  categories: { id: string; name: string; slug: string }[]
}

export function SiteFooter({ siteName, tagline, categories }: FooterProps) {
  const year = new Date().getFullYear()

  return (
    <footer className="mt-16 border-t border-[var(--color-border)] bg-[var(--color-surface-sunken)]">
      <div className="mx-auto max-w-[1280px] px-4 py-12 sm:px-6">
        <div className="grid gap-10 md:grid-cols-[1.4fr_1fr_1fr]">
          <div>
            <p className="font-serif text-xl font-semibold tracking-[-0.02em]">{siteName}</p>
            <p className="mt-1 text-[0.6875rem] uppercase tracking-[0.14em] text-[var(--color-muted-soft)]">
              {tagline}
            </p>
            <p className="mt-4 max-w-sm text-sm leading-relaxed text-[var(--color-muted)]">
              {siteConfig.description}
            </p>
          </div>

          <nav aria-label="Rubriken">
            <p className="eyebrow eyebrow-muted mb-3">Rubriken</p>
            <ul className="space-y-2">
              {categories.map((category) => (
                <li key={category.id}>
                  <Link
                    href={`/kategorie/${category.slug}`}
                    className="text-sm text-[var(--color-text-soft)] hover:text-[var(--color-accent)]"
                  >
                    {category.name}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          <nav aria-label="Redaktion und Rechtliches">
            <p className="eyebrow eyebrow-muted mb-3">Redaktion</p>
            <ul className="space-y-2">
              {staticPages.map((page) => (
                <li key={page.href}>
                  <Link
                    href={page.href}
                    className="text-sm text-[var(--color-text-soft)] hover:text-[var(--color-accent)]"
                  >
                    {page.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        </div>

        <div className="mt-10 flex flex-col gap-2 border-t border-[var(--color-border)] pt-6 text-xs text-[var(--color-muted)] sm:flex-row sm:items-center sm:justify-between">
          <p>
            © {year} {siteName}. Alle Rechte vorbehalten.
          </p>
          <p>
            Redaktionelle Hinweise und Korrekturen:{' '}
            <Link href="/korrekturen" className="underline underline-offset-2 hover:text-[var(--color-accent)]">
              Korrekturhinweis senden
            </Link>
          </p>
        </div>
      </div>
    </footer>
  )
}
