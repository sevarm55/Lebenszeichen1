/**
 * Server-side environment access.
 *
 * Rules of the house:
 *  - Anything secret (DATABASE_URL, AUTH_SECRET, FAL_KEY) is read here and here
 *    only, and never re-exported to a client component.
 *  - Public switches live in config/public.ts and use literal
 *    `process.env.NEXT_PUBLIC_*` references so Next can inline them at build time.
 */

function str(key: string, fallback = ''): string {
  return process.env[key]?.trim() || fallback
}

function int(key: string, fallback: number): number {
  const raw = process.env[key]
  const parsed = raw ? Number.parseInt(raw, 10) : NaN
  return Number.isFinite(parsed) ? parsed : fallback
}

function bool(key: string, fallback = false): boolean {
  const raw = process.env[key]?.trim().toLowerCase()
  if (raw === undefined || raw === '') return fallback
  return raw === 'true' || raw === '1' || raw === 'yes'
}

export const env = {
  nodeEnv: process.env.NODE_ENV ?? 'development',
  isProduction: process.env.NODE_ENV === 'production',
  isDevelopment: process.env.NODE_ENV !== 'production',

  databaseUrl: str('DATABASE_URL'),

  siteName: str('SITE_NAME', 'Lebenszeichen'),
  siteUrl: str('SITE_URL', str('NEXT_PUBLIC_SITE_URL', 'http://localhost:3000')).replace(/\/$/, ''),

  authSecret: str('AUTH_SECRET'),
  authSessionHours: int('AUTH_SESSION_HOURS', 12),

  storage: {
    driver: str('STORAGE_DRIVER', 'local'),
    localDir: str('STORAGE_LOCAL_DIR', 'public/uploads'),
    publicPrefix: str('STORAGE_PUBLIC_PREFIX', '/uploads'),
    maxUploadBytes: int('UPLOAD_MAX_MB', 10) * 1024 * 1024,
  },

  ai: {
    provider: str('AI_PROVIDER', 'mock'),
    falKey: str('FAL_KEY'),
    textModel: str('AI_TEXT_MODEL', 'google/gemini-2.5-flash'),
    textModelFast: str('AI_TEXT_MODEL_FAST', 'google/gemini-2.5-flash-lite'),
    imageModel: str('AI_IMAGE_MODEL', 'fal-ai/flux-2/turbo'),
  },

  ads: {
    enabled: bool('ADS_ENABLED', false),
  },

  import: {
    timeoutMs: int('IMPORT_TIMEOUT_MS', 15_000),
    maxBytes: int('IMPORT_MAX_BYTES', 3_000_000),
    maxRedirects: int('IMPORT_MAX_REDIRECTS', 3),
  },

  revalidateSecret: str('REVALIDATE_SECRET'),
} as const

/**
 * Fails loudly at boot in production if something required is missing, instead
 * of failing quietly at request time.
 */
export function assertProductionEnv(): string[] {
  const problems: string[] = []
  if (!env.databaseUrl) problems.push('DATABASE_URL is not set')
  if (!env.authSecret || env.authSecret.length < 32) {
    problems.push('AUTH_SECRET is missing or shorter than 32 characters')
  }
  if (env.ai.provider === 'fal' && !env.ai.falKey) {
    problems.push('AI_PROVIDER=fal but FAL_KEY is empty')
  }
  return problems
}
