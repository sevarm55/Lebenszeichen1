'use client'

import { useEffect, useState } from 'react'

import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { publicConfig } from '@/config/public'
import { readConsent, saveConsent } from '@/components/public/consent-banner'

export function CookieSettingsForm() {
  const [analytics, setAnalytics] = useState(false)
  const [ads, setAds] = useState(false)
  const [saved, setSaved] = useState(false)
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    const state = readConsent()
    if (state) {
      setAnalytics(state.analytics)
      setAds(state.ads)
    }
    setLoaded(true)
  }, [])

  if (publicConfig.cmp.provider !== 'none') {
    return (
      <p>
        Ihre Datenschutz-Einstellungen werden über unser Einwilligungs-Tool verwaltet. Öffnen Sie
        dazu bitte das Einwilligungsfenster über den entsprechenden Link am Seitenende.
      </p>
    )
  }

  if (!loaded) return <p className="text-[var(--color-muted)]">Einstellungen werden geladen…</p>

  return (
    <div className="space-y-6">
      <Row
        title="Technisch notwendig"
        description="Speichert Ihre Datenschutz-Auswahl und ermöglicht die Anmeldung im Redaktionsbereich. Ohne diese Speicherung funktioniert die Website nicht."
        checked
        disabled
      />
      <Row
        title="Statistik"
        description="Anonymisierte Reichweitenmessung: welche Beiträge gelesen werden und wie weit. Hilft uns zu entscheiden, worüber wir schreiben."
        checked={analytics}
        onChange={setAnalytics}
      />
      <Row
        title="Werbung"
        description="Erlaubt personalisierte Anzeigen. Ohne Einwilligung sehen Sie weiterhin Werbung, aber nicht auf Sie zugeschnittene."
        checked={ads}
        onChange={setAds}
      />

      <div className="flex flex-wrap items-center gap-3 border-t border-[var(--color-border)] pt-5">
        <Button
          onClick={() => {
            saveConsent(analytics, ads)
            setSaved(true)
            setTimeout(() => setSaved(false), 2500)
          }}
        >
          Auswahl speichern
        </Button>
        <Button
          variant="outline"
          onClick={() => {
            setAnalytics(false)
            setAds(false)
            saveConsent(false, false)
            setSaved(true)
            setTimeout(() => setSaved(false), 2500)
          }}
        >
          Alles ablehnen
        </Button>
        {saved && (
          <span className="text-sm text-emerald-700" role="status">
            Gespeichert.
          </span>
        )}
      </div>
    </div>
  )
}

function Row({
  title,
  description,
  checked,
  onChange,
  disabled,
}: {
  title: string
  description: string
  checked: boolean
  onChange?: (value: boolean) => void
  disabled?: boolean
}) {
  return (
    <div className="flex items-start justify-between gap-6 border-t border-[var(--color-border)] pt-5 first:border-t-0 first:pt-0">
      <div>
        <p className="font-medium text-[var(--color-text)]">{title}</p>
        <p className="mt-1 text-sm text-[var(--color-muted)]">{description}</p>
      </div>
      <Switch
        checked={checked}
        onCheckedChange={onChange}
        disabled={disabled}
        aria-label={title}
        className="mt-1 shrink-0"
      />
    </div>
  )
}
