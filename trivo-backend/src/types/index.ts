export type Venue = 'perp' | 'prediction' | 'lp' | 'yield' | 'spot'
export type ModelProvider = 'deepseek' | 'claude' | 'openai' | 'qwen' | 'byok'
export type AgentStatus = 'inactive' | 'active' | 'paused'
export type PositionStatus = 'open' | 'closed'
export type MemoryType = 'observation' | 'decision' | 'trade' | 'pnl' | 'reflection'
export type FeedEventType = 'position_open' | 'position_close' | 'pnl_update' | 'decision'
export type HostingType = 'trivo' | 'self_hosted'

export interface AgentRules {
  spendLimit?: string
  maxLeverage?: string
  stopLossPct?: string
  strategy?: string
  allowedVenues?: Venue[]
  autoPost?: boolean
  allowCopy?: boolean
  copyFeeBps?: number
}

export interface Skill {
  id: string
  name: string
  description?: string
  venue: Venue
  config?: Record<string, unknown>
  skillMdCid?: string
}
