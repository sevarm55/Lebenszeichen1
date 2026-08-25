import { NextResponse } from 'next/server'
import { z } from 'zod'

import { prisma } from '@/lib/prisma'
import { guardApi } from '@/server/auth/guard'
import { consume } from '@/server/auth/rate-limit'
import { getAIProvider } from '@/server/ai'
import { AINotConfiguredError, AIProviderError } from '@/server/ai/types'
import { textToDocument } from '@/server/ai/to-document'
import { parseDocument, documentToPlainText } from '@/server/domain/blocks'
import { audit } from '@/server/services/audit'
import type { AITaskType } from '@prisma/client'

export const dynamic = 'force-dynamic'
export const maxDuration = 120

const schema = z.discriminatedUnion('task', [
  z.object({
    task: z.literal('generateArticle'),
    postId: z.string().optional(),
    language: z.string().min(2).max(30),
    angle: z.string().max(500).optional(),
    categoryHints: z.array(z.string().max(80)).max(20).optional(),
    source: z.object({
      title: z.string().max(400).optional().default(''),
      text: z.string().min(1).max(120_000),
      url: z.string().max(2000).optional(),
      domain: z.string().max(200).optional(),
      publishedAt: z.string().nullable().optional(),
    }),
  }),
  z.object({
    task: z.literal('rewrite'),
    postId: z.string().optional(),
    language: z.string().min(2).max(30),
    text: z.string().min(1).max(120_000),
    kind: z.enum(['title', 'excerpt', 'paragraph', 'document']).optional(),
  }),
  z.object({
    task: z.literal('rewriteDocument'),
    postId: z.string().optional(),
    language: z.string().min(2).max(30),
    document: z.unknown(),
  }),
  z.object({
    task: z.literal('seo'),
    postId: z.string().optional(),
    language: z.string().min(2).max(30),
    title: z.string().max(400),
    excerpt: z.string().max(1000),
    body: z.string().max(60_000),
  }),
  z.object({
    task: z.literal('tags'),
    postId: z.string().optional(),
    language: z.string().min(2).max(30),
    title: z.string().max(400),
    excerpt: z.string().max(1000).optional(),
  }),
  z.object({
    task: z.literal('headlines'),
    postId: z.string().optional(),
    language: z.string().min(2).max(30),
    title: z.string().max(400),
    excerpt: z.string().max(1000).optional(),
    count: z.number().int().min(1).max(10).optional(),
  }),
  z.object({
    task: z.literal('image'),
    postId: z.string().optional(),
    prompt: z.string().min(3).max(1200),
    aspect: z.enum(['16:9', '4:3', '1:1']).optional(),
  }),
  z.object({ task: z.literal('summarize'), text: z.string().min(1).max(120_000), title: z.string().max(400).optional() }),
])

const TASK_TYPES: Record<string, AITaskType> = {
  generateArticle: 'GENERATE_ARTICLE',
  rewrite: 'REWRITE_SECTION',
  rewriteDocument: 'REWRITE_SECTION',
  seo: 'GENERATE_SEO',
  tags: 'GENERATE_TAGS',
  headlines: 'GENERATE_HEADLINES',
  image: 'GENERATE_IMAGE',
  summarize: 'SUMMARIZE_SOURCE',
}

/**
 * Single entry point for every AI operation.
 *
 * Each call is recorded as an AITask with status, duration and error, so the
 * admin can show what ran, what failed and why — instead of a spinner that
 * silently never resolves.
 */
export async function POST(request: Request) {
  const guard = await guardApi(request, { minimum: 'EDITOR' })
  if (!guard.ok) return guard.response

  const limit = consume(`ai:${guard.user.id}`, 120, 10 * 60 * 1000)
  if (!limit.allowed) {
    return NextResponse.json(
      { error: `Слишком много AI-запросов. Повторите через ${limit.retryAfterSeconds} с.` },
      { status: 429 },
    )
  }

  const parsed = schema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? 'Некорректный запрос к AI.' },
      { status: 400 },
    )
  }

  const input = parsed.data
  const provider = getAIProvider()
  const startedAt = Date.now()

  const task = await prisma.aITask.create({
    data: {
      type: TASK_TYPES[input.task] ?? 'REWRITE_SECTION',
      status: 'PROCESSING',
      provider: provider.info.id,
      model: input.task === 'image' ? provider.info.imageModel : provider.info.textModel,
      postId: 'postId' in input && input.postId ? input.postId : null,
      userId: guard.user.id,
      startedAt: new Date(),
      input: summariseInput(input) as object,
    },
  })

  try {
    const result = await run(input, provider)
    const durationMs = Date.now() - startedAt

    await prisma.aITask.update({
      where: { id: task.id },
      data: {
        status: 'COMPLETED',
        completedAt: new Date(),
        durationMs,
        output: truncateOutput(result) as object,
      },
    })

    await audit({
      action: 'AI_GENERATE',
      userId: guard.user.id,
      entity: 'AITask',
      entityId: task.id,
      detail: `${input.task} · ${provider.info.id} · ${durationMs}ms`,
    })

    return NextResponse.json({
      ok: true,
      taskId: task.id,
      provider: provider.info.id,
      model: input.task === 'image' ? provider.info.imageModel : provider.info.textModel,
      durationMs,
      result,
    })
  } catch (error) {
    const message =
      error instanceof AIProviderError
        ? error.message
        : error instanceof Error
          ? error.message
          : 'Неизвестная ошибка AI'

    await prisma.aITask.update({
      where: { id: task.id },
      data: {
        status: 'FAILED',
        completedAt: new Date(),
        durationMs: Date.now() - startedAt,
        error: message.slice(0, 900),
      },
    })

    console.error('[ai] task failed', input.task, error)
    return NextResponse.json(
      { error: message, taskId: task.id },
      { status: error instanceof AINotConfiguredError ? 503 : 502 },
    )
  }
}

async function run(input: z.infer<typeof schema>, provider: ReturnType<typeof getAIProvider>) {
  switch (input.task) {
    case 'generateArticle':
      return provider.generateArticle({
        source: {
          title: input.source.title ?? '',
          text: input.source.text,
          url: input.source.url,
          domain: input.source.domain,
          publishedAt: input.source.publishedAt ?? null,
        },
        language: input.language,
        angle: input.angle,
        categoryHints: input.categoryHints,
      })

    case 'rewrite':
      return { text: await provider.rewriteSection({ text: input.text, language: input.language, kind: input.kind }) }

    case 'rewriteDocument': {
      // Paragraph structure has to survive the round trip, so the document is
      // flattened to blank-line separated prose and rebuilt afterwards.
      const doc = parseDocument(input.document)
      const plain = documentToPlainText(doc)
      const rewritten = await provider.rewriteSection({
        text: plain,
        language: input.language,
        kind: 'document',
      })
      return { document: textToDocument(rewritten) }
    }

    case 'seo':
      return provider.generateSEO({
        title: input.title,
        excerpt: input.excerpt,
        body: input.body,
        language: input.language,
      })

    case 'tags':
      return { tags: await provider.generateTags({ title: input.title, excerpt: input.excerpt, language: input.language }) }

    case 'headlines':
      return {
        headlines: await provider.generateHeadlines({
          title: input.title,
          excerpt: input.excerpt,
          language: input.language,
          count: input.count,
        }),
      }

    case 'image':
      return provider.generateImage({ prompt: input.prompt, aspect: input.aspect })

    case 'summarize':
      return provider.summarizeSource({ title: input.title ?? '', text: input.text })
  }
}

/** Keeps the AITask row small — full source text does not belong in a log. */
function summariseInput(input: z.infer<typeof schema>): Record<string, unknown> {
  const clone: Record<string, unknown> = { task: input.task }
  if ('language' in input) clone.language = input.language
  if ('title' in input) clone.title = String(input.title).slice(0, 200)
  if ('prompt' in input) clone.prompt = String(input.prompt).slice(0, 300)
  if ('source' in input) {
    clone.sourceUrl = input.source.url
    clone.sourceChars = input.source.text.length
  }
  if ('text' in input) clone.chars = input.text.length
  return clone
}

function truncateOutput(result: unknown): unknown {
  const json = JSON.stringify(result)
  if (json.length <= 20_000) return result
  return { truncated: true, preview: json.slice(0, 20_000) }
}
