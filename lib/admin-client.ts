'use client'

/**
 * Client-side helper for every admin mutation.
 *
 * Reads the CSRF cookie and sends it back as a header — the double-submit half
 * that `guardApi` verifies. Every admin fetch goes through here so no call site
 * can forget it.
 */

function csrfToken(): string {
  const match = document.cookie.match(/(?:^|;\s*)lz_csrf=([^;]+)/)
  return match?.[1] ? decodeURIComponent(match[1]) : ''
}

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly details?: unknown,
  ) {
    super(message)
    this.name = 'ApiError'
  }
}

export async function apiFetch<T = unknown>(
  url: string,
  options: RequestInit & { json?: unknown } = {},
): Promise<T> {
  const { json, headers, ...rest } = options
  const method = rest.method ?? (json ? 'POST' : 'GET')

  const response = await fetch(url, {
    ...rest,
    method,
    headers: {
      ...(json ? { 'Content-Type': 'application/json' } : {}),
      'x-csrf-token': csrfToken(),
      ...headers,
    },
    ...(json ? { body: JSON.stringify(json) } : {}),
  })

  const text = await response.text()
  let data: unknown = null
  if (text) {
    try {
      data = JSON.parse(text)
    } catch {
      data = { error: text.slice(0, 300) }
    }
  }

  if (!response.ok) {
    // A 401 mid-session means the cookie expired — send the editor back to the
    // login screen instead of showing an error they cannot act on.
    if (response.status === 401 && typeof window !== 'undefined') {
      window.location.href = `/admin/login?next=${encodeURIComponent(window.location.pathname)}`
    }
    const message =
      (data as { error?: string })?.error ?? `Ошибка запроса (HTTP ${response.status})`
    throw new ApiError(message, response.status, data)
  }

  return data as T
}

export async function uploadFile<T = unknown>(url: string, file: File, extra: Record<string, string> = {}): Promise<T> {
  const form = new FormData()
  form.append('file', file)
  for (const [key, value] of Object.entries(extra)) form.append(key, value)

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'x-csrf-token': csrfToken() },
    body: form,
  })

  const data = (await response.json().catch(() => null)) as { error?: string } | null
  if (!response.ok) {
    throw new ApiError(data?.error ?? `Ошибка загрузки (HTTP ${response.status})`, response.status)
  }
  return data as T
}
