import { NextResponse } from 'next/server'
import { z } from 'zod'

import { prisma } from '@/lib/prisma'
import { guardApi } from '@/server/auth/guard'
import { checkPasswordStrength, hashPassword, verifyPassword } from '@/server/auth/password'
import { clientIp, consume } from '@/server/auth/rate-limit'
import { audit } from '@/server/services/audit'

export const dynamic = 'force-dynamic'

const schema = z.object({
  currentPassword: z.string().min(1).max(200),
  newPassword: z.string().min(10).max(200),
})

export async function POST(request: Request) {
  const guard = await guardApi(request, { minimum: 'EDITOR' })
  if (!guard.ok) return guard.response

  // A password-change endpoint is an oracle for the current password, so it is
  // rate limited exactly like login.
  const limit = consume(`pwchange:${guard.user.id}`, 10, 10 * 60 * 1000)
  if (!limit.allowed) {
    return NextResponse.json(
      { error: `Слишком много попыток. Повторите через ${limit.retryAfterSeconds} с.` },
      { status: 429 },
    )
  }

  const parsed = schema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Новый пароль должен содержать минимум 10 символов.' },
      { status: 400 },
    )
  }

  const strength = checkPasswordStrength(parsed.data.newPassword)
  if (!strength.ok) {
    return NextResponse.json({ error: strength.problems.join(', ') }, { status: 400 })
  }

  const user = await prisma.user.findUnique({ where: { id: guard.user.id } })
  if (!user) return NextResponse.json({ error: 'Пользователь не найден.' }, { status: 404 })

  const valid = await verifyPassword(parsed.data.currentPassword, user.passwordHash)
  if (!valid) {
    await audit({
      action: 'LOGIN_FAILED',
      userId: user.id,
      entity: 'User',
      detail: 'password change: wrong current password',
      ip: clientIp(request.headers),
    })
    return NextResponse.json({ error: 'Текущий пароль неверен.' }, { status: 401 })
  }

  await prisma.user.update({
    where: { id: user.id },
    data: { passwordHash: await hashPassword(parsed.data.newPassword) },
  })

  // Every other session is invalidated — a password change exists precisely to
  // lock out whoever might already be logged in elsewhere.
  await prisma.session.deleteMany({ where: { userId: user.id } })

  await audit({
    action: 'SETTINGS_CHANGE',
    userId: user.id,
    entity: 'User',
    entityId: user.id,
    detail: 'password changed',
    ip: clientIp(request.headers),
  })

  return NextResponse.json({ ok: true, reauth: true })
}
