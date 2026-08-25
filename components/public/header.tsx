'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'
import { Menu, Search, X } from 'lucide-react'

import { cn } from '@/lib/utils'
import { staticPages, utilityNav } from '@/config/site'

interface NavCategory {
  id: string
  name: string
  slug: string
}

interface HeaderProps {
  siteName: string
  tagline: string
  categories: NavCategory[]
}

/**
 * Sticky but deliberately shallow (56px). A tall masthead on a phone eats the
 * screen a Facebook visitor landed on, and that is the traffic this site lives
 * on.
 */
export function SiteHeader({ siteName, tagline, categories }: HeaderProps) {
  const pathname = usePathname()
  const [menuOpen, setMenuOpen] = useState(false)
  const [searchOpen, setSearchOpen] = useState(false)
  const searchRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    setMenuOpen(false)
    setSearchOpen(false)
  }, [pathname])

  useEffect(() => {
    if (searchOpen) searchRef.current?.focus()
  }, [searchOpen])

  useEffect(() => {
    document.body.style.overflow = menuOpen ? 'hidden' : ''
    return () => {
      document.body.style.overflow = ''
    }
  }, [menuOpen])

  // Categories fit on one row up to seven; beyond that a secondary bar keeps
  // the masthead from wrapping.
  const primary = categories.slice(0, 7)
  const overflow = categories.slice(7)

  return (
    <header className="sticky top-0 z-50 border-b border-[var(--color-border)] bg-[var(--color-background)]/95 backdrop-blur supports-[backdrop-filter]:bg-[var(--color-background)]/80">
      <div className="mx-auto flex h-14 max-w-[1280px] items-center gap-3 px-4 sm:px-6">
        <button
          type="button"
          className="-ml-1.5 flex h-9 w-9 items-center justify-center rounded-sm text-[var(--color-text)] lg:hidden"
          onClick={() => setMenuOpen(true)}
          aria-label="Menü öffnen"
          aria-expanded={menuOpen}
        >
          <Menu className="h-5 w-5" />
        </button>

        <Link href="/" className="flex shrink-0 items-baseline gap-2" aria-label={`${siteName} — Startseite`}>
          <span className="font-serif text-xl font-semibold tracking-[-0.02em] sm:text-[1.375rem]">
            {siteName}
          </span>
          <span className="hidden text-[0.6875rem] uppercase tracking-[0.14em] text-[var(--color-muted-soft)] 2xl:inline">
            {tagline}
          </span>
        </Link>

        <nav
          className="ml-4 hidden flex-1 items-center gap-4 overflow-x-auto lg:flex xl:gap-5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          aria-label="Hauptnavigation"
        >
          {primary.map((category) => {
            const href = `/kategorie/${category.slug}`
            const active = pathname === href
            return (
              <Link
                key={category.id}
                href={href}
                className={cn(
                  'whitespace-nowrap text-[0.8125rem] font-medium transition-colors hover:text-[var(--color-accent)]',
                  active ? 'text-[var(--color-accent)]' : 'text-[var(--color-text-soft)]',
                )}
              >
                {category.name}
              </Link>
            )
          })}
          {utilityNav.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="whitespace-nowrap text-[0.8125rem] font-medium text-[var(--color-muted)] transition-colors hover:text-[var(--color-accent)]"
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-1">
          {searchOpen ? (
            <form action="/suche" method="get" className="flex items-center gap-1">
              <label htmlFor="header-search" className="sr-only">
                Suchbegriff
              </label>
              <input
                ref={searchRef}
                id="header-search"
                name="q"
                type="search"
                placeholder="Suchen…"
                className="h-8 w-40 rounded-sm border border-[var(--color-border-strong)] bg-[var(--color-surface)] px-2.5 text-sm sm:w-56"
              />
              <button
                type="button"
                onClick={() => setSearchOpen(false)}
                className="flex h-8 w-8 items-center justify-center text-[var(--color-muted)]"
                aria-label="Suche schließen"
              >
                <X className="h-4 w-4" />
              </button>
            </form>
          ) : (
            <button
              type="button"
              onClick={() => setSearchOpen(true)}
              className="flex h-9 w-9 items-center justify-center rounded-sm text-[var(--color-text)] hover:bg-[var(--color-surface-sunken)]"
              aria-label="Suche öffnen"
            >
              <Search className="h-4.5 w-4.5" style={{ width: 18, height: 18 }} />
            </button>
          )}
        </div>
      </div>

      {menuOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            type="button"
            className="absolute inset-0 bg-black/40"
            onClick={() => setMenuOpen(false)}
            aria-label="Menü schließen"
          />
          <nav
            className="absolute inset-y-0 left-0 flex w-[min(20rem,85vw)] flex-col overflow-y-auto bg-[var(--color-background)] shadow-[var(--shadow-pop)]"
            aria-label="Mobile Navigation"
          >
            <div className="flex h-14 items-center justify-between border-b border-[var(--color-border)] px-4">
              <span className="font-serif text-lg font-semibold">{siteName}</span>
              <button
                type="button"
                onClick={() => setMenuOpen(false)}
                className="flex h-9 w-9 items-center justify-center"
                aria-label="Menü schließen"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="px-4 py-4">
              <p className="eyebrow eyebrow-muted mb-2">Rubriken</p>
              <ul className="space-y-0.5">
                {categories.map((category) => (
                  <li key={category.id}>
                    <Link
                      href={`/kategorie/${category.slug}`}
                      className="block rounded-sm py-2 font-serif text-[1.0625rem] font-medium hover:text-[var(--color-accent)]"
                    >
                      {category.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            <div className="border-t border-[var(--color-border)] px-4 py-4">
              <ul className="space-y-0.5">
                {utilityNav.map((item) => (
                  <li key={item.href}>
                    <Link href={item.href} className="block py-1.5 text-sm text-[var(--color-text-soft)]">
                      {item.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            <div className="mt-auto border-t border-[var(--color-border)] px-4 py-4">
              <ul className="space-y-0.5">
                {staticPages.map((page) => (
                  <li key={page.href}>
                    <Link href={page.href} className="block py-1.5 text-[0.8125rem] text-[var(--color-muted)]">
                      {page.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          </nav>
        </div>
      )}

      {overflow.length > 0 && (
        <div className="hidden border-t border-[var(--color-border)] lg:block">
          <div className="mx-auto flex max-w-[1280px] items-center gap-5 px-6 py-1.5">
            {overflow.map((category) => (
              <Link
                key={category.id}
                href={`/kategorie/${category.slug}`}
                className="whitespace-nowrap text-xs text-[var(--color-muted)] transition-colors hover:text-[var(--color-accent)]"
              >
                {category.name}
              </Link>
            ))}
          </div>
        </div>
      )}
    </header>
  )
}
