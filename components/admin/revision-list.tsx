'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { History, RotateCcw } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { apiFetch } from '@/lib/admin-client'
import { relativeDe } from '@/lib/utils'

interface Revision {
  id: string
  note: string
  createdAt: string
  author: string
}

export function RevisionList({ postId, revisions }: { postId: string; revisions: Revision[] }) {
  const router = useRouter()
  const [busy, setBusy] = useState('')
  const [error, setError] = useState('')

  const restore = async (revisionId: string) => {
    if (!window.confirm('Восстановить эту версию? Текущее состояние будет сохранено в истории.')) {
      return
    }
    setBusy(revisionId)
    setError('')
    try {
      await apiFetch(`/api/admin/posts/${postId}`, {
        method: 'PATCH',
        json: { action: 'restore', revisionId },
      })
      router.refresh()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Не удалось восстановить версию.')
    }
    setBusy('')
  }

  return (
    <section className="rounded border border-[var(--color-border)] bg-[var(--color-surface)]">
      <header className="flex items-center gap-2 border-b border-[var(--color-border)] px-4 py-2.5">
        <History className="h-4 w-4 text-[var(--color-muted)]" />
        <h2 className="text-sm font-semibold">История версий</h2>
        <span className="text-xs text-[var(--color-muted)]">последние {revisions.length}</span>
      </header>

      {error && <p className="px-4 py-2 text-sm text-red-600">{error}</p>}

      <ul className="divide-y divide-[var(--color-border)]">
        {revisions.map((revision) => (
          <li key={revision.id} className="flex items-center justify-between gap-3 px-4 py-2.5">
            <div className="min-w-0">
              <p className="truncate text-sm">{revision.note || 'Изменение'}</p>
              <p className="text-xs text-[var(--color-muted)]">
                {relativeDe(revision.createdAt)} · {revision.author}
              </p>
            </div>
            <Button
              type="button"
              size="sm"
              variant="outline"
              loading={busy === revision.id}
              onClick={() => restore(revision.id)}
            >
              <RotateCcw className="h-3.5 w-3.5" />
              Восстановить
            </Button>
          </li>
        ))}
      </ul>
    </section>
  )
}
