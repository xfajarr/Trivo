import { Hono } from 'hono'
import { ASIOneProvider } from '../engine/providers/asi-one.js'
import { HeuristProvider } from '../engine/providers/heurist.js'
import type { BaseProvider } from '../engine/providers/base-provider.js'

const chat = new Hono()

function getProvider(): BaseProvider {
  const providerName = (process.env.AI_PROVIDER ?? 'heurist').toLowerCase()
  const apiKey = process.env.AI_API_KEY ?? ''
  const model = process.env.AI_MODEL ?? 'asi1-mini'

  if (!apiKey) {
    throw new Error('AI_API_KEY is not set. Set AI_API_KEY in your .env file.')
  }

  if (providerName === 'heurist') {
    return new HeuristProvider({ apiKey, model })
  }
  if (providerName === 'asi1' || providerName === 'asi-one' || providerName === 'asi') {
    return new ASIOneProvider({ apiKey, model })
  }
  // Fallback: detect from base URL
  const baseURL = process.env.AI_BASE_URL ?? ''
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
    const msg = String(error)
    if (msg.includes('401') || msg.includes('AuthenticationError')) {
      return c.json({
        error: `AI provider auth failed. Check AI_API_KEY / AI_PROVIDER env vars. Provider: ${process.env.AI_PROVIDER ?? 'heurist'}`,
        detail: msg,
      }, 502)
    }
    return c.json({ error: msg }, 500)
  }
})

export { chat }

// Per-agent chat with context
chat.post('/agent/:agentId', async (c) => {
  /* eslint-disable @typescript-eslint/no-explicit-any */
  const agentId = c.req.param('agentId')
  const { message, history } = await c.req.json<{
    message: string
    history?: Array<{ role: 'user' | 'assistant'; content: string }>
  }>()

  if (!message) return c.json({ error: 'Message is required' }, 400)
  if (!agentId) return c.json({ error: 'Agent ID is required' }, 400)

  // Load agent context
  const { db } = await import('../lib/db.js')
  const { agents: agentsTable } = await import('../lib/schema.js')
  const { eq } = await import('drizzle-orm')

  const agent = await db.select().from(agentsTable).where(eq(agentsTable.id, agentId))
  if (!agent.length) return c.json({ error: 'Agent not found' }, 404)

  const a = agent[0]

  const provider = getProvider()
  const client = (provider as any).client

  const systemPrompt = `You are ${a?.name}, an AI trading agent on Trivo.
Your strategy: ${a?.strategy || 'Find profitable trading opportunities'}
Your skills: ${a?.skills || 'perp'}
Risk params: Max leverage ${a?.maxLeverage || 5}x, Stop loss ${a?.stopLossPct || 10}%, Spend limit $${a?.spendLimit || 100}
Status: ${a?.status}

The user is your creator. They are chatting with you to train, refine your strategy, or ask about your performance. Be helpful and knowledgeable about trading. You trade on Arc Testnet with real market data from CoinGecko.`

  const messages = [
    { role: 'system' as const, content: systemPrompt },
    ...(history || []),
    { role: 'user' as const, content: message },
  ]

  try {
    const response = await client.chat.completions.create({
      model: (provider as any).model,
      messages,
      temperature: 0.7,
      max_tokens: 1000,
    })

    return c.json({
      reply: response.choices[0]?.message?.content ?? 'No response',
      agentId,
      model: (provider as any).model,
    })
  } catch (error) {
    console.error('Agent chat error:', error)
    const msg = String(error)
    if (msg.includes('401') || msg.includes('AuthenticationError')) {
      return c.json({
        error: `AI provider auth failed. Check AI_API_KEY / AI_PROVIDER env vars. Provider: ${process.env.AI_PROVIDER ?? 'heurist'}`,
        detail: msg,
      }, 502)
    }
    return c.json({ error: msg }, 500)
  }
})
