import { NextResponse, type NextRequest } from 'next/server'

/**
 * Two jobs, both of which have to happen before a page renders.
 *
 *  1. /admin gate — a cheap presence check on the session cookie. The real
 *     authorisation decision (signature, DB session, role) happens in
 *     `requireUser`/`guardApi`, where Prisma and the secret are available.
 *
 *  2. Slug-change redirects — these must be *hard* 301s. Doing it inside the
 *     article page produces only a soft, client-side redirect once the response
 *     has started streaming, which crawlers do not follow as a permanent move.
 *     Middleware runs before rendering, so the 301 is real.
 */

const PUBLIC_ADMIN_PATHS = ['/admin/login']

interface RedirectEntry {
  to: string
  permanent: boolean
}

// Module scope persists between invocations in the same worker, so the map is
// fetched about once a minute rather than on every request.
let redirectMap: Record<string, RedirectEntry> = {}
let loadedAt = 0
let inFlight: Promise<void> | null = null
const TTL_MS = 60_000

async function refreshRedirects(origin: string): Promise<void> {
  try {
    const response = await fetch(`${origin}/api/redirects`, {
      headers: { 'x-internal': '1' },
      cache: 'no-store',
    })
    if (!response.ok) return
    const data = (await response.json()) as { map?: Record<string, RedirectEntry> }
    redirectMap = data.map ?? {}
    loadedAt = Date.now()
  } catch {
    // Keep whatever we had; a stale map beats a failed request.
    loadedAt = Date.now()
  }
}

function ensureRedirects(origin: string): Promise<void> | null {
  const stale = Date.now() - loadedAt > TTL_MS
  if (!stale) return null
  if (!inFlight) {
    inFlight = refreshRedirects(origin).finally(() => {
      inFlight = null
    })
  }
  // Block only on the very first load; later refreshes happen in the background
  // so a stale map never adds latency.
  return loadedAt === 0 ? inFlight : null
}

export async function middleware(request: NextRequest) {
  const { pathname, search } = request.nextUrl

  // ------------------------------------------------------------ admin ----
  if (pathname.startsWith('/admin')) {
    const response = NextResponse.next()
    response.headers.set('X-Robots-Tag', 'noindex, nofollow, noarchive')

    if (PUBLIC_ADMIN_PATHS.some((path) => pathname.startsWith(path))) return response

    const token = request.cookies.get('lz_session')?.value
    if (!token) {
      const loginUrl = new URL('/admin/login', request.url)
      loginUrl.searchParams.set('next', `${pathname}${search}`)
      return NextResponse.redirect(loginUrl)
    }
    return response
  }

  // -------------------------------------------------------- redirects ----
  if (request.method === 'GET') {
    const pending = ensureRedirects(request.nextUrl.origin)
    if (pending) await pending

    const hit = redirectMap[pathname]
    if (hit) {
      const target = new URL(hit.to, request.url)
      // Query strings are preserved so UTM-tagged Facebook links survive a
      // slug change with their attribution intact.
      target.search = search
      return NextResponse.redirect(target, hit.permanent ? 301 : 302)
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    /*
     * Everything except Next internals, static assets and the API — matching
     * those would add a middleware hop to every image request for no reason.
     */
    '/((?!_next/static|_next/image|api/|uploads/|favicon.ico|robots.txt|sitemap.xml|ads.txt|.*\\.(?:png|jpg|jpeg|gif|webp|avif|svg|ico|woff2?|txt|xml)$).*)',
  ],
}
