'use client'

import { useEffect, useRef, useState } from 'react'

import { AD_PLACEMENTS, type AdSlotId } from '@/server/ads/placements'
import { cn } from '@/lib/utils'
import { trackEvent } from '@/server/analytics/events'
import { useAdRuntime } from './ad-context'

interface AdSlotProps {
  id: AdSlotId
  className?: string
  /** Suppresses the "Anzeige" label for slots that carry their own. */
  hideLabel?: boolean
}

/**
 * The only ad primitive in the codebase.
 *
 * Everything it guarantees:
 *  - space is reserved from first paint, so a slow or unfilled ad never shifts
 *    the article (CLS stays at 0);
 *  - the same DOM is rendered on the server and on first client render, so
 *    there is no hydration mismatch;
 *  - "Anzeige" is always visible above the unit — required by German law
 *    (§ 6 TMG / Trennungsgebot) and by AdSense's own policy on clearly
 *    distinguishing ads from content;
 *  - one `adsbygoogle.push` per <ins>, ever. A second push throws and kills
 *    every later slot on the page.
 */
export function AdSlot({ id, className, hideLabel }: AdSlotProps) {
  const runtime = useAdRuntime()
  const placement = AD_PLACEMENTS[id]
  const insRef = useRef<HTMLModElement>(null)
  const pushedRef = useRef(false)
  const [mounted, setMounted] = useState(false)

  const slotId = runtime.slots[id] ?? ''
  const placementOn = runtime.placementEnabled[id] !== false
  const live =
    runtime.enabled &&
    placementOn &&
    runtime.provider === 'adsense' &&
    runtime.clientId.startsWith('ca-pub-') &&
    Boolean(slotId)

  useEffect(() => setMounted(true), [])

  useEffect(() => {
    if (!mounted || !live || pushedRef.current || !insRef.current) return
    try {
      // The loader script is async; pushing onto the queue (creating it if
      // needed) survives the race — AdSense drains it once it arrives.
      const w = window as unknown as { adsbygoogle?: unknown[] }
      w.adsbygoogle = w.adsbygoogle || []
      w.adsbygoogle.push({})
      pushedRef.current = true
      trackEvent('ad_slot_rendered', { slot: id })
    } catch {
      // Blocked by an extension or offline — the reserved box just stays empty.
    }
  }, [mounted, live, id])

  if (!placementOn) return null
  // Nothing configured and not in preview mode: render nothing at all rather
  // than an empty grey box in front of real readers.
  if (!live && !runtime.preview) return null

  const style = {
    '--ad-h-mobile': `${placement.minHeight.mobile}px`,
    '--ad-h-desktop': `${placement.minHeight.desktop}px`,
  } as React.CSSProperties

  const deviceClass =
    placement.device === 'desktop'
      ? 'hidden lg:flex'
      : placement.device === 'mobile'
        ? 'flex lg:hidden'
        : 'flex'

  return (
    <aside
      className={cn('ad-shell my-8', deviceClass, className)}
      style={style}
      aria-label="Werbung"
      data-ad-slot={id}
    >
      {!hideLabel && <span className="ad-label">Anzeige</span>}
      <div
        className="w-full"
        style={{
          maxWidth: placement.maxWidth ? `${placement.maxWidth}px` : undefined,
          minHeight: `var(--ad-h-mobile)`,
        }}
      >
        {live ? (
          <ins
            ref={insRef}
            className="adsbygoogle block"
            style={{ display: 'block', minHeight: placement.minHeight.mobile }}
            data-ad-client={runtime.clientId}
            data-ad-slot={slotId}
            data-ad-format={placement.format === 'fluid' ? 'fluid' : 'auto'}
            data-full-width-responsive="true"
          />
        ) : (
          <PreviewBox label={placement.label} height={placement.minHeight.desktop || 250} />
        )}
      </div>
    </aside>
  )
}

function PreviewBox({ label, height }: { label: string; height: number }) {
  return (
    <div
      className="flex w-full items-center justify-center border border-dashed border-[var(--color-border-strong)] bg-[var(--color-surface-sunken)] text-center"
      style={{ minHeight: Math.max(90, height) }}
    >
      <span className="px-3 text-[0.6875rem] uppercase tracking-[0.14em] text-[var(--color-muted-soft)]">
        {label}
      </span>
    </div>
  )
}
