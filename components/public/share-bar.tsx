'use client'

import { useState } from 'react'
import { Check, Link2, Send } from 'lucide-react'

import { trackEvent } from '@/server/analytics/events'
import { cn } from '@/lib/utils'

interface ShareBarProps {
  url: string
  title: string
  className?: string
  compact?: boolean
}

/**
 * Facebook and WhatsApp are the two that matter for this audience; Telegram is
 * cheap to add. Every link carries a UTM source so the traffic is attributable
 * in analytics without ever touching the canonical URL.
 */
function withUtm(url: string, source: string): string {
  try {
    const parsed = new URL(url)
    parsed.searchParams.set('utm_source', source)
    parsed.searchParams.set('utm_medium', 'social')
    parsed.searchParams.set('utm_campaign', 'share')
    return parsed.toString()
  } catch {
    return url
  }
}

export function ShareBar({ url, title, className, compact }: ShareBarProps) {
  const [copied, setCopied] = useState(false)

  const targets = [
    {
      key: 'facebook',
      label: 'Facebook',
      href: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(withUtm(url, 'facebook'))}`,
      className: 'hover:border-[#1877F2] hover:text-[#1877F2]',
    },
    {
      key: 'whatsapp',
      label: 'WhatsApp',
      href: `https://api.whatsapp.com/send?text=${encodeURIComponent(`${title} ${withUtm(url, 'whatsapp')}`)}`,
      className: 'hover:border-[#25D366] hover:text-[#128C7E]',
    },
    {
      key: 'telegram',
      label: 'Telegram',
      href: `https://t.me/share/url?url=${encodeURIComponent(withUtm(url, 'telegram'))}&text=${encodeURIComponent(title)}`,
      className: 'hover:border-[#229ED9] hover:text-[#229ED9]',
    },
  ]

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url)
      setCopied(true)
      trackEvent('share_click', { method: 'copy_link' })
      setTimeout(() => setCopied(false), 2200)
    } catch {
      // Clipboard denied (insecure context) — the visible links still work.
    }
  }

  return (
    <div className={cn('flex flex-wrap items-center gap-2', className)}>
      {!compact && (
        <span className="mr-1 text-[0.6875rem] uppercase tracking-[0.12em] text-[var(--color-muted-soft)]">
          Teilen
        </span>
      )}
      {targets.map((target) => (
        <a
          key={target.key}
          href={target.href}
          target="_blank"
          rel="noopener noreferrer"
          onClick={() => trackEvent('share_click', { method: target.key })}
          className={cn(
            'inline-flex h-8 items-center gap-1.5 rounded-sm border border-[var(--color-border-strong)] px-2.5 text-[0.8125rem] font-medium text-[var(--color-text-soft)] transition-colors',
            target.className,
          )}
        >
          <Send className="h-3.5 w-3.5" aria-hidden />
          {target.label}
        </a>
      ))}
      <button
        type="button"
        onClick={copy}
        className="inline-flex h-8 items-center gap-1.5 rounded-sm border border-[var(--color-border-strong)] px-2.5 text-[0.8125rem] font-medium text-[var(--color-text-soft)] transition-colors hover:border-[var(--color-accent)] hover:text-[var(--color-accent)]"
        aria-live="polite"
      >
        {copied ? <Check className="h-3.5 w-3.5" aria-hidden /> : <Link2 className="h-3.5 w-3.5" aria-hidden />}
        {copied ? 'Kopiert' : 'Link kopieren'}
      </button>
    </div>
  )
}
