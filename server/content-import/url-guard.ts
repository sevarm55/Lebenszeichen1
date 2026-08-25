import 'server-only'

import { lookup } from 'node:dns/promises'
import { isIP } from 'node:net'

/**
 * SSRF guard for the URL importer.
 *
 * The importer fetches an arbitrary operator-supplied URL from inside the
 * server's network, which is exactly the shape of an SSRF primitive. Two layers
 * of defence:
 *
 *   1. Scheme/host allowlisting — only http(s), never file:, ftp:, gopher:,
 *      data:, and never a hostname that resolves into a private range.
 *   2. Re-validation on every redirect hop (see fetcher.ts). A public host that
 *      302s to 169.254.169.254 is the classic bypass, so redirects are followed
 *      manually and each destination is re-checked.
 */

export class UnsafeUrlError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'UnsafeUrlError'
  }
}

const ALLOWED_PROTOCOLS = new Set(['http:', 'https:'])

const BLOCKED_HOSTNAMES = new Set([
  'localhost',
  'localhost.localdomain',
  'ip6-localhost',
  'ip6-loopback',
  // Cloud instance metadata endpoints
  'metadata.google.internal',
  'metadata.goog',
  'instance-data',
])

/** Suffixes that only ever resolve inside a private network. */
const BLOCKED_SUFFIXES = ['.local', '.internal', '.localdomain', '.home.arpa', '.lan']

function ipv4ToLong(ip: string): number | null {
  const parts = ip.split('.')
  if (parts.length !== 4) return null
  let value = 0
  for (const part of parts) {
    const n = Number(part)
    if (!Number.isInteger(n) || n < 0 || n > 255) return null
    value = value * 256 + n
  }
  return value
}

function isPrivateIPv4(ip: string): boolean {
  const value = ipv4ToLong(ip)
  if (value === null) return true // unparseable → treat as unsafe

  const ranges: [string, number][] = [
    ['0.0.0.0', 8], // "this" network
    ['10.0.0.0', 8], // RFC1918
    ['100.64.0.0', 10], // CGNAT
    ['127.0.0.0', 8], // loopback
    ['169.254.0.0', 16], // link-local + cloud metadata (169.254.169.254)
    ['172.16.0.0', 12], // RFC1918
    ['192.0.0.0', 24], // IETF protocol assignments
    ['192.0.2.0', 24], // TEST-NET-1
    ['192.88.99.0', 24], // 6to4 relay anycast
    ['192.168.0.0', 16], // RFC1918
    ['198.18.0.0', 15], // benchmarking
    ['198.51.100.0', 24], // TEST-NET-2
    ['203.0.113.0', 24], // TEST-NET-3
    ['224.0.0.0', 4], // multicast
    ['240.0.0.0', 4], // reserved + broadcast
  ]

  for (const [base, bits] of ranges) {
    const baseLong = ipv4ToLong(base)
    if (baseLong === null) continue
    const mask = bits === 0 ? 0 : (0xffffffff << (32 - bits)) >>> 0
    if ((value & mask) >>> 0 === (baseLong & mask) >>> 0) return true
  }
  return false
}

function isPrivateIPv6(ip: string): boolean {
  const normalized = ip.toLowerCase().replace(/^\[|\]$/g, '').split('%')[0]!

  if (normalized === '::' || normalized === '::1') return true
  // Unique-local (fc00::/7), link-local (fe80::/10), site-local (fec0::/10)
  if (/^f[cd]/.test(normalized)) return true
  if (/^fe[89ab]/.test(normalized)) return true
  if (/^ff/.test(normalized)) return true // multicast

  // IPv4-mapped / IPv4-compatible — unwrap and check as IPv4
  const mapped = normalized.match(/::ffff:(\d+\.\d+\.\d+\.\d+)$/)
  if (mapped) return isPrivateIPv4(mapped[1]!)
  const compat = normalized.match(/^::(\d+\.\d+\.\d+\.\d+)$/)
  if (compat) return isPrivateIPv4(compat[1]!)
  // NAT64 well-known prefix
  if (normalized.startsWith('64:ff9b:')) return true

  return false
}

export function isPrivateAddress(ip: string): boolean {
  const family = isIP(ip)
  if (family === 4) return isPrivateIPv4(ip)
  if (family === 6) return isPrivateIPv6(ip)
  return true
}

export interface SafeUrl {
  url: URL
  /** Resolved addresses, kept so the caller can log what it actually reached. */
  addresses: string[]
}

/**
 * Validates a single URL: scheme, host shape, credentials, port, and the DNS
 * result. Throws UnsafeUrlError with a message safe to show an editor.
 */
export async function assertSafeUrl(input: string): Promise<SafeUrl> {
  let url: URL
  try {
    url = new URL(input.trim())
  } catch {
    throw new UnsafeUrlError('Keine gültige URL.')
  }

  if (!ALLOWED_PROTOCOLS.has(url.protocol)) {
    throw new UnsafeUrlError(`Protokoll "${url.protocol}" ist nicht erlaubt. Nur http und https.`)
  }
  if (url.username || url.password) {
    throw new UnsafeUrlError('URLs mit eingebetteten Zugangsdaten sind nicht erlaubt.')
  }

  const hostname = url.hostname.toLowerCase().replace(/\.$/, '')
  if (!hostname) throw new UnsafeUrlError('Die URL enthält keinen Host.')
  if (BLOCKED_HOSTNAMES.has(hostname)) {
    throw new UnsafeUrlError('Interne Hostnamen sind nicht erlaubt.')
  }
  if (BLOCKED_SUFFIXES.some((suffix) => hostname.endsWith(suffix))) {
    throw new UnsafeUrlError('Interne Domains sind nicht erlaubt.')
  }
  // A bare label ("router", "intranet") is by definition internal.
  if (!hostname.includes('.') && isIP(hostname) === 0) {
    throw new UnsafeUrlError('Nur vollständige öffentliche Domains sind erlaubt.')
  }

  // Non-standard ports are usually internal services, not news sites.
  const port = url.port ? Number(url.port) : url.protocol === 'https:' ? 443 : 80
  if (port !== 80 && port !== 443 && port !== 8080 && port !== 8443) {
    throw new UnsafeUrlError(`Port ${port} ist nicht erlaubt.`)
  }

  // Literal IP in the URL: check it directly, no DNS involved.
  if (isIP(hostname) !== 0) {
    if (isPrivateAddress(hostname)) {
      throw new UnsafeUrlError('Adressen im privaten Netzbereich sind nicht erlaubt.')
    }
    return { url, addresses: [hostname] }
  }

  let resolved: { address: string }[]
  try {
    resolved = await lookup(hostname, { all: true, verbatim: true })
  } catch {
    throw new UnsafeUrlError(`Der Host "${hostname}" konnte nicht aufgelöst werden.`)
  }
  if (!resolved.length) {
    throw new UnsafeUrlError(`Der Host "${hostname}" konnte nicht aufgelöst werden.`)
  }

  // Every resolved address must be public — one private A record is enough to
  // make a DNS-rebinding attack work.
  for (const entry of resolved) {
    if (isPrivateAddress(entry.address)) {
      throw new UnsafeUrlError('Der Host zeigt auf eine interne Adresse und wurde blockiert.')
    }
  }

  return { url, addresses: resolved.map((r) => r.address) }
}

export function domainOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, '').toLowerCase()
  } catch {
    return ''
  }
}
