'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { ChevronDown, ChevronUp, Plus, Trash2 } from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { apiFetch } from '@/lib/admin-client'
import { slugify } from '@/lib/utils'

export interface CategoryRow {
  id: string
  name: string
  slug: string
  description: string
  intro: string
  seoTitle: string
  metaDescription: string
  order: number
  enabled: boolean
  showInNav: boolean
  postCount: number
}

const BLANK: Omit<CategoryRow, 'id' | 'postCount'> = {
  name: '',
  slug: '',
  description: '',
  intro: '',
  seoTitle: '',
  metaDescription: '',
  order: 0,
  enabled: true,
  showInNav: true,
}

export function CategoryManager({
  categories,
  canEdit,
}: {
  categories: CategoryRow[]
  canEdit: boolean
}) {
  const router = useRouter()
  const [editing, setEditing] = useState<string | null>(null)
  const [creating, setCreating] = useState(false)
  const [draft, setDraft] = useState<Omit<CategoryRow, 'id' | 'postCount'>>(BLANK)
  const [busy, setBusy] = useState('')
  const [error, setError] = useState('')

  const startEdit = (category: CategoryRow) => {
    setCreating(false)
    setEditing(category.id)
    setDraft({ ...category })
    setError('')
  }

  const startCreate = () => {
    setEditing(null)
    setCreating(true)
    setDraft({ ...BLANK, order: categories.length + 1 })
    setError('')
  }

  const save = async () => {
    setBusy('save')
    setError('')
    try {
      const payload = { ...draft, slug: draft.slug || slugify(draft.name) }
      if (creating) {
        await apiFetch('/api/admin/categories', { json: payload })
      } else if (editing) {
        await apiFetch(`/api/admin/categories/${editing}`, { method: 'PUT', json: payload })
      }
      setCreating(false)
      setEditing(null)
      router.refresh()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Не удалось сохранить.')
    }
    setBusy('')
  }

  const remove = async (category: CategoryRow) => {
    if (!window.confirm(`Удалить категорию «${category.name}»?`)) return
    setBusy(category.id)
    setError('')
    try {
      await apiFetch(`/api/admin/categories/${category.id}`, { method: 'DELETE' })
      router.refresh()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Не удалось удалить.')
    }
    setBusy('')
  }

  const reorder = async (category: CategoryRow, direction: -1 | 1) => {
    const sorted = [...categories].sort((a, b) => a.order - b.order)
    const index = sorted.findIndex((c) => c.id === category.id)
    const swapWith = sorted[index + direction]
    if (!swapWith) return

    setBusy(category.id)
    try {
      await apiFetch(`/api/admin/categories/${category.id}`, {
        method: 'PUT',
        json: { ...category, order: swapWith.order },
      })
      await apiFetch(`/api/admin/categories/${swapWith.id}`, {
        method: 'PUT',
        json: { ...swapWith, order: category.order },
      })
      router.refresh()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Не удалось изменить порядок.')
    }
    setBusy('')
  }

  return (
    <div className="space-y-4">
      {error && (
        <p className="rounded-sm border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      )}

      {canEdit && !creating && !editing && (
        <Button onClick={startCreate}>
          <Plus className="h-4 w-4" />
          Новая категория
        </Button>
      )}

      {(creating || editing) && (
        <section className="rounded border border-[var(--color-accent)] bg-[var(--color-surface)]">
          <header className="border-b border-[var(--color-border)] px-4 py-2.5">
            <h2 className="text-sm font-semibold">
              {creating ? 'Новая категория' : 'Редактирование категории'}
            </h2>
          </header>
          <div className="space-y-4 p-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="cat-name">Название</Label>
                <Input
                  id="cat-name"
                  value={draft.name}
                  onChange={(e) =>
                    setDraft({
                      ...draft,
                      name: e.target.value,
                      slug: creating ? slugify(e.target.value) : draft.slug,
                    })
                  }
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="cat-slug">Адрес (slug)</Label>
                <Input
                  id="cat-slug"
                  value={draft.slug}
                  onChange={(e) => setDraft({ ...draft, slug: e.target.value })}
                />
                <p className="text-xs text-[var(--color-muted)]">
                  /kategorie/{draft.slug || 'адрес'}
                </p>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="cat-desc">Краткое описание</Label>
              <Textarea
                id="cat-desc"
                value={draft.description}
                onChange={(e) => setDraft({ ...draft, description: e.target.value })}
                rows={2}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="cat-intro">Вводный текст на странице рубрики</Label>
              <Textarea
                id="cat-intro"
                value={draft.intro}
                onChange={(e) => setDraft({ ...draft, intro: e.target.value })}
                rows={2}
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="cat-seo">SEO-заголовок</Label>
                <Input
                  id="cat-seo"
                  value={draft.seoTitle}
                  onChange={(e) => setDraft({ ...draft, seoTitle: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="cat-meta">Meta description</Label>
                <Input
                  id="cat-meta"
                  value={draft.metaDescription}
                  onChange={(e) => setDraft({ ...draft, metaDescription: e.target.value })}
                />
              </div>
            </div>

            <div className="flex flex-wrap gap-6">
              <label className="flex items-center gap-2 text-sm">
                <Switch
                  checked={draft.enabled}
                  onCheckedChange={(v) => setDraft({ ...draft, enabled: v })}
                />
                Активна
              </label>
              <label className="flex items-center gap-2 text-sm">
                <Switch
                  checked={draft.showInNav}
                  onCheckedChange={(v) => setDraft({ ...draft, showInNav: v })}
                />
                Показывать в меню
              </label>
              <div className="flex items-center gap-2 text-sm">
                <Label htmlFor="cat-order">Порядок</Label>
                <Input
                  id="cat-order"
                  type="number"
                  min={0}
                  value={draft.order}
                  onChange={(e) => setDraft({ ...draft, order: Number(e.target.value) || 0 })}
                  className="w-20"
                />
              </div>
            </div>

            <div className="flex gap-2 border-t border-[var(--color-border)] pt-3">
              <Button onClick={save} loading={busy === 'save'} disabled={!draft.name.trim()}>
                Сохранить
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  setCreating(false)
                  setEditing(null)
                }}
              >
                Отмена
              </Button>
            </div>
          </div>
        </section>
      )}

      <div className="overflow-x-auto rounded border border-[var(--color-border)] bg-[var(--color-surface)]">
        <table className="w-full min-w-[42rem] text-sm">
          <thead className="border-b border-[var(--color-border)] bg-[var(--color-surface-sunken)] text-left">
            <tr className="text-xs uppercase tracking-wider text-[var(--color-muted)]">
              <th className="w-20 px-3 py-2 font-medium">Порядок</th>
              <th className="px-3 py-2 font-medium">Название</th>
              <th className="px-3 py-2 font-medium">Адрес</th>
              <th className="px-3 py-2 font-medium">Материалов</th>
              <th className="px-3 py-2 font-medium">Статус</th>
              <th className="px-3 py-2 text-right font-medium">Действия</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--color-border)]">
            {categories.map((category, index) => (
              <tr key={category.id}>
                <td className="px-3 py-2">
                  <div className="flex items-center gap-1">
                    <span className="w-5 tabular-nums text-[var(--color-muted)]">{category.order}</span>
                    {canEdit && (
                      <>
                        <button
                          type="button"
                          onClick={() => reorder(category, -1)}
                          disabled={index === 0 || busy === category.id}
                          className="text-[var(--color-muted-soft)] hover:text-[var(--color-text)] disabled:opacity-30"
                          aria-label="Выше"
                        >
                          <ChevronUp className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => reorder(category, 1)}
                          disabled={index === categories.length - 1 || busy === category.id}
                          className="text-[var(--color-muted-soft)] hover:text-[var(--color-text)] disabled:opacity-30"
                          aria-label="Ниже"
                        >
                          <ChevronDown className="h-3.5 w-3.5" />
                        </button>
                      </>
                    )}
                  </div>
                </td>
                <td className="px-3 py-2 font-medium">{category.name}</td>
                <td className="px-3 py-2 text-xs text-[var(--color-muted)]">/{category.slug}</td>
                <td className="px-3 py-2 tabular-nums text-[var(--color-muted)]">{category.postCount}</td>
                <td className="px-3 py-2">
                  {category.enabled ? (
                    <Badge variant="success">Активна</Badge>
                  ) : (
                    <Badge variant="neutral">Скрыта</Badge>
                  )}
                  {!category.showInNav && (
                    <Badge variant="outline" className="ml-1">
                      не в меню
                    </Badge>
                  )}
                </td>
                <td className="whitespace-nowrap px-3 py-2 text-right">
                  {canEdit ? (
                    <>
                      <button
                        type="button"
                        onClick={() => startEdit(category)}
                        className="text-xs text-[var(--color-accent)] hover:underline"
                      >
                        Изменить
                      </button>
                      {category.postCount === 0 && (
                        <button
                          type="button"
                          onClick={() => remove(category)}
                          disabled={busy === category.id}
                          className="ml-2 text-xs text-red-600 hover:underline disabled:opacity-50"
                        >
                          <Trash2 className="inline h-3 w-3" />
                        </button>
                      )}
                    </>
                  ) : (
                    <span className="text-xs text-[var(--color-muted-soft)]">только чтение</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
