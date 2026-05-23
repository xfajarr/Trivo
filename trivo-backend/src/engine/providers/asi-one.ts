import OpenAI from 'openai'
import { BaseProvider } from './base-provider.js'

/**
 * ASI:One provider — extends BaseProvider (DRY)
 * Only defines client + model, all logic inherited
 */
export class ASIOneProvider extends BaseProvider {
  protected client: OpenAI
  protected model: string
  private sessionId: string | null = null

  constructor(config: { apiKey: string; model: string }) {
    super()
    this.client = new OpenAI({ apiKey: config.apiKey, baseURL: 'https://api.asi1.ai/v1' })
    this.model = config.model
  }

  setSessionId(sessionId: string): void {
    this.sessionId = sessionId
    // Note: ASI:One supports x-session-id header for multi-turn context
    // We'd need to pass this in runReActLoop if needed
  }
}
