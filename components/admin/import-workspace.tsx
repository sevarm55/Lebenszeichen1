'use client'

import Link from 'next/link'
import { useState } from 'react'
import {
  AlertTriangle,
  ArrowRight,
  Check,
  Download,
  FileText,
  Globe,
  Loader2,
  Sparkles,
} from 'lucide-react'

import { PostEditor, type PostEditorAuthor, type PostEditorCategory } from '@/components/admin/post-editor'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { apiFetch } from '@/lib/admin-client'
import { SUPPORTED_LANGUAGES } from '@/config/site'
import { cn, slugify } from '@/lib/utils'
import { parseDocument, type ArticleDocument } from '@/server/domain/blocks'

interface ExtractedArticle {
  title: string
  subtitle: string
  excerpt: string
  document: ArticleDocument
  plainText: string
  wordCount: number
  publishedAt: string | null
  author: string
  siteName: string
  sourceUrl: string
  sourceDomain: string
  language: string
  images: { url: string; alt: string; role: string }[]
  warnings: string[]
}

interface Duplicate {
  id: string
  title: string
  slug: string
  status: string
  reason: string
}

interface GeneratedArticle {
  title: string
  subtitle: string
  excerpt: string
  document: ArticleDocument
  suggestedCategory: string
  suggestedTags: string[]
  seoTitle: string
  metaDescription: string
  socialHeadline: string
  warnings: string[]
  imageSuggestions: string[]
}

interface ImportWorkspaceProps {
  categories: PostEditorCategory[]
  authors: PostEditorAuthor[]
  aiProvider: { id: string; label: string; ready: boolean; readyHint?: string }
}

type Stage = 'url' | 'source' | 'editor'

/**
 * URL → source → original draft → review → publish.
 *
 * The one flow rule the product depends on: there is no path from a URL to a
 * published page without a human editing the result. Generation always lands in
 * the editor as a draft.
 */
export function ImportWorkspace({ categories, authors, aiProvider }: ImportWorkspaceProps) {
  const [stage, setStage] = useState<Stage>('url')
  const [url, setUrl] = useState('')
  const [busy, setBusy] = useState('')
  const [error, setError] = useState('')

  const [source, setSource] = useState<ExtractedArticle | null>(null)
  const [duplicates, setDuplicates] = useState<Duplicate[]>([])
  const [language, setLanguage] = useState<string>('German')
  const [angle, setAngle] = useState('')
  const [generated, setGenerated] = useState<GeneratedArticle | null>(null)
  const [aiMeta, setAiMeta] = useState<{ provider: string; model: string } | null>(null)

  // ------------------------------------------------------------ import ---
  const runImport = async () => {
    if (!url.trim()) return
    setBusy('import')
    setError('')
    setGenerated(null)

    try {
      const data = await apiFetch<{ article: ExtractedArticle; duplicates: Duplicate[] }>(
        '/api/admin/import',
        { json: { url: url.trim() } },
      )
      setSource({ ...data.article, document: parseDocument(data.article.document) })
      setDuplicates(data.duplicates)
      setStage('source')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Импорт не удался.')
    }
    setBusy('')
  }

  // ------------------------------------------------------- generation ---
  const runGenerate = async () => {
    if (!source) return
    setBusy('generate')
    setError('')

    try {
      const data = await apiFetch<{
        result: GeneratedArticle
        provider: string
        model: string
      }>('/api/admin/ai', {
        json: {
          task: 'generateArticle',
          language,
          angle: angle.trim() || undefined,
          categoryHints: categories.map((c) => c.name),
          source: {
            title: source.title,
            text: source.plainText,
            url: source.sourceUrl,
            domain: source.sourceDomain,
            publishedAt: source.publishedAt,
          },
        },
      })

      setGenerated({ ...data.result, document: parseDocument(data.result.document) })
      setAiMeta({ provider: data.provider, model: data.model })
      setStage('editor')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Генерация не удалась.')
    }
    setBusy('')
  }

  const useSourceAsIs = () => {
    if (!source) return
    setGenerated(null)
    setAiMeta(null)
    setStage('editor')
  }

  const reset = () => {
    setStage('url')
    setSource(null)
    setGenerated(null)
    setDuplicates([])
    setAiMeta(null)
    setError('')
  }

  // ------------------------------------------------------------ render ---
  if (stage === 'editor' && source) {
    const base = generated ?? {
      title: source.title,
      subtitle: source.subtitle,
      excerpt: source.excerpt,
      document: source.document,
      suggestedCategory: '',
      suggestedTags: [],
      seoTitle: '',
      metaDescription: '',
      socialHeadline: '',
      warnings: [],
      imageSuggestions: [],
    }

    const matchedCategory =
      categories.find((c) => c.name.toLowerCase() === base.suggestedCategory.toLowerCase())?.id ??
      categories[0]?.id ??
      ''

    const languageCode = SUPPORTED_LANGUAGES.find((l) => l.value === language)?.code ?? 'de'

    return (
      <div className="space-y-5">
        <SourcePanel
          source={source}
          duplicates={duplicates}
          warnings={[...source.warnings, ...base.warnings]}
          aiMeta={aiMeta}
          onReset={reset}
        />

        <div className="rounded-sm border border-blue-200 bg-blue-50 px-3 py-2 text-sm text-blue-900">
          Черновик ещё не сохранён. Проверьте текст, факты и заголовок, затем сохраните —
          автоматическая публикация из источника невозможна по замыслу.
        </div>

        <PostEditor
          initial={{
            title: base.title,
            slug: slugify(base.title),
            excerpt: base.excerpt,
            document: base.document,
            status: 'DRAFT',
            language: languageCode,
            categoryId: matchedCategory,
            extraCategoryIds: [],
            authorId: null,
            hero: null,
            seoTitle: base.seoTitle,
            metaDescription: base.metaDescription,
            canonicalUrl: '',
            ogTitle: base.seoTitle,
            ogDescription: base.metaDescription,
            socialHeadline: base.socialHeadline,
            sourceUrl: source.sourceUrl,
            sourceNote: '',
            aiUsed: Boolean(generated),
            aiProvider: aiMeta?.provider ?? null,
            aiModel: aiMeta?.model ?? null,
            featured: false,
            isEditorsPick: false,
            tags: base.suggestedTags,
            scheduledAt: null,
            origin: generated ? 'AI_GENERATED' : 'URL_IMPORT',
          }}
          categories={categories}
          authors={authors}
          aiProvider={aiProvider}
          imageCandidates={source.images.map((image) => ({ url: image.url, alt: image.alt }))}
        />
      </div>
    )
  }

  return (
    <div className="space-y-5">
      {/* --------------------------------------------------- URL input --- */}
      <section className="rounded border border-[var(--color-border)] bg-[var(--color-surface)]">
        <header className="flex items-center gap-2 border-b border-[var(--color-border)] px-4 py-2.5">
          <Globe className="h-4 w-4 text-[var(--color-muted)]" />
          <h2 className="text-sm font-semibold">Источник</h2>
        </header>
        <div className="space-y-3 p-4">
          <div className="space-y-1.5">
            <Label htmlFor="source-url">Ссылка на статью</Label>
            <div className="flex gap-2">
              <Input
                id="source-url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    void runImport()
                  }
                }}
                placeholder="https://…"
                autoFocus
              />
              <Button type="button" onClick={runImport} loading={busy === 'import'} disabled={!url.trim()}>
                <Download className="h-4 w-4" />
                {busy === 'import' ? 'Загрузка…' : 'Получить материал'}
              </Button>
            </div>
          </div>

          <p className="text-xs text-[var(--color-muted)]">
            Разрешены только публичные http/https-адреса. Внутренние адреса, приватные сети и
            метаданные облака блокируются. Рекламные блоки, навигация и баннеры удаляются
            автоматически.
          </p>

          {error && (
            <p className="rounded-sm border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </p>
          )}
        </div>
      </section>

      {/* ---------------------------------------------------- source ----- */}
      {stage === 'source' && source && (
        <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_22rem]">
          <SourceContent source={source} />

          <div className="space-y-4">
            <SourcePanel
              source={source}
              duplicates={duplicates}
              warnings={source.warnings}
              aiMeta={null}
              onReset={reset}
            />

            <section className="rounded border border-[var(--color-border)] bg-[var(--color-surface)]">
              <header className="flex items-center gap-2 border-b border-[var(--color-border)] px-4 py-2.5">
                <Sparkles className="h-4 w-4 text-[var(--color-accent)]" />
                <h2 className="text-sm font-semibold">Новая статья</h2>
              </header>
              <div className="space-y-3 p-4">
                <div className="space-y-1.5">
                  <Label htmlFor="lang">Язык публикации</Label>
                  <select
                    id="lang"
                    value={language}
                    onChange={(e) => setLanguage(e.target.value)}
                    className="h-9 w-full rounded-sm border border-[var(--color-border-strong)] bg-[var(--color-surface)] px-2 text-sm"
                  >
                    {SUPPORTED_LANGUAGES.map((lang) => (
                      <option key={lang.code} value={lang.value}>
                        {lang.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="angle">Редакционный ракурс (необязательно)</Label>
                  <Input
                    id="angle"
                    value={angle}
                    onChange={(e) => setAngle(e.target.value)}
                    placeholder="Например: сделать акцент на последствиях для семьи"
                  />
                </div>

                {!aiProvider.ready && (
                  <p className="rounded-sm border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
                    {aiProvider.readyHint}
                  </p>
                )}

                <Button
                  type="button"
                  className="w-full"
                  onClick={runGenerate}
                  loading={busy === 'generate'}
                >
                  {busy === 'generate' ? (
                    'AI пишет статью…'
                  ) : (
                    <>
                      <Sparkles className="h-4 w-4" />
                      AI переработать
                    </>
                  )}
                </Button>

                <Button type="button" variant="outline" className="w-full" onClick={useSourceAsIs}>
                  <FileText className="h-4 w-4" />
                  Открыть в редакторе без AI
                </Button>

                <p className="text-xs text-[var(--color-muted)]">
                  AI пишет самостоятельный материал: новая структура, новый заголовок, новая
                  композиция. Это не замена слов синонимами. Факты берутся только из источника —
                  ничего не выдумывается.
                </p>

                {error && (
                  <p className="rounded-sm border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                    {error}
                  </p>
                )}
              </div>
            </section>
          </div>
        </div>
      )}

      {busy === 'generate' && (
        <div className="flex items-center justify-center gap-2 rounded border border-[var(--color-border)] bg-[var(--color-surface)] py-10 text-sm text-[var(--color-muted)]">
          <Loader2 className="h-4 w-4 animate-spin" />
          Модель обрабатывает материал. Это может занять до минуты.
        </div>
      )}
    </div>
  )
}

function SourceContent({ source }: { source: ExtractedArticle }) {
  return (
    <section className="rounded border border-[var(--color-border)] bg-[var(--color-surface)]">
      <header className="flex items-center justify-between gap-2 border-b border-[var(--color-border)] px-4 py-2.5">
        <h2 className="text-sm font-semibold">Извлечённый текст</h2>
        <span className="text-xs text-[var(--color-muted)]">{source.wordCount} слов</span>
      </header>
      <div className="max-h-[36rem] overflow-y-auto p-4">
        <h3 className="mb-2 text-base font-semibold">{source.title || '(заголовок не найден)'}</h3>
        {source.subtitle && (
          <p className="mb-3 text-sm text-[var(--color-muted)]">{source.subtitle}</p>
        )}
        <div className="space-y-2.5 text-sm leading-relaxed text-[var(--color-text-soft)]">
          {source.document.blocks.map((block) => {
            if (block.type === 'heading2' || block.type === 'heading3') {
              return (
                <p key={block.id} className="pt-2 font-semibold text-[var(--color-text)]">
                  {block.text}
                </p>
              )
            }
            if (block.type === 'quote') {
              return (
                <p key={block.id} className="border-l-2 border-[var(--color-border-strong)] pl-3 italic">
                  {block.text}
                </p>
              )
            }
            if (block.type === 'list') {
              return (
                <ul key={block.id} className="list-disc space-y-1 pl-5">
                  {block.items.map((item, i) => (
                    <li key={i}>{item}</li>
                  ))}
                </ul>
              )
            }
            if (block.type === 'paragraph') {
              return <p key={block.id}>{block.text}</p>
            }
            return null
          })}
        </div>
      </div>
    </section>
  )
}

function SourcePanel({
  source,
  duplicates,
  warnings,
  aiMeta,
  onReset,
}: {
  source: ExtractedArticle
  duplicates: Duplicate[]
  warnings: string[]
  aiMeta: { provider: string; model: string } | null
  onReset: () => void
}) {
  return (
    <section className="rounded border border-[var(--color-border)] bg-[var(--color-surface)]">
      <header className="flex items-center justify-between gap-2 border-b border-[var(--color-border)] px-4 py-2.5">
        <h2 className="text-sm font-semibold">Данные источника</h2>
        <button
          type="button"
          onClick={onReset}
          className="text-xs text-[var(--color-muted)] hover:text-[var(--color-accent)] hover:underline"
        >
          Другой источник
        </button>
      </header>

      <dl className="space-y-1.5 px-4 py-3 text-xs">
        <Row label="Домен" value={source.sourceDomain} />
        <Row label="Издание" value={source.siteName || '—'} />
        <Row label="Автор" value={source.author || 'не указан'} />
        <Row
          label="Дата"
          value={source.publishedAt ? new Date(source.publishedAt).toLocaleDateString('de-DE') : 'не найдена'}
        />
        <Row label="Объём" value={`${source.wordCount} слов`} />
        <Row label="Изображений" value={String(source.images.length)} />
        {aiMeta && <Row label="AI" value={`${aiMeta.provider} · ${aiMeta.model}`} />}
      </dl>

      <div className="border-t border-[var(--color-border)] px-4 py-2.5">
        <a
          href={source.sourceUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1 text-xs text-[var(--color-accent)] hover:underline"
        >
          Открыть оригинал
          <ArrowRight className="h-3 w-3" />
        </a>
      </div>

      {duplicates.length > 0 && (
        <div className="border-t border-amber-200 bg-amber-50 px-4 py-3">
          <p className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold text-amber-900">
            <AlertTriangle className="h-3.5 w-3.5" />
            Материал уже есть в CMS
          </p>
          <ul className="space-y-1">
            {duplicates.map((duplicate) => (
              <li key={duplicate.id} className="text-xs">
                <Link href={`/admin/posts/${duplicate.id}`} className="underline underline-offset-2">
                  {duplicate.title}
                </Link>
                <span className="ml-1 text-amber-700">
                  ({duplicate.reason === 'same-source-url' ? 'тот же источник' : 'похожий заголовок'})
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {warnings.length > 0 && (
        <div className="border-t border-[var(--color-border)] px-4 py-3">
          <p className="mb-1.5 text-xs font-semibold text-[var(--color-text-soft)]">
            Что нужно проверить
          </p>
          <ul className="space-y-1">
            {warnings.map((warning, index) => (
              <li key={index} className="flex gap-1.5 text-xs text-[var(--color-muted)]">
                <AlertTriangle className="mt-0.5 h-3 w-3 shrink-0 text-amber-600" />
                {warning}
              </li>
            ))}
          </ul>
        </div>
      )}

      {warnings.length === 0 && duplicates.length === 0 && (
        <div className="flex items-center gap-1.5 border-t border-[var(--color-border)] px-4 py-3 text-xs text-emerald-700">
          <Check className="h-3.5 w-3.5" />
          Замечаний нет.
        </div>
      )}
    </section>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className={cn('flex justify-between gap-2')}>
      <dt className="text-[var(--color-muted)]">{label}</dt>
      <dd className="truncate text-right font-medium">{value}</dd>
    </div>
  )
}
