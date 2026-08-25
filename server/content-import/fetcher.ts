import 'server-only'

import { env } from '@/config/env'
import { assertSafeUrl, UnsafeUrlError } from './url-guard'

export interface FetchedPage {
  html: string
  finalUrl: string
  contentType: string
  redirects: string[]
}

const USER_AGENT =
  'Mozilla/5.0 (compatible; LebenszeichenBot/1.0; +editorial content import)'

/**
 * Fetches a page with redirects followed *manually*, so that every hop is
 * re-validated against the SSRF guard. `redirect: 'follow'` would hand that
 * decision to undici and let a public host bounce us into the private network.
 *
 * Also bounded in three dimensions — time, bytes and hops — so a hostile or
 * merely broken server cannot hold a worker open.
 */
export async function fetchPage(rawUrl: string): Promise<FetchedPage> {
  const redirects: string[] = []
  let current = rawUrl

  for (let hop = 0; hop <= env.import.maxRedirects; hop += 1) {
    const safe = await assertSafeUrl(current)

    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), env.import.timeoutMs)

    let response: Response
    try {
      response = await fetch(safe.url, {
        redirect: 'manual',
        signal: controller.signal,
        headers: {
          'User-Agent': USER_AGENT,
          Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'de,en;q=0.8',
        },
        cache: 'no-store',
      })
    } catch (error) {
      clearTimeout(timer)
      if (error instanceof Error && error.name === 'AbortError') {
        throw new UnsafeUrlError('Zeitüberschreitung beim Abrufen der Quelle.')
      }
      throw new UnsafeUrlError(
        `Die Quelle konnte nicht geladen werden: ${
          error instanceof Error ? error.message : 'unbekannter Fehler'
        }`,
      )
    }
    clearTimeout(timer)

    if (response.status >= 300 && response.status < 400) {
      const location = response.headers.get('location')
      if (!location) throw new UnsafeUrlError('Weiterleitung ohne Ziel-URL.')
      const next = new URL(location, safe.url).toString()
      redirects.push(next)
      current = next
      continue
    }

    if (!response.ok) {
      throw new UnsafeUrlError(`Die Quelle antwortete mit HTTP ${response.status}.`)
    }

    const contentType = response.headers.get('content-type') ?? ''
    if (!/text\/html|application\/xhtml/i.test(contentType)) {
      throw new UnsafeUrlError(
        `Die URL liefert kein HTML (${contentType || 'unbekannter Typ'}).`,
      )
    }

    const declared = Number(response.headers.get('content-length') ?? '0')
    if (declared && declared > env.import.maxBytes) {
      throw new UnsafeUrlError('Die Seite ist zu groß für den Import.')
    }

    const html = await readCapped(response, env.import.maxBytes)
    return { html, finalUrl: safe.url.toString(), contentType, redirects }
  }

  throw new UnsafeUrlError('Zu viele Weiterleitungen.')
}

/** Streams the body, aborting once the byte cap is exceeded. */
async function readCapped(response: Response, maxBytes: number): Promise<string> {
  if (!response.body) return ''
  const reader = response.body.getReader()
  const chunks: Uint8Array[] = []
  let total = 0

  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    if (!value) continue
    total += value.byteLength
    if (total > maxBytes) {
      await reader.cancel()
      throw new UnsafeUrlError('Die Seite ist zu groß für den Import.')
    }
    chunks.push(value)
  }

  const buffer = new Uint8Array(total)
  let offset = 0
  for (const chunk of chunks) {
    buffer.set(chunk, offset)
    offset += chunk.byteLength
  }
  return new TextDecoder('utf-8', { fatal: false }).decode(buffer)
}
