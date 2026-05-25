// engine/agents/researchers/bear-researcher.ts
// Phase 6 - Ticket R2: Bear Researcher
// Builds the bear case: identifies risks, challenges bull arguments, recommends caution

import { z } from 'zod'
import type { BaseProvider } from '../../providers/base-provider.js'
import type { MarketContext } from '../../types.js'
import { BaseAgent, type AgentConfig, type AgentResponse } from '../base-agent.js'
import type { CompactAnalystReport } from './bull-researcher.js'

const BearResearchSchema = z.object({
  stance: z.enum(['bearish', 'neutral']),
  confidence: z.number().min(0).max(100),
  summary: z.string().max(500),
  strongest_bear_case: z.string().max(500),
  key_risks: z.array(z.string()).max(5),
  exit_triggers: z.array(z.string()).max(3),
  challenges_for_bulls: z.array(z.string()).max(3),
  recommended_caution: z.string().max(300).optional(),
})

type BearResearch = z.infer<typeof BearResearchSchema>

const SYSTEM_PROMPT = `You are a Bearish Research Analyst — the skeptic on the trading team.
Your job is to build the strongest bear case by:
1. Identifying risks and weaknesses in current market conditions
2. Finding evidence that supports caution or bearish positioning
3. Challenging bullish arguments with counter-evidence
4. Defining clear exit triggers and risk signals

You are NOT blindly bearish — you must have evidence for every claim.
If the evidence doesn't support a bear case, your stance must be 'neutral'.`

export class BearResearcherAgent extends BaseAgent {
  constructor(provider: BaseProvider) {
    const config: AgentConfig = {
      name: 'Bear Researcher',
      role: 'bear_researcher',
      specialty: 'Risk identification and bearish scenarios',
      systemPrompt: SYSTEM_PROMPT,
    }
    super(provider, config)
  }

  async analyze(context: MarketContext): Promise<AgentResponse<BearResearch>> {
    return this.analyzeWithData(context, [], '')
  }

  async analyzeWithData(
    context: MarketContext,
    analystReports: CompactAnalystReport[] = [],
    bullCase: string = ''
  ): Promise<AgentResponse<BearResearch>> {
    const btcPrice = context.prices['BTC/USD']
    const ethPrice = context.prices['ETH/USD']

    const reportsSection = analystReports.length > 0
      ? `\nAnalyst Reports:\n${analystReports.map(r => `- ${r.role}: ${r.stance.toUpperCase()} (${r.confidence}%): ${r.summary}`).join('\n')}`
      : ''

    const bullCaseSection = bullCase ? `\nBull Case To Challenge:\n${bullCase}` : ''

    const userPrompt = `Build the bear case for the current market:

Prices: BTC $${btcPrice?.toLocaleString() ?? 'N/A'}, ETH $${ethPrice?.toLocaleString() ?? 'N/A'}
Today's PnL: $${context.todayPnl.toFixed(2)}
Win Rate: ${context.winRate.toFixed(1)}%
Open Positions: ${context.openPositions.length}
Recent Trades: ${context.recentTrades.length}
${reportsSection}
${bullCaseSection}

Consider:
1. What are the biggest risks right now?
2. Which assets show weakness or overextension?
3. What bull arguments can you counter?
4. What conditions would trigger an exit?
5. What is your recommended level of caution?

Respond as JSON:
{
  "stance": "bearish" | "neutral",
  "confidence": <0-100>,
  "summary": "<bear case summary>",
  "strongest_bear_case": "<most compelling bearish argument>",
  "key_risks": ["risk1", "risk2"],
  "exit_triggers": ["trigger1", "trigger2"],
  "challenges_for_bulls": ["challenge1", "challenge2"],
  "recommended_caution": "<optional caution advice>"
}`

    return this.callLLM(userPrompt, BearResearchSchema)
  }
}
