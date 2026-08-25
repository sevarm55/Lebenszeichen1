import { redirect } from 'next/navigation'

import { LoginForm } from './login-form'
import { getCurrentUser } from '@/server/auth/session'
import { siteConfig } from '@/config/site'

export const dynamic = 'force-dynamic'

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>
}) {
  const user = await getCurrentUser()
  if (user) redirect('/admin')

  const { next } = await searchParams

  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <p className="text-lg font-semibold tracking-[-0.01em]">{siteConfig.name}</p>
          <p className="mt-1 text-sm text-[var(--color-muted)]">Вход в редакцию</p>
        </div>

        <div className="rounded border border-[var(--color-border)] bg-[var(--color-surface)] p-6 shadow-sm">
          <LoginForm nextPath={sanitizeNext(next)} />
        </div>

        <p className="mt-6 text-center text-xs text-[var(--color-muted)]">
          Доступ только для сотрудников редакции.
        </p>
      </div>
    </div>
  )
}

/** Open-redirect guard: only same-origin admin paths are accepted. */
function sanitizeNext(next?: string): string {
  if (!next) return '/admin'
  if (!next.startsWith('/admin') || next.startsWith('//')) return '/admin'
  return next
}
