import Link from 'next/link'

import { AdminShell, PageHeader } from '@/components/admin/admin-shell'
import { Badge } from '@/components/ui/badge'
import { SourceRow } from '@/components/admin/source-row'
import { prisma } from '@/lib/prisma'
import { formatDateDe } from '@/lib/utils'
import { requireUser } from '@/server/auth/guard'
import { getSettings, getSiteId } from '@/server/services/site'

export const dynamic = 'force-dynamic'

export default async function SourcesPage() {
  const user = await requireUser()
  const settings = await getSettings()
  const siteId = await getSiteId()

  const sources = await prisma.source.findMany({
    where: { siteId },
    orderBy: [{ lastImportAt: 'desc' }, { domain: 'asc' }],
    include: { _count: { select: { posts: true } } },
  })

  return (
    <AdminShell user={user} siteName={settings.siteName}>
      <PageHeader
        title="Источники"
        description="Домены, из которых импортировались материалы. Заблокированный источник исключается из работы редакции."
      />

      {sources.length === 0 ? (
        <div className="rounded border border-dashed border-[var(--color-border-strong)] py-16 text-center">
          <p className="text-sm text-[var(--color-muted)]">Импортов ещё не было.</p>
          <Link
            href="/admin/posts/import"
            className="mt-2 inline-block text-sm text-[var(--color-accent)] hover:underline"
          >
            Импортировать первый материал
          </Link>
        </div>
      ) : (
        <div className="overflow-x-auto rounded border border-[var(--color-border)] bg-[var(--color-surface)]">
          <table className="w-full min-w-[46rem] text-sm">
            <thead className="border-b border-[var(--color-border)] bg-[var(--color-surface-sunken)] text-left">
              <tr className="text-xs uppercase tracking-wider text-[var(--color-muted)]">
                <th className="px-3 py-2 font-medium">Домен</th>
                <th className="px-3 py-2 font-medium">Название</th>
                <th className="px-3 py-2 font-medium">Импортов</th>
                <th className="px-3 py-2 font-medium">Материалов</th>
                <th className="px-3 py-2 font-medium">Последний</th>
                <th className="px-3 py-2 font-medium">Статус</th>
                <th className="px-3 py-2 text-right font-medium">Действия</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--color-border)]">
              {sources.map((source) => (
                <tr key={source.id}>
                  <td className="px-3 py-2 font-medium">{source.domain}</td>
                  <td className="px-3 py-2 text-[var(--color-muted)]">{source.name}</td>
                  <td className="px-3 py-2 tabular-nums text-[var(--color-muted)]">
                    {source.importCount}
                  </td>
                  <td className="px-3 py-2 tabular-nums text-[var(--color-muted)]">
                    <Link
                      href={`/admin/posts?q=${encodeURIComponent(source.domain)}`}
                      className="hover:text-[var(--color-accent)] hover:underline"
                    >
                      {source._count.posts}
                    </Link>
                  </td>
                  <td className="px-3 py-2 text-xs text-[var(--color-muted)]">
                    {source.lastImportAt ? formatDateDe(source.lastImportAt) : '—'}
                  </td>
                  <td className="px-3 py-2">
                    {source.status === 'ENABLED' ? (
                      <Badge variant="success">Активен</Badge>
                    ) : (
                      <Badge variant="danger">Заблокирован</Badge>
                    )}
                  </td>
                  <td className="px-3 py-2 text-right">
                    <SourceRow id={source.id} status={source.status} notes={source.notes} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </AdminShell>
  )
}
