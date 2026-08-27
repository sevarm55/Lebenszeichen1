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
    siteName: settings.siteName,
    titlePattern: settings.seoTitlePattern,
  })
}

/**
 * Anbieterkennzeichnung nach § 5 DDG.
 *
 * The identity values are placeholders until filled at /admin/settings —
 * inventing an operator's legal identity would be both useless and unlawful.
 *
 * The optional sections (Vertreten durch, USt-IdNr., Telefon) render only when
 * they hold a value. A private individual running the site has no managing
 * director and usually no VAT id, and printing empty headings for them would
 * make the notice look wrong rather than complete.
 */
export default async function ImprintPage() {
  const settings = await getSettings()
  const { legal } = settings
  const isPlaceholder = (value: string) => !value || value.startsWith('[')
  const ph = (value: string) =>
    isPlaceholder(value) ? <Placeholder>{value || '[NICHT AUSGEFÜLLT]'}</Placeholder> : value
  const has = (value: string) => !isPlaceholder(value)

  // A sole operator is their own responsible person under § 18 Abs. 2 MStV.
  const responsible = has(legal.managingDirector) ? legal.managingDirector : legal.companyName

  return (
    <LegalShell title="Impressum" intro="Angaben gemäß § 5 Digitale-Dienste-Gesetz (DDG).">
      <h2>Diensteanbieter</h2>
      <p>
        {ph(legal.companyName)}
        <br />
        {ph(legal.address)}
      </p>

      {has(legal.managingDirector) && (
        <>
          <h2>Vertreten durch</h2>
          <p>{legal.managingDirector}</p>
        </>
      )}

      <h2>Kontakt</h2>
      <p>
        E-Mail: {ph(legal.email)}
        {has(legal.phone) && (
          <>
            <br />
            Telefon: {legal.phone}
          </>
        )}
      </p>

      {has(legal.vatId) && (
        <>
          <h2>Umsatzsteuer-Identifikationsnummer</h2>
          <p>Gemäß § 27 a Umsatzsteuergesetz: {legal.vatId}</p>
        </>
      )}

      <h2>Redaktionell verantwortlich</h2>
      <p>
        {ph(responsible)}
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
