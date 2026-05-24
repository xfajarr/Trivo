// engine/agents/analysts/macro-analyst.ts
// Phase 6: Macro Analysis Agent - macroeconomic trends, global markets, interest rates

import { z } from 'zod'
import type { BaseProvider } from '../../providers/base-provider.js'
import type { MarketContext } from '../../types.js'
import { BaseAgent, type AgentConfig, type AgentResponse } from '../base-agent.js'

const MacroAnalysisSchema = z.object({
  macro_outlook: z.enum(['risk_on', 'risk_off', 'mixed', 'uncertain']),
  btc_correlation: z.enum(['strong_positive', 'weak_positive', 'neutral', 'weak_negative', 'strong_negative']),
  key_factors: z.array(z.string()).max(5),
  liquidity_assessment: z.enum(['abundant', 'adequate', 'tightening', 'scarce']),
  summary: z.string().max(500),
  confidence: z.number().min(0).max(100),
})

type MacroAnalysis = z.infer<typeof MacroAnalysisSchema>

const MACRO_SYSTEM_PROMPT = `You are a Macro Analysis AI for a crypto trading platform.
You analyze macroeconomic trends, global liquidity, and their impact on crypto markets.
Consider interest rates, dollar strength, global events, and institutional flows.
Connect macro conditions to specific crypto market implications.`

export class MacroAnalystAgent extends BaseAgent {
  constructor(provider: BaseProvider) {
    const config: AgentConfig = {
      name: 'Macro Analyst',
      role: 'macro_analyst',
      specialty: 'Macroeconomic Analysis',
      systemPrompt: MACRO_SYSTEM_PROMPT,
    }
    super(provider, config)
  }

  async analyze(context: MarketContext): Promise<AgentResponse<MacroAnalysis>> {
    const userPrompt = `Analyze the macroeconomic environment:

Today's PnL: $${context.todayPnl.toFixed(2)}
Win Rate: ${context.winRate.toFixed(1)}%
Total Trades: ${context.totalTrades}
Open Positions: ${context.openPositions.length}

Consider:
- Global liquidity conditions
- Interest rate expectations
- Dollar strength trends
- Institutional crypto adoption
- Geopolitical risks

Provide your macro analysis as JSON:
{
  "macro_outlook": "risk_on" | "risk_off" | "mixed" | "uncertain",
  "btc_correlation": "strong_positive" | "weak_positive" | "neutral" | "weak_negative" | "strong_negative",
  "key_factors": ["factor1", "factor2"],
  "liquidity_assessment": "abundant" | "adequate" | "tightening" | "scarce",
  "summary": "<analysis summary>",
  "confidence": <0-100>
}`

    return this.callLLM(userPrompt, MacroAnalysisSchema)
  }
}
