'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { Archive, Copy, EyeOff, MoreHorizontal, Trash2 } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { apiFetch } from '@/lib/admin-client'

export function PostActions({
  postId,
  status,
  canDelete,
}: {
  postId: string
  status: string
  canDelete: boolean
}) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [busy, setBusy] = useState('')
  const [error, setError] = useState('')

  const run = async (key: string, body: Record<string, unknown>) => {
    setBusy(key)
    setError('')
    try {
      const result = await apiFetch<{ id?: string }>(`/api/admin/posts/${postId}`, {
        method: 'PATCH',
        json: body,
      })
      setOpen(false)
      if (key === 'duplicate' && result.id) {
        router.push(`/admin/posts/${result.id}`)
      } else {
        router.refresh()
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Действие не выполнено.')
    }
    setBusy('')
  }

  const remove = async () => {
    // Deleting a post also drops its revisions and redirects — a confirm here is
    // the only thing standing between a mis-click and lost work.
    if (!window.confirm('Удалить материал безвозвратно? Это действие нельзя отменить.')) return
    setBusy('delete')
    setError('')
    try {
      await apiFetch(`/api/admin/posts/${postId}`, { method: 'DELETE' })
      router.push('/admin/posts')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Не удалось удалить.')
      setBusy('')
    }
  }

  return (
    <div className="relative">
      <Button variant="outline" size="sm" onClick={() => setOpen(!open)} aria-expanded={open}>
        <MoreHorizontal className="h-4 w-4" />
        Действия
      </Button>

      {open && (
        <>
          <button
            type="button"
            className="fixed inset-0 z-10"
            onClick={() => setOpen(false)}
            aria-label="Закрыть меню"
          />
          <div className="absolute right-0 top-9 z-20 w-56 rounded border border-[var(--color-border-strong)] bg-[var(--color-surface)] p-1 shadow-[var(--shadow-pop)]">
            {status === 'PUBLISHED' && (
              <MenuItem
                icon={<EyeOff className="h-3.5 w-3.5" />}
                label="Снять с публикации"
                loading={busy === 'unpublish'}
                onClick={() => run('unpublish', { action: 'status', status: 'DRAFT' })}
              />
            )}
            <MenuItem
              icon={<Copy className="h-3.5 w-3.5" />}
              label="Дублировать"
              loading={busy === 'duplicate'}
              onClick={() => run('duplicate', { action: 'duplicate' })}
            />
            {status !== 'ARCHIVED' && (
              <MenuItem
                icon={<Archive className="h-3.5 w-3.5" />}
                label="В архив"
                loading={busy === 'archive'}
                onClick={() => run('archive', { action: 'status', status: 'ARCHIVED' })}
              />
            )}
            {canDelete && (
              <MenuItem
                icon={<Trash2 className="h-3.5 w-3.5" />}
                label="Удалить"
                danger
                loading={busy === 'delete'}
                onClick={remove}
              />
            )}
          </div>
        </>
      )}

      {error && (
        <p className="absolute right-0 top-10 z-30 w-64 rounded-sm border border-red-200 bg-red-50 px-2 py-1.5 text-xs text-red-700">
          {error}
        </p>
      )}
    </div>
  )
}

function MenuItem({
  icon,
  label,
  onClick,
  loading,
  danger,
}: {
  icon: React.ReactNode
  label: string
  onClick: () => void
  loading?: boolean
  danger?: boolean
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={loading}
      className={`flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-left text-sm disabled:opacity-50 ${
        danger ? 'text-red-600 hover:bg-red-50' : 'hover:bg-[var(--color-surface-sunken)]'
      }`}
    >
      {icon}
      {loading ? 'Выполняется…' : label}
    </button>
  )
}
