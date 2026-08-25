import Link from 'next/link'
import { Plus, Search, Sparkles } from 'lucide-react'
import type { Prisma, PostStatus } from '@prisma/client'

import { AdminShell, PageHeader } from '@/components/admin/admin-shell'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ORIGIN_LABELS, STATUS_LABELS, STATUS_ORDER, statusVariant } from '@/components/admin/post-status'
import { prisma } from '@/lib/prisma'
import { formatDateDe, relativeDe } from '@/lib/utils'
import { requireUser } from '@/server/auth/guard'
import { getSettings, getSiteId } from '@/server/services/site'

export const dynamic = 'force-dynamic'

const PER_PAGE = 25

interface PageProps {
  searchParams: Promise<{
    status?: string
    category?: string
    origin?: string
    q?: string
    from?: string
    page?: string
  }>
}

export default async function PostsListPage({ searchParams }: PageProps) {
  const user = await requireUser()
  const settings = await getSettings()
  const siteId = await getSiteId()
  const filters = await searchParams

  const page = Math.max(1, Number(filters.page ?? '1') || 1)

  const where: Prisma.PostWhereInput = { siteId }
  if (filters.status && STATUS_ORDER.includes(filters.status as PostStatus)) {
    where.status = filters.status as PostStatus
  }
  if (filters.category) where.categoryId = filters.category
  if (filters.origin) where.origin = filters.origin as Prisma.EnumPostOriginFilter['equals']
  if (filters.from) {
    const from = new Date(filters.from)
    if (!Number.isNaN(from.getTime())) where.createdAt = { gte: from }
  }
  if (filters.q?.trim()) {
    const term = filters.q.trim()
    where.OR = [
      { title: { contains: term, mode: 'insensitive' } },
      { slug: { contains: term, mode: 'insensitive' } },
      { excerpt: { contains: term, mode: 'insensitive' } },
      { sourceDomain: { contains: term, mode: 'insensitive' } },
    ]
  }

  const [posts, total, categories] = await Promise.all([
    prisma.post.findMany({
      where,
      select: {
        id: true,
        title: true,
        slug: true,
        status: true,
        origin: true,
        language: true,
        views: true,
        createdAt: true,
        publishedAt: true,
        updatedAt: true,
        sourceDomain: true,
        category: { select: { name: true, slug: true } },
        heroImage: { select: { url: true, alt: true } },
      },
      orderBy: { updatedAt: 'desc' },
      skip: (page - 1) * PER_PAGE,
      take: PER_PAGE,
    }),
    prisma.post.count({ where }),
    prisma.category.findMany({
      where: { siteId },
      orderBy: { order: 'asc' },
      select: { id: true, name: true },
    }),
  ])

  const totalPages = Math.max(1, Math.ceil(total / PER_PAGE))

  const buildHref = (patch: Record<string, string | undefined>) => {
    const params = new URLSearchParams()
    const merged = { ...filters, ...patch }
    for (const [key, value] of Object.entries(merged)) {
      if (value && key !== 'page') params.set(key, value)
    }
    if (patch.page && patch.page !== '1') params.set('page', patch.page)
    const query = params.toString()
    return `/admin/posts${query ? `?${query}` : ''}`
  }

  return (
    <AdminShell user={user} siteName={settings.siteName}>
      <PageHeader
        title="Материалы"
        description={`${total} записей`}
        actions={
          <>
            <Button variant="outline" asChild>
              <Link href="/admin/posts/import">
                <Sparkles className="h-4 w-4" />
                Импорт + AI
              </Link>
            </Button>
            <Button asChild>
              <Link href="/admin/posts/new">
                <Plus className="h-4 w-4" />
                Новый материал
              </Link>
            </Button>
          </>
        }
      />

      {/* ------------------------------------------------------ filters --- */}
      <form
        method="get"
        className="mb-4 flex flex-wrap items-end gap-2 rounded border border-[var(--color-border)] bg-[var(--color-surface)] p-3"
      >
        <div className="relative min-w-[14rem] flex-1">
          <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[var(--color-muted-soft)]" />
          <Input
            name="q"
            defaultValue={filters.q ?? ''}
            placeholder="Поиск по заголовку, адресу, источнику…"
            className="pl-8"
            aria-label="Поиск"
          />
        </div>

        <select
          name="status"
          defaultValue={filters.status ?? ''}
          className="h-9 rounded-sm border border-[var(--color-border-strong)] bg-[var(--color-surface)] px-2 text-sm"
          aria-label="Статус"
        >
          <option value="">Все статусы</option>
          {STATUS_ORDER.map((status) => (
            <option key={status} value={status}>
              {STATUS_LABELS[status]}
            </option>
          ))}
        </select>

        <select
          name="category"
          defaultValue={filters.category ?? ''}
          className="h-9 rounded-sm border border-[var(--color-border-strong)] bg-[var(--color-surface)] px-2 text-sm"
          aria-label="Категория"
        >
          <option value="">Все категории</option>
          {categories.map((category) => (
            <option key={category.id} value={category.id}>
              {category.name}
            </option>
          ))}
        </select>

        <select
          name="origin"
          defaultValue={filters.origin ?? ''}
          className="h-9 rounded-sm border border-[var(--color-border-strong)] bg-[var(--color-surface)] px-2 text-sm"
          aria-label="Происхождение"
        >
          <option value="">Любое происхождение</option>
          {Object.entries(ORIGIN_LABELS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>

        <Input
          type="date"
          name="from"
          defaultValue={filters.from ?? ''}
          className="w-auto"
          aria-label="Создано начиная с"
        />

        <Button type="submit" variant="outline">
          Применить
        </Button>
        <Button type="button" variant="ghost" asChild>
          <Link href="/admin/posts">Сбросить</Link>
        </Button>
      </form>

      {/* -------------------------------------------------------- table --- */}
      {posts.length === 0 ? (
        <div className="rounded border border-dashed border-[var(--color-border-strong)] py-16 text-center">
          <p className="text-sm text-[var(--color-muted)]">Ничего не найдено.</p>
          <Button className="mt-4" asChild>
            <Link href="/admin/posts/new">Создать материал</Link>
          </Button>
        </div>
      ) : (
        <div className="overflow-x-auto rounded border border-[var(--color-border)] bg-[var(--color-surface)]">
          <table className="w-full min-w-[56rem] text-sm">
            <thead className="border-b border-[var(--color-border)] bg-[var(--color-surface-sunken)] text-left">
              <tr className="text-xs uppercase tracking-wider text-[var(--color-muted)]">
                <th className="w-14 px-3 py-2 font-medium">Фото</th>
                <th className="px-3 py-2 font-medium">Заголовок</th>
                <th className="px-3 py-2 font-medium">Категория</th>
                <th className="px-3 py-2 font-medium">Статус</th>
                <th className="px-3 py-2 font-medium">Источник</th>
                <th className="px-3 py-2 font-medium">Просмотры</th>
                <th className="px-3 py-2 font-medium">Обновлён</th>
                <th className="px-3 py-2 text-right font-medium">Действия</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--color-border)]">
              {posts.map((post) => (
                <tr key={post.id} className="hover:bg-[var(--color-surface-sunken)]/60">
                  <td className="px-3 py-2">
                    <div className="h-9 w-12 overflow-hidden rounded-sm bg-[var(--color-surface-sunken)]">
                      {post.heroImage?.url && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={post.heroImage.url}
                          alt=""
                          className="h-full w-full object-cover"
                          loading="lazy"
                        />
                      )}
                    </div>
                  </td>
                  <td className="max-w-sm px-3 py-2">
                    <Link
                      href={`/admin/posts/${post.id}`}
                      className="block truncate font-medium hover:text-[var(--color-accent)]"
                    >
                      {post.title}
                    </Link>
                    <span className="block truncate text-xs text-[var(--color-muted)]">
                      /{post.category.slug}/{post.slug}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-[var(--color-muted)]">{post.category.name}</td>
                  <td className="px-3 py-2">
                    <Badge variant={statusVariant(post.status)}>{STATUS_LABELS[post.status]}</Badge>
                    {post.publishedAt && post.status === 'PUBLISHED' && (
                      <span className="mt-0.5 block text-[0.6875rem] text-[var(--color-muted)]">
                        {formatDateDe(post.publishedAt)}
                      </span>
                    )}
                  </td>
                  <td className="px-3 py-2 text-xs text-[var(--color-muted)]">
                    {post.sourceDomain ?? ORIGIN_LABELS[post.origin] ?? '—'}
                  </td>
                  <td className="px-3 py-2 tabular-nums text-[var(--color-muted)]">{post.views}</td>
                  <td className="px-3 py-2 text-xs text-[var(--color-muted)]">
                    {relativeDe(post.updatedAt)}
                  </td>
                  <td className="whitespace-nowrap px-3 py-2 text-right">
                    <Link
                      href={`/admin/posts/${post.id}`}
                      className="text-xs text-[var(--color-accent)] hover:underline"
                    >
                      Открыть
                    </Link>
                    <span className="mx-1.5 text-[var(--color-border-strong)]">·</span>
                    <Link
                      href={`/admin/vorschau/${post.id}`}
                      target="_blank"
                      className="text-xs text-[var(--color-muted)] hover:underline"
                    >
                      Просмотр
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {totalPages > 1 && (
        <nav className="mt-4 flex items-center justify-center gap-1.5" aria-label="Постраничная навигация">
          {page > 1 && (
            <Button variant="outline" size="sm" asChild>
              <Link href={buildHref({ page: String(page - 1) })}>Назад</Link>
            </Button>
          )}
          <span className="px-3 text-sm text-[var(--color-muted)]">
            Страница {page} из {totalPages}
          </span>
          {page < totalPages && (
            <Button variant="outline" size="sm" asChild>
              <Link href={buildHref({ page: String(page + 1) })}>Вперёд</Link>
            </Button>
          )}
        </nav>
      )}
    </AdminShell>
  )
}
