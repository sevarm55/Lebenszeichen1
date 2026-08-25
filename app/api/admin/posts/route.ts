import { NextResponse } from 'next/server'

import { guardApi } from '@/server/auth/guard'
import { postSchema } from '@/server/domain/api-schemas'
import { parseDocument } from '@/server/domain/blocks'
import { createPost } from '@/server/services/post-editor'
import { findDuplicates } from '@/server/services/duplicates'

export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
  const guard = await guardApi(request, { minimum: 'EDITOR' })
  if (!guard.ok) return guard.response

  let raw: unknown
  try {
    raw = await request.json()
  } catch {
    return NextResponse.json({ error: 'Некорректный JSON.' }, { status: 400 })
  }

  const parsed = postSchema.safeParse(raw)
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? 'Проверьте заполнение полей.' },
      { status: 400 },
    )
  }

  const input = parsed.data
  const scheduledAt = input.scheduledAt ? new Date(input.scheduledAt) : null
  if (input.status === 'SCHEDULED' && (!scheduledAt || Number.isNaN(scheduledAt.getTime()))) {
    return NextResponse.json({ error: 'Укажите корректную дату публикации.' }, { status: 400 })
  }

  try {
    const post = await createPost(
      {
        ...input,
        document: parseDocument(input.document),
        scheduledAt,
      },
      guard.user.id,
    )
    return NextResponse.json({ ok: true, id: post.id, slug: post.slug })
  } catch (error) {
    console.error('[posts] create failed', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Не удалось сохранить материал.' },
      { status: 500 },
    )
  }
}

/** Duplicate pre-check used by the import workspace. */
export async function GET(request: Request) {
  const guard = await guardApi(request, { minimum: 'EDITOR' })
  if (!guard.ok) return guard.response

  const url = new URL(request.url)
  const sourceUrl = url.searchParams.get('sourceUrl') ?? undefined
  const title = url.searchParams.get('title') ?? undefined
  const excludePostId = url.searchParams.get('excludePostId') ?? undefined

  if (!sourceUrl && !title) {
    return NextResponse.json({ duplicates: [] })
  }

  const duplicates = await findDuplicates({ sourceUrl, title, excludePostId })
  return NextResponse.json({ duplicates })
}
