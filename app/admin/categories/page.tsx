import { AdminShell, PageHeader } from '@/components/admin/admin-shell'
import { CategoryManager } from '@/components/admin/category-manager'
import { prisma } from '@/lib/prisma'
import { requireUser } from '@/server/auth/guard'
import { getSettings, getSiteId } from '@/server/services/site'

export const dynamic = 'force-dynamic'

export default async function CategoriesPage({
  searchParams,
}: {
  searchParams: Promise<{ empty?: string }>
}) {
  const user = await requireUser()
  const settings = await getSettings()
  const siteId = await getSiteId()
  const { empty } = await searchParams

  const categories = await prisma.category.findMany({
    where: { siteId },
    orderBy: { order: 'asc' },
    include: { _count: { select: { posts: true } } },
  })

  return (
    <AdminShell user={user} siteName={settings.siteName}>
      <PageHeader
        title="Категории"
        description="Рубрики публичного сайта. Порядок определяет расположение в навигации."
      />

      {empty && (
        <div className="mb-4 rounded-sm border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
          Прежде чем создавать материалы, нужна хотя бы одна категория.
        </div>
      )}

      <CategoryManager
        canEdit={user.role === 'OWNER' || user.role === 'ADMIN'}
        categories={categories.map((category) => ({
          id: category.id,
          name: category.name,
          slug: category.slug,
          description: category.description,
          intro: category.intro,
          seoTitle: category.seoTitle,
          metaDescription: category.metaDescription,
          order: category.order,
          enabled: category.enabled,
          showInNav: category.showInNav,
          postCount: category._count.posts,
        }))}
      />
    </AdminShell>
  )
}
