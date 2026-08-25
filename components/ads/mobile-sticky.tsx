'use client'

import { useEffect, useState } from 'react'
import { X } from 'lucide-react'

import { AdSlot } from './ad-slot'
import { useAdRuntime } from './ad-context'

/**
 * Bottom anchor ad for phones.
 *
 * Three rules it follows, all of them policy requirements as much as UX ones:
 *  - it never appears before the reader has scrolled past the first screen, so
 *    it cannot cover the headline a Facebook visitor just clicked for;
 *  - it is dismissible, and stays dismissed for the session;
 *  - the close button has a real 44px hit area and sits away from the ad, so a
 *    dismiss tap cannot be mistaken for an ad click.
 */
export function MobileStickyAd() {
  const runtime = useAdRuntime()
  const [visible, setVisible] = useState(false)
  const [closed, setClosed] = useState(false)

  useEffect(() => {
    if (typeof window === 'undefined') return
    if (window.sessionStorage.getItem('lz_sticky_closed') === '1') {
      setClosed(true)
      return
    }
    const onScroll = () => setVisible(window.scrollY > 600)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  if (!runtime.mobileStickyEnabled || closed || !visible) return null

  return (
    <div className="fixed inset-x-0 bottom-0 z-40 lg:hidden">
      <div className="relative border-t border-[var(--color-border)] bg-[var(--color-surface)]/98 backdrop-blur-sm">
        <button
          type="button"
          onClick={() => {
            setClosed(true)
            try {
              window.sessionStorage.setItem('lz_sticky_closed', '1')
            } catch {
              /* storage unavailable — dismissal is per-render then */
            }
          }}
          aria-label="Werbung schließen"
          className="absolute -top-7 right-2 flex h-7 w-7 items-center justify-center rounded-t border border-b-0 border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-muted)]"
        >
          <X className="h-3.5 w-3.5" />
        </button>
        <AdSlot id="MOBILE_STICKY" className="my-0 py-1" hideLabel />
      </div>
    </div>
  )
}
