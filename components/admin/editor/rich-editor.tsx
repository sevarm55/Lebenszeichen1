'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { EditorContent, useEditor, type Editor } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Link from '@tiptap/extension-link'
import Placeholder from '@tiptap/extension-placeholder'
import {
  Bold,
  Heading2,
  Heading3,
  Image as ImageIcon,
  Info,
  Italic,
  Link2,
  List,
  ListOrdered,
  Megaphone,
  Minus,
  Quote,
  Redo2,
  Undo2,
} from 'lucide-react'

import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import type { ArticleDocument } from '@/server/domain/blocks'
import { blocksToTiptap, tiptapToBlocks, type PMDoc } from '@/server/domain/tiptap'
import { MediaPicker, type PickedImage } from '@/components/admin/media-picker'
import {
  AdSlotNode,
  Callout,
  EditorialImage,
  EditorialQuote,
  Gallery,
  VideoEmbed,
} from './nodes'

interface RichEditorProps {
  document: ArticleDocument
  onChange: (document: ArticleDocument) => void
  disabled?: boolean
  promptSeed?: string
  imageCandidates?: { url: string; alt: string }[]
}

/**
 * The article body editor.
 *
 * TipTap (ProseMirror) so that an image is an image, a pull quote is a pull
 * quote and formatting is visible — rather than markers in a text field.
 * Storage stays on the block array: the ad engine needs word counts per block,
 * and the public renderer must never receive stored HTML.
 */
export function RichEditor({
  document: doc,
  onChange,
  disabled,
  promptSeed,
  imageCandidates,
}: RichEditorProps) {
  const [pickerOpen, setPickerOpen] = useState(false)
  // Guards the round trip: while the editor holds focus its own state is
  // authoritative, so re-serialising cannot move the caret.
  const internal = useRef(false)

  const editor = useEditor({
    immediatelyRender: false,
    editable: !disabled,
    extensions: [
      StarterKit.configure({
        heading: { levels: [2, 3] },
        // Replaced by the editorial variants below.
        blockquote: false,
        codeBlock: false,
        code: false,
        strike: false,
        link: false,
      }),
      Link.configure({
        openOnClick: false,
        autolink: false,
        // Anything but http(s) is dropped, matching the public renderer.
        protocols: ['http', 'https'],
        HTMLAttributes: { rel: 'noopener noreferrer', class: 'underline underline-offset-2' },
      }),
      Placeholder.configure({
        placeholder: 'Текст статьи. Enter — новый абзац.',
      }),
      EditorialImage.configure({ inline: false, allowBase64: false }),
      EditorialQuote,
      Callout,
      Gallery,
      VideoEmbed,
      AdSlotNode,
    ],
    content: blocksToTiptap(doc),
    onUpdate: ({ editor: instance }) => {
      internal.current = true
      onChange(tiptapToBlocks(instance.getJSON() as PMDoc))
    },
    editorProps: {
      attributes: {
        class:
          'prose-editor min-h-[24rem] w-full px-4 py-4 focus:outline-none font-serif text-[1.0625rem] leading-[1.75] text-[var(--color-text)]',
      },
    },
  })

  // Adopt external changes (AI rewrite, revision restore) without disturbing
  // an in-progress edit.
  useEffect(() => {
    if (!editor) return
    if (internal.current) {
      internal.current = false
      return
    }
    const incoming = blocksToTiptap(doc)
    const current = editor.getJSON()
    if (JSON.stringify(incoming) !== JSON.stringify(current)) {
      editor.commands.setContent(incoming, { emitUpdate: false })
    }
  }, [doc, editor])

  useEffect(() => {
    editor?.setEditable(!disabled)
  }, [disabled, editor])

  const insertImage = useCallback(
    (image: PickedImage) => {
      editor
        ?.chain()
        .focus()
        .insertContent({
          type: 'image',
          attrs: {
            src: image.url,
            alt: image.alt,
            mediaId: image.mediaId,
            caption: '',
            credit: '',
            ratio: '16:9',
          },
        })
        .run()
      setPickerOpen(false)
    },
    [editor],
  )

  const setLink = useCallback(() => {
    if (!editor) return
    const previous = editor.getAttributes('link').href as string | undefined
    const href = window.prompt('Адрес ссылки (https://…)', previous ?? 'https://')
    if (href === null) return
    if (!href.trim()) {
      editor.chain().focus().extendMarkRange('link').unsetLink().run()
      return
    }
    if (!/^https?:\/\//i.test(href.trim())) {
      window.alert('Разрешены только http:// и https:// ссылки.')
      return
    }
    editor.chain().focus().extendMarkRange('link').setLink({ href: href.trim() }).run()
  }, [editor])

  if (!editor) {
    return <div className="skeleton h-[28rem] w-full rounded-sm" />
  }

  return (
    <div className="rounded-sm border border-[var(--color-border-strong)] bg-[var(--color-surface)]">
      <Toolbar
        editor={editor}
        disabled={disabled}
        onImage={() => setPickerOpen(true)}
        onLink={setLink}
      />

      <div className="max-h-[calc(100vh-15rem)] min-h-[24rem] overflow-y-auto overscroll-contain">
        <EditorContent editor={editor} />
      </div>

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

function Toolbar({
  editor,
  disabled,
  onImage,
  onLink,
}: {
  editor: Editor
  disabled?: boolean
  onImage: () => void
  onLink: () => void
}) {
  const chain = () => editor.chain().focus()

  return (
    <div className="flex flex-wrap items-center gap-0.5 border-b border-[var(--color-border)] bg-[var(--color-surface-sunken)] px-1.5 py-1.5">
      <Tool icon={Bold} label="Жирный (Ctrl+B)" active={editor.isActive('bold')} disabled={disabled} onClick={() => chain().toggleBold().run()} />
      <Tool icon={Italic} label="Курсив (Ctrl+I)" active={editor.isActive('italic')} disabled={disabled} onClick={() => chain().toggleItalic().run()} />
      <Tool icon={Link2} label="Ссылка" active={editor.isActive('link')} disabled={disabled} onClick={onLink} />

      <Divider />

      <Tool icon={Heading2} label="Заголовок H2" active={editor.isActive('heading', { level: 2 })} disabled={disabled} onClick={() => chain().toggleHeading({ level: 2 }).run()} />
      <Tool icon={Heading3} label="Подзаголовок H3" active={editor.isActive('heading', { level: 3 })} disabled={disabled} onClick={() => chain().toggleHeading({ level: 3 }).run()} />
      <Tool icon={List} label="Маркированный список" active={editor.isActive('bulletList')} disabled={disabled} onClick={() => chain().toggleBulletList().run()} />
      <Tool icon={ListOrdered} label="Нумерованный список" active={editor.isActive('orderedList')} disabled={disabled} onClick={() => chain().toggleOrderedList().run()} />

      <Divider />

      <Tool icon={ImageIcon} label="Изображение" disabled={disabled} onClick={onImage} />
      <Tool
        icon={Quote}
        label="Цитата"
        active={editor.isActive('editorialQuote')}
        disabled={disabled}
        onClick={() =>
          chain()
            .insertContent({
              type: 'editorialQuote',
              attrs: { attribution: '' },
              content: [{ type: 'paragraph' }],
            })
            .run()
        }
      />
      <Tool
        icon={Info}
        label="Врезка"
        active={editor.isActive('callout')}
        disabled={disabled}
        onClick={() =>
          chain()
            .insertContent({
              type: 'callout',
              attrs: { title: '', variant: 'context' },
              content: [{ type: 'paragraph' }],
            })
            .run()
        }
      />
      <Tool icon={Minus} label="Разделитель" disabled={disabled} onClick={() => chain().setHorizontalRule().run()} />
      <Tool icon={Megaphone} label="Рекламный блок" disabled={disabled} onClick={() => chain().insertContent({ type: 'adSlot' }).run()} />

      <div className="ml-auto flex items-center gap-0.5">
        <Tool icon={Undo2} label="Отменить" disabled={disabled || !editor.can().undo()} onClick={() => chain().undo().run()} />
        <Tool icon={Redo2} label="Повторить" disabled={disabled || !editor.can().redo()} onClick={() => chain().redo().run()} />
      </div>
    </div>
  )
}

function Divider() {
  return <span className="mx-1 h-5 w-px bg-[var(--color-border-strong)]" />
}

function Tool({
  icon: Icon,
  label,
  onClick,
  active,
  disabled,
}: {
  icon: typeof Bold
  label: string
  onClick: () => void
  active?: boolean
  disabled?: boolean
}) {
  return (
    <Button
      type="button"
      variant="ghost"
      size="iconSm"
      title={label}
      aria-label={label}
      aria-pressed={active}
      disabled={disabled}
      onClick={onClick}
      className={cn(
        'hover:bg-[var(--color-surface)]',
        active && 'bg-[var(--color-accent)] text-white hover:bg-[var(--color-accent-hover)]',
      )}
    >
      <Icon className="h-3.5 w-3.5" />
    </Button>
  )
}
