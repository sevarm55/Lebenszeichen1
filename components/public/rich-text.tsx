import { Fragment, type ReactNode } from 'react'

/**
 * Inline markup renderer for block text.
 *
 * The stored subset is **bold**, *italic* and [label](url) — nothing else, and
 * critically *not* HTML. Rendering therefore never needs dangerouslySetInnerHTML
 * and imported third-party markup can never become executable on our origin.
 */

const PATTERN = /(\*\*[^*]+\*\*|\*[^*]+\*|\[[^\]]+\]\([^)]+\))/g

function safeHref(raw: string): string | null {
  const href = raw.trim()
  if (href.startsWith('/') || href.startsWith('#')) return href
  try {
    const url = new URL(href)
    // Only http(s) survives — javascript:, data: and vbscript: are dropped.
    if (url.protocol === 'http:' || url.protocol === 'https:') return url.toString()
  } catch {
    return null
  }
  return null
}

export function renderInline(text: string): ReactNode[] {
  const parts = text.split(PATTERN).filter((p) => p !== '')

  return parts.map((part, index) => {
    if (part.startsWith('**') && part.endsWith('**') && part.length > 4) {
      return <strong key={index}>{part.slice(2, -2)}</strong>
    }
    if (part.startsWith('*') && part.endsWith('*') && part.length > 2) {
      return <em key={index}>{part.slice(1, -1)}</em>
    }
    const link = part.match(/^\[([^\]]+)\]\(([^)]+)\)$/)
    if (link) {
      const [, label, rawHref] = link
      const href = safeHref(rawHref ?? '')
      if (!href) return <Fragment key={index}>{label}</Fragment>
      const external = /^https?:\/\//i.test(href)
      return (
        <a
          key={index}
          href={href}
          {...(external ? { target: '_blank', rel: 'noopener noreferrer nofollow' } : {})}
        >
          {label}
        </a>
      )
    }
    return <Fragment key={index}>{part}</Fragment>
  })
}

export function RichText({ text }: { text: string }) {
  return <>{renderInline(text)}</>
}
