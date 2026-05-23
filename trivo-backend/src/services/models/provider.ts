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

export const MODEL_CONFIGS: Record<ModelProviderType, { baseURL: string; model: string }> = {
  deepseek: { baseURL: 'https://api.deepseek.com/v1', model: 'deepseek-chat' },
  claude:   { baseURL: 'https://api.anthropic.com/v1', model: 'claude-sonnet-4-20250514' },
  openai:   { baseURL: 'https://api.openai.com/v1', model: 'gpt-4o' },
  qwen:     { baseURL: 'https://dashscope.aliyuncs.com/compatible-mode/v1', model: 'qwen-max' },
  byok:     { baseURL: '', model: '' },
}
