import axios from "axios";
import type { Agent, Position, FeedEvent, CopyRelation, MemoryEntry, ThinkingTrace } from "./types";

export interface Candle {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

const API_BASE = import.meta.env.VITE_API_URL || "https://trivo-production.up.railway.app";

export const api = axios.create({ baseURL: API_BASE });

api.interceptors.request.use((config) => {
  const token = typeof window !== "undefined" ? localStorage.getItem("privy_token") : null;
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) localStorage.removeItem("privy_token");
    return Promise.reject(err);
  },
);

// Auth
export const authApi = {
  verify: (accessToken: string) =>
    api.post("/api/auth/verify", { accessToken }).then((r) => r.data),
  me: () => api.get("/api/auth/me").then((r) => r.data),
};

// Agents
export const agentsApi = {
  list: () => api.get<{ agents: Agent[]; total: number }>("/api/agents").then((r) => r.data),
  get: (id: string) => api.get<{ agent: Agent }>(`/api/agents/${id}`).then((r) => r.data),
  create: (data: Partial<Agent>) =>
    api.post<{ agent: Agent }>("/api/agents", data).then((r) => r.data),
  update: (id: string, data: Partial<Agent>) =>
    api.put<{ agent: Agent }>(`/api/agents/${id}`, data).then((r) => r.data),
  updateStatus: (id: string, status: string) =>
    api.patch(`/api/agents/${id}/status`, { status }).then((r) => r.data),
};

// Positions
export const positionsApi = {
  list: (params?: Record<string, string>) =>
    api
      .get<{ positions: Position[]; total: number }>("/api/positions", { params })
      .then((r) => r.data),
};

// Feed
export const feedApi = {
  list: (params?: Record<string, string>) =>
    api.get<{ feed: FeedEvent[]; total: number }>("/api/feed", { params }).then((r) => r.data),
};

// Copy Trading
export const copyApi = {
  attach: (data: { followerAgentId: string; targetAgentId: string; allocationBps: number }) =>
    api.post("/api/copy/attach", data).then((r) => r.data),
  detach: (data: { followerAgentId: string; targetAgentId: string }) =>
    api.post("/api/copy/detach", data).then((r) => r.data),
  relations: (agentId: string) =>
    api.get<{ followers: CopyRelation[] }>(`/api/copy/relations/${agentId}`).then((r) => r.data),
};

// Wallets
export const walletsApi = {
  create: (agentId: string) => api.post("/api/wallets/create", { agentId }).then((r) => r.data),
  balance: (agentId: string) =>
    api
      .get<{ balance: string; walletAddress: string | null }>(`/api/wallets/${agentId}/balance`)
      .then((r) => r.data),
  deposit: (agentId: string) =>
    api.get<{ walletAddress: string }>(`/api/wallets/${agentId}/deposit`).then((r) => r.data),
};

// Memory
export const memoryApi = {
  getAgentMemory: (agentId: string, params?: Record<string, string>) =>
    api
      .get<{ memories: MemoryEntry[] }>(`/api/agents/${agentId}/memory`, { params })
      .then((r) => r.data),
  addAgentMemory: (agentId: string, data: { type: string; content: string }) =>
    api.post(`/api/agents/${agentId}/memory`, data).then((r) => r.data),
  traces: (agentId: string, limit = 20) =>
    api
      .get<{ traces: ThinkingTrace[] }>(`/api/agents/${agentId}/traces?limit=${limit}`)
      .then((r) => r.data),
};

// Strategy
export const strategyApi = {
  compile: (text: string) =>
    api.post("/api/strategy/compile", { strategy: text }).then((r) => r.data),
  train: (agentId: string, instruction: string) =>
    api.post("/api/strategy/train", { agentId, instruction }).then((r) => r.data),
};

// Backtest
export const backtestApi = {
  run: (config: Record<string, unknown>) =>
    api.post("/api/backtest/run", config).then((r) => r.data),
};

// PnL
export const pnlApi = {
  agentSummary: (agentId: string) => api.get(`/api/pnl/agents/${agentId}`).then((r) => r.data),
};

export const marketApi = {
  candles: (params: { symbol: string; timeframe: string; limit?: number }) =>
    api
      .get<{
        symbol: string;
        timeframe: string;
        candles: Candle[];
      }>("/api/market/candles", { params })
      .then((r) => r.data),
};

// Transfers (App Kit Send)
export const transferApi = {
  deposit: (agentId: string) => api.get(`/api/transfers/deposit/${agentId}`).then((r) => r.data),
  withdraw: (data: { agentId: string; amount: string; toAddress?: string }) =>
    api.post("/api/transfers/withdraw", data).then((r) => r.data),
  platformSend: (data: { to: string; amount: string }) =>
    api.post("/api/transfers/platform-send", data).then((r) => r.data),
};

// Bridge (App Kit CCTP)
export const bridgeApi = {
  chains: () => api.get("/api/bridge/chains").then((r) => r.data),
  withdraw: (data: { destination: string; amount: string; destinationAddress: string }) =>
    api.post("/api/bridge/withdraw", data).then((r) => r.data),
};

// Unified Balance (Gateway)
export const unifiedApi = {
  balance: (address: string) => api.get(`/api/unified/balance/${address}`).then((r) => r.data),
  deposit: (data: { owner: string; amount: string }) =>
    api.post("/api/unified/deposit", data).then((r) => r.data),
  initiateWithdrawal: (owner?: string) =>
    api.post("/api/unified/initiate-withdrawal", { owner }).then((r) => r.data),
  completeWithdrawal: () => api.post("/api/unified/complete-withdrawal").then((r) => r.data),
  pendingWithdrawal: (owner: string) =>
    api.get(`/api/unified/pending-withdrawal/${owner}`).then((r) => r.data),
};

// Intelligence
export interface AgentDecisionRecord {
  id: string;
  agentId: string;
  action: string;
  calibratedConfidence?: string;
  riskDecision?: string;
  riskReason?: string;
  committeeSummary?: string;
  finalReasoning?: string;
  createdAt?: string;
}

export interface AgentScorecardRecord {
  id: string;
  agentId: string;
  window: string;
  trivoScore?: string;
  winRateScore?: string;
  drawdownScore?: string;
  consistencyScore?: string;
  riskAdjustedScore?: string;
  explanationScore?: string;
  updatedAt?: string;
}

export interface MarketRegimeRecord {
  id: string;
  symbol: string;
  timeframe: string;
  regime: string;
  confidence?: string;
  createdAt?: string;
}

export const intelligenceApi = {
  decisions: (agentId: string) =>
    api
      .get<{ decisions: AgentDecisionRecord[] }>(`/api/intelligence/agents/${agentId}/decisions`)
      .then((r) => r.data),
  scorecard: (agentId: string) =>
    api
      .get<{
        scorecard: AgentScorecardRecord | null;
      }>(`/api/intelligence/agents/${agentId}/scorecard`)
      .then((r) => r.data),
  regimes: (params?: { symbol?: string; timeframe?: string }) =>
    api
      .get<{ regimes: MarketRegimeRecord[] }>("/api/intelligence/market-regimes", { params })
      .then((r) => r.data),
  skillPacks: () =>
    api
      .get<{
        skillPacks: Array<{ slug: string; name: string; description: string }>;
      }>("/api/intelligence/skill-packs")
      .then((r) => r.data),
};

// WebSocket
export function createAgentSocket(agentId: string): WebSocket {
  const wsBase = API_BASE.replace(/^http/, "ws");
  return new WebSocket(`${wsBase}/ws/agent/${agentId}`);
}
