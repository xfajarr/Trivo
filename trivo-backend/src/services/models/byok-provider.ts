import { createOpenAIProvider } from './openai-provider'
import type { LLMProvider } from './provider'

export function createBYOKProvider(endpoint: string, model: string, apiKey: string): LLMProvider {
  return createOpenAIProvider(model, apiKey, endpoint)
}
