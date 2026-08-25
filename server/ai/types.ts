/**
 * AI provider contract.
 *
 * Admin code never imports a vendor SDK. It calls `getAIProvider()` and works
 * against this interface, so adding a second fal.ai model — or moving to
 * another vendor entirely — touches server/ai/ and nothing else.
 */

import type { ArticleDocument } from '@/server/domain/blocks'

export interface AIProviderInfo {
  /** Machine key: 'mock' | 'fal' */
  id: string
  label: string
  /** False when the provider is selected but not usable (missing key). */
  ready: boolean
  textModel: string
  imageModel: string
  /** Shown in /admin/settings when `ready` is false. */
  readyHint?: string
}

export interface SourceMaterial {
  title: string
  text: string
  url?: string
  domain?: string
  publishedAt?: string | null
}

export interface GenerateArticleInput {
  source: SourceMaterial
  /** Target publication language, e.g. "German". */
  language: string
  /** Optional editorial steer from the human. */
  angle?: string
  categoryHints?: string[]
}

export interface GeneratedArticle {
  title: string
  subtitle: string
  excerpt: string
  document: ArticleDocument
  suggestedCategory: string
  suggestedTags: string[]
  seoTitle: string
  metaDescription: string
  socialHeadline: string
  /** Model-flagged uncertainties the editor must verify before publishing. */
  warnings: string[]
  imageSuggestions: string[]
}

export interface RewriteInput {
  text: string
  language: string
  /** Tightens the instruction for short fields. */
  kind?: 'title' | 'excerpt' | 'paragraph' | 'document'
}

export interface HeadlineInput {
  title: string
  excerpt?: string
  language: string
  count?: number
}

export interface SEOInput {
  title: string
  excerpt: string
  body: string
  language: string
}

export interface GeneratedSEO {
  seoTitle: string
  metaDescription: string
  ogTitle: string
  ogDescription: string
  socialHeadline: string
}

export interface SummaryResult {
  summary: string
  keyPoints: string[]
  entities: string[]
}

export interface ImageInput {
  prompt: string
  aspect?: '16:9' | '4:3' | '1:1'
}

export interface GeneratedImage {
  url: string
  width: number
  height: number
  model: string
  prompt: string
}

export interface AIProvider {
  readonly info: AIProviderInfo
  summarizeSource(source: SourceMaterial): Promise<SummaryResult>
  generateArticle(input: GenerateArticleInput): Promise<GeneratedArticle>
  rewriteSection(input: RewriteInput): Promise<string>
  generateHeadlines(input: HeadlineInput): Promise<string[]>
  generateSEO(input: SEOInput): Promise<GeneratedSEO>
  generateTags(input: HeadlineInput): Promise<string[]>
  generateImage(input: ImageInput): Promise<GeneratedImage>
}

export class AIProviderError extends Error {
  constructor(
    message: string,
    readonly cause?: unknown,
  ) {
    super(message)
    this.name = 'AIProviderError'
  }
}

export class AINotConfiguredError extends AIProviderError {
  constructor(message: string) {
    super(message)
    this.name = 'AINotConfiguredError'
  }
}
