import Link from 'next/link'
import { AlertTriangle, FileText, Plus, Sparkles } from 'lucide-react'

import { AdminShell, PageHeader } from '@/components/admin/admin-shell'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { prisma } from '@/lib/prisma'
import { relativeDe } from '@/lib/utils'
import { requireUser } from '@/server/auth/guard'
import { getAIProvider } from '@/server/ai'
import { env, assertProductionEnv } from '@/config/env'
import { getSettings, getSiteId } from '@/server/services/site'
import { STATUS_LABELS, statusVariant } from '@/components/admin/post-status'

export const dynamic = 'force-dynamic'

export default async function AdminDashboard() {
  const user = await requireUser()
  const settings = await getSettings()
  const siteId = await getSiteId()

  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)

  const [
    published,
    drafts,
    needsReview,
    scheduled,
    thisWeek,
    categories,
    mediaCount,
    latestPosts,
    latestImports,
    failedTasks,
  ] = await Promise.all([
    prisma.post.count({ where: { siteId, status: 'PUBLISHED' } }),
    prisma.post.count({ where: { siteId, status: 'DRAFT' } }),
    prisma.post.count({ where: { siteId, status: { in: ['NEEDS_REVIEW', 'READY'] } } }),
    prisma.post.count({ where: { siteId, status: 'SCHEDULED' } }),
    prisma.post.count({ where: { siteId, status: 'PUBLISHED', publishedAt: { gte: weekAgo } } }),
    prisma.category.count({ where: { siteId } }),
    prisma.mediaAsset.count({ where: { siteId } }),
    prisma.post.findMany({
      where: { siteId },
      select: {
        id: true,
        title: true,
        status: true,
        updatedAt: true,
        category: { select: { name: true } },
      },
      orderBy: { updatedAt: 'desc' },
      take: 8,
    }),
    prisma.post.findMany({
      where: { siteId, sourceUrl: { not: null } },
      select: { id: true, title: true, sourceDomain: true, createdAt: true, status: true },
      orderBy: { createdAt: 'desc' },
      take: 5,
    }),
    prisma.aITask.findMany({
      where: { status: 'FAILED' },
      select: { id: true, type: true, error: true, createdAt: true },
      orderBy: { createdAt: 'desc' },
      take: 5,
    }),
  ])

  const provider = getAIProvider()
  const envProblems = env.isProduction ? assertProductionEnv() : []

  const stats = [
    { label: 'Опубликовано', value: published, href: '/admin/posts?status=PUBLISHED' },
    { label: 'Черновики', value: drafts, href: '/admin/posts?status=DRAFT' },
    { label: 'На проверке', value: needsReview, href: '/admin/posts?status=NEEDS_REVIEW' },
    { label: 'Запланировано', value: scheduled, href: '/admin/posts?status=SCHEDULED' },
    { label: 'За 7 дней', value: thisWeek, href: '/admin/posts' },
    { label: 'Категории', value: categories, href: '/admin/categories' },
    { label: 'Медиафайлы', value: mediaCount, href: '/admin/media' },
  ]

  return (
    <AdminShell user={user} siteName={settings.siteName}>
      <PageHeader
        title={`Здравствуйте, ${user.name.split(' ')[0]}`}
        description="Состояние редакции на текущий момент."
        actions={
          <>
            <Button asChild variant="outline">
              <Link href="/admin/posts/new">
                <Plus className="h-4 w-4" />
                Новый материал
              </Link>
            </Button>
            <Button asChild>
              <Link href="/admin/posts/import">
                <Sparkles className="h-4 w-4" />
                Импорт из источника
              </Link>
            </Button>
          </>
        }
      />

      {/* ------------------------------------------------------- alerts --- */}
      <div className="mb-6 space-y-2">
        {envProblems.map((problem) => (
          <Alert key={problem} tone="danger">
            Проблема конфигурации: {problem}
          </Alert>
        ))}

        {!provider.info.ready && (
          <Alert tone="warning">
            AI-провайдер «{provider.info.label}» не готов: {provider.info.readyHint}
          </Alert>
        )}
        {provider.info.id === 'mock' && (
          <Alert tone="info">
            Активен mock-провайдер — тексты генерируются как заглушки. Для реальной работы задайте{' '}
            <code className="rounded-sm bg-white/60 px-1">AI_PROVIDER=fal</code> и{' '}
            <code className="rounded-sm bg-white/60 px-1">FAL_KEY</code>.
          </Alert>
        )}
        {!settings.adsEnabled && (
          <Alert tone="info">
            Реклама выключена. Включить и настроить плотность можно в{' '}
            <Link href="/admin/settings" className="underline underline-offset-2">
              настройках
            </Link>
            .
          </Alert>
        )}
        {settings.legal.companyName.startsWith('[') && (
          <Alert tone="warning">
            Юридические данные (импрессум) ещё не заполнены — сайт нельзя публиковать в Германии без
            них.{' '}
            <Link href="/admin/settings" className="underline underline-offset-2">
              Заполнить
            </Link>
          </Alert>
        )}
      </div>

      {/* -------------------------------------------------------- stats --- */}
      <div className="mb-8 grid grid-cols-2 gap-3 sm:grid-cols-4 xl:grid-cols-7">
        {stats.map((stat) => (
          <Link
            key={stat.label}
            href={stat.href}
            className="rounded border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-3 transition-colors hover:border-[var(--color-border-strong)]"
          >
            <p className="text-2xl font-semibold tabular-nums tracking-[-0.02em]">{stat.value}</p>
            <p className="mt-0.5 text-xs text-[var(--color-muted)]">{stat.label}</p>
          </Link>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* ------------------------------------------------ latest posts -- */}
        <section className="rounded border border-[var(--color-border)] bg-[var(--color-surface)]">
          <header className="flex items-center justify-between border-b border-[var(--color-border)] px-4 py-2.5">
            <h2 className="text-sm font-semibold">Последние изменения</h2>
            <Link href="/admin/posts" className="text-xs text-[var(--color-accent)] hover:underline">
              Все материалы
            </Link>
          </header>
          {latestPosts.length === 0 ? (
            <EmptyRow icon={<FileText className="h-5 w-5" />} text="Материалов пока нет." />
          ) : (
            <ul className="divide-y divide-[var(--color-border)]">
              {latestPosts.map((post) => (
                <li key={post.id}>
                  <Link
                    href={`/admin/posts/${post.id}`}
                    className="flex items-center gap-3 px-4 py-2.5 transition-colors hover:bg-[var(--color-surface-sunken)]"
                  >
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm">{post.title}</span>
                      <span className="block text-xs text-[var(--color-muted)]">
                        {post.category.name} · {relativeDe(post.updatedAt)}
                      </span>
                    </span>
                    <Badge variant={statusVariant(post.status)}>{STATUS_LABELS[post.status]}</Badge>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>

        <div className="space-y-6">
          {/* ---------------------------------------------- imports ------ */}
          <section className="rounded border border-[var(--color-border)] bg-[var(--color-surface)]">
            <header className="border-b border-[var(--color-border)] px-4 py-2.5">
              <h2 className="text-sm font-semibold">Последние импорты</h2>
            </header>
            {latestImports.length === 0 ? (
              <EmptyRow
                icon={<Sparkles className="h-5 w-5" />}
                text="Импортов ещё не было."
                action={{ href: '/admin/posts/import', label: 'Импортировать из URL' }}
              />
            ) : (
              <ul className="divide-y divide-[var(--color-border)]">
                {latestImports.map((post) => (
                  <li key={post.id}>
                    <Link
                      href={`/admin/posts/${post.id}`}
                      className="block px-4 py-2.5 transition-colors hover:bg-[var(--color-surface-sunken)]"
                    >
                      <span className="block truncate text-sm">{post.title}</span>
                      <span className="block text-xs text-[var(--color-muted)]">
                        {post.sourceDomain} · {relativeDe(post.createdAt)}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>

          {/* ------------------------------------------- failed AI jobs -- */}
          <section className="rounded border border-[var(--color-border)] bg-[var(--color-surface)]">
            <header className="flex items-center justify-between border-b border-[var(--color-border)] px-4 py-2.5">
              <h2 className="text-sm font-semibold">Сбои AI</h2>
              <Link href="/admin/ai-tasks" className="text-xs text-[var(--color-accent)] hover:underline">
                Все задачи
              </Link>
            </header>
            {failedTasks.length === 0 ? (
              <EmptyRow icon={<AlertTriangle className="h-5 w-5" />} text="Сбоев нет." />
            ) : (
              <ul className="divide-y divide-[var(--color-border)]">
                {failedTasks.map((task) => (
                  <li key={task.id} className="px-4 py-2.5">
                    <p className="text-sm">{task.type}</p>
                    <p className="truncate text-xs text-red-600">{task.error}</p>
                    <p className="text-xs text-[var(--color-muted)]">{relativeDe(task.createdAt)}</p>
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

function Alert({
  tone,
  children,
}: {
  tone: 'info' | 'warning' | 'danger'
  children: React.ReactNode
}) {
  const styles = {
    info: 'border-blue-200 bg-blue-50 text-blue-900',
    warning: 'border-amber-200 bg-amber-50 text-amber-900',
    danger: 'border-red-200 bg-red-50 text-red-900',
  }[tone]

  return (
    <div className={`flex items-start gap-2 rounded-sm border px-3 py-2 text-sm ${styles}`}>
      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
      <span>{children}</span>
    </div>
  )
}

function EmptyRow({
  icon,
  text,
  action,
}: {
  icon: React.ReactNode
  text: string
  action?: { href: string; label: string }
}) {
  return (
    <div className="flex flex-col items-center gap-2 px-4 py-10 text-center">
      <span className="text-[var(--color-muted-soft)]">{icon}</span>
      <p className="text-sm text-[var(--color-muted)]">{text}</p>
      {action && (
        <Link href={action.href} className="text-sm text-[var(--color-accent)] hover:underline">
          {action.label}
        </Link>
      )}
    </div>
  )
}
