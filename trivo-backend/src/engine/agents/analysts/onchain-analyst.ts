// engine/agents/analysts/onchain-analyst.ts
// Phase 6 - Ticket A3: OnChain Analyst Agent
// Analyzes wallet flows, exchange balances, smart money movements, protocol metrics

import { z } from 'zod'
import type { BaseProvider } from '../../providers/base-provider.js'
import type { MarketContext } from '../../types.js'
import { BaseAgent, type AgentConfig, type AgentResponse } from '../base-agent.js'

const OnChainAnalysisSchema = z.object({
  overall_assessment: z.enum(['bullish', 'bearish', 'neutral']),
  confidence: z.number().min(0).max(100),
  summary: z.string().max(500),
  exchange_flows: z.enum(['net_inflow', 'net_outflow', 'neutral', 'insufficient_data']).optional(),
  whale_activity: z.enum(['accumulating', 'distributing', 'neutral', 'insufficient_data']).optional(),
  smart_money: z.enum(['buying', 'selling', 'neutral', 'insufficient_data']).optional(),
  key_signals: z.array(z.string()).max(5),
  warnings: z.array(z.string()).max(3).optional(),
})

type OnChainAnalysis = z.infer<typeof OnChainAnalysisSchema>

const SYSTEM_PROMPT = `You are an On-Chain Analytics AI for a crypto trading platform.
You analyze on-chain data: wallet flows, exchange balances, whale movements, and protocol metrics.
You trace smart money and identify accumulation/distribution patterns.
Always distinguish between confirmed data and inferred signals.
Be clear about your confidence level and data limitations.`

export class OnChainAnalystAgent extends BaseAgent {
  constructor(provider: BaseProvider) {
    const config: AgentConfig = {
      name: 'OnChain Analyst',
      role: 'onchain_analyst',
      specialty: 'Wallet flows, smart money, on-chain metrics',
      systemPrompt: SYSTEM_PROMPT,
    }
    super(provider, config)
  }

  async analyze(context: MarketContext): Promise<AgentResponse<OnChainAnalysis>> {
    const btcPrice = context.prices['BTC/USD']
    const ethPrice = context.prices['ETH/USD']

    const userPrompt = `Analyze the on-chain market conditions:

Prices: BTC $${btcPrice?.toLocaleString() ?? 'N/A'}, ETH $${ethPrice?.toLocaleString() ?? 'N/A'}
Open Positions: ${context.openPositions.length}
Today's PnL: $${context.todayPnl.toFixed(2)}

Consider the following on-chain factors:
1. Exchange inflows/outflows (are coins moving to or from exchanges?)
2. Whale activity (large holders accumulating or distributing?)
3. Smart money movements (professional traders positioning?)
4. Network activity (transaction volume, active addresses)
5. Protocol metrics (TVL changes, staking activity)

Provide your on-chain analysis as JSON:
{
  "overall_assessment": "bullish" | "bearish" | "neutral",
  "confidence": <0-100>,
  "summary": "<2-3 sentence analysis>",
  "exchange_flows": "net_inflow" | "net_outflow" | "neutral" | "insufficient_data",
  "whale_activity": "accumulating" | "distributing" | "neutral" | "insufficient_data",
  "smart_money": "buying" | "selling" | "neutral" | "insufficient_data",
  "key_signals": ["signal1", "signal2"],
  "warnings": ["warning1"]
}`

    return this.callLLM(userPrompt, OnChainAnalysisSchema)
  }
}
