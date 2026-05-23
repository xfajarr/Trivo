import { HeuristProvider } from '../providers/heurist.js'
import { db } from '../../lib/db.js'
import { agentMemory } from '../../lib/schema.js'
import { eq, desc } from 'drizzle-orm'

export interface MemoryEntry {
  id: string; content: string; type: string
  embedding: number[]; metadata: Record<string, unknown>
  createdAt: Date; similarity: number
}

export class SemanticMemory {
  private embeddingCache = new Map<string, number[]>()

  constructor(private readonly heurist: HeuristProvider) {}

  async store(agentId: string, type: string, content: string, extras?: Record<string, unknown>): Promise<void> {
    const embedding = await this.getEmbedding(content)
    await db.insert(agentMemory).values({
      id: crypto.randomUUID(), agentId, type, content: content.slice(0, 2000), reasoning: null,
      metadata: JSON.stringify({ ...extras, embedding: embedding.slice(0, 50) }),
    }).execute().catch((err: Error) => console.error('[SemanticMemory] store:', err.message))
  }

  async searchSimilar(agentId: string, query: string, limit = 5): Promise<MemoryEntry[]> {
    const qEmbed = await this.getEmbedding(query)
    const memories = await db.select().from(agentMemory).where(eq(agentMemory.agentId, agentId)).orderBy(desc(agentMemory.createdAt)).limit(100)

    const scored: MemoryEntry[] = []
    for (const m of memories) {
      const meta = m.metadata ? JSON.parse(m.metadata) as Record<string, unknown> : {}
      const emb = meta.embedding as number[] | undefined
      if (!emb || emb.length === 0) continue
      scored.push({
        id: m.id, content: m.content ?? '', type: m.type ?? 'unknown', embedding: emb,
        metadata: meta, createdAt: m.createdAt ?? new Date(), similarity: this.cosineSimilarity(qEmbed, emb),
      })
    }
    scored.sort((a, b) => b.similarity - a.similarity)
    return scored.slice(0, limit)
  }

  private async getEmbedding(text: string): Promise<number[]> {
    const cached = this.embeddingCache.get(text)
    if (cached) return cached

    const embedding = await this.heurist.createEmbedding(text)
    this.embeddingCache.set(text, embedding)

    if (this.embeddingCache.size > 1000) {
      const firstKey = this.embeddingCache.keys().next().value
      if (firstKey) this.embeddingCache.delete(firstKey)
    }

    return embedding
  }

  private cosineSimilarity(a: number[], b: number[]): number {
    if (a.length !== b.length) return 0
    let d = 0, na = 0, nb = 0
    for (let i = 0; i < a.length; i++) { d += a[i]! * b[i]!; na += a[i]! * a[i]!; nb += b[i]! * b[i]! }
    const denom = Math.sqrt(na) * Math.sqrt(nb)
    return denom === 0 ? 0 : d / denom
  }
}
