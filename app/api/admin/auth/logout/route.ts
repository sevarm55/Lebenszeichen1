import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'

import { getCurrentUser, destroyCurrentSession, CSRF_COOKIE, SESSION_COOKIE } from '@/server/auth/session'
import { audit } from '@/server/services/audit'
import { clientIp } from '@/server/auth/rate-limit'

export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
  const user = await getCurrentUser()
  await destroyCurrentSession()

  const store = await cookies()
  store.delete(SESSION_COOKIE)
  store.delete(CSRF_COOKIE)

  if (user) {
    await audit({ action: 'LOGOUT', userId: user.id, entity: 'User', ip: clientIp(request.headers) })
  }
  return NextResponse.json({ ok: true })
}
