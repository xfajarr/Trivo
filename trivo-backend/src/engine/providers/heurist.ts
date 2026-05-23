import OpenAI from 'openai'
import { BaseProvider } from './base-provider.js'

/**
 * Heurist provider — extends BaseProvider (DRY)
 * Adds embedding capability on top
 */
export class HeuristProvider extends BaseProvider {
  protected client: OpenAI
  protected model: string

  constructor(config: { apiKey: string; model: string }) {
    super()
    this.client = new OpenAI({ apiKey: config.apiKey, baseURL: 'https://llm-gateway.heurist.xyz' })
    this.model = config.model
  }

  async createEmbedding(text: string): Promise<number[]> {
    const r = await this.client.embeddings.create({
      model: 'BAAI/bge-large-en-v1.5',
      input: text,
      encoding_format: 'float',
    })
    return r.data[0]?.embedding ?? []
  }

  async createEmbeddings(texts: string[]): Promise<number[][]> {
    const r = await this.client.embeddings.create({
      model: 'BAAI/bge-large-en-v1.5',
      input: texts,
      encoding_format: 'float',
    })
    return r.data.map(d => d.embedding ?? [])
  }
}
