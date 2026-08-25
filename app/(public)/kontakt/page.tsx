import type { Metadata } from 'next'
import Link from 'next/link'

import { LegalShell, Placeholder } from '../_components/legal-shell'
import { buildMetadata } from '@/server/seo/metadata'
import { getSettings } from '@/server/services/site'

export async function generateMetadata(): Promise<Metadata> {
  const settings = await getSettings()
  return buildMetadata({
    title: 'Kontakt',
    description: `So erreichen Sie die Redaktion von ${settings.siteName}.`,
    path: '/kontakt',
    siteName: settings.siteName,
    titlePattern: settings.seoTitlePattern,
  })
}

export default async function ContactPage() {
  const settings = await getSettings()
  const { legal } = settings
  const isPlaceholder = (value: string) => value.startsWith('[')

  return (
    <LegalShell title="Kontakt" intro="Wir lesen jede Nachricht.">
      <h2>Redaktion</h2>
      <p>
        E-Mail:{' '}
        {isPlaceholder(legal.email) ? (
          <Placeholder>{legal.email}</Placeholder>
        ) : (
          <a href={`mailto:${legal.email}`}>{legal.email}</a>
        )}
      </p>
      <p>
        Telefon: {isPlaceholder(legal.phone) ? <Placeholder>{legal.phone}</Placeholder> : legal.phone}
      </p>

      <h2>Postanschrift</h2>
      <p>
        {isPlaceholder(legal.companyName) ? (
          <Placeholder>{legal.companyName}</Placeholder>
        ) : (
          legal.companyName
        )}
        <br />
        {isPlaceholder(legal.address) ? <Placeholder>{legal.address}</Placeholder> : legal.address}
      </p>

      <h2>Themenhinweise</h2>
      <p>
        Sie kennen eine Geschichte, die erzählt werden sollte? Schreiben Sie uns kurz, worum es geht
        und wie wir Sie erreichen können. Wir melden uns, wenn wir dem Hinweis nachgehen.
      </p>

      <h2>Fehler gefunden?</h2>
      <p>
        Bitte nutzen Sie dafür unsere <Link href="/korrekturen">Korrekturseite</Link> — dort steht, welche
        Angaben wir brauchen, um eine Korrektur schnell zu prüfen.
      </p>
    </LegalShell>
  )
}
