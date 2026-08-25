'use client'

import { Node, mergeAttributes } from '@tiptap/core'
import {
  NodeViewContent,
  NodeViewWrapper,
  ReactNodeViewRenderer,
  type NodeViewProps,
} from '@tiptap/react'
import Image from '@tiptap/extension-image'
import { ImageIcon, Megaphone, Trash2, Video } from 'lucide-react'

import { cn } from '@/lib/utils'

/**
 * Editorial node types.
 *
 * Everything the magazine actually publishes has a real representation in the
 * editor — an image looks like an image, a pull quote looks like a pull quote.
 * That is the whole reason for moving off a plain text field.
 */

// ------------------------------------------------------------- image -------

/**
 * Image with the metadata the CMS cares about: media id (so the file is
 * tracked), alt (accessibility + Google Images), caption and credit (rights),
 * and an aspect ratio.
 */
export const EditorialImage = Image.extend({
  name: 'image',
  draggable: true,

  addAttributes() {
    return {
      ...this.parent?.(),
      mediaId: { default: null },
      caption: { default: '' },
      credit: { default: '' },
      ratio: { default: '16:9' },
    }
  },

  addNodeView() {
    return ReactNodeViewRenderer(ImageView)
  },
})

function ImageView({ node, updateAttributes, deleteNode, selected }: NodeViewProps) {
  const { src, alt, caption, credit, ratio } = node.attrs as {
    src: string
    alt: string
    caption: string
    credit: string
    ratio: string
  }

  const aspect = ratio === '1:1' ? 'aspect-square' : ratio === '4:3' ? 'aspect-[4/3]' : 'aspect-[16/9]'

  return (
    <NodeViewWrapper
      className={cn(
        'group relative my-5 rounded border transition-colors',
        selected ? 'border-[var(--color-accent)]' : 'border-[var(--color-border)]',
      )}
      data-drag-handle
    >
      <div className={cn('relative overflow-hidden bg-[var(--color-surface-sunken)]', aspect)}>
        {src ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={src} alt={alt || ''} className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full items-center justify-center text-[var(--color-muted-soft)]">
            <ImageIcon className="h-6 w-6" />
          </div>
        )}

        <div className="absolute right-2 top-2 flex gap-1 opacity-0 transition-opacity group-hover:opacity-100">
          <select
            value={ratio}
            onChange={(e) => updateAttributes({ ratio: e.target.value })}
            className="h-7 rounded-sm border border-white/40 bg-black/60 px-1.5 text-xs text-white backdrop-blur"
            aria-label="Пропорции"
          >
            <option value="16:9">16:9</option>
            <option value="4:3">4:3</option>
            <option value="1:1">1:1</option>
          </select>
          <button
            type="button"
            onClick={() => deleteNode()}
            className="flex h-7 w-7 items-center justify-center rounded-sm border border-white/40 bg-black/60 text-white backdrop-blur"
            aria-label="Удалить изображение"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      <div className="grid gap-1.5 border-t border-[var(--color-border)] bg-[var(--color-surface)] p-2 sm:grid-cols-3">
        <input
          value={alt || ''}
          onChange={(e) => updateAttributes({ alt: e.target.value })}
          placeholder="Alt-текст (обязателен)"
          className={cn(
            'h-7 rounded-sm border px-2 text-xs',
            alt ? 'border-[var(--color-border-strong)]' : 'border-amber-300 bg-amber-50',
          )}
        />
        <input
          value={caption || ''}
          onChange={(e) => updateAttributes({ caption: e.target.value })}
          placeholder="Подпись"
          className="h-7 rounded-sm border border-[var(--color-border-strong)] px-2 text-xs"
        />
        <input
          value={credit || ''}
          onChange={(e) => updateAttributes({ credit: e.target.value })}
          placeholder="Автор / источник"
          className="h-7 rounded-sm border border-[var(--color-border-strong)] px-2 text-xs"
        />
      </div>
    </NodeViewWrapper>
  )
}

// ------------------------------------------------------------- quote -------

/** Pull quote with an attribution line, matching the public renderer. */
export const EditorialQuote = Node.create({
  name: 'editorialQuote',
  group: 'block',
  content: 'paragraph+',
  defining: true,

  addAttributes() {
    return { attribution: { default: '' } }
  },

  parseHTML() {
    return [{ tag: 'figure[data-quote]' }]
  },

  renderHTML({ HTMLAttributes }) {
    return ['figure', mergeAttributes(HTMLAttributes, { 'data-quote': '' }), 0]
  },

  addNodeView() {
    return ReactNodeViewRenderer(QuoteView)
  },
})

function QuoteView({ node, updateAttributes, selected }: NodeViewProps) {
  return (
    <NodeViewWrapper
      className={cn(
        'my-5 border-l-2 pl-4',
        selected ? 'border-[var(--color-accent)]' : 'border-[var(--color-border-strong)]',
      )}
    >
      <NodeViewContent className="font-serif text-[1.0625rem] italic leading-relaxed [&>p]:my-0" />
      <input
        value={(node.attrs.attribution as string) || ''}
        onChange={(e) => updateAttributes({ attribution: e.target.value })}
        placeholder="Кто сказал (необязательно)"
        contentEditable={false}
        className="mt-1.5 h-6 w-full max-w-xs border-0 border-b border-dashed border-[var(--color-border-strong)] bg-transparent px-0 text-xs text-[var(--color-muted)] focus:outline-none"
      />
    </NodeViewWrapper>
  )
}

// ----------------------------------------------------------- callout -------

export const Callout = Node.create({
  name: 'callout',
  group: 'block',
  content: 'paragraph+',
  defining: true,

  addAttributes() {
    return { title: { default: '' }, variant: { default: 'context' } }
  },

  parseHTML() {
    return [{ tag: 'aside[data-callout]' }]
  },

  renderHTML({ HTMLAttributes }) {
    return ['aside', mergeAttributes(HTMLAttributes, { 'data-callout': '' }), 0]
  },

  addNodeView() {
    return ReactNodeViewRenderer(CalloutView)
  },
})

function CalloutView({ node, updateAttributes, selected }: NodeViewProps) {
  const variant = (node.attrs.variant as string) || 'context'
  const tone =
    variant === 'warning'
      ? 'border-amber-300 bg-amber-50/70'
      : variant === 'info'
        ? 'border-blue-200 bg-blue-50/70'
        : 'border-[var(--color-border-strong)] bg-[var(--color-surface-sunken)]'

  return (
    <NodeViewWrapper
      className={cn('my-5 rounded-sm border-l-2 px-4 py-3', tone, selected && 'ring-1 ring-[var(--color-accent)]')}
    >
      <div className="mb-1.5 flex items-center gap-2" contentEditable={false}>
        <input
          value={(node.attrs.title as string) || ''}
          onChange={(e) => updateAttributes({ title: e.target.value })}
          placeholder="Заголовок врезки"
          className="h-6 flex-1 border-0 bg-transparent px-0 text-[0.6875rem] font-semibold uppercase tracking-[0.12em] text-[var(--color-muted)] focus:outline-none"
        />
        <select
          value={variant}
          onChange={(e) => updateAttributes({ variant: e.target.value })}
          className="h-6 rounded-sm border border-[var(--color-border-strong)] bg-[var(--color-surface)] px-1 text-[0.6875rem]"
          aria-label="Тип врезки"
        >
          <option value="context">Контекст</option>
          <option value="info">Инфо</option>
          <option value="warning">Внимание</option>
        </select>
      </div>
      <NodeViewContent className="text-sm leading-relaxed [&>p]:my-0" />
    </NodeViewWrapper>
  )
}

// ------------------------------------------------------------ atoms --------

export const AdSlotNode = Node.create({
  name: 'adSlot',
  group: 'block',
  atom: true,
  selectable: true,

  parseHTML() {
    return [{ tag: 'div[data-ad-slot-marker]' }]
  },
  renderHTML({ HTMLAttributes }) {
    return ['div', mergeAttributes(HTMLAttributes, { 'data-ad-slot-marker': '' })]
  },
  addNodeView() {
    return ReactNodeViewRenderer(AdSlotView)
  },
})

function AdSlotView({ deleteNode, selected }: NodeViewProps) {
  return (
    <NodeViewWrapper
      className={cn(
        'my-5 flex items-center gap-2 rounded-sm border border-dashed px-3 py-3 text-xs',
        selected ? 'border-[var(--color-accent)] bg-[var(--color-accent-soft)]' : 'border-amber-300 bg-amber-50/60 text-amber-800',
      )}
      contentEditable={false}
    >
      <Megaphone className="h-4 w-4 shrink-0" />
      <span className="flex-1">Рекламный блок — дополнительно к автоматическим</span>
      <button type="button" onClick={() => deleteNode()} aria-label="Удалить">
        <Trash2 className="h-3.5 w-3.5" />
      </button>
    </NodeViewWrapper>
  )
}

export const Gallery = Node.create({
  name: 'gallery',
  group: 'block',
  atom: true,
  selectable: true,

  addAttributes() {
    return { items: { default: [] } }
  },
  parseHTML() {
    return [{ tag: 'div[data-gallery]' }]
  },
  renderHTML({ HTMLAttributes }) {
    return ['div', mergeAttributes(HTMLAttributes, { 'data-gallery': '' })]
  },
  addNodeView() {
    return ReactNodeViewRenderer(GalleryView)
  },
})

function GalleryView({ node, deleteNode, selected }: NodeViewProps) {
  const items = (node.attrs.items as { url: string; alt: string }[]) ?? []
  return (
    <NodeViewWrapper
      className={cn(
        'my-5 rounded border p-2',
        selected ? 'border-[var(--color-accent)]' : 'border-[var(--color-border)]',
      )}
      contentEditable={false}
    >
      <div className="mb-1.5 flex items-center justify-between text-xs text-[var(--color-muted)]">
        <span>Галерея — {items.length} изображ.</span>
        <button type="button" onClick={() => deleteNode()} aria-label="Удалить галерею">
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>
      <div className="grid grid-cols-4 gap-1.5">
        {items.map((item, i) => (
          // eslint-disable-next-line @next/next/no-img-element
          <img key={i} src={item.url} alt={item.alt} className="aspect-square w-full rounded-sm object-cover" />
        ))}
      </div>
    </NodeViewWrapper>
  )
}

export const VideoEmbed = Node.create({
  name: 'videoEmbed',
  group: 'block',
  atom: true,
  selectable: true,

  addAttributes() {
    return { provider: { default: 'youtube' }, embedId: { default: '' }, caption: { default: '' } }
  },
  parseHTML() {
    return [{ tag: 'div[data-video-embed]' }]
  },
  renderHTML({ HTMLAttributes }) {
    return ['div', mergeAttributes(HTMLAttributes, { 'data-video-embed': '' })]
  },
  addNodeView() {
    return ReactNodeViewRenderer(VideoView)
  },
})

function VideoView({ node, deleteNode, selected }: NodeViewProps) {
  const { provider, embedId } = node.attrs as { provider: string; embedId: string }
  return (
    <NodeViewWrapper
      className={cn(
        'my-5 flex items-center gap-2 rounded border px-3 py-3 text-xs',
        selected ? 'border-[var(--color-accent)]' : 'border-[var(--color-border)]',
      )}
      contentEditable={false}
    >
      <Video className="h-4 w-4 shrink-0 text-[var(--color-muted)]" />
      <span className="flex-1">
        Видео · {provider} · <code>{embedId}</code>
      </span>
      <button type="button" onClick={() => deleteNode()} aria-label="Удалить видео">
        <Trash2 className="h-3.5 w-3.5" />
      </button>
    </NodeViewWrapper>
  )
}
