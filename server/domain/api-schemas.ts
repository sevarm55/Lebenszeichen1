import { z } from 'zod'

/**
 * Request schemas shared between route handlers.
 *
 * They live here rather than in a `route.ts` because Next.js only allows a
 * fixed set of exports from a route file — exporting anything else is a build
 * error, not just a lint warning.
 */

export const postSchema = z.object({
  title: z.string().min(1, 'Заголовок обязателен').max(300),
  subtitle: z.string().max(400).optional().default(''),
  slug: z.string().max(120).optional().default(''),
  excerpt: z.string().max(600).optional().default(''),
  document: z.unknown(),
  status: z.enum([
    'DRAFT',
    'AI_PROCESSING',
    'NEEDS_REVIEW',
    'READY',
    'SCHEDULED',
    'PUBLISHED',
    'ARCHIVED',
    'FAILED',
  ]),
  origin: z.enum(['MANUAL', 'URL_IMPORT', 'AI_GENERATED', 'SEED']).optional(),
  language: z.string().max(10).optional(),
  categoryId: z.string().min(1, 'Категория обязательна'),
  authorId: z.string().nullable().optional(),
  heroImageId: z.string().nullable().optional(),
  ogImageId: z.string().nullable().optional(),
  seoTitle: z.string().max(200).optional().default(''),
  metaDescription: z.string().max(400).optional().default(''),
  canonicalUrl: z.string().max(500).optional().default(''),
  ogTitle: z.string().max(200).optional().default(''),
  ogDescription: z.string().max(400).optional().default(''),
  socialHeadline: z.string().max(200).optional().default(''),
  sourceUrl: z.string().max(1000).nullable().optional(),
  sourceNote: z.string().max(600).optional().default(''),
  aiUsed: z.boolean().optional(),
  aiProvider: z.string().max(50).nullable().optional(),
  aiModel: z.string().max(100).nullable().optional(),
  featured: z.boolean().optional(),
  isEditorsPick: z.boolean().optional(),
  tags: z.array(z.string().max(50)).max(20).optional(),
  scheduledAt: z.string().nullable().optional(),
})

export const categorySchema = z.object({
  name: z.string().min(1).max(80),
  slug: z.string().max(80).optional(),
  description: z.string().max(600).optional().default(''),
  intro: z.string().max(1000).optional().default(''),
  seoTitle: z.string().max(200).optional().default(''),
  metaDescription: z.string().max(400).optional().default(''),
  imageId: z.string().nullable().optional(),
  order: z.number().int().min(0).max(999).optional(),
  enabled: z.boolean().optional(),
  showInNav: z.boolean().optional(),
})
