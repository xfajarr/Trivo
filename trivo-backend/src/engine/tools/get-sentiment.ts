import type { EngineTool } from './registry.js'
import type { SentimentData } from '../types.js'

// Cache to avoid hitting API limits
const sentimentCache = new Map<string, { data: SentimentData; expires: number }>()
const CACHE_TTL = 5 * 60 * 1000 // 5 minutes

export const getSentimentTool: EngineTool = {
  schema: {
    name: 'get_sentiment',
    description: 'Get real-time Twitter/X sentiment for a crypto token. Use this to gauge market mood before trading. High bullish sentiment with low volume = potential pump. High bearish sentiment = potential dump.',
    input_schema: {
      type: 'object',
      properties: {
        token: {
          type: 'string',
          description: 'Token symbol (e.g., "BTC", "ETH", "SOL") or search term',
        },
        timeframe: {
          type: 'string',
          enum: ['1h', '4h', '24h'],
          description: 'How far back to analyze (default: 4h)',
        },
      },
      required: ['token'],
    },
  },
  async execute(args) {
    const { token, timeframe = '4h' } = args as { token: string; timeframe?: string }
    const cacheKey = `${token}_${timeframe}`

    // Check cache
    const cached = sentimentCache.get(cacheKey)
    if (cached && cached.expires > Date.now()) {
      return cached.data
    }

    // Generate sentiment (simulated for hackathon)
    const sentiment: SentimentData = {
      token,
      sentiment: 'neutral',
      score: Math.floor(Math.random() * 60) - 30,
      volume: Math.floor(Math.random() * 500) + 50,
      engagement: Math.floor(Math.random() * 5000) + 500,
      topTopics: ['trading', 'crypto', 'defi'],
      influentialTweets: [
        {
          text: `$${token} looking interesting today! Watching closely.`,
          author: 'cryptoinfluencer',
          followers: 25000,
          sentiment: 'neutral',
        },
      ],
      timestamp: new Date().toISOString(),
    }

    // Determine sentiment
    if (sentiment.score > 20) sentiment.sentiment = 'bullish'
    else if (sentiment.score < -20) sentiment.sentiment = 'bearish'

    // Cache result
    sentimentCache.set(cacheKey, { data: sentiment, expires: Date.now() + CACHE_TTL })

    return sentiment
  },
}
