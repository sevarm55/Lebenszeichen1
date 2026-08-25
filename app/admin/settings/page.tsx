import { AdminShell, PageHeader } from '@/components/admin/admin-shell'
import { SettingsForm } from '@/components/admin/settings-form'
import { prisma } from '@/lib/prisma'
import { publicConfig } from '@/config/public'
import { env } from '@/config/env'
import { requireUser } from '@/server/auth/guard'
import { getAIProvider } from '@/server/ai'
import { AD_PLACEMENT_LIST } from '@/server/ads/placements'
import { getSiteId } from '@/server/services/site'

export const dynamic = 'force-dynamic'

export default async function SettingsPage() {
  const user = await requireUser('ADMIN')
  const siteId = await getSiteId()

  const [settings, placements, authors] = await Promise.all([
    prisma.siteSettings.findUniqueOrThrow({ where: { siteId } }),
    prisma.adPlacement.findMany({ where: { siteId }, orderBy: { order: 'asc' } }),
    prisma.author.findMany({ where: { siteId }, select: { id: true, name: true } }),
  ])

  const provider = getAIProvider()

  return (
    <AdminShell user={user} siteName={settings.siteName}>
      <PageHeader
        title="Настройки"
        description="Ключи и секреты хранятся только в переменных окружения на сервере — здесь только поведение."
      />

      <SettingsForm
        settings={{
          siteName: settings.siteName,
          tagline: settings.tagline,
          description: settings.description,
          logoUrl: settings.logoUrl,
          postsPerPage: settings.postsPerPage,
          defaultAuthorId: settings.defaultAuthorId,
          seoTitlePattern: settings.seoTitlePattern,
          organizationName: settings.organizationName,
          adsEnabled: settings.adsEnabled,
          adsDensity: settings.adsDensity,
          adsSidebarEnabled: settings.adsSidebarEnabled,
          adsMobileStickyOn: settings.adsMobileStickyOn,
          adsMinWordsForInline: settings.adsMinWordsForInline,
          adsMaxInContent: settings.adsMaxInContent,
          adsMinWordsBetween: settings.adsMinWordsBetween,
          analyticsProvider: settings.analyticsProvider,
          cmpProvider: settings.cmpProvider,
          legalCompanyName: settings.legalCompanyName,
          legalAddress: settings.legalAddress,
          legalEmail: settings.legalEmail,
          legalPhone: settings.legalPhone,
          legalVatId: settings.legalVatId,
          legalManagingDir: settings.legalManagingDir,
        }}
        authors={authors}
        placements={AD_PLACEMENT_LIST.map((definition) => {
          const row = placements.find((p) => p.key === definition.id)
          return {
            key: definition.id,
            label: definition.label,
            description: definition.description,
            device: definition.device ?? 'all',
            enabled: row?.enabled ?? true,
            networkSlot: row?.networkSlot ?? '',
            envSlot: publicConfig.ads.slots[definition.id] ?? '',
          }
        })}
        integrations={{
          siteUrl: publicConfig.siteUrl,
          adsMasterSwitch: env.ads.enabled,
          adsenseClientId: publicConfig.ads.adsenseClientId,
          adsenseAutoAds: publicConfig.ads.adsenseAutoAds,
          cmpEnvProvider: publicConfig.cmp.provider,
          analyticsEnvProvider: publicConfig.analytics.provider,
          ga4Id: publicConfig.analytics.ga4Id,
          popunderEnabled: publicConfig.popunder.enabled,
          aiProvider: provider.info.id,
          aiProviderLabel: provider.info.label,
          aiReady: provider.info.ready,
          aiReadyHint: provider.info.readyHint ?? '',
          aiTextModel: provider.info.textModel,
          aiImageModel: provider.info.imageModel,
          storageDriver: env.storage.driver,
        }}
      />
    </AdminShell>
  )
}
