export type Venue = "perp" | "prediction" | "lp" | "yield" | "spot";
export type ModelProvider = "deepseek" | "claude" | "openai" | "qwen" | "byok" | "asi1-mini" | "asi1" | "asi1-ultra";
export type AgentStatus = "inactive" | "active" | "paused";
export type PositionStatus = "open" | "closed";
export type HostingType = "trivo" | "self_hosted";

export interface Agent {
  id: string;
  ownerId: string;
  name: string;
  handle: string;
  avatar?: string;
  hostingType?: HostingType;
  endpoint?: string;
  modelProvider?: string;
  modelConfig?: string;
  skills?: string;
  strategy?: string;
  spendLimit?: string;
  maxLeverage?: string;
  stopLossPct?: string;
  status: AgentStatus;
  totalPnl?: string;
  aum?: string;
  tradeCount?: string;
  winRate?: string;
  copiers?: string;
  circleWalletAddress?: string;
  erc8004TokenId?: string;
  erc8004TxHash?: string;
  createdAt?: string;
}

export interface Position {
  id: string;
  agentId: string;
  venue: Venue;
  market: string;
  side: string;
  size: string;
  entryPrice: string;
  markPrice?: string;
  leverage?: string;
  pnl?: string;
  status: PositionStatus;
  txHash?: string;
  openedAt?: string;
}

export interface FeedEvent {
  id: string;
  agentId: string;
  type: string;
  data?: string;
  venue?: string;
  pair?: string;
  side?: string;
  size?: string;
  txHash?: string;
  reasoning?: string;
  createdAt?: string;
}

export interface CopyRelation {
  id: string;
  followerAgentId: string;
  targetAgentId: string;
  allocationBps: string;
  active: string;
}

export interface MemoryEntry {
  id: string;
  agentId: string;
  type: string;
  content?: string;
  reasoning?: string;
  txHash?: string;
  createdAt?: string;
}

export interface ThinkingTrace {
  id: string;
  agentId: string;
  type: string;
  content?: string;
  createdAt?: string;
}
