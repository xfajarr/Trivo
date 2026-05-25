// engine/agents/trader.ts
// Phase 6 - Ticket D1: Trader Agent
// Translates research into specific trade proposals with entry, exit, position sizing

import { z } from 'zod'
import type { BaseProvider } from '../providers/base-provider.js'
import type { MarketContext } from '../types.js'
import { BaseAgent, type AgentConfig, type AgentResponse } from './base-agent.js'
import type { CompactAnalystReport } from './researchers/bull-researcher.js'

export const TraderProposalSchema = z.object({
  action: z.enum(['buy', 'sell', 'hold']),
  reasoning: z.string().max(500),
  entry_price: z.number().positive().optional(),
  stop_loss: z.number().positive().optional(),
  take_profit: z.number().positive().optional(),
  position_size: z.string(),
  position_size_usd: z.string().optional(),
  leverage: z.number().min(1).max(10).optional(),
  timeframe: z.string().optional(),
  conviction: z.number().min(0).max(100),
  risk_reward_ratio: z.string().optional(),
})

export type TraderProposal = z.infer<typeof TraderProposalSchema>

const SYSTEM_PROMPT = `You are an Expert Trading Agent — you turn research into specific trade proposals.
You determine:
- Entry price, stop loss, and take profit levels
- Position size based on risk and conviction
- Leverage (if applicable)
- Timeframe for the trade
- Risk/reward ratio

You MUST be specific and actionable. No vague recommendations.
CRITICAL: In demo mode, you should actively seek trading opportunities. Only return 'hold' if there is a clear reason not to trade. When analyst signals are mixed, prefer taking a small position over holding cash. Never suggest holding just because signals aren't perfect — suggest a trade with appropriate position sizing instead.`

export class TraderAgent extends BaseAgent {
  constructor(provider: BaseProvider) {
    const config: AgentConfig = {
      name: 'Trader',
      role: 'trader',
      specialty: 'Trade execution and position sizing',
      systemPrompt: SYSTEM_PROMPT,
    }
    super(provider, config)
  }

  async analyze(context: MarketContext): Promise<AgentResponse<TraderProposal>> {
    return this.analyzeWithResearch(context, '', [])
  }

  async analyzeWithResearch(
    context: MarketContext,
    researchPlan: string = '',
    analystReports: CompactAnalystReport[] = []
  ): Promise<AgentResponse<TraderProposal>> {
    const btcPrice = context.prices['BTC/USD']

    const reportsSection = analystReports.length > 0
      ? `\nAnalyst Reports:\n${analystReports.map(r => `- ${r.role}: ${r.stance.toUpperCase()} (${r.confidence}%): ${r.summary}`).join('\n')}`
      : ''

    const researchSection = researchPlan ? `\nResearch Plan:\n${researchPlan}` : ''

    const userPrompt = `Generate a trade proposal based on current market conditions:

BTC Price: $${btcPrice?.toLocaleString() ?? 'N/A'}
Today's PnL: $${context.todayPnl.toFixed(2)}
Win Rate: ${context.winRate.toFixed(1)}%
Total Trades: ${context.totalTrades}
Open Positions: ${context.openPositions.length || 0}
${reportsSection}
${researchSection}

Consider:
1. Current market conditions and trend
2. Risk/reward ratio (minimum 1:2)
3. Position sizing based on risk tolerance
4. Clear entry, stop loss, and take profit levels
5. Timeframe and leverage

Respond as JSON:
{
  "action": "buy" | "sell" | "hold",
  "reasoning": "<why this action?>",
  "entry_price": <price>,
  "stop_loss": <price>,
  "take_profit": <price>,
  "position_size": "<e.g. 0.1 BTC>",
  "position_size_usd": "<e.g. $1,000>",
  "leverage": <1-10>,
  "timeframe": "<e.g. 24h, 1w>",
  "conviction": <0-100>,
  "risk_reward_ratio": "<e.g. 1:3>"
}`

    return this.callLLM(userPrompt, TraderProposalSchema)
  }
}
