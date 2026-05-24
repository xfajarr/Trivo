import { ASIOneProvider } from './asi-one.js'
import { HeuristProvider } from './heurist.js'
import type { BaseProvider } from './base-provider.js'

export type TaskComplexity = 'simple' | 'standard' | 'complex'

/**
 * ModelRouter — picks the best provider for each task
 * KISS: Caches provider instances (no new instance per call)
 */
export class ModelRouter {
  private providers = new Map<string, BaseProvider>()
  private embeddingProvider!: HeuristProvider

  constructor(config: {
    asiOne?: { apiKey: string; defaultModel?: string }
    heurist?: { apiKey: string; defaultModel?: string }
  }) {
    // Cache ASI:One variants
    if (config.asiOne) {
      const models = ['asi1-mini', 'asi1', 'asi1-ultra']
      for (const model of models) {
        this.providers.set(
          `asi-one:${model}`,
          new ASIOneProvider({
            apiKey: config.asiOne.apiKey,
            model,
          }),
        )
      }
    }

    // Cache Heurist
    if (config.heurist) {
      const model = config.heurist.defaultModel ?? 'hermes-3-llama3.1-8b'
      this.providers.set(
        `heurist:${model}`,
        new HeuristProvider({
          apiKey: config.heurist.apiKey,
          model,
        }),
      )
      this.embeddingProvider = this.providers.get(`heurist:${model}`) as HeuristProvider
    }
  }

  getProvider(complexity: TaskComplexity = 'standard'): BaseProvider {
    const key = this.getProviderKey(complexity)
    const provider = this.providers.get(key)
    if (!provider) throw new Error(`No provider configured for ${key}`)
    return provider
  }

  getEmbeddingProvider(): HeuristProvider {
    if (!this.embeddingProvider) throw new Error('Heurist not configured for embeddings')
    return this.embeddingProvider
  }

  private getProviderKey(complexity: TaskComplexity): string {
    switch (complexity) {
      case 'simple':
        return 'asi-one:asi1-mini'
      case 'complex':
        return 'asi-one:asi1-ultra'
      case 'standard':
      default:
        return 'asi-one:asi1' // Default to balanced
    }
  }
}
