import { NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'

import { prisma } from '@/lib/prisma'
import { guardApi } from '@/server/auth/guard'
import { audit } from '@/server/services/audit'
import { getSiteId } from '@/server/services/site'

export const dynamic = 'force-dynamic'

/**
 * Editable site settings.
 *
 * Note what is *not* here: no AdSense publisher id, no FAL_KEY, no analytics
 * secret. Credentials live in the environment and are never written to the
 * database or sent to a browser — the admin only toggles behaviour.
 */
const schema = z.object({
  siteName: z.string().min(1).max(80).optional(),
  tagline: z.string().max(160).optional(),
  description: z.string().max(600).optional(),
  logoUrl: z.string().max(500).nullable().optional(),
  faviconUrl: z.string().max(500).nullable().optional(),
  postsPerPage: z.number().int().min(4).max(48).optional(),
  defaultAuthorId: z.string().nullable().optional(),
  seoTitlePattern: z.string().max(120).optional(),
  organizationName: z.string().max(160).optional(),

  adsEnabled: z.boolean().optional(),
  adsDensity: z.enum(['low', 'balanced', 'high', 'aggressive']).optional(),
  adsSidebarEnabled: z.boolean().optional(),
  adsMobileStickyOn: z.boolean().optional(),
  adsMinWordsForInline: z.number().int().min(50).max(2000).optional(),
  adsMaxInContent: z.number().int().min(0).max(12).optional(),
  adsMinWordsBetween: z.number().int().min(80).max(2000).optional(),

  analyticsProvider: z.enum(['none', 'ga4']).optional(),
  cmpProvider: z.enum(['none', 'funding-choices', 'custom']).optional(),

  legalCompanyName: z.string().max(200).optional(),
  legalAddress: z.string().max(400).optional(),
  legalEmail: z.string().max(200).optional(),
  legalPhone: z.string().max(80).optional(),
  legalVatId: z.string().max(80).optional(),
  legalManagingDir: z.string().max(200).optional(),

  placements: z
    .array(z.object({ key: z.string().max(60), enabled: z.boolean(), networkSlot: z.string().max(60).optional() }))
    .max(30)
    .optional(),
})

export async function PUT(request: Request) {
  const guard = await guardApi(request, { minimum: 'ADMIN' })
  if (!guard.ok) return guard.response

  const parsed = schema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? 'Проверьте поля настроек.' },
      { status: 400 },
    )
  }

  const siteId = await getSiteId()
  const { placements, ...settings } = parsed.data

  // Guard against a nonsensical combination that would silently produce zero
  // in-content ads: fewer words between units than the minimum article length.
  if (
    settings.adsMinWordsBetween &&
    settings.adsMinWordsForInline &&
    settings.adsMinWordsBetween > settings.adsMinWordsForInline * 4
  ) {
    return NextResponse.json(
      { error: 'Минимальное расстояние между блоками слишком велико для заданной длины статьи.' },
      { status: 400 },
    )
  }

  await prisma.siteSettings.update({ where: { siteId }, data: settings })

  if (placements?.length) {
    for (const placement of placements) {
      await prisma.adPlacement.updateMany({
        where: { siteId, key: placement.key },
        data: { enabled: placement.enabled, networkSlot: placement.networkSlot ?? '' },
      })
    }
  }

  if (settings.siteName) {
    await prisma.site.update({ where: { id: siteId }, data: { name: settings.siteName } })
  }

  await audit({ action: 'SETTINGS_CHANGE', userId: guard.user.id, entity: 'SiteSettings', entityId: siteId })
  revalidatePath('/', 'layout')

  return NextResponse.json({ ok: true })
}
