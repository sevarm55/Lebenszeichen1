import {
  type AIProvider,
  type AIProviderInfo,
  type GeneratedArticle,
  type GeneratedImage,
  type GeneratedSEO,
  type GenerateArticleInput,
  type HeadlineInput,
  type ImageInput,
  type RewriteInput,
  type SEOInput,
  type SourceMaterial,
  type SummaryResult,
} from './types'
import { blockId, parseDocument } from '@/server/domain/blocks'

/**
 * Deterministic, offline provider.
 *
 * This is the default so the whole editorial workflow — import, generate,
 * review, publish — can be exercised in dev and CI without a key, without
 * network calls and without cost. It is obviously-fake on purpose: output is
 * marked so nobody can mistake it for a finished article.
 */
const MARK = '[MOCK]'

function sentences(text: string, count: number): string {
  const parts = text
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter(Boolean)
  return parts.slice(0, count).join(' ')
}

export class MockAIProvider implements AIProvider {
  readonly info: AIProviderInfo = {
    id: 'mock',
    label: 'Mock (offline)',
    ready: true,
    textModel: 'mock-text',
    imageModel: 'mock-image',
    readyHint:
      'Der Mock-Provider erzeugt keine echten Inhalte. Für Produktion AI_PROVIDER=fal setzen.',
  }

  async summarizeSource(source: SourceMaterial): Promise<SummaryResult> {
    return {
      summary: `${MARK} ${sentences(source.text, 2) || 'Keine Quelle vorhanden.'}`,
      keyPoints: [`${MARK} Kernpunkt 1`, `${MARK} Kernpunkt 2`, `${MARK} Kernpunkt 3`],
      entities: [],
    }
  }

  async generateArticle(input: GenerateArticleInput): Promise<GeneratedArticle> {
    const base = input.source.title || 'Ohne Titel'
    const lead = sentences(input.source.text, 3) || 'Kein Quelltext vorhanden.'

    const document = parseDocument({
      version: 1,
      blocks: [
        { id: blockId(), type: 'paragraph', lead: true, text: `${MARK} ${lead}` },
        { id: blockId(), type: 'heading2', text: `${MARK} Was bekannt ist` },
        {
          id: blockId(),
          type: 'paragraph',
          text: `${MARK} Dieser Text stammt vom Mock-Provider und ersetzt keine redaktionelle Arbeit. Setzen Sie AI_PROVIDER=fal und hinterlegen Sie FAL_KEY, um echte Entwürfe zu erzeugen.`,
        },
        { id: blockId(), type: 'heading2', text: `${MARK} Einordnung` },
        {
          id: blockId(),
          type: 'paragraph',
          text: `${MARK} ${sentences(input.source.text.slice(400), 3) || 'Keine weiteren Angaben.'}`,
        },
      ],
    })

    return {
      title: `${MARK} ${base}`,
      subtitle: `${MARK} Automatisch erzeugter Platzhalter`,
      excerpt: `${MARK} ${sentences(input.source.text, 1)}`.slice(0, 200),
      document,
      suggestedCategory: input.categoryHints?.[0] ?? '',
      suggestedTags: ['mock', 'platzhalter'],
      seoTitle: `${MARK} ${base}`.slice(0, 60),
      metaDescription: `${MARK} Platzhalter-Beschreibung für den Entwurf.`,
      socialHeadline: `${MARK} ${base}`.slice(0, 90),
      warnings: [
        'Mock-Provider aktiv — der Text ist ein Platzhalter und darf nicht veröffentlicht werden.',
      ],
      imageSuggestions: ['Platzhalter-Bildidee'],
    }
  }

  async rewriteSection(input: RewriteInput): Promise<string> {
    return `${MARK} ${input.text}`
  }

  async generateHeadlines(input: HeadlineInput): Promise<string[]> {
    return Array.from({ length: input.count ?? 5 }, (_, i) => `${MARK} ${input.title} (${i + 1})`)
  }

  async generateSEO(input: SEOInput): Promise<GeneratedSEO> {
    return {
      seoTitle: `${MARK} ${input.title}`.slice(0, 60),
      metaDescription: `${MARK} ${input.excerpt}`.slice(0, 158),
      ogTitle: `${MARK} ${input.title}`.slice(0, 70),
      ogDescription: `${MARK} ${input.excerpt}`.slice(0, 160),
      socialHeadline: `${MARK} ${input.title}`.slice(0, 90),
    }
  }

  async generateTags(): Promise<string[]> {
    return ['mock', 'platzhalter', 'demo']
  }

  async generateImage(input: ImageInput): Promise<GeneratedImage> {
    // A local SVG placeholder — no network, no cost, still a usable image URL.
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="675"><rect width="100%" height="100%" fill="#e7e2da"/><text x="50%" y="50%" text-anchor="middle" font-family="sans-serif" font-size="34" fill="#8a8279">MOCK BILD</text></svg>`
    return {
      url: `data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}`,
      width: 1200,
      height: 675,
      model: 'mock-image',
      prompt: input.prompt,
    }
  }
}
