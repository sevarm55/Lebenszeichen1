import type { Metadata } from 'next'
import Link from 'next/link'

import { LegalShell, Placeholder } from '../_components/legal-shell'
import { buildMetadata } from '@/server/seo/metadata'
import { getSettings } from '@/server/services/site'

export async function generateMetadata(): Promise<Metadata> {
  const settings = await getSettings()
  return buildMetadata({
    title: 'Datenschutzerklärung',
    description: 'Informationen zur Verarbeitung personenbezogener Daten nach DSGVO.',
    path: '/datenschutz',
    siteName: settings.siteName,
    titlePattern: settings.seoTitlePattern,
  })
}

/**
 * Baseline privacy notice covering what this codebase actually does. It is a
 * starting point, not legal advice — the operator must have it reviewed, and
 * must extend it for every service they switch on (AdSense, GA4, a CMP).
 */
export default async function PrivacyPage() {
  const settings = await getSettings()
  const { legal } = settings
  const ph = (value: string) => (value.startsWith('[') ? <Placeholder>{value}</Placeholder> : value)

  return (
    <LegalShell
      title="Datenschutzerklärung"
      intro="Wir erklären hier, welche Daten beim Besuch dieser Website verarbeitet werden und warum."
    >
      <div className="rounded-sm border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900">
        <strong>Hinweis für den Betreiber:</strong> Dieser Text ist eine technische Grundlage, die
        beschreibt, was diese Anwendung tatsächlich tut. Er ersetzt keine Rechtsberatung und muss
        vor dem Live-Gang juristisch geprüft und um jeden aktivierten Dienst (Google AdSense,
        Google Analytics, CMP) ergänzt werden.
      </div>

      <h2>1. Verantwortlicher</h2>
      <p>
        {ph(legal.companyName)}
        <br />
        {ph(legal.address)}
        <br />
        E-Mail: {ph(legal.email)}
      </p>

      <h2>2. Server-Logfiles</h2>
      <p>
        Beim Aufruf dieser Website werden vom Hosting-Provider automatisch Daten in Logfiles
        gespeichert: aufgerufene Seite, Datum und Uhrzeit, übertragene Datenmenge, Referrer,
        Browsertyp und -version, Betriebssystem sowie die IP-Adresse. Rechtsgrundlage ist Art. 6
        Abs. 1 lit. f DSGVO (berechtigtes Interesse am sicheren und stabilen Betrieb).
      </p>

      <h2>3. Cookies und lokale Speicherung</h2>
      <p>
        Technisch notwendige Speicherung nutzen wir für Ihre Datenschutz-Auswahl und für die
        Anmeldung im Redaktionsbereich. Optionale Cookies für Statistik und Werbung setzen wir erst
        nach Ihrer Einwilligung (Art. 6 Abs. 1 lit. a DSGVO). Sie können diese Einwilligung
        jederzeit in den <Link href="/cookie-einstellungen">Cookie-Einstellungen</Link> widerrufen.
      </p>

      <h2>4. Reichweitenmessung</h2>
      <p>
        Sofern aktiviert, nutzen wir Google Analytics 4 (Google Ireland Limited). Die Verarbeitung
        erfolgt ausschließlich nach Ihrer Einwilligung. Ohne Einwilligung werden keine
        Analyse-Cookies gesetzt und keine Messdaten übertragen. Dabei kann es zu einer Übermittlung
        in Drittländer kommen; Google stützt sich auf Standardvertragsklauseln.
      </p>

      <h2>5. Werbung</h2>
      <p>
        Sofern aktiviert, binden wir Google AdSense (Google Ireland Limited) ein. AdSense verwendet
        Cookies und ähnliche Technologien, um Anzeigen auszuliefern und deren Leistung zu messen.
        Personalisierte Werbung wird nur nach Ihrer Einwilligung ausgeliefert; andernfalls werden
        ausschließlich nicht personalisierte Anzeigen ausgespielt. Weitere Informationen:{' '}
        <a href="https://policies.google.com/technologies/ads" target="_blank" rel="noopener noreferrer">
          policies.google.com/technologies/ads
        </a>
        .
      </p>

      <h2>6. Schriftarten</h2>
      <p>
        Schriftarten werden lokal von unserem eigenen Server ausgeliefert. Es findet keine
        Verbindung zu Google Fonts von Ihrem Browser aus statt.
      </p>

      <h2>7. Eingebettete Inhalte</h2>
      <p>
        In einzelnen Beiträgen betten wir Videos ein. YouTube-Videos laden wir im erweiterten
        Datenschutzmodus (youtube-nocookie.com), sodass erst beim Abspielen Daten an den Anbieter
        übermittelt werden.
      </p>

      <h2>8. Ihre Rechte</h2>
      <ul>
        <li>Auskunft über die verarbeiteten Daten (Art. 15 DSGVO)</li>
        <li>Berichtigung unrichtiger Daten (Art. 16 DSGVO)</li>
        <li>Löschung (Art. 17 DSGVO)</li>
        <li>Einschränkung der Verarbeitung (Art. 18 DSGVO)</li>
        <li>Datenübertragbarkeit (Art. 20 DSGVO)</li>
        <li>Widerspruch gegen die Verarbeitung (Art. 21 DSGVO)</li>
        <li>Beschwerde bei einer Aufsichtsbehörde (Art. 77 DSGVO)</li>
      </ul>
      <p>Für alle Anliegen erreichen Sie uns unter {ph(legal.email)}.</p>
    </LegalShell>
  )
}
