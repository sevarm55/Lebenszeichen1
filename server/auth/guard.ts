import 'server-only'

import { redirect } from 'next/navigation'
import { NextResponse } from 'next/server'
import type { Role } from '@prisma/client'

import { getCurrentUser, type SessionUser, verifyCsrf } from './session'

const ROLE_RANK: Record<Role, number> = { EDITOR: 1, ADMIN: 2, OWNER: 3 }

export function hasRole(user: SessionUser, minimum: Role): boolean {
  return ROLE_RANK[user.role] >= ROLE_RANK[minimum]
}

/** For server components under /admin. Redirects to the login page. */
export async function requireUser(minimum: Role = 'EDITOR'): Promise<SessionUser> {
  const user = await getCurrentUser()
  if (!user) redirect('/admin/login')
  if (!hasRole(user, minimum)) redirect('/admin?error=forbidden')
  return user
}

export type ApiGuardResult =
  | { ok: true; user: SessionUser }
  | { ok: false; response: NextResponse }

/**
 * For route handlers. Returns a 401/403 response instead of redirecting, and
 * enforces CSRF on every state-changing method.
 */
export async function guardApi(
  request: Request,
  options: { minimum?: Role; csrf?: boolean } = {},
): Promise<ApiGuardResult> {
  const user = await getCurrentUser()
  if (!user) {
    return {
      ok: false,
      response: NextResponse.json({ error: 'Nicht angemeldet' }, { status: 401 }),
    }
  }
  if (!hasRole(user, options.minimum ?? 'EDITOR')) {
    return {
      ok: false,
      response: NextResponse.json({ error: 'Keine Berechtigung' }, { status: 403 }),
    }
  }

  const mutating = !['GET', 'HEAD', 'OPTIONS'].includes(request.method.toUpperCase())
  if (mutating && options.csrf !== false) {
    const valid = await verifyCsrf(request)
    if (!valid) {
      return {
        ok: false,
        response: NextResponse.json({ error: 'Ungültiges CSRF-Token' }, { status: 403 }),
      }
    }
  }

  return { ok: true, user }
}
