import { redirect } from 'next/navigation'
import Link from 'next/link'

import { AdminShell, PageHeader } from '@/components/admin/admin-shell'
import { Button } from '@/components/ui/button'
import { PostEditor } from '@/components/admin/post-editor'
import { emptyInitial, loadEditorOptions } from '@/components/admin/editor-data'
import { requireUser } from '@/server/auth/guard'
import { getAIProvider } from '@/server/ai'
import { getSettings } from '@/server/services/site'

export const dynamic = 'force-dynamic'

export default async function NewPostPage() {
  const user = await requireUser()
  const settings = await getSettings()
  const { categories, authors, popularTags } = await loadEditorOptions()

  if (categories.length === 0) redirect('/admin/categories?empty=1')

  const provider = getAIProvider()

  return (
    <AdminShell user={user} siteName={settings.siteName}>
      <PageHeader
        title="Новый материал"
        description="Заполните поля вручную или импортируйте статью из источника."
        actions={
          <Button variant="outline" asChild>
            <Link href="/admin/posts/import">Импорт из URL</Link>
          </Button>
        }
      />
      <PostEditor
        initial={emptyInitial(categories[0]!.id)}
        categories={categories}
        authors={authors}
        popularTags={popularTags}
        aiProvider={{
          id: provider.info.id,
          label: provider.info.label,
          ready: provider.info.ready,
          readyHint: provider.info.readyHint,
        }}
      />
    </AdminShell>
  )
}
