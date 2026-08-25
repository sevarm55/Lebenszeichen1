import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { z } from 'zod'

import { prisma } from '@/lib/prisma'
import { verifyPassword } from '@/server/auth/password'
import { clientIp, consume, reset } from '@/server/auth/rate-limit'
import {
  cookieOptions,
  createSession,
  CSRF_COOKIE,
  csrfCookieOptions,
  SESSION_COOKIE,
} from '@/server/auth/session'
import { audit } from '@/server/services/audit'

export const dynamic = 'force-dynamic'

const schema = z.object({
  email: z.string().email().max(160),
  password: z.string().min(1).max(200),
})

/** Account lockout after this many consecutive failures. */
const MAX_FAILED = 8
const LOCK_MINUTES = 15

export async function POST(request: Request) {
  const ip = clientIp(request.headers)

  // Two independent limiters: one per IP (stops a spray across accounts) and
  // one per account (stops a slow drip against one known email).
  const ipLimit = consume(`login:ip:${ip}`, 20, 10 * 60 * 1000)
  if (!ipLimit.allowed) {
    return NextResponse.json(
      { error: `Zu viele Versuche. Bitte in ${ipLimit.retryAfterSeconds} Sekunden erneut versuchen.` },
      { status: 429, headers: { 'Retry-After': String(ipLimit.retryAfterSeconds) } },
    )
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Ungültige Anfrage.' }, { status: 400 })
  }

  const parsed = schema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'E-Mail und Passwort sind erforderlich.' }, { status: 400 })
  }

  const email = parsed.data.email.trim().toLowerCase()
  const accountLimit = consume(`login:acct:${email}`, 10, 10 * 60 * 1000)
  if (!accountLimit.allowed) {
    return NextResponse.json(
      { error: `Zu viele Versuche für dieses Konto. Bitte in ${accountLimit.retryAfterSeconds} Sekunden erneut versuchen.` },
      { status: 429 },
    )
  }

  const user = await prisma.user.findUnique({ where: { email } })

  // One generic message for "no such user", "wrong password" and "inactive" —
  // anything more specific is an account-enumeration oracle.
  const generic = NextResponse.json(
    { error: 'E-Mail oder Passwort ist falsch.' },
    { status: 401 },
  )

  if (!user || !user.active) {
    await audit({ action: 'LOGIN_FAILED', entity: 'User', detail: email, ip })
    return generic
  }

  if (user.lockedUntil && user.lockedUntil > new Date()) {
    const minutes = Math.ceil((user.lockedUntil.getTime() - Date.now()) / 60000)
    return NextResponse.json(
      { error: `Das Konto ist vorübergehend gesperrt. Bitte in ${minutes} Minuten erneut versuchen.` },
      { status: 423 },
    )
  }

  const valid = await verifyPassword(parsed.data.password, user.passwordHash)
  if (!valid) {
    const failed = user.failedLogins + 1
    await prisma.user.update({
      where: { id: user.id },
      data: {
        failedLogins: failed,
        lockedUntil: failed >= MAX_FAILED ? new Date(Date.now() + LOCK_MINUTES * 60_000) : null,
      },
    })
    await audit({ action: 'LOGIN_FAILED', userId: user.id, entity: 'User', detail: email, ip })
    return generic
  }

  const { token, csrf, expiresAt } = await createSession(
    { id: user.id, email: user.email, name: user.name, role: user.role },
    { ip, userAgent: request.headers.get('user-agent') ?? undefined },
  )

  await prisma.user.update({
    where: { id: user.id },
    data: { failedLogins: 0, lockedUntil: null, lastLoginAt: new Date() },
  })
  reset(`login:acct:${email}`)

  const store = await cookies()
  store.set(SESSION_COOKIE, token, cookieOptions(expiresAt))
  store.set(CSRF_COOKIE, csrf, csrfCookieOptions(expiresAt))

  await audit({ action: 'LOGIN', userId: user.id, entity: 'User', detail: email, ip })

  return NextResponse.json({
    ok: true,
    user: { name: user.name, email: user.email, role: user.role },
  })
}
