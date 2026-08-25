import { NextResponse } from 'next/server'

import { prisma } from '@/lib/prisma'
import { getSiteId } from '@/server/services/site'

// Refreshed at most once a minute; the middleware caches it in memory on top.
export const revalidate = 60

/**
 * Slug-change redirect map, consumed by middleware.
 *
 * It lives behind an API route rather than being read directly in middleware
 * because middleware runs on the Edge runtime, where Prisma is unavailable.
 * The payload is nothing but old → new public paths, so exposing it is
 * harmless.
 */
export async function GET() {
  try {
    const siteId = await getSiteId()
    const rows = await prisma.postRedirect.findMany({
      where: { siteId },
      select: { fromPath: true, toPath: true, permanent: true },
      take: 5000,
    })

    const map: Record<string, { to: string; permanent: boolean }> = {}
    for (const row of rows) {
      map[row.fromPath] = { to: row.toPath, permanent: row.permanent }
    }

    return NextResponse.json(
      { map },
      { headers: { 'Cache-Control': 'public, max-age=60, stale-while-revalidate=300' } },
    )
  } catch {
    // A failure here must not take the site down — no redirects is degraded,
    // not broken.
    return NextResponse.json({ map: {} }, { status: 200 })
  }
}
