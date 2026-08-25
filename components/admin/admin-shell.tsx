'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState } from 'react'
import {
  BarChart3,
  FileText,
  FolderTree,
  Image as ImageIcon,
  LayoutDashboard,
  Link2,
  LogOut,
  Menu,
  Settings,
  Sparkles,
  X,
} from 'lucide-react'

import { cn } from '@/lib/utils'

const NAV = [
  { href: '/admin', label: 'Обзор', icon: LayoutDashboard, exact: true },
  { href: '/admin/posts', label: 'Материалы', icon: FileText },
  { href: '/admin/posts/import', label: 'Импорт + AI', icon: Sparkles },
  { href: '/admin/media', label: 'Медиатека', icon: ImageIcon },
  { href: '/admin/categories', label: 'Категории', icon: FolderTree },
  { href: '/admin/sources', label: 'Источники', icon: Link2 },
  { href: '/admin/ai-tasks', label: 'AI-задачи', icon: BarChart3 },
  { href: '/admin/settings', label: 'Настройки', icon: Settings },
]

interface AdminShellProps {
  user: { name: string; email: string; role: string }
  siteName: string
  children: React.ReactNode
}

export function AdminShell({ user, siteName, children }: AdminShellProps) {
  const pathname = usePathname()
  const [mobileOpen, setMobileOpen] = useState(false)

  const isActive = (item: (typeof NAV)[number]) =>
    item.exact ? pathname === item.href : pathname.startsWith(item.href)

  const logout = async () => {
    await fetch('/api/admin/auth/logout', { method: 'POST' })
    window.location.href = '/admin/login'
  }

  return (
    <div className="flex min-h-screen">
      {/* ------------------------------------------------------ sidebar --- */}
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-40 flex w-60 flex-col border-r border-[var(--color-border)] bg-[var(--color-surface)] transition-transform lg:static lg:translate-x-0',
          mobileOpen ? 'translate-x-0' : '-translate-x-full',
        )}
      >
        <div className="flex h-14 items-center justify-between border-b border-[var(--color-border)] px-4">
          <Link href="/admin" className="text-sm font-semibold tracking-[-0.01em]">
            {siteName}
            <span className="ml-1.5 rounded-sm bg-[var(--color-accent-soft)] px-1.5 py-0.5 text-[0.625rem] font-medium uppercase tracking-wider text-[var(--color-accent)]">
              CMS
            </span>
          </Link>
          <button
            type="button"
            onClick={() => setMobileOpen(false)}
            className="lg:hidden"
            aria-label="Закрыть меню"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto p-2" aria-label="Разделы админки">
          <ul className="space-y-0.5">
            {NAV.map((item) => {
              const Icon = item.icon
              const active = isActive(item)
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    onClick={() => setMobileOpen(false)}
                    aria-current={active ? 'page' : undefined}
                    className={cn(
                      'flex items-center gap-2.5 rounded-sm px-2.5 py-2 text-sm transition-colors',
                      active
                        ? 'bg-[var(--color-accent-soft)] font-medium text-[var(--color-accent)]'
                        : 'text-[var(--color-text-soft)] hover:bg-[var(--color-surface-sunken)]',
                    )}
                  >
                    <Icon className="h-4 w-4 shrink-0" />
                    {item.label}
                  </Link>
                </li>
              )
            })}
          </ul>

          <div className="mt-4 border-t border-[var(--color-border)] pt-3">
            <Link
              href="/"
              target="_blank"
              className="flex items-center gap-2.5 rounded-sm px-2.5 py-2 text-sm text-[var(--color-muted)] hover:bg-[var(--color-surface-sunken)]"
            >
              <Link2 className="h-4 w-4" />
              Открыть сайт
            </Link>
          </div>
        </nav>

        <div className="border-t border-[var(--color-border)] p-3">
          <div className="mb-2 px-1">
            <p className="truncate text-sm font-medium">{user.name}</p>
            <p className="truncate text-xs text-[var(--color-muted)]">{user.email}</p>
            <p className="mt-1 inline-block rounded-sm bg-[var(--color-surface-sunken)] px-1.5 py-0.5 text-[0.625rem] font-medium uppercase tracking-wider text-[var(--color-muted)]">
              {user.role}
            </p>
          </div>
          <button
            type="button"
            onClick={logout}
            className="flex w-full items-center gap-2 rounded-sm px-2.5 py-2 text-sm text-[var(--color-muted)] transition-colors hover:bg-[var(--color-surface-sunken)] hover:text-[var(--color-text)]"
          >
            <LogOut className="h-4 w-4" />
            Выйти
          </button>
        </div>
      </aside>

      {mobileOpen && (
        <button
          type="button"
          className="fixed inset-0 z-30 bg-black/30 lg:hidden"
          onClick={() => setMobileOpen(false)}
          aria-label="Закрыть меню"
        />
      )}

      {/* --------------------------------------------------------- main --- */}
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-14 items-center gap-3 border-b border-[var(--color-border)] bg-[var(--color-surface)] px-4 lg:hidden">
          <button type="button" onClick={() => setMobileOpen(true)} aria-label="Открыть меню">
            <Menu className="h-5 w-5" />
          </button>
          <span className="text-sm font-semibold">{siteName} CMS</span>
        </header>

        <main className="min-w-0 flex-1 p-4 sm:p-6">{children}</main>
      </div>
    </div>
  )
}

export function PageHeader({
  title,
  description,
  actions,
}: {
  title: string
  description?: string
  actions?: React.ReactNode
}) {
  return (
    <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
      <div>
        <h1 className="text-xl font-semibold tracking-[-0.01em]">{title}</h1>
        {description && <p className="mt-1 text-sm text-[var(--color-muted)]">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  )
}
