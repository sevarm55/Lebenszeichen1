import { NextResponse } from 'next/server'
import { z } from 'zod'

import { guardApi } from '@/server/auth/guard'
import { clientIp, consume } from '@/server/auth/rate-limit'
import { importFromUrl, UnsafeUrlError } from '@/server/content-import'
import { findDuplicates } from '@/server/services/duplicates'
import { audit } from '@/server/services/audit'

export const dynamic = 'force-dynamic'
// Fetching and parsing a slow foreign page can take a while.
export const maxDuration = 60

const schema = z.object({ url: z.string().min(8).max(2000) })

export async function POST(request: Request) {
  const guard = await guardApi(request, { minimum: 'EDITOR' })
  if (!guard.ok) return guard.response

  // Outbound fetching is the expensive, abusable operation here — cap it per
  // user even though the caller is already authenticated.
  const limit = consume(`import:${guard.user.id}`, 30, 10 * 60 * 1000)
  if (!limit.allowed) {
    return NextResponse.json(
      { error: `Слишком много импортов. Повторите через ${limit.retryAfterSeconds} с.` },
      { status: 429 },
    )
  }

  const parsed = schema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) {
    return NextResponse.json({ error: 'Укажите ссылку на статью.' }, { status: 400 })
  }

  try {
    const article = await importFromUrl(parsed.data.url)
    const duplicates = await findDuplicates({
      sourceUrl: article.sourceUrl,
      title: article.title,
    })

    await audit({
      action: 'URL_IMPORT',
      userId: guard.user.id,
      entity: 'Source',
      detail: article.sourceUrl,
      ip: clientIp(request.headers),
    })

    return NextResponse.json({
      ok: true,
      article: {
        title: article.title,
        subtitle: article.subtitle,
        excerpt: article.excerpt,
        document: article.document,
        plainText: article.plainText,
        wordCount: article.wordCount,
        publishedAt: article.publishedAt,
        author: article.author,
        siteName: article.siteName,
        sourceUrl: article.sourceUrl,
        sourceDomain: article.sourceDomain,
        language: article.language,
        images: article.images,
        warnings: article.warnings,
      },
      duplicates,
    })
  } catch (error) {
    if (error instanceof UnsafeUrlError) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }
    console.error('[import] failed', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Импорт не удался.' },
      { status: 500 },
    )
  }
}
