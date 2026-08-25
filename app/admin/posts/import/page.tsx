import { redirect } from 'next/navigation'

import { AdminShell, PageHeader } from '@/components/admin/admin-shell'
import { ImportWorkspace } from '@/components/admin/import-workspace'
import { loadEditorOptions } from '@/components/admin/editor-data'
import { requireUser } from '@/server/auth/guard'
import { getAIProvider } from '@/server/ai'
import { getSettings } from '@/server/services/site'

export const dynamic = 'force-dynamic'

export default async function ImportPage() {
  const user = await requireUser()
  const settings = await getSettings()
  const { categories, authors, popularTags } = await loadEditorOptions()

  if (categories.length === 0) redirect('/admin/categories?empty=1')

  const provider = getAIProvider()

  return (
    <AdminShell user={user} siteName={settings.siteName}>
      <PageHeader
        title="Импорт из источника + AI"
        description="Вставьте ссылку, проверьте извлечённый материал, сгенерируйте самостоятельную статью и отредактируйте её перед публикацией."
      />
      <ImportWorkspace
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
