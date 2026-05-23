// Mock data for the AI Agent trading platform
export type Venue = "PERP" | "PREDICTION" | "LP" | "YIELD" | "SPOT";
export type Side = "LONG" | "SHORT" | "YES" | "NO" | "ADD" | "STAKE" | "BUY" | "SELL";

export type Agent = {
  id: string;
  name: string;
  handle: string;
  avatar: string; // emoji or 1-char
  color: string; // hex accent
  owner: string;
  strategy: string;
  venues: Venue[];
  aum: number; // USD
  pnl24h: number; // %
  pnl7d: number; // %
  winRate: number; // %
  followers: number;
  copiers: number;
  trades: number;
  status: "LIVE" | "PAUSED";
};

export type Position = {
  id: string;
  agentId: string;
  venue: Venue;
  market: string; // e.g. BTC-PERP, "Will BTC > 100k by Dec"
  side: Side;
  size: number; // USD notional
  entry: number;
  mark: number;
  leverage?: number;
  pnl: number; // USD
  pnlPct: number; // %
  openedAt: number; // ms
  copies: number; // how many agents copied
};

const now = Date.now();
const m = 60_000;

export const AGENTS: Agent[] = [
  {
    id: "a1",
    name: "Hyperion",
    handle: "hyperion.eth",
    avatar: "◤",
    color: "#00ff9d",
    owner: "0x7a3f…b21c",
    strategy: "Trend-following perp scalper across BTC/ETH/SOL.",
    venues: ["PERP", "SPOT"],
    aum: 184_320,
    pnl24h: 4.21,
    pnl7d: 12.8,
    winRate: 62,
    followers: 4821,
    copiers: 312,
    trades: 1284,
    status: "LIVE",
  },
  {
    id: "a2",
    name: "Oracle-7",
    handle: "oracle7",
    avatar: "▣",
    color: "#a78bfa",
    owner: "0x91c2…44de",
    strategy: "Polymarket arbitrage + sentiment-weighted YES/NO sizing.",
    venues: ["PREDICTION"],
    aum: 92_140,
    pnl24h: -1.18,
    pnl7d: 8.4,
    winRate: 71,
    followers: 2104,
    copiers: 188,
    trades: 412,
    status: "LIVE",
  },
  {
    id: "a3",
    name: "Lattice",
    handle: "lattice.lp",
    avatar: "✦",
    color: "#22d3ee",
    owner: "0x12ab…99f1",
    strategy: "Concentrated Uni v3 LP, auto-rebalance on IL > 2%.",
    venues: ["LP", "YIELD"],
    aum: 421_900,
    pnl24h: 0.62,
    pnl7d: 3.1,
    winRate: 84,
    followers: 6310,
    copiers: 540,
    trades: 88,
    status: "LIVE",
  },
  {
    id: "a4",
    name: "Nightowl",
    handle: "nightowl",
    avatar: "◉",
    color: "#f472b6",
    owner: "0xee01…2c4a",
    strategy: "Asia-session momentum bot, 3x leverage cap.",
    venues: ["PERP"],
    aum: 58_700,
    pnl24h: 6.92,
    pnl7d: -2.4,
    winRate: 54,
    followers: 1820,
    copiers: 96,
    trades: 904,
    status: "LIVE",
  },
  {
    id: "a5",
    name: "Mosaic",
    handle: "mosaic.ai",
    avatar: "❖",
    color: "#fbbf24",
    owner: "0xaa77…ff03",
    strategy: "Multi-strat: yield base + opportunistic perps.",
    venues: ["YIELD", "PERP", "LP"],
    aum: 312_540,
    pnl24h: 1.94,
    pnl7d: 9.7,
    winRate: 68,
    followers: 5102,
    copiers: 401,
    trades: 622,
    status: "LIVE",
  },
  {
    id: "a6",
    name: "Drift-Δ",
    handle: "drift-delta",
    avatar: "Δ",
    color: "#34d399",
    owner: "0x55bd…7711",
    strategy: "Mean-reversion on majors, delta-neutral hedge.",
    venues: ["PERP", "SPOT"],
    aum: 76_200,
    pnl24h: -2.41,
    pnl7d: 4.2,
    winRate: 59,
    followers: 980,
    copiers: 44,
    trades: 1502,
    status: "PAUSED",
  },
];

export const POSITIONS: Position[] = [
  {
    id: "p1",
    agentId: "a1",
    venue: "PERP",
    market: "BTC-PERP",
    side: "LONG",
    size: 42_000,
    entry: 71240,
    mark: 72880,
    leverage: 5,
    pnl: 967,
    pnlPct: 2.3,
    openedAt: now - 14 * m,
    copies: 38,
  },
  {
    id: "p2",
    agentId: "a4",
    venue: "PERP",
    market: "SOL-PERP",
    side: "LONG",
    size: 12_500,
    entry: 198.4,
    mark: 211.2,
    leverage: 3,
    pnl: 803,
    pnlPct: 6.45,
    openedAt: now - 31 * m,
    copies: 22,
  },
  {
    id: "p3",
    agentId: "a2",
    venue: "PREDICTION",
    market: "Fed cuts rates in Dec?",
    side: "YES",
    size: 8_400,
    entry: 0.42,
    mark: 0.51,
    pnl: 1801,
    pnlPct: 21.4,
    openedAt: now - 2 * 60 * m,
    copies: 71,
  },
  {
    id: "p4",
    agentId: "a3",
    venue: "LP",
    market: "ETH/USDC 0.05%",
    side: "ADD",
    size: 120_000,
    entry: 1,
    mark: 1.018,
    pnl: 2160,
    pnlPct: 1.8,
    openedAt: now - 6 * 60 * m,
    copies: 14,
  },
  {
    id: "p5",
    agentId: "a5",
    venue: "YIELD",
    market: "stETH (Lido)",
    side: "STAKE",
    size: 80_000,
    entry: 1,
    mark: 1.0042,
    pnl: 336,
    pnlPct: 0.42,
    openedAt: now - 22 * 60 * m,
    copies: 9,
  },
  {
    id: "p6",
    agentId: "a1",
    venue: "SPOT",
    market: "ETH/USDC",
    side: "BUY",
    size: 18_000,
    entry: 3420,
    mark: 3508,
    pnl: 463,
    pnlPct: 2.57,
    openedAt: now - 48 * m,
    copies: 11,
  },
  {
    id: "p7",
    agentId: "a2",
    venue: "PREDICTION",
    market: "ETH ETF approved by Jan?",
    side: "NO",
    size: 5_200,
    entry: 0.62,
    mark: 0.55,
    pnl: 367,
    pnlPct: 11.3,
    openedAt: now - 4 * 60 * m,
    copies: 28,
  },
  {
    id: "p8",
    agentId: "a6",
    venue: "PERP",
    market: "ETH-PERP",
    side: "SHORT",
    size: 22_000,
    entry: 3540,
    mark: 3508,
    leverage: 2,
    pnl: 199,
    pnlPct: 0.9,
    openedAt: now - 9 * m,
    copies: 4,
  },
  {
    id: "p9",
    agentId: "a4",
    venue: "PERP",
    market: "DOGE-PERP",
    side: "LONG",
    size: 4_400,
    entry: 0.184,
    mark: 0.179,
    leverage: 4,
    pnl: -120,
    pnlPct: -2.7,
    openedAt: now - 3 * m,
    copies: 1,
  },
  {
    id: "p10",
    agentId: "a3",
    venue: "LP",
    market: "WBTC/ETH 0.30%",
    side: "ADD",
    size: 64_000,
    entry: 1,
    mark: 1.011,
    pnl: 704,
    pnlPct: 1.1,
    openedAt: now - 11 * 60 * m,
    copies: 6,
  },
];

export function getAgent(id: string) {
  return AGENTS.find((a) => a.id === id);
}
export function positionsOf(agentId: string) {
  return POSITIONS.filter((p) => p.agentId === agentId);
}

export function fmtUSD(n: number, opts: { compact?: boolean } = {}) {
  if (opts.compact && Math.abs(n) >= 1000) {
    return (
      "$" + Intl.NumberFormat("en", { notation: "compact", maximumFractionDigits: 1 }).format(n)
    );
  }
  return "$" + Intl.NumberFormat("en", { maximumFractionDigits: 2 }).format(n);
}

export function fmtPct(n: number) {
  const s = n >= 0 ? "+" : "";
  return `${s}${n.toFixed(2)}%`;
}

export function timeAgo(ts: number) {
  const s = Math.max(1, Math.floor((Date.now() - ts) / 1000));
  if (s < 60) return `${s}s`;
  const mi = Math.floor(s / 60);
  if (mi < 60) return `${mi}m`;
  const h = Math.floor(mi / 60);
  if (h < 24) return `${h}h`;
  return `${Math.floor(h / 24)}d`;
}

export const VENUE_LABEL: Record<Venue, string> = {
  PERP: "Perpetuals",
  PREDICTION: "Prediction",
  LP: "Liquidity",
  YIELD: "Yield",
  SPOT: "Spot",
};
