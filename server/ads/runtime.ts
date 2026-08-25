import 'server-only'

import { adsenseReady, publicConfig } from '@/config/public'
import { env } from '@/config/env'
import { prisma } from '@/lib/prisma'
import type { AdRuntime } from '@/components/ads/ad-context'
import { getSettings, getSiteId } from '@/server/services/site'
import { AD_PLACEMENT_LIST } from './placements'

/**
 * Builds the client-facing ad runtime from three sources, in priority order:
 *   env (ids + master switch) → SiteSettings (editorial switches) → AdPlacement
 *   rows (per-slot on/off).
 *
 * `preview` is what keeps grey placeholder boxes out of production: they render
 * in development and in the admin preview, never for a real reader.
 */
export async function buildAdRuntime(options: { preview?: boolean } = {}): Promise<AdRuntime> {
  const settings = await getSettings()

  let placementEnabled: Record<string, boolean> = {}
  let slots: Record<string, string> = { ...publicConfig.ads.slots }

  try {
    const siteId = await getSiteId()
    const rows = await prisma.adPlacement.findMany({
      where: { siteId },
      select: { key: true, enabled: true, networkSlot: true },
    })
    placementEnabled = Object.fromEntries(rows.map((r) => [r.key, r.enabled]))
    // A per-placement override in the DB wins over the env slot id.
    for (const row of rows) {
      if (row.networkSlot) slots[row.key] = row.networkSlot
    }
  } catch {
    // No DB yet (first boot / migration in flight) — fall back to env only.
    placementEnabled = {}
  }

  // Any placement without a row defaults to on.
  for (const placement of AD_PLACEMENT_LIST) {
    if (!(placement.id in placementEnabled)) placementEnabled[placement.id] = true
  }

  const masterOn = env.ads.enabled && settings.adsEnabled

  return {
    enabled: masterOn && adsenseReady,
    provider: publicConfig.ads.provider,
    clientId: publicConfig.ads.adsenseClientId,
    autoAds: publicConfig.ads.adsenseAutoAds,
    density: settings.adsDensity,
    sidebarEnabled: settings.adsSidebarEnabled,
    mobileStickyEnabled: masterOn && settings.adsMobileStickyOn,
    slots,
    placementEnabled,
    preview: options.preview ?? env.isDevelopment,
  }
}
