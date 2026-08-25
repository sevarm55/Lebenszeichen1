import type { Metadata } from 'next'
import Link from 'next/link'

import { LegalShell } from '../_components/legal-shell'
import { buildMetadata } from '@/server/seo/metadata'
import { getSettings } from '@/server/services/site'

export async function generateMetadata(): Promise<Metadata> {
  const settings = await getSettings()
  return buildMetadata({
    title: 'Über uns',
    description: `Wer hinter ${settings.siteName} steht und wie wir arbeiten.`,
    path: '/ueber-uns',
    siteName: settings.siteName,
    titlePattern: settings.seoTitlePattern,
  })
}

export default async function AboutPage() {
  const settings = await getSettings()
  return (
    <LegalShell
      title="Über uns"
      intro={`${settings.siteName} erzählt Geschichten über Menschen — sorgfältig recherchiert, ruhig erzählt, ohne Effekthascherei.`}
    >
      <h2>Was wir machen</h2>
      <p>
        Wir veröffentlichen Reportagen und Erzählungen über Familien, Beziehungen, ungewöhnliche
        Lebenswege, Tiere und Orte. Themen also, bei denen es nicht um die Schlagzeile des Tages
        geht, sondern um das, was Menschen bewegt und was länger nachwirkt als ein Nachrichtenzyklus.
      </p>
      <p>
        Wir sind kein Nachrichtenportal. Politik, Börsenkurse und Eilmeldungen finden Sie hier
        bewusst nicht. Was Sie finden: Geschichten, die man zu Ende liest.
      </p>

      <h2>Wie wir arbeiten</h2>
      <p>
        Jeder Beitrag wird von einer Redakteurin oder einem Redakteur geprüft, bevor er erscheint.
        Wo wir uns auf externes Material stützen, nennen wir die Quelle. Wo wir uns irren,
        korrigieren wir sichtbar — die Einzelheiten dazu stehen in unseren{' '}
        <Link href="/redaktionsrichtlinien">Redaktionsrichtlinien</Link> und in der{' '}
        <Link href="/korrekturen">Korrekturrichtlinie</Link>.
      </p>

      <h2>Kontakt</h2>
      <p>
        Hinweise, Themenvorschläge und Kritik nehmen wir gern entgegen — über die{' '}
        <Link href="/kontakt">Kontaktseite</Link>.
      </p>
    </LegalShell>
  )
}
