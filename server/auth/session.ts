import 'server-only'

import { createHash, randomBytes, timingSafeEqual } from 'node:crypto'
import { cookies } from 'next/headers'
import { SignJWT, jwtVerify } from 'jose'
import type { Role } from '@prisma/client'

import { env } from '@/config/env'
import { prisma } from '@/lib/prisma'

export const SESSION_COOKIE = 'lz_session'
export const CSRF_COOKIE = 'lz_csrf'
const ISSUER = 'lebenszeichen'

export interface SessionUser {
  id: string
  email: string
  name: string
  role: Role
}

export interface SessionPayload extends SessionUser {
  sid: string
}

function secretKey(): Uint8Array {
  if (!env.authSecret) {
    // Refusing to sign with a default is the point — a predictable secret is
    // the same as no authentication at all.
    throw new Error('AUTH_SECRET is not configured. Generate one: openssl rand -base64 48')
  }
  return new TextEncoder().encode(env.authSecret)
}

function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex')
}

/**
 * Issues a session: a random opaque id stored (hashed) in the DB, wrapped in a
 * signed JWT cookie. The DB row is what makes server-side revocation possible;
 * the JWT is what makes the common path a zero-query check.
 */
export async function createSession(
  user: SessionUser,
  meta: { ip?: string; userAgent?: string } = {},
): Promise<{ token: string; csrf: string; expiresAt: Date }> {
  const sessionSecret = randomBytes(32).toString('hex')
  const expiresAt = new Date(Date.now() + env.authSessionHours * 60 * 60 * 1000)

  const record = await prisma.session.create({
    data: {
      userId: user.id,
      tokenHash: hashToken(sessionSecret),
      expiresAt,
      ip: meta.ip?.slice(0, 64),
      userAgent: meta.userAgent?.slice(0, 255),
    },
  })

  const token = await new SignJWT({
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    sid: record.id,
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setIssuer(ISSUER)
    .setSubject(user.id)
    .setExpirationTime(Math.floor(expiresAt.getTime() / 1000))
    .sign(secretKey())

  const csrf = randomBytes(24).toString('hex')
  return { token, csrf, expiresAt }
}

export async function verifySessionToken(token: string): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, secretKey(), { issuer: ISSUER })
    const { id, email, name, role, sid } = payload as unknown as SessionPayload
    if (!id || !sid) return null
    return { id, email, name, role, sid }
  } catch {
    return null
  }
}

/**
 * Full check: signature + DB row still alive. Used by anything that mutates.
 */
export async function getCurrentUser(): Promise<SessionUser | null> {
  const store = await cookies()
  const token = store.get(SESSION_COOKIE)?.value
  if (!token) return null

  const payload = await verifySessionToken(token)
  if (!payload) return null

  const session = await prisma.session.findUnique({
    where: { id: payload.sid },
    select: { expiresAt: true, userId: true },
  })
  if (!session || session.expiresAt <= new Date() || session.userId !== payload.id) return null

  const user = await prisma.user.findUnique({
    where: { id: payload.id },
    select: { id: true, email: true, name: true, role: true, active: true },
  })
  if (!user || !user.active) return null

  return { id: user.id, email: user.email, name: user.name, role: user.role }
}

export async function destroyCurrentSession(): Promise<void> {
  const store = await cookies()
  const token = store.get(SESSION_COOKIE)?.value
  if (!token) return
  const payload = await verifySessionToken(token)
  if (payload?.sid) {
    await prisma.session.deleteMany({ where: { id: payload.sid } })
  }
}

export async function purgeExpiredSessions(): Promise<number> {
  const { count } = await prisma.session.deleteMany({
    where: { expiresAt: { lte: new Date() } },
  })
  return count
}

export function cookieOptions(expiresAt: Date) {
  return {
    httpOnly: true,
    secure: env.isProduction,
    sameSite: 'lax' as const,
    path: '/',
    expires: expiresAt,
  }
}

/** CSRF cookie is readable by JS on purpose — it is the double-submit token. */
export function csrfCookieOptions(expiresAt: Date) {
  return {
    httpOnly: false,
    secure: env.isProduction,
    sameSite: 'lax' as const,
    path: '/',
    expires: expiresAt,
  }
}

/**
 * Double-submit CSRF check. SameSite=Lax already blocks cross-site POSTs in
 * every browser we care about; this is the belt to that suspenders.
 */
export async function verifyCsrf(request: Request): Promise<boolean> {
  const store = await cookies()
  const cookieToken = store.get(CSRF_COOKIE)?.value
  const headerToken = request.headers.get('x-csrf-token')
  if (!cookieToken || !headerToken) return false
  const a = Buffer.from(cookieToken)
  const b = Buffer.from(headerToken)
  if (a.length !== b.length) return false
  return timingSafeEqual(a, b)
}
