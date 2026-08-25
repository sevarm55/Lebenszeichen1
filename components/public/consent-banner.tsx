'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'

import { publicConfig } from '@/config/public'
import { Button } from '@/components/ui/button'

const STORAGE_KEY = 'lz_consent_v1'

interface ConsentState {
  analytics: boolean
  ads: boolean
  decidedAt: string
}

/**
 * Consent surface — and an explicit non-claim.
 *
 * This is NOT an IAB TCF-certified CMP, and it is not presented as one. Google
 * requires a *certified* CMP for personalised ads to EEA/UK/CH users; that CMP
 * plugs in via NEXT_PUBLIC_CMP_PROVIDER and takes over completely (this banner
 * then never renders). Until then this component does the one thing it can do
 * honestly: keep everything optional switched off, and give the reader a
 * working control.
 *
 * See docs/ADSENSE.md § Consent before going live in the EU.
 */
export function ConsentBanner() {
  const [state, setState] = useState<ConsentState | null>(null)
  const [ready, setReady] = useState(false)

  // A certified CMP owns the whole flow — never show two banners.
  const managedExternally = publicConfig.cmp.provider !== 'none'

  useEffect(() => {
    if (managedExternally) return
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY)
      if (raw) {
        const parsed = JSON.parse(raw) as ConsentState
        setState(parsed)
        applyConsent(parsed)
      }
    } catch {
      /* storage unavailable — treat as undecided */
    }
    setReady(true)
  }, [managedExternally])

  const decide = (analytics: boolean, ads: boolean) => {
    const next: ConsentState = { analytics, ads, decidedAt: new Date().toISOString() }
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
    } catch {
      /* ignore */
    }
    setState(next)
    applyConsent(next)
  }

  if (managedExternally || !ready || state) return null

  return (
    <div
      role="dialog"
      aria-live="polite"
      aria-label="Datenschutz-Einstellungen"
      className="fixed inset-x-0 bottom-0 z-[60] border-t border-[var(--color-border-strong)] bg-[var(--color-surface)] shadow-[var(--shadow-pop)]"
    >
      <div className="mx-auto flex max-w-[1280px] flex-col gap-4 px-4 py-4 sm:px-6 lg:flex-row lg:items-center lg:justify-between">
        <div className="max-w-2xl text-sm leading-relaxed text-[var(--color-text-soft)]">
          <p className="mb-1 font-medium text-[var(--color-text)]">Datenschutz</p>
          <p>
            Wir verwenden technisch notwendige Cookies. Optionale Cookies für Statistik und
            Werbung setzen wir nur mit Ihrer Einwilligung. Sie können Ihre Auswahl jederzeit in
            den{' '}
            <Link href="/cookie-einstellungen" className="underline underline-offset-2">
              Cookie-Einstellungen
            </Link>{' '}
            ändern. Mehr dazu in der{' '}
            <Link href="/datenschutz" className="underline underline-offset-2">
              Datenschutzerklärung
            </Link>
            .
          </p>
        </div>
        <div className="flex shrink-0 flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={() => decide(false, false)}>
            Nur notwendige
          </Button>
          <Button variant="outline" size="sm" asChild>
            <Link href="/cookie-einstellungen">Einstellungen</Link>
          </Button>
          <Button size="sm" onClick={() => decide(true, true)}>
            Alle akzeptieren
          </Button>
        </div>
      </div>
    </div>
  )
}

export function applyConsent(state: { analytics: boolean; ads: boolean }) {
  const w = window as unknown as {
    __lzConsent?: { analytics: boolean; ads: boolean }
    gtag?: (...args: unknown[]) => void
    dataLayer?: unknown[]
  }
  w.__lzConsent = { analytics: state.analytics, ads: state.ads }

  // Consent Mode v2 update — this is what actually unlocks Google's tags.
  w.dataLayer = w.dataLayer || []
  function gtag(...args: unknown[]) {
    w.dataLayer!.push(args)
  }
  gtag('consent', 'update', {
    ad_storage: state.ads ? 'granted' : 'denied',
    ad_user_data: state.ads ? 'granted' : 'denied',
    ad_personalization: state.ads ? 'granted' : 'denied',
    analytics_storage: state.analytics ? 'granted' : 'denied',
  })
}

export function readConsent(): ConsentState | null {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    return raw ? (JSON.parse(raw) as ConsentState) : null
  } catch {
    return null
  }
}

export function saveConsent(analytics: boolean, ads: boolean) {
  const next: ConsentState = { analytics, ads, decidedAt: new Date().toISOString() }
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
  } catch {
    /* ignore */
  }
  applyConsent(next)
  return next
}
