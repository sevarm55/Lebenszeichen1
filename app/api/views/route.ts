import { NextResponse } from 'next/server'
import { z } from 'zod'

import { clientIp, consume } from '@/server/auth/rate-limit'
import { incrementViews } from '@/server/services/posts'

export const dynamic = 'force-dynamic'

const schema = z.object({ postId: z.string().min(1).max(40) })

/**
 * View counter. Rate limited per IP so the "popular" rail cannot be gamed with
 * a loop, and it never returns an error the client would act on.
 */
export async function POST(request: Request) {
  const ip = clientIp(request.headers)
  if (!consume(`views:${ip}`, 60, 60_000).allowed) {
    return NextResponse.json({ ok: true })
  }

  try {
    const parsed = schema.safeParse(await request.json())
    if (!parsed.success) return NextResponse.json({ ok: true })
    await incrementViews(parsed.data.postId)
  } catch {
    // Counting a view is best-effort by design.
  }
  return NextResponse.json({ ok: true })
}
