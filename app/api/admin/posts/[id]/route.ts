import { NextResponse } from 'next/server'
import { z } from 'zod'

import { guardApi } from '@/server/auth/guard'
import { parseDocument } from '@/server/domain/blocks'
import {
  deletePost,
  duplicatePost,
  restoreRevision,
  setPostStatus,
  updatePost,
} from '@/server/services/post-editor'
import { postSchema } from '@/server/domain/api-schemas'

export const dynamic = 'force-dynamic'

type Params = { params: Promise<{ id: string }> }

export async function PUT(request: Request, { params }: Params) {
  const guard = await guardApi(request, { minimum: 'EDITOR' })
  if (!guard.ok) return guard.response

  const { id } = await params

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
    const post = await updatePost(
      id,
      { ...input, document: parseDocument(input.document), scheduledAt },
      guard.user.id,
    )
    return NextResponse.json({ ok: true, id: post.id, slug: post.slug })
  } catch (error) {
    console.error('[posts] update failed', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Не удалось сохранить материал.' },
      { status: 500 },
    )
  }
}

const actionSchema = z.object({
  action: z.enum(['status', 'duplicate', 'restore']),
  status: z
    .enum(['DRAFT', 'NEEDS_REVIEW', 'READY', 'SCHEDULED', 'PUBLISHED', 'ARCHIVED'])
    .optional(),
  revisionId: z.string().optional(),
})

export async function PATCH(request: Request, { params }: Params) {
  const guard = await guardApi(request, { minimum: 'EDITOR' })
  if (!guard.ok) return guard.response

  const { id } = await params
  const parsed = actionSchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) {
    return NextResponse.json({ error: 'Неизвестное действие.' }, { status: 400 })
  }

  try {
    if (parsed.data.action === 'status') {
      if (!parsed.data.status) {
        return NextResponse.json({ error: 'Статус не указан.' }, { status: 400 })
      }
      const post = await setPostStatus(id, parsed.data.status, guard.user.id)
      return NextResponse.json({ ok: true, status: post.status })
    }

    if (parsed.data.action === 'duplicate') {
      const copy = await duplicatePost(id, guard.user.id)
      return NextResponse.json({ ok: true, id: copy.id })
    }

    if (!parsed.data.revisionId) {
      return NextResponse.json({ error: 'Версия не указана.' }, { status: 400 })
    }
    const post = await restoreRevision(parsed.data.revisionId, guard.user.id)
    return NextResponse.json({ ok: true, id: post.id })
  } catch (error) {
    console.error('[posts] action failed', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Действие не выполнено.' },
      { status: 500 },
    )
  }
}

export async function DELETE(request: Request, { params }: Params) {
  // Deleting is destructive and irreversible — ADMIN and above only.
  const guard = await guardApi(request, { minimum: 'ADMIN' })
  if (!guard.ok) return guard.response

  const { id } = await params
  try {
    await deletePost(id, guard.user.id)
    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('[posts] delete failed', error)
    return NextResponse.json({ error: 'Не удалось удалить материал.' }, { status: 500 })
  }
}
