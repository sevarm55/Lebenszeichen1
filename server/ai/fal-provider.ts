import 'server-only'

import { fal } from '@fal-ai/client'

import { env } from '@/config/env'
import { asStringArray, extractJson } from './json'
import { blocksToDocument } from './to-document'
import {
  articlePrompt,
  EDITORIAL_SYSTEM,
  headlinePrompt,
  imagePrompt,
  rewritePrompt,
  seoPrompt,
  summarizePrompt,
  tagsPrompt,
} from './prompts'
import {
  AINotConfiguredError,
  AIProviderError,
  type AIProvider,
  type AIProviderInfo,
  type GenerateArticleInput,
  type GeneratedArticle,
  type GeneratedImage,
  type GeneratedSEO,
  type HeadlineInput,
  type ImageInput,
  type RewriteInput,
  type SEOInput,
  type SourceMaterial,
  type SummaryResult,
} from './types'

const IMAGE_SIZES: Record<NonNullable<ImageInput['aspect']>, { key: string; w: number; h: number }> = {
  '16:9': { key: 'landscape_16_9', w: 1280, h: 720 },
  '4:3': { key: 'landscape_4_3', w: 1200, h: 900 },
  '1:1': { key: 'square_hd', w: 1024, h: 1024 },
}

/**
 * fal.ai provider.
 *
 * Text goes through `fal-ai/any-llm`, which is a model router — so switching
 * the underlying LLM is an env change (AI_TEXT_MODEL), not a code change.
 * Images go through FLUX.
 */
export class FalAIProvider implements AIProvider {
  readonly info: AIProviderInfo

  constructor() {
    const ready = Boolean(env.ai.falKey)
    this.info = {
      id: 'fal',
      label: 'fal.ai',
      ready,
      textModel: env.ai.textModel,
      imageModel: env.ai.imageModel,
      readyHint: ready ? undefined : 'FAL_KEY ist nicht gesetzt.',
    }
    if (ready) {
      fal.config({ credentials: env.ai.falKey })
    }
  }

  private assertReady() {
    if (!this.info.ready) {
      throw new AINotConfiguredError(
        'fal.ai ist nicht konfiguriert. FAL_KEY in der .env hinterlegen und den Prozess neu starten.',
      )
    }
  }

  private async text(
    prompt: string,
    options: { system?: string; temperature?: number; fast?: boolean } = {},
  ): Promise<string> {
    this.assertReady()
    const model = options.fast ? env.ai.textModelFast : env.ai.textModel
    try {
      const result = await fal.run('fal-ai/any-llm', {
        input: {
          model,
          prompt,
          system_prompt: options.system ?? EDITORIAL_SYSTEM,
          temperature: options.temperature ?? 0.7,
        },
      })
      const res = result as { data?: { output?: string }; output?: string }
      const output = res.data?.output ?? res.output
      if (!output) throw new AIProviderError('Das Modell hat keine Ausgabe geliefert.')
      return output
    } catch (error) {
      if (error instanceof AIProviderError) throw error
      throw new AIProviderError(
        error instanceof Error ? error.message : 'Unbekannter fal.ai-Fehler',
        error,
      )
    }
  }

  async summarizeSource(source: SourceMaterial): Promise<SummaryResult> {
    const raw = await this.text(summarizePrompt(source), { temperature: 0.2 })
    const parsed = extractJson<{ summary?: string; keyPoints?: unknown; entities?: unknown }>(raw)
    return {
      summary: parsed?.summary?.trim() ?? raw.trim().slice(0, 600),
      keyPoints: asStringArray(parsed?.keyPoints, 8),
      entities: asStringArray(parsed?.entities, 15),
    }
  }

  async generateArticle(input: GenerateArticleInput): Promise<GeneratedArticle> {
    const raw = await this.text(articlePrompt(input), { temperature: 0.75 })
    const parsed = extractJson<Record<string, unknown>>(raw)
    if (!parsed) {
      throw new AIProviderError(
        'Die Modellantwort konnte nicht als JSON gelesen werden. Bitte erneut versuchen.',
      )
    }

    const document = blocksToDocument(parsed.blocks)
    if (document.blocks.length === 0) {
      throw new AIProviderError('Das Modell hat keine verwertbaren Textblöcke geliefert.')
    }

    const str = (v: unknown) => (typeof v === 'string' ? v.trim() : '')

    return {
      title: str(parsed.title),
      subtitle: str(parsed.subtitle),
      excerpt: str(parsed.excerpt),
      document,
      suggestedCategory: str(parsed.suggestedCategory),
      suggestedTags: asStringArray(parsed.suggestedTags, 10),
      seoTitle: str(parsed.seoTitle),
      metaDescription: str(parsed.metaDescription),
      socialHeadline: str(parsed.socialHeadline),
      warnings: asStringArray(parsed.warnings, 10),
      imageSuggestions: asStringArray(parsed.imageSuggestions, 6),
    }
  }

  async rewriteSection(input: RewriteInput): Promise<string> {
    const fast = input.kind === 'title' || input.kind === 'excerpt'
    const raw = await this.text(rewritePrompt(input), {
      temperature: 0.8,
      fast,
      system:
        'You are a professional rewriter. You always change the wording substantially — different vocabulary, different sentence structure — while keeping every fact intact. You never copy the input verbatim, never add facts, and never explain what you did. You return only the rewritten text.',
    })
    return raw.trim().replace(/^["'«»]|["'«»]$/g, '').trim()
  }

  async generateHeadlines(input: HeadlineInput): Promise<string[]> {
    const raw = await this.text(headlinePrompt(input), { temperature: 0.9, fast: true })
    const parsed = extractJson<unknown>(raw)
    const list = asStringArray(parsed, input.count ?? 5)
    if (list.length) return list
    return raw
      .split('\n')
      .map((l) => l.replace(/^\s*[-*\d.)]+\s*/, '').trim())
      .filter(Boolean)
      .slice(0, input.count ?? 5)
  }

  async generateTags(input: HeadlineInput): Promise<string[]> {
    const raw = await this.text(tagsPrompt(input), { temperature: 0.5, fast: true })
    const parsed = extractJson<unknown>(raw)
    const list = asStringArray(parsed, 10)
    if (list.length) return list.map((t) => t.replace(/^#/, '').trim())
    return raw
      .split(/[,\n#]+/)
      .map((t) => t.trim())
      .filter((t) => t.length > 1 && t.length < 30)
      .slice(0, 8)
  }

  async generateSEO(input: SEOInput): Promise<GeneratedSEO> {
    const raw = await this.text(seoPrompt(input), { temperature: 0.4, fast: true })
    const parsed = extractJson<Partial<GeneratedSEO>>(raw)
    const fallbackTitle = input.title.slice(0, 60)
    const fallbackDesc = input.excerpt.slice(0, 158)
    return {
      seoTitle: parsed?.seoTitle?.trim() || fallbackTitle,
      metaDescription: parsed?.metaDescription?.trim() || fallbackDesc,
      ogTitle: parsed?.ogTitle?.trim() || fallbackTitle,
      ogDescription: parsed?.ogDescription?.trim() || fallbackDesc,
      socialHeadline: parsed?.socialHeadline?.trim() || fallbackTitle,
    }
  }

  async generateImage(input: ImageInput): Promise<GeneratedImage> {
    this.assertReady()
    const size = IMAGE_SIZES[input.aspect ?? '16:9']
    try {
      const result = await fal.subscribe(env.ai.imageModel, {
        input: {
          prompt: imagePrompt(input.prompt),
          image_size: size.key,
          num_images: 1,
          output_format: 'jpeg',
          enable_prompt_expansion: true,
        },
      })
      const data = result as {
        data?: { images?: { url: string; width?: number; height?: number }[] }
        images?: { url: string; width?: number; height?: number }[]
      }
      const images = data.data?.images ?? data.images
      const first = images?.[0]
      if (!first?.url) throw new AIProviderError('Es wurde kein Bild erzeugt.')
      return {
        url: first.url,
        width: first.width ?? size.w,
        height: first.height ?? size.h,
        model: env.ai.imageModel,
        prompt: input.prompt,
      }
    } catch (error) {
      if (error instanceof AIProviderError) throw error
      throw new AIProviderError(
        error instanceof Error ? error.message : 'Unbekannter fal.ai-Bildfehler',
        error,
      )
    }
  }
}
