import { AdminShell, PageHeader } from '@/components/admin/admin-shell'
import { AccountForm } from '@/components/admin/account-form'
import { prisma } from '@/lib/prisma'
import { formatDateDe } from '@/lib/utils'
import { requireUser } from '@/server/auth/guard'
import { getSettings } from '@/server/services/site'

export const dynamic = 'force-dynamic'

export default async function AccountPage() {
  const user = await requireUser()
  const settings = await getSettings()

  const [record, sessions, recentActions] = await Promise.all([
    prisma.user.findUniqueOrThrow({
      where: { id: user.id },
      select: { lastLoginAt: true, createdAt: true },
    }),
    prisma.session.count({ where: { userId: user.id, expiresAt: { gt: new Date() } } }),
    prisma.auditLog.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: 'desc' },
      take: 10,
      select: { action: true, detail: true, createdAt: true, ip: true },
    }),
  ])

  return (
    <AdminShell user={user} siteName={settings.siteName}>
      <PageHeader title="Мой аккаунт" description={`${user.name} · ${user.email} · ${user.role}`} />

      <div className="grid gap-5 lg:grid-cols-[minmax(0,26rem)_1fr]">
        <AccountForm />

        <div className="space-y-5">
          <section className="rounded border border-[var(--color-border)] bg-[var(--color-surface)]">
            <header className="border-b border-[var(--color-border)] px-4 py-2.5">
              <h2 className="text-sm font-semibold">Сессия</h2>
            </header>
            <dl className="space-y-1.5 px-4 py-3 text-sm">
              <Row label="Последний вход" value={record.lastLoginAt ? formatDateDe(record.lastLoginAt, { withTime: true }) : '—'} />
              <Row label="Активных сессий" value={String(sessions)} />
              <Row label="Аккаунт создан" value={formatDateDe(record.createdAt)} />
            </dl>
          </section>

          <section className="rounded border border-[var(--color-border)] bg-[var(--color-surface)]">
            <header className="border-b border-[var(--color-border)] px-4 py-2.5">
              <h2 className="text-sm font-semibold">Последние действия</h2>
            </header>
            {recentActions.length === 0 ? (
              <p className="px-4 py-6 text-center text-sm text-[var(--color-muted)]">Записей нет.</p>
            ) : (
              <ul className="divide-y divide-[var(--color-border)]">
                {recentActions.map((entry, index) => (
                  <li key={index} className="flex items-baseline justify-between gap-3 px-4 py-2">
                    <span className="min-w-0">
                      <span className="block text-sm">{entry.action}</span>
                      {entry.detail && (
                        <span className="block truncate text-xs text-[var(--color-muted)]">
                          {entry.detail}
                        </span>
                      )}
                    </span>
                    <time className="shrink-0 text-xs text-[var(--color-muted)]">
                      {formatDateDe(entry.createdAt, { withTime: true })}
                    </time>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      </div>
    </AdminShell>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-3">
      <dt className="text-[var(--color-muted)]">{label}</dt>
      <dd className="text-right font-medium">{value}</dd>
    </div>
  )
}
