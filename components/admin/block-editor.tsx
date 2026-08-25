'use client'

import { useCallback, useRef, useState } from 'react'
import {
  ChevronDown,
  ChevronUp,
  GripVertical,
  Heading2,
  Heading3,
  Image as ImageIcon,
  Info,
  Languages,
  List as ListIcon,
  Loader2,
  Megaphone,
  Minus,
  Pilcrow,
  Plus,
  Quote,
  Trash2,
} from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import { blockId, type Block, type ArticleDocument } from '@/server/domain/blocks'

interface BlockEditorProps {
  document: ArticleDocument
  onChange: (document: ArticleDocument) => void
  /** Rewrites one block's text via AI. Returns the new text. */
  onRewriteBlock?: (text: string) => Promise<string>
  onPickImage?: () => Promise<{ url: string; alt: string; mediaId?: string } | null>
  disabled?: boolean
}

const BLOCK_MENU: { type: Block['type']; label: string; icon: typeof Pilcrow }[] = [
  { type: 'paragraph', label: 'Абзац', icon: Pilcrow },
  { type: 'heading2', label: 'Заголовок H2', icon: Heading2 },
  { type: 'heading3', label: 'Подзаголовок H3', icon: Heading3 },
  { type: 'image', label: 'Изображение', icon: ImageIcon },
  { type: 'quote', label: 'Цитата', icon: Quote },
  { type: 'callout', label: 'Врезка', icon: Info },
  { type: 'list', label: 'Список', icon: ListIcon },
  { type: 'divider', label: 'Разделитель', icon: Minus },
  { type: 'ad', label: 'Рекламный блок', icon: Megaphone },
]

/**
 * Structured document editor.
 *
 * Content is a typed block array, not an HTML blob — that is what keeps
 * imported markup from ever becoming stored HTML and what lets the ad engine
 * reason about the article. Inline emphasis uses a closed subset:
 * **bold**, *italic*, [text](url).
 */
export function BlockEditor({
  document,
  onChange,
  onRewriteBlock,
  onPickImage,
  disabled,
}: BlockEditorProps) {
  const [menuIndex, setMenuIndex] = useState<number | null>(null)
  const [busyBlock, setBusyBlock] = useState<string | null>(null)
  const dragIndex = useRef<number | null>(null)

  // Only the first paragraph can be the lead, so only it shows the toggle —
  // otherwise a 60-block import renders 60 checkboxes nobody wants.
  const firstParagraphIndex = document.blocks.findIndex((b) => b.type === 'paragraph')

  const update = useCallback(
    (blocks: Block[]) => onChange({ version: document.version, blocks }),
    [document.version, onChange],
  )

  const patch = (index: number, changes: Partial<Block>) => {
    const blocks = [...document.blocks]
    const current = blocks[index]
    if (!current) return
    blocks[index] = { ...current, ...changes } as Block
    update(blocks)
  }

  const insert = (index: number, type: Block['type']) => {
    const base = { id: blockId() }
    let block: Block
    switch (type) {
      case 'image':
        block = { ...base, type: 'image', url: '', alt: '', ratio: '16:9' }
        break
      case 'list':
        block = { ...base, type: 'list', items: [''], ordered: false }
        break
      case 'callout':
        block = { ...base, type: 'callout', title: '', text: '', variant: 'context' }
        break
      case 'quote':
        block = { ...base, type: 'quote', text: '', attribution: '' }
        break
      case 'divider':
        block = { ...base, type: 'divider' }
        break
      case 'ad':
        block = { ...base, type: 'ad' }
        break
      case 'heading2':
      case 'heading3':
        block = { ...base, type, text: '' }
        break
      default:
        block = { ...base, type: 'paragraph', text: '' }
    }
    const blocks = [...document.blocks]
    blocks.splice(index, 0, block)
    update(blocks)
    setMenuIndex(null)
  }

  const remove = (index: number) => {
    const blocks = document.blocks.filter((_, i) => i !== index)
    update(blocks)
  }

  const move = (from: number, to: number) => {
    if (to < 0 || to >= document.blocks.length) return
    const blocks = [...document.blocks]
    const [item] = blocks.splice(from, 1)
    if (item) blocks.splice(to, 0, item)
    update(blocks)
  }

  const rewrite = async (index: number) => {
    const block = document.blocks[index]
    if (!block || !onRewriteBlock) return
    const text = 'text' in block ? block.text : ''
    if (!text.trim()) return

    setBusyBlock(block.id)
    try {
      const rewritten = await onRewriteBlock(text)
      if (rewritten) patch(index, { text: rewritten } as Partial<Block>)
    } finally {
      setBusyBlock(null)
    }
  }

  const chooseImage = async (index: number) => {
    if (!onPickImage) return
    const picked = await onPickImage()
    if (!picked) return
    patch(index, { url: picked.url, alt: picked.alt, mediaId: picked.mediaId } as Partial<Block>)
  }

  return (
    <div className="space-y-1">
      {document.blocks.length === 0 && (
        <div className="rounded border border-dashed border-[var(--color-border-strong)] px-4 py-10 text-center">
          <p className="text-sm text-[var(--color-muted)]">Текст пока пуст.</p>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="mt-3"
            onClick={() => insert(0, 'paragraph')}
            disabled={disabled}
          >
            <Plus className="h-3.5 w-3.5" />
            Добавить абзац
          </Button>
        </div>
      )}

      {document.blocks.map((block, index) => (
        <div key={block.id}>
          <InsertBar
            open={menuIndex === index}
            onToggle={() => setMenuIndex(menuIndex === index ? null : index)}
            onPick={(type) => insert(index, type)}
            disabled={disabled}
          />

          <div
            draggable={!disabled}
            onDragStart={() => {
              dragIndex.current = index
            }}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault()
              if (dragIndex.current !== null && dragIndex.current !== index) {
                move(dragIndex.current, index)
              }
              dragIndex.current = null
            }}
            className="group relative rounded border border-transparent bg-[var(--color-surface)] px-2 py-1.5 transition-colors hover:border-[var(--color-border)]"
          >
            <div className="flex gap-2">
              <div className="flex w-6 shrink-0 flex-col items-center gap-0.5 pt-1.5 opacity-0 transition-opacity group-focus-within:opacity-100 group-hover:opacity-100">
                <span className="cursor-grab text-[var(--color-muted-soft)]" title="Перетащить">
                  <GripVertical className="h-3.5 w-3.5" />
                </span>
                <button
                  type="button"
                  onClick={() => move(index, index - 1)}
                  disabled={disabled || index === 0}
                  className="text-[var(--color-muted-soft)] hover:text-[var(--color-text)] disabled:opacity-30"
                  aria-label="Выше"
                >
                  <ChevronUp className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => move(index, index + 1)}
                  disabled={disabled || index === document.blocks.length - 1}
                  className="text-[var(--color-muted-soft)] hover:text-[var(--color-text)] disabled:opacity-30"
                  aria-label="Ниже"
                >
                  <ChevronDown className="h-3.5 w-3.5" />
                </button>
              </div>

              <div className="min-w-0 flex-1">
                <BlockFields
                  block={block}
                  onPatch={(changes) => patch(index, changes)}
                  onPickImage={() => chooseImage(index)}
                  disabled={disabled}
                  isLeadCandidate={index === firstParagraphIndex}
                />
              </div>

              <div className="flex w-16 shrink-0 items-start justify-end gap-0.5 pt-1 opacity-0 transition-opacity group-focus-within:opacity-100 group-hover:opacity-100">
                {onRewriteBlock && 'text' in block && (
                  <button
                    type="button"
                    onClick={() => rewrite(index)}
                    disabled={disabled || busyBlock === block.id}
                    className="rounded-sm p-1 text-[var(--color-muted)] hover:bg-[var(--color-surface-sunken)] hover:text-[var(--color-accent)] disabled:opacity-40"
                    title="Перефразировать блок"
                  >
                    {busyBlock === block.id ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Languages className="h-3.5 w-3.5" />
                    )}
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => remove(index)}
                  disabled={disabled}
                  className="rounded-sm p-1 text-[var(--color-muted)] hover:bg-red-50 hover:text-red-600 disabled:opacity-40"
                  title="Удалить блок"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          </div>
        </div>
      ))}

      <InsertBar
        open={menuIndex === document.blocks.length}
        onToggle={() =>
          setMenuIndex(menuIndex === document.blocks.length ? null : document.blocks.length)
        }
        onPick={(type) => insert(document.blocks.length, type)}
        disabled={disabled}
        always
      />

      <p className="pt-2 text-xs text-[var(--color-muted)]">
        Форматирование внутри текста: <code>**жирный**</code>, <code>*курсив*</code>,{' '}
        <code>[текст](https://ссылка)</code>. HTML не поддерживается — это защита от XSS.
      </p>
    </div>
  )
}

function InsertBar({
  open,
  onToggle,
  onPick,
  disabled,
  always,
}: {
  open: boolean
  onToggle: () => void
  onPick: (type: Block['type']) => void
  disabled?: boolean
  always?: boolean
}) {
  return (
    <div className={cn('relative', always ? 'py-2' : 'h-3')}>
      <div
        className={cn(
          'flex items-center gap-2 transition-opacity',
          always || open ? 'opacity-100' : 'opacity-0 hover:opacity-100',
        )}
      >
        <button
          type="button"
          onClick={onToggle}
          disabled={disabled}
          className="flex h-6 items-center gap-1 rounded-sm border border-[var(--color-border-strong)] bg-[var(--color-surface)] px-2 text-xs text-[var(--color-muted)] hover:border-[var(--color-accent)] hover:text-[var(--color-accent)]"
        >
          <Plus className="h-3 w-3" />
          Блок
        </button>
        <span className="h-px flex-1 bg-[var(--color-border)]" />
      </div>

      {open && (
        <div className="absolute left-0 top-7 z-20 w-56 rounded border border-[var(--color-border-strong)] bg-[var(--color-surface)] p-1 shadow-[var(--shadow-pop)]">
          {BLOCK_MENU.map((item) => {
            const Icon = item.icon
            return (
              <button
                key={item.type}
                type="button"
                onClick={() => onPick(item.type)}
                className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-left text-sm hover:bg-[var(--color-surface-sunken)]"
              >
                <Icon className="h-3.5 w-3.5 text-[var(--color-muted)]" />
                {item.label}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}

function AutoTextarea({
  value,
  onChange,
  placeholder,
  className,
  disabled,
  rows = 2,
}: {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  className?: string
  disabled?: boolean
  rows?: number
}) {
  return (
    <textarea
      value={value}
      rows={rows}
      placeholder={placeholder}
      disabled={disabled}
      onChange={(e) => {
        onChange(e.target.value)
        e.target.style.height = 'auto'
        e.target.style.height = `${e.target.scrollHeight}px`
      }}
      onFocus={(e) => {
        e.target.style.height = 'auto'
        e.target.style.height = `${e.target.scrollHeight}px`
      }}
      className={cn(
        'w-full resize-none rounded-sm border border-transparent bg-transparent px-2 py-1.5 text-sm leading-relaxed outline-none',
        'focus:border-[var(--color-border-strong)] focus:bg-[var(--color-surface)]',
        'placeholder:text-[var(--color-muted-soft)] disabled:opacity-60',
        className,
      )}
    />
  )
}

function BlockFields({
  block,
  onPatch,
  onPickImage,
  disabled,
  isLeadCandidate,
}: {
  block: Block
  onPatch: (changes: Partial<Block>) => void
  onPickImage: () => void
  disabled?: boolean
  isLeadCandidate?: boolean
}) {
  switch (block.type) {
    case 'paragraph':
      return (
        <div>
          <AutoTextarea
            value={block.text}
            onChange={(text) => onPatch({ text } as Partial<Block>)}
            placeholder="Текст абзаца…"
            disabled={disabled}
            rows={3}
          />
          {isLeadCandidate && (
            <label className="ml-2 flex items-center gap-1.5 text-xs text-[var(--color-muted)]">
              <input
                type="checkbox"
                checked={block.lead === true}
                onChange={(e) => onPatch({ lead: e.target.checked } as Partial<Block>)}
                disabled={disabled}
              />
              Лид-абзац (крупный шрифт)
            </label>
          )}
        </div>
      )

    case 'heading2':
    case 'heading3':
      return (
        <div className="flex items-center gap-2">
          <span className="shrink-0 rounded-sm bg-[var(--color-surface-sunken)] px-1.5 py-0.5 text-[0.625rem] font-semibold uppercase tracking-wider text-[var(--color-muted)]">
            {block.type === 'heading2' ? 'H2' : 'H3'}
          </span>
          <AutoTextarea
            value={block.text}
            onChange={(text) => onPatch({ text } as Partial<Block>)}
            placeholder="Текст заголовка…"
            disabled={disabled}
            rows={1}
            className="font-semibold"
          />
        </div>
      )

    case 'image':
      return (
        <div className="space-y-2 py-1">
          <div className="flex gap-3">
            <div className="h-20 w-32 shrink-0 overflow-hidden rounded-sm border border-[var(--color-border)] bg-[var(--color-surface-sunken)]">
              {block.url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={block.url} alt="" className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full items-center justify-center text-[var(--color-muted-soft)]">
                  <ImageIcon className="h-5 w-5" />
                </div>
              )}
            </div>
            <div className="min-w-0 flex-1 space-y-1.5">
              <div className="flex gap-1.5">
                <Button type="button" size="sm" variant="outline" onClick={onPickImage} disabled={disabled}>
                  {block.url ? 'Заменить' : 'Выбрать'}
                </Button>
                <select
                  value={block.ratio ?? '16:9'}
                  onChange={(e) => onPatch({ ratio: e.target.value } as Partial<Block>)}
                  disabled={disabled}
                  className="h-8 rounded-sm border border-[var(--color-border-strong)] bg-[var(--color-surface)] px-2 text-xs"
                  aria-label="Пропорции"
                >
                  <option value="16:9">16:9</option>
                  <option value="4:3">4:3</option>
                  <option value="1:1">1:1</option>
                </select>
              </div>
              <Input
                value={block.alt}
                onChange={(e) => onPatch({ alt: e.target.value } as Partial<Block>)}
                placeholder="Alt-текст (обязателен)"
                className="h-8 text-xs"
                disabled={disabled}
              />
            </div>
          </div>
          <div className="grid gap-1.5 sm:grid-cols-2">
            <Input
              value={block.caption ?? ''}
              onChange={(e) => onPatch({ caption: e.target.value } as Partial<Block>)}
              placeholder="Подпись"
              className="h-8 text-xs"
              disabled={disabled}
            />
            <Input
              value={block.credit ?? ''}
              onChange={(e) => onPatch({ credit: e.target.value } as Partial<Block>)}
              placeholder="Автор / источник"
              className="h-8 text-xs"
              disabled={disabled}
            />
          </div>
        </div>
      )

    case 'quote':
      return (
        <div className="border-l-2 border-[var(--color-accent)] pl-2">
          <AutoTextarea
            value={block.text}
            onChange={(text) => onPatch({ text } as Partial<Block>)}
            placeholder="Текст цитаты…"
            disabled={disabled}
            rows={2}
            className="italic"
          />
          <Input
            value={block.attribution ?? ''}
            onChange={(e) => onPatch({ attribution: e.target.value } as Partial<Block>)}
            placeholder="Кто сказал (необязательно)"
            className="mt-1 h-7 text-xs"
            disabled={disabled}
          />
        </div>
      )

    case 'callout':
      return (
        <div className="rounded-sm border border-[var(--color-border)] bg-[var(--color-surface-sunken)] p-2">
          <div className="mb-1.5 flex gap-1.5">
            <Input
              value={block.title ?? ''}
              onChange={(e) => onPatch({ title: e.target.value } as Partial<Block>)}
              placeholder="Заголовок врезки"
              className="h-7 text-xs"
              disabled={disabled}
            />
            <select
              value={block.variant ?? 'context'}
              onChange={(e) => onPatch({ variant: e.target.value } as Partial<Block>)}
              disabled={disabled}
              className="h-7 shrink-0 rounded-sm border border-[var(--color-border-strong)] bg-[var(--color-surface)] px-2 text-xs"
              aria-label="Тип врезки"
            >
              <option value="context">Контекст</option>
              <option value="info">Инфо</option>
              <option value="warning">Внимание</option>
            </select>
          </div>
          <AutoTextarea
            value={block.text}
            onChange={(text) => onPatch({ text } as Partial<Block>)}
            placeholder="Текст врезки…"
            disabled={disabled}
            rows={2}
          />
        </div>
      )

    case 'list':
      return (
        <div className="py-1">
          <label className="mb-1.5 flex items-center gap-1.5 text-xs text-[var(--color-muted)]">
            <input
              type="checkbox"
              checked={block.ordered === true}
              onChange={(e) => onPatch({ ordered: e.target.checked } as Partial<Block>)}
              disabled={disabled}
            />
            Нумерованный список
          </label>
          <div className="space-y-1">
            {block.items.map((item, i) => (
              <div key={i} className="flex items-center gap-1.5">
                <span className="w-4 shrink-0 text-center text-xs text-[var(--color-muted-soft)]">
                  {block.ordered ? `${i + 1}.` : '•'}
                </span>
                <Input
                  value={item}
                  onChange={(e) => {
                    const items = [...block.items]
                    items[i] = e.target.value
                    onPatch({ items } as Partial<Block>)
                  }}
                  className="h-8 text-sm"
                  disabled={disabled}
                />
                <button
                  type="button"
                  onClick={() => onPatch({ items: block.items.filter((_, x) => x !== i) } as Partial<Block>)}
                  disabled={disabled}
                  className="shrink-0 p-1 text-[var(--color-muted-soft)] hover:text-red-600"
                  aria-label="Удалить пункт"
                >
                  <Trash2 className="h-3 w-3" />
                </button>
              </div>
            ))}
          </div>
          <Button
            type="button"
            size="sm"
            variant="ghost"
            className="mt-1 h-7 text-xs"
            onClick={() => onPatch({ items: [...block.items, ''] } as Partial<Block>)}
            disabled={disabled}
          >
            <Plus className="h-3 w-3" />
            Пункт
          </Button>
        </div>
      )

    case 'divider':
      return (
        <div className="flex items-center gap-2 py-2 text-xs text-[var(--color-muted-soft)]">
          <span className="h-px flex-1 bg-[var(--color-border-strong)]" />
          Разделитель
          <span className="h-px flex-1 bg-[var(--color-border-strong)]" />
        </div>
      )

    case 'ad':
      return (
        <div className="flex items-center gap-2 rounded-sm border border-dashed border-amber-300 bg-amber-50/60 px-3 py-2 text-xs text-amber-800">
          <Megaphone className="h-3.5 w-3.5" />
          Рекламный блок (в дополнение к автоматическим)
        </div>
      )

    default:
      return null
  }
}
