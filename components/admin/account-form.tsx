'use client'

import { useState } from 'react'
import { Check, KeyRound } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { apiFetch } from '@/lib/admin-client'

export function AccountForm() {
  const [current, setCurrent] = useState('')
  const [next, setNext] = useState('')
  const [repeat, setRepeat] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [done, setDone] = useState(false)

  const submit = async (event: React.FormEvent) => {
    event.preventDefault()
    setError('')

    if (next !== repeat) {
      setError('Новые пароли не совпадают.')
      return
    }
    if (next.length < 10) {
      setError('Минимум 10 символов.')
      return
    }

    setBusy(true)
    try {
      await apiFetch('/api/admin/auth/password', {
        json: { currentPassword: current, newPassword: next },
      })
      setDone(true)
      // Changing the password revokes every session, this one included.
      setTimeout(() => {
        window.location.href = '/admin/login'
      }, 2500)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Не удалось изменить пароль.')
      setBusy(false)
    }
  }

  if (done) {
    return (
      <section className="rounded border border-emerald-200 bg-emerald-50 p-5">
        <p className="flex items-center gap-2 text-sm font-medium text-emerald-900">
          <Check className="h-4 w-4" />
          Пароль изменён.
        </p>
        <p className="mt-1 text-sm text-emerald-800">
          Все сессии завершены. Сейчас вы будете перенаправлены на страницу входа.
        </p>
      </section>
    )
  }

  return (
    <section className="rounded border border-[var(--color-border)] bg-[var(--color-surface)]">
      <header className="flex items-center gap-2 border-b border-[var(--color-border)] px-4 py-2.5">
        <KeyRound className="h-4 w-4 text-[var(--color-muted)]" />
        <h2 className="text-sm font-semibold">Смена пароля</h2>
      </header>

      <form onSubmit={submit} className="space-y-4 p-4">
        <div className="space-y-1.5">
          <Label htmlFor="cur">Текущий пароль</Label>
          <Input
            id="cur"
            type="password"
            autoComplete="current-password"
            value={current}
            onChange={(e) => setCurrent(e.target.value)}
            required
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="new">Новый пароль</Label>
          <Input
            id="new"
            type="password"
            autoComplete="new-password"
            value={next}
            onChange={(e) => setNext(e.target.value)}
            required
          />
          <p className="text-xs text-[var(--color-muted)]">
            Минимум 10 символов, хотя бы одна буква и одна цифра.
          </p>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="rep">Повторите новый пароль</Label>
          <Input
            id="rep"
            type="password"
            autoComplete="new-password"
            value={repeat}
            onChange={(e) => setRepeat(e.target.value)}
            required
          />
        </div>

        {error && (
          <p className="rounded-sm border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </p>
        )}

        <p className="rounded-sm border border-[var(--color-border)] bg-[var(--color-surface-sunken)] px-3 py-2 text-xs text-[var(--color-muted)]">
          После смены пароля все активные сессии будут завершены — включая эту.
        </p>

        <Button type="submit" loading={busy} disabled={!current || !next || !repeat}>
          Изменить пароль
        </Button>
      </form>
    </section>
  )
}
