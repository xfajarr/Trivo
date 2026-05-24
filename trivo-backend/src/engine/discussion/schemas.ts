// engine/discussion/schemas.ts
// Debate and deliberation specific Zod schemas

import { z } from 'zod'
import type { Stance } from '../schemas/index.js'

export const StanceSchema = z.enum(['bullish', 'bearish', 'neutral'])

export const DebaterResultSchema = z.object({
  stance: StanceSchema,
  confidence: z.number().min(0).max(100),
  summary: z.string(),
  reasoning: z.string(),
  evidence_hashes: z.array(z.string()),
})

export type DebaterResult = z.infer<typeof DebaterResultSchema>

export const DebateRoundSchema = z.object({
  round: z.number(),
  statements: z.array(z.object({
    role: z.string(),
    stance: StanceSchema,
    summary: z.string(),
    confidence: z.number().min(0).max(100),
  })),
})

export type DebateRound = z.infer<typeof DebateRoundSchema>
