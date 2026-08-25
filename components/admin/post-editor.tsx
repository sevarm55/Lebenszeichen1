'use client'

import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useCallback, useMemo, useState } from 'react'
import {
  AlertTriangle,
  Check,
  ExternalLink,
  Hash,
  Languages,
  Search,
  Sparkles,
  X,
} from 'lucide-react'

import { BlockEditor } from '@/components/admin/block-editor'
import { ProseEditor } from '@/components/admin/prose-editor'
import { HeroImageField, MediaPicker, type PickedImage } from '@/components/admin/media-picker'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { apiFetch } from '@/lib/admin-client'
import { cn, formatDateTimeInput, slugify } from '@/lib/utils'
import { SUPPORTED_LANGUAGES } from '@/config/site'
import {
  documentToPlainText,
  documentWordCount,
  parseDocument,
  type ArticleDocument,
} from '@/server/domain/blocks'
import { evaluateQuality, type QualityCheck } from '@/server/services/quality'

export interface PostEditorCategory {
  id: string
  name: string
}

export interface PostEditorAuthor {
  id: string
  name: string
}

export interface PostEditorInitial {
  id?: string
  title: string
  subtitle: string
  slug: string
  excerpt: string
  document: ArticleDocument
  status: string
  language: string
  categoryId: string
  authorId: string | null
  hero: { mediaId: string; url: string; alt: string } | null
  seoTitle: string
  metaDescription: string
  canonicalUrl: string
  ogTitle: string
  ogDescription: string
  socialHeadline: string
  sourceUrl: string | null
  sourceNote: string
  aiUsed: boolean
  aiProvider: string | null
  aiModel: string | null
  featured: boolean
  isEditorsPick: boolean
  tags: string[]
  scheduledAt: string | null
  origin?: string
  categorySlug?: string
}

interface PostEditorProps {
  initial: PostEditorInitial
  categories: PostEditorCategory[]
  authors: PostEditorAuthor[]
  aiProvider: { id: string; label: string; ready: boolean; readyHint?: string }
  /** Existing tag vocabulary, offered as one-click chips. */
  popularTags?: string[]
  /** Image candidates carried over from a URL import. */
  imageCandidates?: { url: string; alt: string }[]
}

type PublishMode = 'draft' | 'review' | 'now' | 'schedule'

export function PostEditor({
  initial,
  categories,
  authors,
  aiProvider,
  popularTags = [],
  imageCandidates,
}: PostEditorProps) {
  const router = useRouter()

  const [title, setTitle] = useState(initial.title)
  const [subtitle, setSubtitle] = useState(initial.subtitle)
  const [slug, setSlug] = useState(initial.slug)
  const [autoSlug, setAutoSlug] = useState(!initial.id)
  const [excerpt, setExcerpt] = useState(initial.excerpt)
  const [document, setDocument] = useState<ArticleDocument>(initial.document)
  const [categoryId, setCategoryId] = useState(initial.categoryId)
  const [authorId, setAuthorId] = useState(initial.authorId ?? '')
  const [hero, setHero] = useState(initial.hero)
  const [tags, setTags] = useState<string[]>(initial.tags)
  const [tagInput, setTagInput] = useState('')
  const [featured, setFeatured] = useState(initial.featured)
  const [editorsPick, setEditorsPick] = useState(initial.isEditorsPick)

  const [seoTitle, setSeoTitle] = useState(initial.seoTitle)
  const [metaDescription, setMetaDescription] = useState(initial.metaDescription)
  const [canonicalUrl, setCanonicalUrl] = useState(initial.canonicalUrl)
  const [ogTitle, setOgTitle] = useState(initial.ogTitle)
  const [ogDescription, setOgDescription] = useState(initial.ogDescription)
  const [socialHeadline, setSocialHeadline] = useState(initial.socialHeadline)
  const [sourceNote, setSourceNote] = useState(initial.sourceNote)

  const [language, setLanguage] = useState<string>(
    SUPPORTED_LANGUAGES.find((l) => l.code === initial.language)?.value ?? 'German',
  )
  const [publishMode, setPublishMode] = useState<PublishMode>(() => {
    if (initial.status === 'PUBLISHED') return 'now'
    if (initial.status === 'SCHEDULED') return 'schedule'
    if (initial.status === 'NEEDS_REVIEW' || initial.status === 'READY') return 'review'
    return 'draft'
  })
  const [scheduledAt, setScheduledAt] = useState(
    initial.scheduledAt ? formatDateTimeInput(new Date(initial.scheduledAt)) : '',
  )

  // Prose is the default: after an import a long article becomes dozens of
  // separate boxes, and nobody wants to edit that. Blocks stay one click away
  // for precise placement of images, callouts and galleries.
  const [bodyMode, setBodyMode] = useState<'prose' | 'blocks'>('prose')
  const [busy, setBusy] = useState<string | null>(null)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [headlines, setHeadlines] = useState<string[]>([])
  const [inlinePicker, setInlinePicker] = useState<null | ((image: PickedImage | null) => void)>(null)
  const [duplicates, setDuplicates] = useState<{ id: string; title: string; slug: string }[]>([])

  const wordCount = useMemo(() => documentWordCount(document), [document])

  const quality = useMemo(
    () =>
      evaluateQuality({
        title,
        subtitle,
        excerpt,
        document,
        categoryId,
        heroImageId: hero?.mediaId ?? null,
        heroImageAlt: hero?.alt,
        metaDescription,
        seoTitle,
        sourceUrl: initial.sourceUrl,
        aiUsed: initial.aiUsed,
      }),
    [title, subtitle, excerpt, document, categoryId, hero, metaDescription, seoTitle, initial],
  )

  const updateTitle = (value: string) => {
    setTitle(value)
    if (autoSlug) setSlug(slugify(value))
  }

  // ------------------------------------------------------------ AI ------
  const callAi = useCallback(
    async <T,>(key: string, payload: Record<string, unknown>): Promise<T | null> => {
      setBusy(key)
      setError('')
      try {
        const data = await apiFetch<{ result: T }>('/api/admin/ai', { json: payload })
        return data.result
      } catch (e) {
        setError(e instanceof Error ? e.message : 'AI-запрос не удался.')
        return null
      } finally {
        setBusy(null)
      }
    },
    [],
  )

  const rewriteField = async (
    key: string,
    text: string,
    kind: 'title' | 'excerpt' | 'paragraph',
    setter: (value: string) => void,
  ) => {
    if (!text.trim()) return
    const result = await callAi<{ text: string }>(key, { task: 'rewrite', text, language, kind })
    if (result?.text) setter(result.text)
  }

  const rewriteAll = async () => {
    setBusy('rewriteAll')
    setError('')
    try {
      // Sequential, not parallel: the provider is rate-limited per key and a
      // burst of four calls is the fastest way to get a 429.
      if (title.trim()) {
        const r = await apiFetch<{ result: { text: string } }>('/api/admin/ai', {
          json: { task: 'rewrite', text: title, language, kind: 'title' },
        })
        if (r.result?.text) {
          setTitle(r.result.text)
          if (autoSlug) setSlug(slugify(r.result.text))
        }
      }
      if (subtitle.trim()) {
        const r = await apiFetch<{ result: { text: string } }>('/api/admin/ai', {
          json: { task: 'rewrite', text: subtitle, language, kind: 'excerpt' },
        })
        if (r.result?.text) setSubtitle(r.result.text)
      }
      if (excerpt.trim()) {
        const r = await apiFetch<{ result: { text: string } }>('/api/admin/ai', {
          json: { task: 'rewrite', text: excerpt, language, kind: 'excerpt' },
        })
        if (r.result?.text) setExcerpt(r.result.text)
      }
      if (document.blocks.length) {
        const r = await apiFetch<{ result: { document: ArticleDocument } }>('/api/admin/ai', {
          json: { task: 'rewriteDocument', language, document },
        })
        if (r.result?.document) setDocument(parseDocument(r.result.document))
      }
      setNotice('Материал перефразирован. Обязательно вычитайте текст перед публикацией.')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Перефразирование не удалось.')
    }
    setBusy(null)
  }

  const generateSeo = async () => {
    const result = await callAi<{
      seoTitle: string
      metaDescription: string
      ogTitle: string
      ogDescription: string
      socialHeadline: string
    }>('seo', {
      task: 'seo',
      title,
      excerpt,
      body: documentToPlainText(document).slice(0, 20000),
      language,
    })
    if (!result) return
    setSeoTitle(result.seoTitle)
    setMetaDescription(result.metaDescription)
    setOgTitle(result.ogTitle)
    setOgDescription(result.ogDescription)
    setSocialHeadline(result.socialHeadline)
  }

  const generateTags = async () => {
    const result = await callAi<{ tags: string[] }>('tags', { task: 'tags', title, excerpt, language })
    if (!result?.tags) return
    setTags((prev) => Array.from(new Set([...prev, ...result.tags])).slice(0, 12))
  }

  const generateHeadlines = async () => {
    const result = await callAi<{ headlines: string[] }>('headlines', {
      task: 'headlines',
      title,
      excerpt,
      language,
      count: 5,
    })
    if (result?.headlines) setHeadlines(result.headlines)
  }

  const rewriteBlock = useCallback(
    async (text: string) => {
      const data = await apiFetch<{ result: { text: string } }>('/api/admin/ai', {
        json: { task: 'rewrite', text, language, kind: 'paragraph' },
      })
      return data.result?.text ?? text
    },
    [language],
  )

  const pickInlineImage = useCallback(
    () =>
      new Promise<{ url: string; alt: string; mediaId?: string } | null>((resolve) => {
        setInlinePicker(() => (image: PickedImage | null) => {
          setInlinePicker(null)
          resolve(image)
        })
      }),
    [],
  )

  // ---------------------------------------------------------- saving ----
  const statusFor = (mode: PublishMode): string => {
    switch (mode) {
      case 'now':
        return 'PUBLISHED'
      case 'schedule':
        return 'SCHEDULED'
      case 'review':
        return 'NEEDS_REVIEW'
      default:
        return 'DRAFT'
    }
  }

  const save = async (mode: PublishMode) => {
    if (busy) return
    setError('')
    setNotice('')

    if (mode === 'now' && !quality.readyToPublish) {
      setError('Публикация невозможна: есть блокирующие пункты в чек-листе ниже.')
      return
    }
    if (mode === 'schedule' && !scheduledAt) {
      setError('Укажите дату и время публикации.')
      return
    }

    setBusy('save')
    const languageCode = SUPPORTED_LANGUAGES.find((l) => l.value === language)?.code ?? 'de'

    const payload = {
      title,
      subtitle,
      slug: slug || slugify(title),
      excerpt,
      document,
      status: statusFor(mode),
      origin: initial.origin ?? (initial.sourceUrl ? 'URL_IMPORT' : 'MANUAL'),
      language: languageCode,
      categoryId,
      authorId: authorId || null,
      heroImageId: hero?.mediaId ?? null,
      seoTitle,
      metaDescription,
      canonicalUrl,
      ogTitle,
      ogDescription,
      socialHeadline,
      sourceUrl: initial.sourceUrl,
      sourceNote,
      aiUsed: initial.aiUsed,
      aiProvider: initial.aiProvider,
      aiModel: initial.aiModel,
      featured,
      isEditorsPick: editorsPick,
      tags,
      scheduledAt: mode === 'schedule' && scheduledAt ? new Date(scheduledAt).toISOString() : null,
    }

    try {
      const result = await apiFetch<{ id: string }>(
        initial.id ? `/api/admin/posts/${initial.id}` : '/api/admin/posts',
        { method: initial.id ? 'PUT' : 'POST', json: payload },
      )
      if (!initial.id) {
        router.push(`/admin/posts/${result.id}`)
      } else {
        setNotice(mode === 'now' ? 'Опубликовано.' : 'Сохранено.')
        router.refresh()
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Не удалось сохранить.')
    }
    setBusy(null)
  }

  const checkDuplicates = useCallback(async () => {
    if (!title.trim()) return
    try {
      const params = new URLSearchParams({ title })
      if (initial.sourceUrl) params.set('sourceUrl', initial.sourceUrl)
      if (initial.id) params.set('excludePostId', initial.id)
      const data = await apiFetch<{ duplicates: { id: string; title: string; slug: string }[] }>(
        `/api/admin/posts?${params.toString()}`,
      )
      setDuplicates(data.duplicates)
    } catch {
      // A failed duplicate check must not block editing.
    }
  }, [title, initial.sourceUrl, initial.id])

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_20rem]">
      <div className="min-w-0 space-y-5">
        {/* ------------------------------------------------ AI panel --- */}
        <Panel
          title="AI-перефразирование"
          badge={aiProvider.ready ? aiProvider.label : `${aiProvider.label} — не настроен`}
          tone={aiProvider.ready ? 'accent' : 'warning'}
        >
          {!aiProvider.ready && (
            <p className="mb-3 rounded-sm border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
              {aiProvider.readyHint}
            </p>
          )}
          <div className="flex flex-wrap items-center gap-2">
            <select
              value={language}
              onChange={(e) => setLanguage(e.target.value)}
              className="h-9 rounded-sm border border-[var(--color-border-strong)] bg-[var(--color-surface)] px-2 text-sm"
              aria-label="Язык публикации"
            >
              {SUPPORTED_LANGUAGES.map((lang) => (
                <option key={lang.code} value={lang.value}>
                  {lang.label}
                </option>
              ))}
            </select>

            <Button type="button" onClick={rewriteAll} loading={busy === 'rewriteAll'}>
              <Languages className="h-4 w-4" />
              Перефразировать всё
            </Button>
            <Button type="button" variant="outline" onClick={generateSeo} loading={busy === 'seo'}>
              <Search className="h-4 w-4" />
              SEO
            </Button>
            <Button type="button" variant="outline" onClick={generateTags} loading={busy === 'tags'}>
              <Hash className="h-4 w-4" />
              Теги
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={generateHeadlines}
              loading={busy === 'headlines'}
            >
              <Sparkles className="h-4 w-4" />
              Варианты заголовка
            </Button>
          </div>

          {headlines.length > 0 && (
            <div className="mt-3 space-y-1 rounded-sm border border-[var(--color-border)] p-2">
              <p className="mb-1 text-xs font-medium text-[var(--color-muted)]">
                Предложенные заголовки — нажмите, чтобы применить:
              </p>
              {headlines.map((headline) => (
                <button
                  key={headline}
                  type="button"
                  onClick={() => {
                    updateTitle(headline)
                    setHeadlines([])
                  }}
                  className="block w-full rounded-sm px-2 py-1 text-left text-sm hover:bg-[var(--color-surface-sunken)]"
                >
                  {headline}
                </button>
              ))}
            </div>
          )}
        </Panel>

        {/* ------------------------------------------------- main -------- */}
        <Panel title="Основные поля">
          <div className="space-y-4">
            <Field label="Заголовок" htmlFor="title" required>
              <div className="flex gap-2">
                <Input
                  id="title"
                  value={title}
                  onChange={(e) => updateTitle(e.target.value)}
                  onBlur={checkDuplicates}
                  placeholder="Заголовок материала"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  title="Перефразировать заголовок"
                  loading={busy === 'title'}
                  onClick={() => rewriteField('title', title, 'title', updateTitle)}
                >
                  <Languages className="h-4 w-4" />
                </Button>
              </div>
              <CharCount value={title.length} ideal={[30, 70]} />
            </Field>

            {duplicates.length > 0 && (
              <div className="rounded-sm border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
                <p className="mb-1 flex items-center gap-1.5 font-medium">
                  <AlertTriangle className="h-3.5 w-3.5" />
                  Похожие материалы уже есть
                </p>
                <ul className="space-y-0.5">
                  {duplicates.map((duplicate) => (
                    <li key={duplicate.id}>
                      <Link
                        href={`/admin/posts/${duplicate.id}`}
                        className="underline underline-offset-2"
                      >
                        {duplicate.title}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <Field label="Подзаголовок / лид" htmlFor="subtitle">
              <div className="flex gap-2">
                <Input id="subtitle" value={subtitle} onChange={(e) => setSubtitle(e.target.value)} />
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  loading={busy === 'subtitle'}
                  onClick={() => rewriteField('subtitle', subtitle, 'excerpt', setSubtitle)}
                >
                  <Languages className="h-4 w-4" />
                </Button>
              </div>
            </Field>

            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Адрес (slug)" htmlFor="slug" required>
                <Input
                  id="slug"
                  value={slug}
                  onChange={(e) => {
                    setSlug(e.target.value)
                    setAutoSlug(false)
                  }}
                />
                {initial.status === 'PUBLISHED' && slug !== initial.slug && (
                  <p className="mt-1 text-xs text-amber-700">
                    Адрес изменится — со старого будет создан 301-редирект.
                  </p>
                )}
              </Field>

              <Field label="Категория" htmlFor="category" required>
                <select
                  id="category"
                  value={categoryId}
                  onChange={(e) => setCategoryId(e.target.value)}
                  className="h-9 w-full rounded-sm border border-[var(--color-border-strong)] bg-[var(--color-surface)] px-2 text-sm"
                >
                  <option value="">— выберите —</option>
                  {categories.map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
                  ))}
                </select>
              </Field>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Автор / редактор" htmlFor="author">
                <select
                  id="author"
                  value={authorId}
                  onChange={(e) => setAuthorId(e.target.value)}
                  className="h-9 w-full rounded-sm border border-[var(--color-border-strong)] bg-[var(--color-surface)] px-2 text-sm"
                >
                  <option value="">— без автора —</option>
                  {authors.map((author) => (
                    <option key={author.id} value={author.id}>
                      {author.name}
                    </option>
                  ))}
                </select>
              </Field>

              <Field label="Обложка" required>
                <HeroImageField
                  value={hero}
                  onChange={(image) =>
                    setHero(image ? { mediaId: image.mediaId, url: image.url, alt: image.alt } : null)
                  }
                  promptSeed={title}
                  candidates={imageCandidates}
                />
              </Field>
            </div>

            <Field label="Краткое описание (анонс)" htmlFor="excerpt" required>
              <div className="flex gap-2">
                <Textarea
                  id="excerpt"
                  value={excerpt}
                  onChange={(e) => setExcerpt(e.target.value)}
                  rows={2}
                />
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  loading={busy === 'excerpt'}
                  onClick={() => rewriteField('excerpt', excerpt, 'excerpt', setExcerpt)}
                >
                  <Languages className="h-4 w-4" />
                </Button>
              </div>
              <CharCount value={excerpt.length} ideal={[80, 220]} />
            </Field>

            <Field label="Теги">
              <div className="mb-2 flex flex-wrap gap-1.5">
                {tags.map((tag) => (
                  <span
                    key={tag}
                    className="inline-flex items-center gap-1 rounded-sm bg-[var(--color-surface-sunken)] px-2 py-1 text-xs"
                  >
                    {tag}
                    <button
                      type="button"
                      onClick={() => setTags(tags.filter((t) => t !== tag))}
                      className="text-[var(--color-muted-soft)] hover:text-red-600"
                      aria-label={`Удалить тег ${tag}`}
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                ))}
              </div>
              <Input
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={(e) => {
                  if ((e.key === 'Enter' || e.key === ',') && tagInput.trim()) {
                    e.preventDefault()
                    const value = tagInput.trim().replace(/^#/, '')
                    if (value && !tags.includes(value)) setTags([...tags, value])
                    setTagInput('')
                  }
                }}
                placeholder="Введите тег и нажмите Enter"
              />

              {popularTags.filter((t) => !tags.includes(t)).length > 0 && (
                <div className="mt-2">
                  <p className="mb-1.5 text-xs text-[var(--color-muted)]">
                    Часто используемые — нажмите, чтобы добавить:
                  </p>
                  <div className="flex flex-wrap gap-1">
                    {popularTags
                      .filter((t) => !tags.includes(t))
                      .slice(0, 18)
                      .map((tag) => (
                        <button
                          key={tag}
                          type="button"
                          onClick={() => setTags([...tags, tag])}
                          className="rounded-sm border border-[var(--color-border-strong)] px-1.5 py-0.5 text-xs text-[var(--color-muted)] transition-colors hover:border-[var(--color-accent)] hover:text-[var(--color-accent)]"
                        >
                          + {tag}
                        </button>
                      ))}
                  </div>
                </div>
              )}
            </Field>

            <div className="flex flex-wrap gap-4 border-t border-[var(--color-border)] pt-3">
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={featured} onChange={(e) => setFeatured(e.target.checked)} />
                Показывать в главном блоке
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={editorsPick}
                  onChange={(e) => setEditorsPick(e.target.checked)}
                />
                Выбор редакции
              </label>
            </div>
          </div>
        </Panel>

        {/* ---------------------------------------------- body ---------- */}
        <Panel
          title="Текст материала"
          badge={`${wordCount} слов`}
          toolbar={
            <div className="flex rounded-sm border border-[var(--color-border-strong)] p-0.5">
              {(
                [
                  ['prose', 'Текст'],
                  ['blocks', 'Блоки'],
                ] as ['prose' | 'blocks', string][]
              ).map(([mode, label]) => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => setBodyMode(mode)}
                  className={cn(
                    'rounded-sm px-2.5 py-1 text-xs font-medium transition-colors',
                    bodyMode === mode
                      ? 'bg-[var(--color-accent)] text-white'
                      : 'text-[var(--color-muted)] hover:text-[var(--color-text)]',
                  )}
                >
                  {label}
                </button>
              ))}
            </div>
          }
        >
          {bodyMode === 'prose' ? (
            <ProseEditor
              document={document}
              onChange={setDocument}
              disabled={busy === 'rewriteAll'}
              promptSeed={title}
              imageCandidates={imageCandidates}
            />
          ) : (
            <BlockEditor
              document={document}
              onChange={setDocument}
              onRewriteBlock={rewriteBlock}
              onPickImage={pickInlineImage}
              disabled={busy === 'rewriteAll'}
            />
          )}
        </Panel>

        {/* ---------------------------------------------- SEO ----------- */}
        <Panel title="SEO и социальные сети">
          <div className="space-y-4">
            <Field label="SEO-заголовок" htmlFor="seoTitle">
              <Input id="seoTitle" value={seoTitle} onChange={(e) => setSeoTitle(e.target.value)} />
              <CharCount value={seoTitle.length} ideal={[30, 60]} />
            </Field>

            <Field label="Meta description" htmlFor="metaDescription">
              <Textarea
                id="metaDescription"
                value={metaDescription}
                onChange={(e) => setMetaDescription(e.target.value)}
                rows={2}
              />
              <CharCount value={metaDescription.length} ideal={[140, 158]} />
            </Field>

            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="OG-заголовок (Facebook)" htmlFor="ogTitle">
                <Input id="ogTitle" value={ogTitle} onChange={(e) => setOgTitle(e.target.value)} />
              </Field>
              <Field label="Заголовок для соцсетей" htmlFor="socialHeadline">
                <Input
                  id="socialHeadline"
                  value={socialHeadline}
                  onChange={(e) => setSocialHeadline(e.target.value)}
                />
              </Field>
            </div>

            <Field label="OG-описание" htmlFor="ogDescription">
              <Textarea
                id="ogDescription"
                value={ogDescription}
                onChange={(e) => setOgDescription(e.target.value)}
                rows={2}
              />
            </Field>

            <Field label="Canonical URL (только если материал перепечатан)" htmlFor="canonicalUrl">
              <Input
                id="canonicalUrl"
                value={canonicalUrl}
                onChange={(e) => setCanonicalUrl(e.target.value)}
                placeholder="Оставьте пустым для обычной публикации"
              />
            </Field>

            {initial.sourceUrl && (
              <Field label="Примечание об источнике (видно читателю)" htmlFor="sourceNote">
                <Textarea
                  id="sourceNote"
                  value={sourceNote}
                  onChange={(e) => setSourceNote(e.target.value)}
                  rows={2}
                  placeholder="Например: Für diesen Beitrag wurde Material von … ausgewertet."
                />
                <p className="mt-1 text-xs text-[var(--color-muted)]">
                  Источник:{' '}
                  <a
                    href={initial.sourceUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline underline-offset-2"
                  >
                    {initial.sourceUrl}
                  </a>
                </p>
              </Field>
            )}
          </div>
        </Panel>
      </div>

      {/* -------------------------------------------------- sidebar ----- */}
      <aside className="space-y-4 xl:sticky xl:top-6 xl:self-start">
        <Panel title="Публикация">
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-1.5">
              {(
                [
                  ['draft', 'Черновик'],
                  ['review', 'На проверку'],
                  ['now', 'Опубликовать'],
                  ['schedule', 'По расписанию'],
                ] as [PublishMode, string][]
              ).map(([mode, label]) => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => setPublishMode(mode)}
                  className={cn(
                    'rounded-sm border px-2 py-2 text-xs font-medium transition-colors',
                    publishMode === mode
                      ? 'border-[var(--color-accent)] bg-[var(--color-accent-soft)] text-[var(--color-accent)]'
                      : 'border-[var(--color-border-strong)] text-[var(--color-muted)] hover:border-[var(--color-border-strong)]',
                  )}
                >
                  {label}
                </button>
              ))}
            </div>

            {publishMode === 'schedule' && (
              <div className="space-y-1.5">
                <Input
                  type="datetime-local"
                  value={scheduledAt}
                  min={formatDateTimeInput(new Date())}
                  onChange={(e) => setScheduledAt(e.target.value)}
                />
                <div className="flex flex-wrap gap-1">
                  {[
                    { label: '+1 ч', hours: 1 },
                    { label: '+3 ч', hours: 3 },
                    { label: 'Завтра 9:00', hours: -1 },
                  ].map((option) => (
                    <button
                      key={option.label}
                      type="button"
                      onClick={() => {
                        const date = new Date()
                        if (option.hours === -1) {
                          date.setDate(date.getDate() + 1)
                          date.setHours(9, 0, 0, 0)
                        } else {
                          date.setHours(date.getHours() + option.hours)
                        }
                        setScheduledAt(formatDateTimeInput(date))
                      }}
                      className="rounded-sm border border-[var(--color-border-strong)] px-1.5 py-0.5 text-[0.6875rem] text-[var(--color-muted)] hover:border-[var(--color-accent)]"
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {error && (
              <p className="rounded-sm border border-red-200 bg-red-50 px-2.5 py-2 text-xs text-red-700">
                {error}
              </p>
            )}
            {notice && (
              <p className="rounded-sm border border-emerald-200 bg-emerald-50 px-2.5 py-2 text-xs text-emerald-800">
                {notice}
              </p>
            )}

            <Button
              type="button"
              className="w-full"
              loading={busy === 'save'}
              onClick={() => save(publishMode)}
            >
              {publishMode === 'now'
                ? 'Опубликовать'
                : publishMode === 'schedule'
                  ? 'Запланировать'
                  : 'Сохранить'}
            </Button>

            {initial.id && (
              <div className="grid grid-cols-2 gap-1.5">
                <Button type="button" variant="outline" size="sm" asChild>
                  <Link href={`/admin/vorschau/${initial.id}`} target="_blank">
                    Предпросмотр
                  </Link>
                </Button>
                {initial.status === 'PUBLISHED' && initial.categorySlug && (
                  <Button type="button" variant="outline" size="sm" asChild>
                    <Link href={`/${initial.categorySlug}/${initial.slug}`} target="_blank">
                      <ExternalLink className="h-3.5 w-3.5" />
                      На сайте
                    </Link>
                  </Button>
                )}
              </div>
            )}
          </div>
        </Panel>

        <Panel
          title="Готовность к публикации"
          badge={quality.readyToPublish ? 'Готово' : 'Нужно проверить'}
          tone={quality.readyToPublish ? 'success' : 'warning'}
        >
          <ul className="space-y-1.5">
            {quality.checks.map((check) => (
              <QualityRow key={check.id} check={check} />
            ))}
          </ul>
        </Panel>

        {initial.aiUsed && (
          <Panel title="Происхождение">
            <dl className="space-y-1 text-xs">
              <Row label="Создано" value={initial.origin ?? '—'} />
              <Row label="AI-провайдер" value={initial.aiProvider ?? '—'} />
              <Row label="Модель" value={initial.aiModel ?? '—'} />
              {initial.sourceUrl && <Row label="Источник" value={new URL(initial.sourceUrl).hostname} />}
            </dl>
          </Panel>
        )}
      </aside>

      {inlinePicker && (
        <MediaPicker
          open
          onClose={() => {
            inlinePicker(null)
          }}
          onPick={(image) => inlinePicker(image)}
          promptSeed={title}
          candidates={imageCandidates}
        />
      )}
    </div>
  )
}

function Panel({
  title,
  badge,
  tone = 'default',
  toolbar,
  children,
}: {
  title: string
  badge?: string
  tone?: 'default' | 'accent' | 'warning' | 'success'
  toolbar?: React.ReactNode
  children: React.ReactNode
}) {
  const badgeClass = {
    default: 'bg-[var(--color-surface-sunken)] text-[var(--color-muted)]',
    accent: 'bg-[var(--color-accent-soft)] text-[var(--color-accent)]',
    warning: 'bg-amber-50 text-amber-800',
    success: 'bg-emerald-50 text-emerald-800',
  }[tone]

  return (
    <section className="rounded border border-[var(--color-border)] bg-[var(--color-surface)]">
      <header className="flex flex-wrap items-center gap-2 border-b border-[var(--color-border)] px-4 py-2.5">
        <h2 className="text-sm font-semibold">{title}</h2>
        {badge && (
          <span className={`rounded-sm px-1.5 py-0.5 text-[0.6875rem] font-medium ${badgeClass}`}>
            {badge}
          </span>
        )}
        {toolbar && <div className="ml-auto">{toolbar}</div>}
      </header>
      <div className="p-4">{children}</div>
    </section>
  )
}

function Field({
  label,
  htmlFor,
  required,
  children,
}: {
  label: string
  htmlFor?: string
  required?: boolean
  children: React.ReactNode
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={htmlFor}>
        {label}
        {required && <span className="ml-0.5 text-[var(--color-accent)]">*</span>}
      </Label>
      {children}
    </div>
  )
}

function CharCount({ value, ideal }: { value: number; ideal: [number, number] }) {
  const [min, max] = ideal
  const ok = value >= min && value <= max
  return (
    <p
      className={cn(
        'mt-1 text-xs tabular-nums',
        value === 0 ? 'text-[var(--color-muted-soft)]' : ok ? 'text-emerald-700' : 'text-amber-700',
      )}
    >
      {value} симв. · оптимум {min}–{max}
    </p>
  )
}

function QualityRow({ check }: { check: QualityCheck }) {
  const icon =
    check.level === 'ok' ? (
      <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-600" />
    ) : check.level === 'warn' ? (
      <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-600" />
    ) : (
      <X className="mt-0.5 h-3.5 w-3.5 shrink-0 text-red-600" />
    )

  return (
    <li className="flex gap-2 text-xs">
      {icon}
      <span
        className={cn(
          check.level === 'ok' ? 'text-[var(--color-muted)]' : 'text-[var(--color-text-soft)]',
        )}
      >
        {check.label}
        {check.hint && check.level !== 'ok' && (
          <span className="block text-[var(--color-muted)]">{check.hint}</span>
        )}
      </span>
    </li>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-2">
      <dt className="text-[var(--color-muted)]">{label}</dt>
      <dd className="truncate text-right">{value}</dd>
    </div>
  )
}

