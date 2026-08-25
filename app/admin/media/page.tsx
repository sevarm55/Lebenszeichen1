import { AdminShell, PageHeader } from '@/components/admin/admin-shell'
import { MediaLibrary } from '@/components/admin/media-library'
import { prisma } from '@/lib/prisma'
import { requireUser } from '@/server/auth/guard'
import { getSettings, getSiteId } from '@/server/services/site'

export const dynamic = 'force-dynamic'

export default async function MediaPage() {
  const user = await requireUser()
  const settings = await getSettings()
  const siteId = await getSiteId()

  const [assets, totals] = await Promise.all([
    prisma.mediaAsset.findMany({
      where: { siteId },
      orderBy: { createdAt: 'desc' },
      take: 60,
      include: {
        _count: { select: { heroFor: true, ogFor: true, categories: true, authors: true } },
      },
    }),
    prisma.mediaAsset.aggregate({ where: { siteId }, _count: true, _sum: { fileSize: true } }),
  ])

  return (
    <AdminShell user={user} siteName={settings.siteName}>
      <PageHeader
        title="Медиатека"
        description={`${totals._count} файлов · ${((totals._sum.fileSize ?? 0) / 1024 / 1024).toFixed(1)} МБ`}
      />
      <MediaLibrary
        canDelete={user.role === 'OWNER' || user.role === 'ADMIN'}
        assets={assets.map((asset) => ({
          id: asset.id,
          url: asset.url,
          filename: asset.filename,
          alt: asset.alt,
          caption: asset.caption,
          credit: asset.credit,
          license: asset.license,
          width: asset.width,
          height: asset.height,
          fileSize: asset.fileSize,
          sourceType: asset.sourceType,
          createdAt: asset.createdAt.toISOString(),
          usageCount:
            asset._count.heroFor + asset._count.ogFor + asset._count.categories + asset._count.authors,
        }))}
      />
    </AdminShell>
  )
}
