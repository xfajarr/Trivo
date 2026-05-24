// engine/agents/portfolio-manager.ts
// Phase 6 - Ticket D2: Portfolio Manager
// Final authority: synthesizes all analysis, risk, and learning into go/no-go decisions

import { z } from 'zod'
import type { BaseProvider } from '../providers/base-provider.js'
import type { MarketContext } from '../types.js'
import { BaseAgent, type AgentConfig, type AgentResponse } from './base-agent.js'

export const PortfolioDecisionSchema = z.object({
  rating: z.enum(['buy', 'overweight', 'hold', 'underweight', 'sell']),
  conviction: z.number().min(0).max(100),
  executive_summary: z.string().max(500),
  investment_thesis: z.string().max(500),
  position_size: z.string(),
  entry_price: z.number().positive().optional(),
  stop_loss: z.number().positive().optional(),
  take_profit: z.number().positive().optional(),
  leverage: z.number().min(1).max(10).optional(),
  timeframe: z.string().optional(),
  risk_adjusted: z.boolean(),
  lessons_applied: z.array(z.string()).max(3).optional(),
  reasoning_chain_summary: z.string().max(500),
})

export type PortfolioDecision = z.infer<typeof PortfolioDecisionSchema>

const SYSTEM_PROMPT = `You are the Senior Portfolio Manager — the final decision authority.
Your role:
1. Synthesize all research, trader proposals, and analysis
2. Apply lessons from past trades
3. Make final go/no-go decisions with conviction levels
4. Consider portfolio-level risk and diversification
5. You can reject or modify any trader proposal

You are measured by long-term results, not individual trades.
Be decisive but humble — adjust conviction based on confidence in the analysis.`

export class PortfolioManagerAgent extends BaseAgent {
  constructor(provider: BaseProvider) {
    const config: AgentConfig = {
      name: 'Portfolio Manager',
      role: 'portfolio_manager',
      specialty: 'Final execution authority, portfolio-level risk',
      systemPrompt: SYSTEM_PROMPT,
    }
    super(provider, config)
  }

  async analyze(context: MarketContext): Promise<AgentResponse<PortfolioDecision>> {
    const btcPrice = context.prices['BTC/USD']
    const userPrompt = `Make the final portfolio decision:

BTC Price: $${btcPrice?.toLocaleString() ?? 'N/A'}
Today's PnL: $${context.todayPnl.toFixed(2)}
Win Rate: ${context.winRate.toFixed(1)}%
Total Trades: ${context.totalTrades}
Open Positions: ${context.openPositions.length || 0}

You must consider:
1. Overall portfolio health and risk exposure
2. Current position concentration
3. Market regime and trend
4. Risk-adjusted opportunity
5. Lessons from past decisions

Respond as JSON:
{
  "rating": "buy" | "overweight" | "hold" | "underweight" | "sell",
  "conviction": <0-100>,
  "executive_summary": "<final decision summary>",
  "investment_thesis": "<core thesis>",
  "position_size": "<e.g. 5% of portfolio>",
  "entry_price": <optional>,
  "stop_loss": <optional>,
  "take_profit": <optional>,
  "leverage": <optional 1-10>,
  "timeframe": "<optional>",
  "risk_adjusted": true | false,
  "lessons_applied": ["lesson applied"],
  "reasoning_chain_summary": "<synthesis of all inputs>"
}`

    return this.callLLM(userPrompt, PortfolioDecisionSchema)
  }
}
