import Link from 'next/link'

import { AdminShell, PageHeader } from '@/components/admin/admin-shell'
import { Badge } from '@/components/ui/badge'
import { prisma } from '@/lib/prisma'
import { relativeDe } from '@/lib/utils'
import { requireUser } from '@/server/auth/guard'
import { getAIProvider } from '@/server/ai'
import { getSettings } from '@/server/services/site'
import type { AITaskStatus } from '@prisma/client'

export const dynamic = 'force-dynamic'

const STATUS_LABEL: Record<AITaskStatus, string> = {
  QUEUED: 'В очереди',
  PROCESSING: 'Выполняется',
  COMPLETED: 'Готово',
  FAILED: 'Ошибка',
}

const TYPE_LABEL: Record<string, string> = {
  SUMMARIZE_SOURCE: 'Разбор источника',
  GENERATE_ARTICLE: 'Генерация статьи',
  REWRITE_SECTION: 'Перефразирование',
  GENERATE_HEADLINES: 'Заголовки',
  GENERATE_SEO: 'SEO',
  GENERATE_TAGS: 'Теги',
  GENERATE_IMAGE: 'Изображение',
}

export default async function AiTasksPage() {
  const user = await requireUser()
  const settings = await getSettings()
  const provider = getAIProvider()

  const [tasks, stats] = await Promise.all([
    prisma.aITask.findMany({
      orderBy: { createdAt: 'desc' },
      take: 80,
      include: {
        post: { select: { id: true, title: true } },
        user: { select: { name: true } },
      },
    }),
    prisma.aITask.groupBy({ by: ['status'], _count: true }),
  ])

  const counts = Object.fromEntries(stats.map((s) => [s.status, s._count]))

  return (
    <AdminShell user={user} siteName={settings.siteName}>
      <PageHeader
        title="AI-задачи"
        description={`Провайдер: ${provider.info.label}${provider.info.ready ? '' : ' — не настроен'} · Модель: ${provider.info.textModel}`}
      />

      <div className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {(['QUEUED', 'PROCESSING', 'COMPLETED', 'FAILED'] as AITaskStatus[]).map((status) => (
          <div
            key={status}
            className="rounded border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-3"
          >
            <p className="text-2xl font-semibold tabular-nums">{counts[status] ?? 0}</p>
            <p className="mt-0.5 text-xs text-[var(--color-muted)]">{STATUS_LABEL[status]}</p>
          </div>
        ))}
      </div>

      {tasks.length === 0 ? (
        <div className="rounded border border-dashed border-[var(--color-border-strong)] py-16 text-center text-sm text-[var(--color-muted)]">
          AI-задач ещё не было.
        </div>
      ) : (
        <div className="overflow-x-auto rounded border border-[var(--color-border)] bg-[var(--color-surface)]">
          <table className="w-full min-w-[48rem] text-sm">
            <thead className="border-b border-[var(--color-border)] bg-[var(--color-surface-sunken)] text-left">
              <tr className="text-xs uppercase tracking-wider text-[var(--color-muted)]">
                <th className="px-3 py-2 font-medium">Тип</th>
                <th className="px-3 py-2 font-medium">Статус</th>
                <th className="px-3 py-2 font-medium">Модель</th>
                <th className="px-3 py-2 font-medium">Материал</th>
                <th className="px-3 py-2 font-medium">Длительность</th>
                <th className="px-3 py-2 font-medium">Когда</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--color-border)]">
              {tasks.map((task) => (
                <tr key={task.id}>
                  <td className="px-3 py-2">{TYPE_LABEL[task.type] ?? task.type}</td>
                  <td className="px-3 py-2">
                    <Badge
                      variant={
                        task.status === 'COMPLETED'
                          ? 'success'
                          : task.status === 'FAILED'
                            ? 'danger'
                            : 'warning'
                      }
                    >
                      {STATUS_LABEL[task.status]}
                    </Badge>
                    {task.error && (
                      <p className="mt-0.5 max-w-xs truncate text-xs text-red-600" title={task.error}>
                        {task.error}
                      </p>
                    )}
                  </td>
                  <td className="px-3 py-2 text-xs text-[var(--color-muted)]">
                    {task.provider} · {task.model || '—'}
                  </td>
                  <td className="max-w-[16rem] px-3 py-2">
                    {task.post ? (
                      <Link
                        href={`/admin/posts/${task.post.id}`}
                        className="block truncate text-xs hover:text-[var(--color-accent)] hover:underline"
                      >
                        {task.post.title}
                      </Link>
                    ) : (
                      <span className="text-xs text-[var(--color-muted-soft)]">—</span>
                    )}
                  </td>
                  <td className="px-3 py-2 tabular-nums text-xs text-[var(--color-muted)]">
                    {task.durationMs ? `${(task.durationMs / 1000).toFixed(1)} с` : '—'}
                  </td>
                  <td className="px-3 py-2 text-xs text-[var(--color-muted)]">
                    {relativeDe(task.createdAt)}
                    {task.user && <span className="block">{task.user.name}</span>}
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
