export interface StructuredDecision {
  reasoning: string
  confidence: number
  tool: string | null
  args: Record<string, unknown> | null
}

export interface LLMProvider {
  name: string
  think(systemPrompt: string, context: string): Promise<string>
  decide(systemPrompt: string, context: string, thinking: string): Promise<StructuredDecision>
}

export type ModelProviderType = 'deepseek' | 'claude' | 'openai' | 'qwen' | 'byok'

/**
 * Get model config priority:
 * 1. Per-agent modelConfig (JSON in DB)
 * 2. Global env vars (AI_PROVIDER, AI_BASE_URL, AI_MODEL, AI_API_KEY)
 * 3. Built-in defaults
 */
export function getEffectiveConfig(agentModelConfig?: string | null): {
  provider: string
  baseURL: string
  model: string
  apiKey: string
} {
  // Try per-agent config first
  if (agentModelConfig) {
    try {
      const cfg = JSON.parse(agentModelConfig)
      if (cfg.apiKey && cfg.baseURL) {
        return {
          provider: cfg.provider || 'custom',
          baseURL: cfg.baseURL,
          model: cfg.model || 'default',
          apiKey: cfg.apiKey,
        }
      }
    } catch { /* non-critical */ }
  }

  // Fallback to env vars
  const envProvider = process.env.AI_PROVIDER || ''
  const envBaseURL = process.env.AI_BASE_URL || ''
  const envModel = process.env.AI_MODEL || ''
  const envApiKey = process.env.AI_API_KEY || ''

  if (envApiKey && envBaseURL) {
    return {
      provider: envProvider || 'custom',
      baseURL: envBaseURL,
      model: envModel || 'default',
      apiKey: envApiKey,
    }
  }

  // Fallback to built-in defaults + OPENAI_API_KEY
  const BUILT_IN: Record<string, { baseURL: string; model: string }> = {
    deepseek: { baseURL: 'https://api.deepseek.com/v1', model: 'deepseek-chat' },
    claude:   { baseURL: 'https://api.anthropic.com/v1', model: 'claude-sonnet-4-20250514' },
    openai:   { baseURL: 'https://api.openai.com/v1', model: 'gpt-4o' },
    qwen:     { baseURL: 'https://dashscope.aliyuncs.com/compatible-mode/v1', model: 'qwen-max' },
  }

  const provider = envProvider || 'openai'
  const builtin = BUILT_IN[provider]
  if (builtin && process.env.OPENAI_API_KEY) {
    return {
      provider,
      baseURL: builtin.baseURL,
      model: builtin.model,
      apiKey: process.env.OPENAI_API_KEY,
    }
  }

  return { provider: '', baseURL: '', model: '', apiKey: '' }
}
