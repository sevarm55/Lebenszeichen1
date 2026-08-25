import type { Metadata } from 'next'

import { LegalShell, Placeholder } from '../_components/legal-shell'
import { buildMetadata } from '@/server/seo/metadata'
import { getSettings } from '@/server/services/site'

export async function generateMetadata(): Promise<Metadata> {
  const settings = await getSettings()
  return buildMetadata({
    title: 'Korrekturen',
    description: 'Wie wir mit Fehlern umgehen und wie Sie uns auf einen hinweisen.',
    path: '/korrekturen',
    siteName: settings.siteName,
    titlePattern: settings.seoTitlePattern,
  })
}

export default async function CorrectionsPage() {
  const settings = await getSettings()
  const email = settings.legal.email
  return (
    <LegalShell
      title="Korrekturen"
      intro="Ein Fehler, der stehen bleibt, ist schlimmer als einer, der korrigiert wird."
    >
      <h2>Unser Vorgehen</h2>
      <ul>
        <li>
          <strong>Sachliche Fehler</strong> korrigieren wir im Text und ergänzen am Ende des
          Beitrags einen Hinweis, was geändert wurde und wann.
        </li>
        <li>
          <strong>Tippfehler und Formulierungen</strong> bessern wir still nach — dafür gibt es
          keinen Korrekturhinweis.
        </li>
        <li>
          <strong>Schwerwiegende Fehler</strong> führen zu einem sichtbaren Hinweis am Anfang des
          Beitrags.
        </li>
        <li>
          Beiträge werden nicht kommentarlos gelöscht. Wenn ein Text nicht haltbar ist, kennzeichnen
          wir ihn und erklären warum.
        </li>
      </ul>

      <h2>Einen Fehler melden</h2>
      <p>Damit wir schnell prüfen können, schreiben Sie uns bitte:</p>
      <ul>
        <li>den Link zum Beitrag,</li>
        <li>die betroffene Stelle (Zitat oder Absatz),</li>
        <li>was daran falsch ist,</li>
        <li>wenn möglich: eine Quelle für die richtige Angabe.</li>
      </ul>
      <p>
        E-Mail:{' '}
        {email.startsWith('[') ? <Placeholder>{email}</Placeholder> : <a href={`mailto:${email}`}>{email}</a>}
      </p>
      <p>
        Wir melden uns in der Regel innerhalb von drei Werktagen — auch dann, wenn wir zu dem
        Ergebnis kommen, dass keine Korrektur nötig ist.
      </p>
    </LegalShell>
  )
}
