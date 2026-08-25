'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'

import { Button } from '@/components/ui/button'
import { apiFetch } from '@/lib/admin-client'

export function SourceRow({
  id,
  status,
  notes,
}: {
  id: string
  status: string
  notes: string
}) {
  const router = useRouter()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const toggle = async () => {
    setBusy(true)
    setError('')
    try {
      await apiFetch(`/api/admin/sources/${id}`, {
        method: 'PATCH',
        json: { status: status === 'ENABLED' ? 'BLOCKED' : 'ENABLED' },
      })
      router.refresh()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Не удалось изменить.')
    }
    setBusy(false)
  }

  const editNotes = async () => {
    const value = window.prompt('Заметка об источнике', notes)
    if (value === null) return
    setBusy(true)
    try {
      await apiFetch(`/api/admin/sources/${id}`, { method: 'PATCH', json: { notes: value } })
      router.refresh()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Не удалось сохранить.')
    }
    setBusy(false)
  }

  return (
    <div className="flex items-center justify-end gap-2">
      {error && <span className="text-xs text-red-600">{error}</span>}
      <Button size="sm" variant="ghost" onClick={editNotes} disabled={busy}>
        Заметка
      </Button>
      <Button size="sm" variant="outline" onClick={toggle} loading={busy}>
        {status === 'ENABLED' ? 'Заблокировать' : 'Разблокировать'}
      </Button>
    </div>
  )
}
