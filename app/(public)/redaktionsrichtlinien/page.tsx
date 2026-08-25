import type { Metadata } from 'next'
import Link from 'next/link'

import { LegalShell } from '../_components/legal-shell'
import { buildMetadata } from '@/server/seo/metadata'
import { getSettings } from '@/server/services/site'

export async function generateMetadata(): Promise<Metadata> {
  const settings = await getSettings()
  return buildMetadata({
    title: 'Redaktionsrichtlinien',
    description: 'Wie wir recherchieren, mit Quellen umgehen und Technik einsetzen.',
    path: '/redaktionsrichtlinien',
    siteName: settings.siteName,
    titlePattern: settings.seoTitlePattern,
  })
}

export default async function EditorialPolicyPage() {
  const settings = await getSettings()
  return (
    <LegalShell
      title="Redaktionsrichtlinien"
      intro="Woran wir uns halten — und woran Sie uns messen dürfen."
    >
      <h2>Sorgfalt vor Geschwindigkeit</h2>
      <p>
        Wir sind kein Eilmeldungsdienst. Wenn eine Angabe unklar ist, warten wir lieber, als sie
        ungeprüft zu veröffentlichen. Kein Beitrag erscheint ohne redaktionelle Prüfung.
      </p>

      <h2>Umgang mit Quellen</h2>
      <p>
        Wenn wir uns bei einer Geschichte auf die Recherche anderer stützen, weisen wir am Ende des
        Beitrags darauf hin. Wir geben fremde Exklusivrecherchen nicht als unsere eigene aus und
        übernehmen keine ganzen Passagen aus fremden Texten.
      </p>

      <h2>Einsatz von KI</h2>
      <p>
        Wir setzen KI-Werkzeuge in der Produktion ein — etwa um Material zu strukturieren, Entwürfe
        zu erstellen oder Bildideen zu entwickeln. Dabei gilt ohne Ausnahme:
      </p>
      <ul>
        <li>Kein Beitrag geht automatisch online. Jeder Text wird von einem Menschen geprüft.</li>
        <li>KI erfindet bei uns keine Fakten, Namen, Zahlen oder Zitate.</li>
        <li>Wo Bilder KI-generiert sind, kennzeichnen wir das in der Bildunterschrift.</li>
        <li>Die redaktionelle Verantwortung liegt immer bei einem Menschen, nie beim Modell.</li>
      </ul>

      <h2>Werbung und Unabhängigkeit</h2>
      <p>
        {settings.siteName} finanziert sich über Werbung. Anzeigen sind als solche gekennzeichnet
        und von redaktionellen Inhalten getrennt. Werbekunden haben keinen Einfluss auf die Auswahl
        oder die Darstellung unserer Geschichten.
      </p>

      <h2>Persönlichkeitsrechte</h2>
      <p>
        Wir erzählen Geschichten über Menschen. Deshalb wägen wir bei jedem Beitrag ab, was für das
        Verständnis nötig ist und was nur neugierig macht. Im Zweifel schützen wir die
        Persönlichkeitsrechte.
      </p>

      <h2>Fehler</h2>
      <p>
        Wir machen Fehler. Wenn das passiert, korrigieren wir sie sichtbar — siehe{' '}
        <Link href="/korrekturen">Korrekturrichtlinie</Link>.
      </p>
    </LegalShell>
  )
}
