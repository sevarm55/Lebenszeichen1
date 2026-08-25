'use client'

import { useRouter } from 'next/navigation'
import { useRef, useState } from 'react'
import { Trash2, Upload } from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { apiFetch, uploadFile } from '@/lib/admin-client'
import { formatDateDe } from '@/lib/utils'

export interface MediaRow {
  id: string
  url: string
  filename: string
  alt: string
  caption: string
  credit: string
  license: string
  width: number
  height: number
  fileSize: number
  sourceType: string
  createdAt: string
  usageCount: number
}

const SOURCE_LABELS: Record<string, string> = {
  UPLOAD: 'Загружено',
  AI_GENERATED: 'AI',
  EXTERNAL_URL: 'Внешний источник',
  STOCK: 'Сток',
}

export function MediaLibrary({ assets, canDelete }: { assets: MediaRow[]; canDelete: boolean }) {
  const router = useRouter()
  const [selected, setSelected] = useState<MediaRow | null>(null)
  const [busy, setBusy] = useState('')
  const [error, setError] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  const upload = async (file: File) => {
    setBusy('upload')
    setError('')
    try {
      await uploadFile('/api/admin/media', file)
      router.refresh()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Ошибка загрузки.')
    }
    setBusy('')
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <Button onClick={() => inputRef.current?.click()} loading={busy === 'upload'}>
          <Upload className="h-4 w-4" />
          Загрузить файл
        </Button>
        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/avif,image/gif"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0]
            if (file) void upload(file)
            e.target.value = ''
          }}
        />
        <p className="text-xs text-[var(--color-muted)]">
          Загруженные изображения конвертируются в WebP, EXIF удаляется, создаются адаптивные
          варианты.
        </p>
      </div>

      {error && (
        <p className="rounded-sm border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      )}

      {assets.length === 0 ? (
        <div className="rounded border border-dashed border-[var(--color-border-strong)] py-16 text-center text-sm text-[var(--color-muted)]">
          Медиатека пуста.
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-6">
          {assets.map((asset) => (
            <button
              key={asset.id}
              type="button"
              onClick={() => setSelected(asset)}
              className="group overflow-hidden rounded border border-[var(--color-border)] bg-[var(--color-surface)] text-left transition-colors hover:border-[var(--color-accent)]"
            >
              <div className="aspect-[4/3] bg-[var(--color-surface-sunken)]">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={asset.url} alt={asset.alt} className="h-full w-full object-cover" loading="lazy" />
              </div>
              <div className="p-2">
                <p className="truncate text-xs font-medium">{asset.alt || asset.filename}</p>
                <p className="mt-0.5 flex items-center gap-1 text-[0.6875rem] text-[var(--color-muted)]">
                  {asset.width}×{asset.height}
                  {asset.usageCount > 0 && <Badge variant="info">×{asset.usageCount}</Badge>}
                  {!asset.alt && <Badge variant="warning">нет alt</Badge>}
                </p>
              </div>
            </button>
          ))}
        </div>
      )}

      {selected && (
        <MediaDetail
          asset={selected}
          canDelete={canDelete}
          onClose={() => setSelected(null)}
          onChanged={() => {
            setSelected(null)
            router.refresh()
          }}
        />
      )}
    </div>
  )
}

function MediaDetail({
  asset,
  canDelete,
  onClose,
  onChanged,
}: {
  asset: MediaRow
  canDelete: boolean
  onClose: () => void
  onChanged: () => void
}) {
  const [alt, setAlt] = useState(asset.alt)
  const [caption, setCaption] = useState(asset.caption)
  const [credit, setCredit] = useState(asset.credit)
  const [license, setLicense] = useState(asset.license)
  const [busy, setBusy] = useState('')
  const [error, setError] = useState('')

  const save = async () => {
    setBusy('save')
    setError('')
    try {
      await apiFetch(`/api/admin/media/${asset.id}`, {
        method: 'PATCH',
        json: { alt, caption, credit, license },
      })
      onChanged()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Не удалось сохранить.')
      setBusy('')
    }
  }

  const remove = async () => {
    if (!window.confirm('Удалить файл безвозвратно?')) return
    setBusy('delete')
    setError('')
    try {
      await apiFetch(`/api/admin/media/${asset.id}`, { method: 'DELETE' })
      onChanged()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Не удалось удалить.')
      setBusy('')
    }
  }

  return (
    <Dialog open onOpenChange={(v) => !v && onClose()}>
      <DialogContent title="Изображение">
        <div className="grid gap-4 sm:grid-cols-[16rem_1fr]">
          <div>
            <div className="overflow-hidden rounded border border-[var(--color-border)]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={asset.url} alt={asset.alt} className="w-full" />
            </div>
            <dl className="mt-3 space-y-1 text-xs text-[var(--color-muted)]">
              <div className="flex justify-between">
                <dt>Размер</dt>
                <dd>
                  {asset.width}×{asset.height}
                </dd>
              </div>
              <div className="flex justify-between">
                <dt>Файл</dt>
                <dd>{(asset.fileSize / 1024).toFixed(0)} КБ</dd>
              </div>
              <div className="flex justify-between">
                <dt>Источник</dt>
                <dd>{SOURCE_LABELS[asset.sourceType] ?? asset.sourceType}</dd>
              </div>
              <div className="flex justify-between">
                <dt>Добавлено</dt>
                <dd>{formatDateDe(asset.createdAt)}</dd>
              </div>
              <div className="flex justify-between">
                <dt>Используется</dt>
                <dd>{asset.usageCount} раз</dd>
              </div>
            </dl>
          </div>

          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="m-alt">Alt-текст</Label>
              <Input id="m-alt" value={alt} onChange={(e) => setAlt(e.target.value)} />
              <p className="text-xs text-[var(--color-muted)]">
                Описывает изображение для незрячих читателей и для Google Images.
              </p>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="m-caption">Подпись</Label>
              <Input id="m-caption" value={caption} onChange={(e) => setCaption(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="m-credit">Автор / копирайт</Label>
              <Input id="m-credit" value={credit} onChange={(e) => setCredit(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="m-license">Лицензия</Label>
              <Input id="m-license" value={license} onChange={(e) => setLicense(e.target.value)} />
            </div>

            {error && <p className="text-sm text-red-600">{error}</p>}

            <div className="flex gap-2 pt-1">
              <Button onClick={save} loading={busy === 'save'}>
                Сохранить
              </Button>
              {canDelete && (
                <Button variant="danger" onClick={remove} loading={busy === 'delete'}>
                  <Trash2 className="h-4 w-4" />
                  Удалить
                </Button>
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
