import OpenAI from 'openai'
import { db } from '../../lib/db.js'
import { agentMemory } from '../../lib/schema.js'
import { eq, desc } from 'drizzle-orm'

export async function distillAgentMemory(
  agentId: string,
  apiKey: string,
  baseURL: string,
  model: string,
): Promise<void> {
  const client = new OpenAI({ apiKey, baseURL })

  const recent = await db
    .select()
    .from(agentMemory)
    .where(eq(agentMemory.agentId, agentId))
    .orderBy(desc(agentMemory.createdAt))
    .limit(20)

  if (recent.length < 5) {
    console.log(`[distill] Agent ${agentId}: not enough memories (${recent.length})`)
    return
  }

  const memoriesText = recent.map((m) => `[${m.type}] ${m.content}`).join('\n\n')

  const response = await client.chat.completions.create({
    model,
    messages: [
      {
        role: 'system',
        content: 'You are a trading analyst. Summarize these trading memories into actionable insights.',
      },
      {
        role: 'user',
        content: `Analyze these trading memories and extract 3-5 key lessons:\n\n${memoriesText}\n\nFocus on:\n1. What patterns worked?\n2. What patterns failed?\n3. What market conditions matter?\n4. What should the agent avoid?\n\nBe concise. Output as a simple list.`,
      },
    ],
    max_tokens: 500,
  })

  const insight = response.choices[0]?.message?.content ?? 'No insight generated'

  await db.insert(agentMemory).values({
    id: crypto.randomUUID(),
    agentId,
    type: 'reflection',
    content: insight,
    reasoning: `Distilled from ${recent.length} recent memories`,
    metadata: JSON.stringify({ sourceCount: recent.length }),
  })

  console.log(`✅ [distill] Agent ${agentId}: ${recent.length} memories → insight`)
}
