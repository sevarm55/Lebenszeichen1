import 'server-only'

import { fetchPage } from './fetcher'
import { extractArticle, type ExtractedArticle } from './extract'

export * from './url-guard'
export type { ExtractedArticle, ImageCandidate } from './extract'

/**
 * Full import pipeline: validate → fetch (bounded, redirect-checked) → extract.
 * Everything the editor sees comes from here; nothing is auto-published.
 */
export async function importFromUrl(rawUrl: string): Promise<ExtractedArticle> {
  const page = await fetchPage(rawUrl)
  const article = extractArticle(page.html, page.finalUrl)

  if (page.redirects.length) {
    article.warnings.push(
      `Die URL wurde ${page.redirects.length}× weitergeleitet. Endgültige Quelle: ${page.finalUrl}`,
    )
  }
  return article
}
