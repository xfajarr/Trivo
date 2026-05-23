import { Hono } from 'hono'
import { ASIOneProvider } from '../engine/providers/asi-one.js'
import { HeuristProvider } from '../engine/providers/heurist.js'
import type { BaseProvider } from '../engine/providers/base-provider.js'

const chat = new Hono()

function getProvider(): BaseProvider {
  const apiKey = process.env.AI_API_KEY ?? process.env.OPENAI_API_KEY ?? ''
  const baseURL = process.env.AI_BASE_URL ?? ''
  const model = process.env.AI_MODEL ?? 'asi1-mini'

  if (baseURL.includes('heurist')) {
    return new HeuristProvider({ apiKey, model })
  }
  return new ASIOneProvider({ apiKey, model })
}

// Simple chat — no tools, no JSON, just text
chat.post('/', async (c) => {
  const { message, history } = await c.req.json<{
    message: string
    history?: Array<{ role: 'user' | 'assistant'; content: string }>
  }>()

  if (!message) {
    return c.json({ error: 'Message is required' }, 400)
  }

  const provider = getProvider()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const client = (provider as any).client

  const messages = [
    {
      role: 'system' as const,
      content: `You are Trivo AI, a helpful assistant for the Trivo platform. 
You help users with:
- Understanding crypto trading concepts
- Explaining how Trivo agents work
- Answering questions about DeFi, perpetuals, prediction markets
- General conversation

Be concise, friendly, and helpful. Use emojis occasionally.`,
    },
    ...(history ?? []),
    { role: 'user' as const, content: message },
  ]

  try {
    const response = await client.chat.completions.create({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      model: (provider as any).model,
      messages,
      temperature: 0.7,
      max_tokens: 1000,
    })

    const reply = response.choices[0]?.message?.content ?? 'No response'

    return c.json({
      reply,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      model: (provider as any).model,
      usage: response.usage,
    })
  } catch (error) {
    console.error('Chat error:', error)
    return c.json({ error: String(error) }, 500)
  }
})

export { chat }
