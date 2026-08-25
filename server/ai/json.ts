/**
 * Tolerant JSON extraction from model output.
 *
 * Models wrap JSON in fences, prepend "Here is the JSON:", or emit a trailing
 * comma. Rather than failing the whole editorial workflow on that, we strip the
 * usual noise and take the outermost balanced object/array.
 */

export function extractJson<T>(raw: string): T | null {
  if (!raw) return null

  let text = raw.trim()
  text = text.replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/i, '').trim()

  const direct = tryParse<T>(text)
  if (direct !== null) return direct

  const start = text.search(/[[{]/)
  if (start === -1) return null
  const opener = text[start]
  const closer = opener === '{' ? '}' : ']'

  let depth = 0
  let inString = false
  let escaped = false
  for (let i = start; i < text.length; i += 1) {
    const ch = text[i]
    if (escaped) {
      escaped = false
      continue
    }
    if (ch === '\\') {
      escaped = true
      continue
    }
    if (ch === '"') {
      inString = !inString
      continue
    }
    if (inString) continue
    if (ch === opener) depth += 1
    else if (ch === closer) {
      depth -= 1
      if (depth === 0) {
        return tryParse<T>(text.slice(start, i + 1))
      }
    }
  }
  return null
}

function tryParse<T>(text: string): T | null {
  try {
    return JSON.parse(text) as T
  } catch {
    // One retry after removing trailing commas, the single most common defect.
    try {
      return JSON.parse(text.replace(/,\s*([}\]])/g, '$1')) as T
    } catch {
      return null
    }
  }
}

export function asStringArray(value: unknown, limit = 20): string[] {
  if (!Array.isArray(value)) return []
  return value
    .map((v) => (typeof v === 'string' ? v.trim() : ''))
    .filter((v) => v.length > 0)
    .slice(0, limit)
}
