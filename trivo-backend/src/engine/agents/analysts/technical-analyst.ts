// engine/agents/analysts/technical-analyst.ts
// Phase 6: Technical Analysis Agent - chart patterns, indicators, trends

import { z } from 'zod'
import type { BaseProvider } from '../../providers/base-provider.js'
import type { MarketContext } from '../../types.js'
import { BaseAgent, type AgentConfig, type AgentResponse } from '../base-agent.js'

const TechnicalAnalysisSchema = z.object({
  market: z.string(),
  trend: z.enum(['bullish', 'bearish', 'neutral', 'ranging']),
  trend_strength: z.number().min(0).max(100),
  key_levels: z.object({
    support: z.array(z.number()).max(5),
    resistance: z.array(z.number()).max(5),
  }),
  indicators: z.object({
    rsi: z.number().optional(),
    macd: z.enum(['bullish_cross', 'bearish_cross', 'neutral']).optional(),
    volume_trend: z.enum(['increasing', 'decreasing', 'flat']).optional(),
  }).optional(),
  summary: z.string().max(500),
  confidence: z.number().min(0).max(100),
})

type TechnicalAnalysis = z.infer<typeof TechnicalAnalysisSchema>

const TECHNICAL_SYSTEM_PROMPT = `You are a Technical Analysis AI for a crypto trading platform.
You analyze price action, chart patterns, and technical indicators to produce actionable insights.
Always reference specific price levels and technical concepts.
Be clear about your confidence level and any conflicting signals.`

export class TechnicalAnalystAgent extends BaseAgent {
  constructor(provider: BaseProvider) {
    const config: AgentConfig = {
      name: 'Technical Analyst',
      role: 'technical_analyst',
      specialty: 'Technical Analysis',
      systemPrompt: TECHNICAL_SYSTEM_PROMPT,
    }
    super(provider, config)
  }

  async analyze(context: MarketContext): Promise<AgentResponse<TechnicalAnalysis>> {
    const btcPrice = context.prices['BTC/USD']
    const ethPrice = context.prices['ETH/USD']

    const priceData = Object.entries(context.priceChanges)
      .map(([pair, change]) => `${pair}: ${JSON.stringify(change)}%`)
      .join(', ')

    const userPrompt = `Analyze the current market from a technical perspective:

Prices: BTC $${btcPrice?.toLocaleString()}, ETH $${ethPrice?.toLocaleString()}
Price Changes (24h): ${priceData}
Open Positions: ${context.openPositions.length}

Provide your technical analysis as JSON:
{
  "market": "BTC/USD or the primary market",
  "trend": "bullish" | "bearish" | "neutral" | "ranging",
  "trend_strength": <0-100>,
  "key_levels": {
    "support": [<nearest support levels>],
    "resistance": [<nearest resistance levels>]
  },
  "indicators": {
    "rsi": <0-100>,
    "macd": "bullish_cross" | "bearish_cross" | "neutral",
    "volume_trend": "increasing" | "decreasing" | "flat"
  },
  "summary": "<analysis summary>",
  "confidence": <0-100>
}`

    return this.callLLM(userPrompt, TechnicalAnalysisSchema)
  }
}
