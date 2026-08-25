import { notFound } from 'next/navigation'
import Link from 'next/link'

import { AdminShell, PageHeader } from '@/components/admin/admin-shell'
import { Badge } from '@/components/ui/badge'
import { PostEditor } from '@/components/admin/post-editor'
import { loadEditorOptions, loadPostForEditor } from '@/components/admin/editor-data'
import { STATUS_LABELS, statusVariant } from '@/components/admin/post-status'
import { PostActions } from '@/components/admin/post-actions'
import { RevisionList } from '@/components/admin/revision-list'
import { prisma } from '@/lib/prisma'
import { requireUser } from '@/server/auth/guard'
import { getAIProvider } from '@/server/ai'
import { getSettings } from '@/server/services/site'
import type { PostStatus } from '@prisma/client'

export const dynamic = 'force-dynamic'

export default async function EditPostPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser()
  const { id } = await params

  const [settings, initial, options] = await Promise.all([
    getSettings(),
    loadPostForEditor(id),
    loadEditorOptions(),
  ])

  if (!initial) notFound()

  const revisions = await prisma.postRevision.findMany({
    where: { postId: id },
    orderBy: { createdAt: 'desc' },
    take: 10,
    select: { id: true, note: true, createdAt: true, createdBy: { select: { name: true } } },
  })

  const provider = getAIProvider()

  return (
    <AdminShell user={user} siteName={settings.siteName}>
      <PageHeader
        title="Редактирование материала"
        description={initial.title}
        actions={
          <>
            <Badge variant={statusVariant(initial.status as PostStatus)}>
              {STATUS_LABELS[initial.status as PostStatus]}
            </Badge>
            <PostActions
              postId={id}
              status={initial.status}
              canDelete={user.role === 'OWNER' || user.role === 'ADMIN'}
            />
          </>
        }
      />

      <PostEditor
        initial={initial}
        categories={options.categories}
        authors={options.authors}
        aiProvider={{
          id: provider.info.id,
          label: provider.info.label,
          ready: provider.info.ready,
          readyHint: provider.info.readyHint,
        }}
      />

      {revisions.length > 0 && (
        <div className="mt-6 xl:max-w-[calc(100%-21rem)]">
          <RevisionList
            postId={id}
            revisions={revisions.map((revision) => ({
              id: revision.id,
              note: revision.note,
              createdAt: revision.createdAt.toISOString(),
              author: revision.createdBy?.name ?? '—',
            }))}
          />
        </div>
      )}

      <p className="mt-6 text-xs text-[var(--color-muted)]">
        <Link href="/admin/posts" className="underline underline-offset-2">
          ← Ко всем материалам
        </Link>
      </p>
    </AdminShell>
  )
}
