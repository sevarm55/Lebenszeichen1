'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { ImagePlus, Loader2, Search, Sparkles, Upload, X } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { apiFetch, uploadFile } from '@/lib/admin-client'
import { cn } from '@/lib/utils'

export interface MediaAssetLite {
  id: string
  url: string
  alt: string
  caption: string
  credit: string
  filename: string
  width: number
  height: number
  fileSize: number
  sourceType: string
  createdAt: string
}

export interface PickedImage {
  mediaId: string
  url: string
  alt: string
}

interface MediaPickerProps {
  open: boolean
  onClose: () => void
  onPick: (image: PickedImage) => void
  /** Seeds the AI prompt — normally the article headline. */
  promptSeed?: string
  /** Candidate images found by the URL importer. */
  candidates?: { url: string; alt: string }[]
}

type Tab = 'library' | 'upload' | 'ai' | 'url' | 'candidates'

export function MediaPicker({ open, onClose, onPick, promptSeed, candidates }: MediaPickerProps) {
  const [tab, setTab] = useState<Tab>('library')
  const [items, setItems] = useState<MediaAssetLite[]>([])
  const [loading, setLoading] = useState(false)
  const [query, setQuery] = useState('')
  const [error, setError] = useState('')

  const load = useCallback(async (q = '') => {
    setLoading(true)
    setError('')
    try {
      const data = await apiFetch<{ items: MediaAssetLite[] }>(
        `/api/admin/media?perPage=40${q ? `&q=${encodeURIComponent(q)}` : ''}`,
      )
      setItems(data.items)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Не удалось загрузить медиатеку.')
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    if (open) void load()
  }, [open, load])

  useEffect(() => {
    if (open && candidates?.length) setTab('candidates')
  }, [open, candidates])

  const tabs: { id: Tab; label: string; hidden?: boolean }[] = [
    { id: 'library', label: 'Медиатека' },
    { id: 'upload', label: 'Загрузить' },
    { id: 'ai', label: 'AI-генерация' },
    { id: 'url', label: 'По ссылке' },
    { id: 'candidates', label: `Из источника${candidates?.length ? ` (${candidates.length})` : ''}`, hidden: !candidates?.length },
  ]

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent title="Изображение" className="w-[min(100vw-2rem,58rem)]">
        <div className="mb-4 flex flex-wrap gap-1 border-b border-[var(--color-border)]">
          {tabs
            .filter((t) => !t.hidden)
            .map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setTab(t.id)}
                className={cn(
                  '-mb-px border-b-2 px-3 py-2 text-sm transition-colors',
                  tab === t.id
                    ? 'border-[var(--color-accent)] font-medium text-[var(--color-accent)]'
                    : 'border-transparent text-[var(--color-muted)] hover:text-[var(--color-text)]',
                )}
              >
                {t.label}
              </button>
            ))}
        </div>

        {error && (
          <p className="mb-3 rounded-sm border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </p>
        )}

        {tab === 'library' && (
          <div>
            <div className="mb-3 flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[var(--color-muted-soft)]" />
                <Input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), void load(query))}
                  placeholder="Поиск по названию или alt…"
                  className="pl-8"
                />
              </div>
              <Button type="button" variant="outline" onClick={() => void load(query)}>
                Найти
              </Button>
            </div>

            {loading ? (
              <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
                {Array.from({ length: 10 }).map((_, i) => (
                  <div key={i} className="skeleton aspect-[4/3] rounded-sm" />
                ))}
              </div>
            ) : items.length === 0 ? (
              <p className="py-12 text-center text-sm text-[var(--color-muted)]">
                Медиатека пуста. Загрузите файл или сгенерируйте изображение.
              </p>
            ) : (
              <div className="grid max-h-[24rem] grid-cols-3 gap-2 overflow-y-auto sm:grid-cols-5">
                {items.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => onPick({ mediaId: item.id, url: item.url, alt: item.alt })}
                    className="group overflow-hidden rounded-sm border border-[var(--color-border)] text-left transition-colors hover:border-[var(--color-accent)]"
                  >
                    <div className="aspect-[4/3] bg-[var(--color-surface-sunken)]">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={item.url} alt={item.alt} className="h-full w-full object-cover" loading="lazy" />
                    </div>
                    <p className="truncate px-1.5 py-1 text-[0.6875rem] text-[var(--color-muted)]">
                      {item.alt || item.filename}
                    </p>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {tab === 'upload' && <UploadPane onDone={(a) => onPick({ mediaId: a.id, url: a.url, alt: a.alt })} />}
        {tab === 'ai' && (
          <AiPane
            promptSeed={promptSeed}
            onDone={(a) => onPick({ mediaId: a.id, url: a.url, alt: a.alt })}
          />
        )}
        {tab === 'url' && <UrlPane onDone={(a) => onPick({ mediaId: a.id, url: a.url, alt: a.alt })} />}
        {tab === 'candidates' && candidates && (
          <CandidatePane candidates={candidates} onDone={(a) => onPick({ mediaId: a.id, url: a.url, alt: a.alt })} />
        )}
      </DialogContent>
    </Dialog>
  )
}

function UploadPane({ onDone }: { onDone: (asset: MediaAssetLite) => void }) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [dragOver, setDragOver] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const upload = async (file: File) => {
    setBusy(true)
    setError('')
    try {
      const data = await uploadFile<{ asset: MediaAssetLite }>('/api/admin/media', file)
      onDone(data.asset)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Ошибка загрузки.')
    }
    setBusy(false)
  }

  return (
    <div>
      <div
        onDragOver={(e) => {
          e.preventDefault()
          setDragOver(true)
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault()
          setDragOver(false)
          const file = e.dataTransfer.files?.[0]
          if (file) void upload(file)
        }}
        onClick={() => inputRef.current?.click()}
        className={cn(
          'flex cursor-pointer flex-col items-center gap-2 rounded border-2 border-dashed px-6 py-14 text-center transition-colors',
          dragOver ? 'border-[var(--color-accent)] bg-[var(--color-accent-soft)]' : 'border-[var(--color-border-strong)]',
        )}
      >
        {busy ? (
          <>
            <Loader2 className="h-7 w-7 animate-spin text-[var(--color-muted)]" />
            <p className="text-sm text-[var(--color-muted)]">Обработка изображения…</p>
          </>
        ) : (
          <>
            <Upload className="h-7 w-7 text-[var(--color-muted-soft)]" />
            <p className="text-sm">Перетащите файл или нажмите, чтобы выбрать</p>
            <p className="text-xs text-[var(--color-muted)]">
              JPEG, PNG, WebP, AVIF, GIF · до 10 МБ · EXIF удаляется автоматически
            </p>
          </>
        )}
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/avif,image/gif"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0]
          if (file) void upload(file)
        }}
      />
      {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
    </div>
  )
}

function AiPane({
  promptSeed,
  onDone,
}: {
  promptSeed?: string
  onDone: (asset: MediaAssetLite) => void
}) {
  const [prompt, setPrompt] = useState(promptSeed ?? '')
  const [aspect, setAspect] = useState<'16:9' | '4:3' | '1:1'>('16:9')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [preview, setPreview] = useState<{ url: string; model: string } | null>(null)
  const [saving, setSaving] = useState(false)

  const generate = async () => {
    if (!prompt.trim()) return
    setBusy(true)
    setError('')
    setPreview(null)
    try {
      const data = await apiFetch<{ result: { url: string; model: string } }>('/api/admin/ai', {
        json: { task: 'image', prompt: prompt.trim(), aspect },
      })
      setPreview(data.result)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Генерация не удалась.')
    }
    setBusy(false)
  }

  const save = async () => {
    if (!preview) return
    setSaving(true)
    setError('')
    try {
      // The generated file is copied into our own storage — an fal.ai URL is
      // temporary and must never end up as a published hero image.
      const data = await apiFetch<{ asset: MediaAssetLite }>('/api/admin/media', {
        json: {
          url: preview.url,
          alt: prompt.trim().slice(0, 200),
          credit: 'KI-generiert',
          license: 'KI-generiert — vor Veröffentlichung kennzeichnen',
          sourceType: 'AI_GENERATED',
          aiPrompt: prompt.trim(),
          aiModel: preview.model,
        },
      })
      onDone(data.asset)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Не удалось сохранить изображение.')
    }
    setSaving(false)
  }

  return (
    <div className="space-y-3">
      <div className="space-y-1.5">
        <Label htmlFor="ai-prompt">Описание изображения</Label>
        <textarea
          id="ai-prompt"
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          rows={3}
          placeholder="Например: пожилой часовщик в маленькой мастерской, тёплый свет из окна"
          className="w-full rounded-sm border border-[var(--color-border-strong)] bg-[var(--color-surface)] px-3 py-2 text-sm"
        />
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <select
          value={aspect}
          onChange={(e) => setAspect(e.target.value as '16:9' | '4:3' | '1:1')}
          className="h-9 rounded-sm border border-[var(--color-border-strong)] bg-[var(--color-surface)] px-2 text-sm"
          aria-label="Пропорции"
        >
          <option value="16:9">16:9 — обложка</option>
          <option value="4:3">4:3 — в тексте</option>
          <option value="1:1">1:1 — квадрат</option>
        </select>
        <Button type="button" onClick={generate} loading={busy} disabled={!prompt.trim()}>
          <Sparkles className="h-4 w-4" />
          {busy ? 'Генерация…' : 'Сгенерировать'}
        </Button>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      {preview && (
        <div className="space-y-2 rounded border border-[var(--color-border)] p-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={preview.url} alt="Предпросмотр" className="w-full rounded-sm" />
          <p className="text-xs text-[var(--color-muted)]">Модель: {preview.model}</p>
          <div className="flex gap-2">
            <Button type="button" onClick={save} loading={saving}>
              Сохранить в медиатеку и выбрать
            </Button>
            <Button type="button" variant="outline" onClick={generate} disabled={busy}>
              Ещё вариант
            </Button>
          </div>
          <p className="rounded-sm bg-amber-50 px-2 py-1.5 text-xs text-amber-800">
            KI-генерация: перед публикацией укажите это в подписи к изображению.
          </p>
        </div>
      )}
    </div>
  )
}

function UrlPane({ onDone }: { onDone: (asset: MediaAssetLite) => void }) {
  const [url, setUrl] = useState('')
  const [alt, setAlt] = useState('')
  const [credit, setCredit] = useState('')
  const [license, setLicense] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const save = async () => {
    if (!url.trim()) return
    setBusy(true)
    setError('')
    try {
      const data = await apiFetch<{ asset: MediaAssetLite }>('/api/admin/media', {
        json: { url: url.trim(), alt, credit, license, sourceType: 'EXTERNAL_URL' },
      })
      onDone(data.asset)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Не удалось загрузить.')
    }
    setBusy(false)
  }

  return (
    <div className="space-y-3">
      <div className="space-y-1.5">
        <Label htmlFor="img-url">Ссылка на изображение (https)</Label>
        <Input id="img-url" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://…" />
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="img-alt">Alt-текст</Label>
          <Input id="img-alt" value={alt} onChange={(e) => setAlt(e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="img-credit">Автор / источник</Label>
          <Input id="img-credit" value={credit} onChange={(e) => setCredit(e.target.value)} />
        </div>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="img-license">Лицензия / права</Label>
        <Input
          id="img-license"
          value={license}
          onChange={(e) => setLicense(e.target.value)}
          placeholder="Например: собственная съёмка / лицензия стока / разрешение автора"
        />
      </div>
      <div className="rounded-sm border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
        Изображение будет скопировано на наш сервер. Убедитесь, что у вас есть право его
        использовать — чужие фотографии без лицензии публиковать нельзя.
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <Button type="button" onClick={save} loading={busy} disabled={!url.trim()}>
        <ImagePlus className="h-4 w-4" />
        Загрузить и выбрать
      </Button>
    </div>
  )
}

function CandidatePane({
  candidates,
  onDone,
}: {
  candidates: { url: string; alt: string }[]
  onDone: (asset: MediaAssetLite) => void
}) {
  const [busy, setBusy] = useState<string | null>(null)
  const [error, setError] = useState('')

  const use = async (candidate: { url: string; alt: string }) => {
    setBusy(candidate.url)
    setError('')
    try {
      const data = await apiFetch<{ asset: MediaAssetLite }>('/api/admin/media', {
        json: {
          url: candidate.url,
          alt: candidate.alt,
          sourceType: 'EXTERNAL_URL',
          license: 'UNGEPRÜFT — Rechte vor Veröffentlichung klären',
        },
      })
      onDone(data.asset)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Не удалось загрузить.')
    }
    setBusy(null)
  }

  return (
    <div>
      <div className="mb-3 rounded-sm border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
        <strong>Внимание:</strong> это изображения с сайта-источника. Права на них у нас нет.
        Используйте их только как референс — для публикации нужны собственные, лицензированные или
        сгенерированные изображения.
      </div>
      {error && <p className="mb-2 text-sm text-red-600">{error}</p>}
      <div className="grid max-h-[24rem] grid-cols-2 gap-2 overflow-y-auto sm:grid-cols-4">
        {candidates.map((candidate) => (
          <div key={candidate.url} className="overflow-hidden rounded-sm border border-[var(--color-border)]">
            <div className="aspect-[4/3] bg-[var(--color-surface-sunken)]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={candidate.url} alt={candidate.alt} className="h-full w-full object-cover" loading="lazy" />
            </div>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              className="w-full rounded-none text-xs"
              loading={busy === candidate.url}
              onClick={() => use(candidate)}
            >
              Использовать
            </Button>
          </div>
        ))}
      </div>
    </div>
  )
}

/** Small trigger + preview used by the post editor for the hero image. */
export function HeroImageField({
  value,
  onChange,
  promptSeed,
  candidates,
}: {
  value: { mediaId: string; url: string; alt: string } | null
  onChange: (image: PickedImage | null) => void
  promptSeed?: string
  candidates?: { url: string; alt: string }[]
}) {
  const [open, setOpen] = useState(false)

  return (
    <div>
      {value ? (
        <div className="flex gap-3">
          <div className="relative h-24 w-40 shrink-0 overflow-hidden rounded-sm border border-[var(--color-border)]">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={value.url} alt={value.alt} className="h-full w-full object-cover" />
            <button
              type="button"
              onClick={() => onChange(null)}
              className="absolute right-1 top-1 flex h-5 w-5 items-center justify-center rounded-full bg-black/60 text-white"
              aria-label="Убрать обложку"
            >
              <X className="h-3 w-3" />
            </button>
          </div>
          <div className="flex flex-col justify-center gap-1.5">
            <Button type="button" size="sm" variant="outline" onClick={() => setOpen(true)}>
              Заменить
            </Button>
            {!value.alt && (
              <p className="text-xs text-amber-700">Нет alt-текста — добавьте в медиатеке.</p>
            )}
          </div>
        </div>
      ) : (
        <Button type="button" variant="outline" onClick={() => setOpen(true)}>
          <ImagePlus className="h-4 w-4" />
          Выбрать обложку
        </Button>
      )}

      <MediaPicker
        open={open}
        onClose={() => setOpen(false)}
        onPick={(image) => {
          onChange(image)
          setOpen(false)
        }}
        promptSeed={promptSeed}
        candidates={candidates}
      />
    </div>
  )
}
