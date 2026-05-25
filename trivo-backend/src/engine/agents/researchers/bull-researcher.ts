// engine/agents/researchers/bull-researcher.ts
// Phase 6 - Ticket R1: Bull Researcher
// Builds the bull case: finds evidence for bullish positions, challenges bear arguments

import { z } from 'zod'
import type { BaseProvider } from '../../providers/base-provider.js'
import type { MarketContext } from '../../types.js'
import { BaseAgent, type AgentConfig, type AgentResponse } from '../base-agent.js'

export interface CompactAnalystReport {
  role: string
  stance: string
  confidence: number
  summary: string
}

const BullResearchSchema = z.object({
  stance: z.enum(['bullish', 'neutral']),
  confidence: z.number().min(0).max(100),
  summary: z.string().max(500),
  strongest_bull_case: z.string().max(500),
  key_thesis: z.string().max(300),
  catalyst: z.array(z.string()).max(3),
  entry_requirements: z.array(z.string()).max(3),
  target_price: z.string().optional(),
  stop_loss_suggestion: z.string().optional(),
  challenges_for_bears: z.array(z.string()).max(3),
})

type BullResearch = z.infer<typeof BullResearchSchema>

const SYSTEM_PROMPT = `You are a Bullish Research Analyst — the optimist on the trading team.
Your job is to build the strongest bull case by:
1. Finding evidence that supports bullish positioning
2. Identifying positive catalysts (news, technicals, on-chain)
3. Challenging bearish arguments with counter-evidence
4. Defining clear entry requirements and targets

You are NOT blindly bullish — you must have evidence for every claim.
If the evidence doesn't support a bull case, your stance must be 'neutral'.`

export class BullResearcherAgent extends BaseAgent {
  constructor(provider: BaseProvider) {
    const config: AgentConfig = {
      name: 'Bull Researcher',
      role: 'bull_researcher',
      specialty: 'Bullish opportunities and catalysts',
      systemPrompt: SYSTEM_PROMPT,
    }
    super(provider, config)
  }

  async analyze(context: MarketContext): Promise<AgentResponse<BullResearch>> {
    return this.analyzeWithData(context, [], '')
  }

  async analyzeWithData(
    context: MarketContext,
    analystReports: CompactAnalystReport[] = [],
    bearCase: string = ''
  ): Promise<AgentResponse<BullResearch>> {
    const btcPrice = context.prices['BTC/USD']
    const ethPrice = context.prices['ETH/USD']

    const reportsSection = analystReports.length > 0
      ? `\nAnalyst Reports:\n${analystReports.map(r => `- ${r.role}: ${r.stance.toUpperCase()} (${r.confidence}%): ${r.summary}`).join('\n')}`
      : ''

    const bearCaseSection = bearCase ? `\nBear Case To Address:\n${bearCase}` : ''

    const userPrompt = `Build the bull case for the current market:

Prices: BTC $${btcPrice?.toLocaleString() ?? 'N/A'}, ETH $${ethPrice?.toLocaleString() ?? 'N/A'}
Today's PnL: $${context.todayPnl.toFixed(2)}
Win Rate: ${context.winRate.toFixed(1)}%
Open Positions: ${context.openPositions.length}
Recent Trades: ${context.recentTrades.length}
${reportsSection}
${bearCaseSection}

Consider:
1. What positive catalysts exist right now?
2. Which assets show the strongest technical setups?
3. What bear arguments can you counter?
4. What conditions would confirm a bullish entry?
5. What is your price target and stop loss suggestion?

Respond as JSON:
{
  "stance": "bullish" | "neutral",
  "confidence": <0-100>,
  "summary": "<bull case summary>",
  "strongest_bull_case": "<most compelling bullish argument>",
  "key_thesis": "<core investment thesis>",
  "catalyst": ["catalyst1", "catalyst2"],
  "entry_requirements": ["requirement1", "requirement2"],
  "target_price": "<optional price target>",
  "stop_loss_suggestion": "<optional stop loss>",
  "challenges_for_bears": ["challenge1", "challenge2"]
}`

    return this.callLLM(userPrompt, BullResearchSchema)
  }
}
