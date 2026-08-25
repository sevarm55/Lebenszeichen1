import type { Metadata } from 'next'

import { LegalShell, Placeholder } from '../_components/legal-shell'
import { buildMetadata } from '@/server/seo/metadata'
import { getSettings } from '@/server/services/site'

export async function generateMetadata(): Promise<Metadata> {
  const settings = await getSettings()
  return buildMetadata({
    title: 'Impressum',
    description: 'Anbieterkennzeichnung nach § 5 DDG.',
    path: '/impressum',
    noindex: true,
    siteName: settings.siteName,
    titlePattern: settings.seoTitlePattern,
  })
}

/**
 * Anbieterkennzeichnung. The values are intentionally placeholders — inventing
 * an operator's legal identity would be both useless and unlawful. They are
 * filled in at /admin/settings before launch.
 */
export default async function ImprintPage() {
  const settings = await getSettings()
  const { legal } = settings
  const ph = (value: string) => (value.startsWith('[') ? <Placeholder>{value}</Placeholder> : value)

  return (
    <LegalShell title="Impressum" intro="Angaben gemäß § 5 Digitale-Dienste-Gesetz (DDG).">
      <h2>Diensteanbieter</h2>
      <p>
        {ph(legal.companyName)}
        <br />
        {ph(legal.address)}
      </p>

      <h2>Vertreten durch</h2>
      <p>{ph(legal.managingDirector)}</p>

      <h2>Kontakt</h2>
      <p>
        Telefon: {ph(legal.phone)}
        <br />
        E-Mail: {ph(legal.email)}
      </p>

      <h2>Umsatzsteuer-Identifikationsnummer</h2>
      <p>Gemäß § 27 a Umsatzsteuergesetz: {ph(legal.vatId)}</p>

      <h2>Redaktionell verantwortlich</h2>
      <p>
        {ph(legal.managingDirector)}
        <br />
        {ph(legal.address)}
      </p>

      <h2>Streitbeilegung</h2>
      <p>
        Die Europäische Kommission stellt eine Plattform zur Online-Streitbeilegung bereit:{' '}
        <a href="https://ec.europa.eu/consumers/odr/" target="_blank" rel="noopener noreferrer">
          ec.europa.eu/consumers/odr
        </a>
        . Wir sind nicht bereit und nicht verpflichtet, an Streitbeilegungsverfahren vor einer
        Verbraucherschlichtungsstelle teilzunehmen.
      </p>

      <h2>Haftung für Inhalte</h2>
      <p>
        Als Diensteanbieter sind wir für eigene Inhalte auf diesen Seiten nach den allgemeinen
        Gesetzen verantwortlich. Wir sind jedoch nicht verpflichtet, übermittelte oder gespeicherte
        fremde Informationen zu überwachen oder nach Umständen zu forschen, die auf eine
        rechtswidrige Tätigkeit hinweisen.
      </p>

      <h2>Haftung für Links</h2>
      <p>
        Unser Angebot enthält Links zu externen Websites Dritter, auf deren Inhalte wir keinen
        Einfluss haben. Für die Inhalte der verlinkten Seiten ist stets der jeweilige Anbieter
        verantwortlich.
      </p>

      <h2>Urheberrecht</h2>
      <p>
        Die durch {settings.siteName} erstellten Inhalte und Werke unterliegen dem deutschen
        Urheberrecht. Beiträge Dritter sind als solche gekennzeichnet.
      </p>
    </LegalShell>
  )
}
