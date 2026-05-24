// engine/agents/analysts/sentiment-analyst.ts
// Phase 6: Sentiment Analysis Agent - market sentiment, news, social signals

import { z } from 'zod'
import type { BaseProvider } from '../../providers/base-provider.js'
import type { MarketContext } from '../../types.js'
import { BaseAgent, type AgentConfig, type AgentResponse } from '../base-agent.js'

const SentimentAnalysisSchema = z.object({
  overall_sentiment: z.enum(['very_bullish', 'bullish', 'neutral', 'bearish', 'very_bearish']),
  sentiment_score: z.number().min(-100).max(100),
  key_signals: z.array(z.string()).max(5),
  news_impact: z.enum(['positive', 'negative', 'neutral', 'mixed']),
  fear_greed_estimate: z.number().min(0).max(100),
  summary: z.string().max(500),
  confidence: z.number().min(0).max(100),
})

type SentimentAnalysis = z.infer<typeof SentimentAnalysisSchema>

const SENTIMENT_SYSTEM_PROMPT = `You are a Sentiment Analysis AI for a crypto trading platform.
You evaluate market sentiment from news, social media, and on-chain data.
Distinguish between noise and meaningful signals.
Consider the broader market context in your assessment.`

export class SentimentAnalystAgent extends BaseAgent {
  constructor(provider: BaseProvider) {
    const config: AgentConfig = {
      name: 'Sentiment Analyst',
      role: 'sentiment_analyst',
      specialty: 'Market Sentiment',
      systemPrompt: SENTIMENT_SYSTEM_PROMPT,
    }
    super(provider, config)
  }

  async analyze(context: MarketContext): Promise<AgentResponse<SentimentAnalysis>> {
    const sentimentData = Object.entries(context.sentiment)
      .map(([pair, data]) => `${pair}: ${JSON.stringify(data)}`)
      .join(', ')

    const priceChanges = Object.entries(context.priceChanges)
      .map(([pair, change]) => `${pair}: ${JSON.stringify(change)}%`)
      .join(', ')

    const userPrompt = `Evaluate current market sentiment:

Sentiment Data: ${sentimentData || 'No sentiment data available'}
Price Changes: ${priceChanges}
Recent Trades: ${context.recentTrades.length} in last 24h
Win Rate: ${context.winRate.toFixed(1)}%

Provide your sentiment analysis as JSON:
{
  "overall_sentiment": "very_bullish" | "bullish" | "neutral" | "bearish" | "very_bearish",
  "sentiment_score": <-100 to 100>,
  "key_signals": ["signal1", "signal2"],
  "news_impact": "positive" | "negative" | "neutral" | "mixed",
  "fear_greed_estimate": <0-100>,
  "summary": "<analysis summary>",
  "confidence": <0-100>
}`

    return this.callLLM(userPrompt, SentimentAnalysisSchema)
  }
}
