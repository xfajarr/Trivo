import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { MarketContext } from '../../types.js'

const mockProvider = {
  completeWithSchema: vi.fn(),
  getModelVersion: vi.fn().mockReturnValue('test-model'),
  complete: vi.fn(),
}

const mockContext: MarketContext = {
  prices: { 'BTC/USD': 50000, 'ETH/USD': 3000, 'SOL/USD': 150 },
  priceChanges: { 'BTC/USD': { hour: 0.5, day: 2.0 } },
  sentiment: {},
  recentTrades: [],
  openPositions: [],
  todayPnl: 100,
  winRate: 60,
  totalTrades: 10,
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('Analyst Agents', () => {
  it('TechnicalAnalystAgent returns structured analysis', async () => {
    mockProvider.completeWithSchema.mockResolvedValueOnce({
      market: 'BTC/USD', trend: 'bullish', trend_strength: 75,
      key_levels: { support: [48000, 46000], resistance: [52000, 54000] },
      indicators: { rsi: 55, macd: 'bullish_cross', volume_trend: 'increasing' },
      summary: 'BTC showing bullish momentum', confidence: 70,
      evidence: [{ source: 'price_data', content: 'BTC up 2%', confidence: 80 }],
      challenges: ['What could invalidate this uptrend?'],
      warnings: ['RSI nearing overbought'],
    })

    const { TechnicalAnalystAgent } = await import('../../agents/analysts/technical-analyst.js')
    const agent = new TechnicalAnalystAgent(mockProvider as never)
    const result = await agent.analyze(mockContext)

    expect(result.success).toBe(true)
    expect(result.data).toBeDefined()
    expect((result.data as Record<string, unknown>).trend).toBe('bullish')
  })

  it('SentimentAnalystAgent returns structured analysis with evidence', async () => {
    mockProvider.completeWithSchema.mockResolvedValueOnce({
      overall_sentiment: 'neutral', sentiment_score: 10,
      key_signals: ['low volatility'], news_impact: 'neutral',
      fear_greed_estimate: 50, summary: 'Market sentiment is neutral',
      confidence: 65,
      evidence: [{ source: 'social', content: 'neutral chatter', confidence: 60 }],
      warnings: ['Low volume suggests indecision'],
    })

    const { SentimentAnalystAgent } = await import('../../agents/analysts/sentiment-analyst.js')
    const agent = new SentimentAnalystAgent(mockProvider as never)
    const result = await agent.analyze(mockContext)

    expect(result.success).toBe(true)
    expect((result.data as Record<string, unknown>).overall_sentiment).toBe('neutral')
  })
})

describe('Research Agents', () => {
  it('BullResearcherAgent accepts analyst reports', async () => {
    mockProvider.completeWithSchema.mockResolvedValueOnce({
      stance: 'bullish', confidence: 75, summary: 'Bullish case for BTC',
      strongest_bull_case: 'Strong support at 48K', key_thesis: 'Uptrend intact',
      catalyst: ['ETF inflows'], entry_requirements: ['Price above 49K'],
      target_price: '55000', stop_loss_suggestion: '47000',
      challenges_for_bears: ['Momentum is strong'],
    })

    const { BullResearcherAgent } = await import('../../agents/researchers/bull-researcher.js')
    const agent = new BullResearcherAgent(mockProvider as never)
    const result = await agent.analyzeWithData(mockContext, [
      { role: 'technical_analyst', stance: 'bullish', confidence: 70, summary: 'Uptrend' },
    ], '')

    expect(result.success).toBe(true)
    expect((result.data as Record<string, unknown>).stance).toBe('bullish')
  })

  it('BearResearcherAgent accepts analyst reports', async () => {
    mockProvider.completeWithSchema.mockResolvedValueOnce({
      stance: 'bearish', confidence: 60, summary: 'Bearish risks',
      strongest_bear_case: 'Market overbought', key_risks: ['Correction risk'],
      exit_triggers: ['Break below 48K'], challenges_for_bulls: ['No catalyst'],
    })

    const { BearResearcherAgent } = await import('../../agents/researchers/bear-researcher.js')
    const agent = new BearResearcherAgent(mockProvider as never)
    const result = await agent.analyzeWithData(mockContext, [
      { role: 'technical_analyst', stance: 'bullish', confidence: 70, summary: 'Uptrend' },
    ], 'Bull case: Strong momentum')

    expect(result.success).toBe(true)
    expect((result.data as Record<string, unknown>).stance).toBe('bearish')
  })
})

describe('Decision Agents', () => {
  it('TraderAgent returns trade proposal with research', async () => {
    mockProvider.completeWithSchema.mockResolvedValueOnce({
      action: 'buy', reasoning: 'Strong technical setup',
      entry_price: 50000, stop_loss: 48000, take_profit: 54000,
      position_size: '0.1 BTC', position_size_usd: '$5,000',
      leverage: 2, timeframe: '24h', conviction: 75,
      risk_reward_ratio: '1:2',
    })

    const { TraderAgent } = await import('../../agents/trader.js')
    const agent = new TraderAgent(mockProvider as never)
    const result = await agent.analyzeWithResearch(mockContext, 'Bullish research', [
      { role: 'technical_analyst', stance: 'bullish', confidence: 70, summary: 'Uptrend' },
    ])

    expect(result.success).toBe(true)
    expect((result.data as Record<string, unknown>).action).toBe('buy')
  })

  it('PortfolioManagerAgent returns final decision with proposal', async () => {
    mockProvider.completeWithSchema.mockResolvedValueOnce({
      rating: 'buy', conviction: 80,
      executive_summary: 'Approve trade', investment_thesis: 'BTC uptrend strong',
      position_size: '5% of portfolio', entry_price: 50000,
      stop_loss: 48000, take_profit: 54000, leverage: 2,
      timeframe: '24h', risk_adjusted: true,
      lessons_applied: ['Tighter stops'],
      reasoning_chain_summary: 'All analysts agree on bullish direction',
    })

    const { PortfolioManagerAgent } = await import('../../agents/portfolio-manager.js')
    const agent = new PortfolioManagerAgent(mockProvider as never)
    const result = await agent.analyzeWithProposal(mockContext, 'Buy BTC at 50K', 'Bullish research')

    expect(result.success).toBe(true)
    expect((result.data as Record<string, unknown>).rating).toBe('buy')
  })
})

describe('Complete Trading Cycle', () => {
  it('CompleteTradingAgent runs full cycle without errors', async () => {
    mockProvider.completeWithSchema
      .mockResolvedValueOnce({ market: 'BTC/USD', trend: 'bullish', trend_strength: 70, key_levels: { support: [48000], resistance: [52000] }, summary: 'Bullish', confidence: 70 })
      .mockResolvedValueOnce({ overall_sentiment: 'bullish', sentiment_score: 30, key_signals: [], news_impact: 'positive', fear_greed_estimate: 60, summary: 'Positive', confidence: 65 })
      .mockResolvedValueOnce({ market: 'BTC/USD', trend: 'bullish', trend_strength: 65, key_levels: { support: [47500], resistance: [52500] }, summary: 'On-chain bullish', confidence: 60 })
      .mockResolvedValueOnce({ market: 'BTC/USD', trend: 'neutral', trend_strength: 50, key_levels: { support: [47000], resistance: [53000] }, summary: 'Macro neutral', confidence: 55 })
      .mockResolvedValueOnce({ stance: 'bullish', confidence: 70, summary: 'Bull case', strongest_bull_case: 'Technical strength', key_thesis: 'Uptrend', catalyst: [], entry_requirements: [], target_price: '55K', stop_loss_suggestion: '47K', challenges_for_bears: [] })
      .mockResolvedValueOnce({ stance: 'neutral', confidence: 50, summary: 'Neutral bear', strongest_bear_case: 'Overbought', key_risks: [], exit_triggers: [], challenges_for_bulls: [] })
      .mockResolvedValueOnce({ action: 'buy', reasoning: 'Bullish setup', entry_price: 50000, stop_loss: 48000, take_profit: 54000, position_size: '0.1 BTC', position_size_usd: '$5000', leverage: 2, timeframe: '24h', conviction: 70, risk_reward_ratio: '1:2' })
      .mockResolvedValueOnce({ rating: 'buy', conviction: 75, executive_summary: 'Approve', investment_thesis: 'Bull trend', position_size: '5%', entry_price: 50000, stop_loss: 48000, take_profit: 54000, leverage: 2, timeframe: '24h', risk_adjusted: true, lessons_applied: [], reasoning_chain_summary: 'Bullish consensus' })

    const { CompleteTradingAgent } = await import('../../agents/complete-trading-agent.js')
    const agent = new CompleteTradingAgent(mockProvider as never)
    const result = await agent.runFullCycle(mockContext, 'test-agent-id')

    expect(result.cycleId).toBeDefined()
    expect(result.phases.length).toBeGreaterThanOrEqual(4)
    expect(result.finalDecision).toBeDefined()
  })
})

describe('Audit System', () => {
  it('creates and verifies chains', async () => {
    const { auditSystem } = await import('../../audit/audit-system.js')
    auditSystem.clear()

    const chainId = auditSystem.createChain()
    expect(chainId).toBeDefined()

    auditSystem.addReasoningStep({
      agent_role: 'test_analyst',
      input_summary: 'input',
      output_summary: 'output',
      evidence_used: [],
      confidence: 75,
      timestamp: Date.now(),
    })

    const export_ = auditSystem.finalizeChain(chainId)
    expect(export_.chainId).toBe(chainId)
    expect(export_.totalSteps).toBe(1)
    expect(export_.averageConfidence).toBe(75)

    expect(auditSystem.verifyAuditChain().valid).toBe(true)
  })
})

describe('Autonomous Runner', () => {
  it('creates cycle results', async () => {
    mockProvider.completeWithSchema.mockResolvedValue({
      market: 'BTC/USD', trend: 'bullish', trend_strength: 70,
      key_levels: { support: [48000], resistance: [52000] },
      summary: 'Test analysis', confidence: 70,
    })

    const { AutonomousRunner } = await import('../../autonomous/autonomous-runner.js')
    const runner = new AutonomousRunner(mockProvider as never)
    const { TechnicalAnalystAgent } = await import('../../agents/analysts/technical-analyst.js')
    const agent = new TechnicalAnalystAgent(mockProvider as never)
    runner.registerAgent(agent)

    const result = await runner.runCycle(mockContext)
    expect(result.cycleId).toBeDefined()
    expect(result.latencyMs).toBeGreaterThanOrEqual(0)
  })

  it('lifecycle state transitions', async () => {
    const { AutonomousRunner, LifecycleState } = await import('../../autonomous/autonomous-runner.js')
    const runner = new AutonomousRunner(mockProvider as never)
    expect(runner.getState()).toBe(LifecycleState.SLEEPING)
    expect(runner.isRunning()).toBe(false)
  })
})

describe('Event Store', () => {
  it('stores and retrieves events', async () => {
    const { EventStore, EventType } = await import('../../autonomous/event-store.js')
    const store = new EventStore(100, true) // skipWarmup to avoid stale cache
    const agentId = `test-agent-${Date.now()}` // unique per run so DB state is irrelevant

    await store.append(agentId, EventType.CYCLE_START, { cycleId: '123' })
    await store.append(agentId, EventType.CYCLE_END, { cycleId: '123' })
    await store.append(agentId, EventType.ERROR, { error: 'test' })

    const events = await store.getEvents(agentId)
    expect(events.length).toBe(3)
    // Returns newest first (desc sequence)
    expect(events[0]?.type).toBe(EventType.ERROR)
    expect(events[2]?.type).toBe(EventType.CYCLE_START)
  })
})

describe('Debate Orchestrator', () => {
  it('runResearchDebate returns structured result', async () => {
    mockProvider.completeWithSchema
      .mockResolvedValue({ stance: 'bullish', confidence: 70, summary: 'Bullish', reasoning: 'Technical strength', evidence_hashes: [] })
      .mockResolvedValue({ stance: 'bearish', confidence: 60, summary: 'Bearish', reasoning: 'Overbought', evidence_hashes: [] })
      .mockResolvedValue({ stance: 'bullish', confidence: 75, summary: 'Maintain', reasoning: 'Momentum', evidence_hashes: [] })
      .mockResolvedValue({ stance: 'bearish', confidence: 55, summary: 'Cautious', reasoning: 'Risks', evidence_hashes: [] })
      .mockResolvedValue({ stance: 'bullish', confidence: 70, summary: 'Consensus bullish', reasoning: 'Balanced view', evidence_hashes: [] })

    const { DebateOrchestrator } = await import('../../discussion/debate-orchestrator.js')
    const orch = new DebateOrchestrator(mockProvider as never)
    orch.registerDebater({ role: 'technical_analyst', description: 'Technical Analyst', systemPrompt: 'Analyze technicals' })
    orch.registerDebater({ role: 'sentiment_analyst', description: 'Sentiment Analyst', systemPrompt: 'Analyze sentiment' })

    const result = await orch.runResearchDebate(
      'BTC at 50K', 'Bull case: Uptrend', 'Bear case: Overbought',
      [{ role: 'technical', stance: 'bullish', confidence: 70, summary: 'Uptrend' }]
    )

    expect(result.rounds.length).toBeGreaterThanOrEqual(1)
    expect(result.consensus).toBeDefined()
    expect(result.researchPlan).toContain('Research Plan')
  })
})

describe('Learning Engine (DB-dependent - skipped in CI)', () => {
  it.skip('extractPatterns returns pattern matches', async () => {
    const { LearningEngine } = await import('../../learning/learning-engine.js')
    const engine = new LearningEngine(mockProvider as never)
    const patterns = await engine.extractPatterns('test-agent')
    expect(Array.isArray(patterns)).toBe(true)
  })
})
