import type { Metadata } from 'next'

import { LegalShell } from '../_components/legal-shell'
import { CookieSettingsForm } from './settings-form'
import { buildMetadata } from '@/server/seo/metadata'
import { getSettings } from '@/server/services/site'

export async function generateMetadata(): Promise<Metadata> {
  const settings = await getSettings()
  return buildMetadata({
    title: 'Cookie-Einstellungen',
    description: 'Verwalten Sie Ihre Einwilligung für Statistik- und Werbe-Cookies.',
    path: '/cookie-einstellungen',
    noindex: true,
    siteName: settings.siteName,
    titlePattern: settings.seoTitlePattern,
  })
}

export default function CookieSettingsPage() {
  return (
    <LegalShell
      title="Cookie-Einstellungen"
      intro="Sie entscheiden, welche optionalen Technologien wir verwenden dürfen. Ihre Auswahl können Sie jederzeit ändern."
    >
      <CookieSettingsForm />
    </LegalShell>
  )
}
