import { NextResponse } from 'next/server'
import { z } from 'zod'

import { prisma } from '@/lib/prisma'
import { guardApi } from '@/server/auth/guard'
import { audit } from '@/server/services/audit'

export const dynamic = 'force-dynamic'

type Params = { params: Promise<{ id: string }> }

const schema = z.object({
  name: z.string().max(160).optional(),
  notes: z.string().max(1000).optional(),
  status: z.enum(['ENABLED', 'BLOCKED']).optional(),
})

export async function PATCH(request: Request, { params }: Params) {
  const guard = await guardApi(request, { minimum: 'EDITOR' })
  if (!guard.ok) return guard.response

  const { id } = await params
  const parsed = schema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ error: 'Некорректные данные.' }, { status: 400 })

  const source = await prisma.source.update({ where: { id }, data: parsed.data })
  await audit({ action: 'SOURCE_CHANGE', userId: guard.user.id, entity: 'Source', entityId: id, detail: source.domain })
  return NextResponse.json({ ok: true, source })
}
