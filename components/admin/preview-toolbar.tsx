'use client'

import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { Eye, Megaphone, PencilLine } from 'lucide-react'

import { STATUS_LABELS, statusVariant } from '@/components/admin/post-status'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import type { PostStatus } from '@prisma/client'

/**
 * Preview chrome. Deliberately fixed and loud — an editor must never mistake a
 * preview for the live page.
 */
export function PreviewToolbar({
  postId,
  status,
  showAds,
  adSummary,
}: {
  postId: string
  status: PostStatus
  showAds: boolean
  adSummary: string
}) {
  const router = useRouter()
  const params = useSearchParams()

  const toggle = (next: boolean) => {
    const query = new URLSearchParams(params.toString())
    if (next) query.set('ads', '1')
    else query.delete('ads')
    router.replace(`/admin/vorschau/${postId}${query.toString() ? `?${query}` : ''}`)
  }

  return (
    <div className="sticky top-0 z-50 border-b border-[#2b3444] bg-[#10151f] px-4 py-2 text-white">
      <div className="mx-auto flex max-w-[1280px] flex-wrap items-center gap-3">
        <span className="flex items-center gap-1.5 text-sm font-medium">
          <Eye className="h-4 w-4" />
          Предпросмотр
        </span>
        <Badge variant={statusVariant(status)}>{STATUS_LABELS[status]}</Badge>

        <label className="ml-auto flex items-center gap-2 text-xs">
          <Megaphone className="h-3.5 w-3.5" />
          Показать рекламные места
          <Switch checked={showAds} onCheckedChange={toggle} aria-label="Показать рекламные места" />
        </label>

        <Link
          href={`/admin/posts/${postId}`}
          className="flex items-center gap-1.5 rounded-sm bg-white/10 px-2.5 py-1 text-xs hover:bg-white/20"
        >
          <PencilLine className="h-3.5 w-3.5" />
          Редактировать
        </Link>
      </div>

      {showAds && (
        <p className="mx-auto mt-1.5 max-w-[1280px] text-[0.6875rem] text-white/60">
          {adSummary} · показаны только макеты, реальная реклама в предпросмотре не загружается
        </p>
      )}
    </div>
  )
}
