'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { Heading2, Heading3, Image as ImageIcon, List, Minus, Quote } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { documentToProse, proseToDocument } from '@/server/domain/prose'
import type { ArticleDocument } from '@/server/domain/blocks'
import { MediaPicker, type PickedImage } from '@/components/admin/media-picker'

interface ProseEditorProps {
  document: ArticleDocument
  onChange: (document: ArticleDocument) => void
  disabled?: boolean
  promptSeed?: string
  imageCandidates?: { url: string; alt: string }[]
}

/**
 * One large text area, the way a writer expects.
 *
 * The document is still stored as blocks — this only changes how it is typed.
 * Local text state is authoritative while the field has focus, so re-parsing on
 * every keystroke cannot move the caret or collapse a paragraph the moment a
 * blank line is typed.
 */
export function ProseEditor({
  document: doc,
  onChange,
  disabled,
  promptSeed,
  imageCandidates,
}: ProseEditorProps) {
  const view = useMemo(() => documentToProse(doc), [doc])
  const [text, setText] = useState(view.text)
  const [lead, setLead] = useState(view.lead)
  const [pickerOpen, setPickerOpen] = useState(false)
  const dirty = useRef(false)
  const areaRef = useRef<HTMLTextAreaElement>(null)

  // Adopt external changes (AI rewrite, revision restore) but never overwrite
  // what the editor is in the middle of typing.
  useEffect(() => {
    if (dirty.current) return
    setText(view.text)
    setLead(view.lead)
  }, [view.text, view.lead])

  const push = (nextText: string, nextLead: boolean) => {
    onChange(proseToDocument(nextText, doc, { lead: nextLead }))
  }

  const handleChange = (value: string) => {
    dirty.current = true
    setText(value)
    push(value, lead)
  }

  /** Wraps or inserts syntax at the caret. */
  const insert = (before: string, placeholder: string, after = '') => {
    const area = areaRef.current
    if (!area) return
    const start = area.selectionStart
    const end = area.selectionEnd
    const selected = text.slice(start, end) || placeholder

    const needsBreakBefore = start > 0 && !text.slice(0, start).endsWith('\n\n')
    const prefix = needsBreakBefore ? '\n\n' : ''
    const snippet = `${prefix}${before}${selected}${after}`

    const next = text.slice(0, start) + snippet + text.slice(end)
    dirty.current = true
    setText(next)
    push(next, lead)

    requestAnimationFrame(() => {
      const caret = start + prefix.length + before.length
      area.focus()
      area.setSelectionRange(caret, caret + selected.length)
    })
  }

  const insertImage = (image: PickedImage) => {
    // The image becomes a real block; the token is only its placeholder in text.
    const nextIndex = view.opaque.length + 1
    const area = areaRef.current
    const start = area?.selectionStart ?? text.length
    const needsBreak = start > 0 && !text.slice(0, start).endsWith('\n\n')
    const next =
      text.slice(0, start) + `${needsBreak ? '\n\n' : ''}[[block:${nextIndex}]]\n\n` + text.slice(start)

    const withImage: ArticleDocument = {
      version: doc.version,
      blocks: [
        ...doc.blocks,
        {
          id: `img_${Date.now().toString(36)}`,
          type: 'image',
          url: image.url,
          mediaId: image.mediaId,
          alt: image.alt,
          ratio: '16:9',
        },
      ],
    }

    dirty.current = true
    setText(next)
    onChange(proseToDocument(next, withImage, { lead }))
    setPickerOpen(false)
  }

  const words = text.trim() ? text.trim().split(/\s+/).length : 0

  return (
    <div className="space-y-2">
      {/* --------------------------------------------------- toolbar --- */}
      <div className="flex flex-wrap items-center gap-1 rounded-sm border border-[var(--color-border)] bg-[var(--color-surface-sunken)] px-1.5 py-1.5">
        <ToolButton icon={Heading2} label="Заголовок H2" onClick={() => insert('## ', 'Заголовок')} disabled={disabled} />
        <ToolButton icon={Heading3} label="Подзаголовок H3" onClick={() => insert('### ', 'Подзаголовок')} disabled={disabled} />
        <ToolButton icon={Quote} label="Цитата" onClick={() => insert('> ', 'Текст цитаты')} disabled={disabled} />
        <ToolButton icon={List} label="Список" onClick={() => insert('- ', 'Первый пункт')} disabled={disabled} />
        <ToolButton icon={Minus} label="Разделитель" onClick={() => insert('---', '')} disabled={disabled} />
        <span className="mx-1 h-5 w-px bg-[var(--color-border-strong)]" />
        <ToolButton icon={ImageIcon} label="Вставить изображение" onClick={() => setPickerOpen(true)} disabled={disabled} />

        <span className="ml-auto flex items-center gap-3 pr-1 text-xs text-[var(--color-muted)]">
          <label className="flex items-center gap-1.5">
            <input
              type="checkbox"
              checked={lead}
              disabled={disabled}
              onChange={(e) => {
                setLead(e.target.checked)
                push(text, e.target.checked)
              }}
            />
            Первый абзац — лид
          </label>
          <span className="tabular-nums">{words} слов</span>
        </span>
      </div>

      {/* ------------------------------------------------- text area --- */}
      <textarea
        ref={areaRef}
        value={text}
        disabled={disabled}
        onChange={(e) => handleChange(e.target.value)}
        onBlur={() => {
          dirty.current = false
        }}
        spellCheck
        placeholder={
          'Текст статьи.\n\nАбзацы разделяются пустой строкой.\n\n## Так делается подзаголовок\n\n> Так — цитата'
        }
        className={cn(
          'min-h-[32rem] w-full resize-y rounded-sm border border-[var(--color-border-strong)] bg-[var(--color-surface)] p-4',
          'font-serif text-[1.0625rem] leading-[1.75] text-[var(--color-text)]',
          'focus:border-[var(--color-accent)] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]/15',
          'placeholder:font-sans placeholder:text-[var(--color-muted-soft)] disabled:opacity-60',
        )}
      />

      {/* --------------------------------------------------- legend --- */}
      {view.opaque.length > 0 && (
        <div className="rounded-sm border border-[var(--color-border)] bg-[var(--color-surface-sunken)] px-3 py-2">
          <p className="mb-1 text-xs font-medium text-[var(--color-text-soft)]">
            Блоки в тексте — не удаляйте метку, если блок нужен:
          </p>
          <ul className="space-y-0.5">
            {view.opaque.map((entry) => (
              <li key={entry.index} className="flex items-center gap-2 text-xs text-[var(--color-muted)]">
                <code className="rounded-sm bg-[var(--color-surface)] px-1 py-0.5 text-[0.6875rem]">
                  [[block:{entry.index}]]
                </code>
                {entry.label}
              </li>
            ))}
          </ul>
        </div>
      )}

      <p className="text-xs text-[var(--color-muted)]">
        <code>**жирный**</code> · <code>*курсив*</code> · <code>[текст](https://ссылка)</code> ·{' '}
        <code>## H2</code> · <code>### H3</code> · <code>&gt; цитата</code> · <code>- список</code> ·{' '}
        <code>---</code> разделитель. HTML не поддерживается — это защита от XSS.
      </p>

      <MediaPicker
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        onPick={insertImage}
        promptSeed={promptSeed}
        candidates={imageCandidates}
      />
    </div>
  )
}

function ToolButton({
  icon: Icon,
  label,
  onClick,
  disabled,
}: {
  icon: typeof Heading2
  label: string
  onClick: () => void
  disabled?: boolean
}) {
  return (
    <Button
      type="button"
      variant="ghost"
      size="iconSm"
      onClick={onClick}
      disabled={disabled}
      title={label}
      aria-label={label}
      className="hover:bg-[var(--color-surface)]"
    >
      <Icon className="h-3.5 w-3.5" />
    </Button>
  )
}
