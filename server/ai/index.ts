import 'server-only'

import { env } from '@/config/env'
import { FalAIProvider } from './fal-provider'
import { MockAIProvider } from './mock-provider'
import type { AIProvider } from './types'

let cached: AIProvider | null = null
let cachedKey = ''

/**
 * Provider factory. Everything upstream depends on the interface only, which is
 * what makes "add another model / another vendor" a contained change.
 *
 * Future providers slot in here:
 *   case 'openai':    return new OpenAIProvider()
 *   case 'anthropic': return new AnthropicProvider()
 */
export function getAIProvider(): AIProvider {
  const key = `${env.ai.provider}:${env.ai.textModel}:${env.ai.imageModel}`
  if (cached && cachedKey === key) return cached

  cachedKey = key
  switch (env.ai.provider) {
    case 'fal':
      cached = new FalAIProvider()
      break
    case 'mock':
    default:
      cached = new MockAIProvider()
      break
  }
  return cached
}

export * from './types'
