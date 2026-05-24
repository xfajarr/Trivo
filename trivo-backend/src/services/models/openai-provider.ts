import OpenAI from 'openai'
import type { LLMProvider, StructuredDecision } from './provider'

export function createOpenAIProvider(modelName: string, apiKey: string, baseURL: string): LLMProvider {
  const client = new OpenAI({ apiKey, baseURL })

  return {
    name: modelName,

    async think(systemPrompt: string, context: string): Promise<string> {
      const res = await client.chat.completions.create({
        model: modelName,
        messages: [
          { role: 'system', content: systemPrompt },
          {
            role: 'user',
            content: `Analyze the current market situation and your portfolio. What are you thinking?\n\n${context}`,
          },
        ],
        temperature: 0.7,
        max_tokens: 1024,
      })
      return res.choices[0]?.message?.content ?? ''
    },

    async decide(systemPrompt: string, context: string, thinking: string): Promise<StructuredDecision> {
      const res = await client.chat.completions.create({
        model: modelName,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'assistant', content: `My analysis:\n${thinking}` },
          {
            role: 'user',
            content: `Based on your analysis, what action do you take?\n\n${context}\n\nRespond with JSON only:\n{ "reasoning": "...", "confidence": 0.75, "tool": "open_trade" | null, "args": { "venue": "perp", "market": "BTC-PERP", "side": "LONG", "size": 5000 } | null }`,
          },
        ],
        response_format: { type: 'json_object' },
        temperature: 0.3,
        max_tokens: 512,
      })
      try {
        return JSON.parse(res.choices[0]?.message?.content ?? '{}')
      } catch {
        return { reasoning: 'Failed to parse AI response', confidence: 0, tool: null, args: null }
      }
    },
  }
}
