import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, Copy, UserPlus, TrendingUp, TrendingDown, Zap } from "lucide-react";
import { useState, useMemo } from "react";
import { toast } from "sonner";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { AgentChat } from "@/components/AgentChat";
import { AgentChart } from "@/components/AgentChart";
import { AgentWalletCard } from "@/components/AgentWalletCard";
import { useAgent } from "@/hooks/useAgents";
import { usePositions } from "@/hooks/usePositions";
import { useAgentPnl } from "@/hooks/usePortfolioPnl";
import { useWebSocket } from "@/hooks/useWebSocket";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useMarketCandles } from "@/hooks/useMarketCandles";
import { useAgentDecisions, useAgentScorecard, useMarketRegimes } from "@/hooks/useIntelligence";
import { useThinkingTraces } from "@/hooks/useMemory";
import { fmtUSD, timeAgo } from "@/lib/utils";

interface TradeHistoryItem {
  id: string;
  closedAt?: string;
  openedAt?: string;
  markPrice?: string;
  entryPrice?: string;
  status?: string;
  side?: string;
  pnl?: string;
  reasoning?: string;
  size?: string;
  market?: string;
  venue?: string;
}

export const Route = createFileRoute("/agent/$id")({
  component: AgentDetail,
  notFoundComponent: () => (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <h1 className="font-display text-2xl font-bold mb-2">Agent Not Found</h1>
      <Link to="/discover" className="text-neon hover:underline text-sm">
        Back to Discover
      </Link>
    </div>
  ),
});

function AgentDetail() {
  const { id } = Route.useParams();
  const { data: agentData, isLoading } = useAgent(id);
  const { positions } = usePositions(id);
  const { data: pnlData } = useAgentPnl(id);
  const { lastEvent } = useWebSocket(id);
  const agent = agentData?.agent;
  const [following, setFollowing] = useState(false);
  const [copyAll, setCopyAll] = useState(false);
  const [timeframe, setTimeframe] = useState("4h");

  const { data: history } = useQuery({
    queryKey: ["trade-history", id],
    queryFn: () => api.get(`/api/positions/history/${id}`).then((r) => r.data),
    enabled: !!id,
  });

  const primarySymbol = history?.trades?.[0]?.market || positions?.[0]?.market || "BTC/USD";
  const candles = useMarketCandles(primarySymbol, timeframe, 160);
  const decisionsQuery = useAgentDecisions(id);
  const scorecardQuery = useAgentScorecard(id);
  const regimeQuery = useMarketRegimes(primarySymbol, "1h");
  const thinkingQuery = useThinkingTraces(id);

  // ── Derived stats from trade history ────────────────────────────────────────
  const tradeStats = useMemo(() => {
    const trades: TradeHistoryItem[] = history?.trades || [];
    const closed = trades.filter((t) => t.status === "closed" || t.closedAt);
    const longs = closed.filter((t) =>
      ["long", "yes", "add", "buy"].includes((t.side || "").toLowerCase()),
    );
    const shorts = closed.filter(
      (t) => !["long", "yes", "add", "buy"].includes((t.side || "").toLowerCase()),
    );
    const wins = closed.filter((t) => Number(t.pnl || 0) > 0);
    const longWins = longs.filter((t) => Number(t.pnl || 0) > 0);
    const shortWins = shorts.filter((t) => Number(t.pnl || 0) > 0);
    return {
      total: closed.length,
      overallWinRate: closed.length ? (wins.length / closed.length) * 100 : 0,
      longWinRate: longs.length ? (longWins.length / longs.length) * 100 : 0,
      shortWinRate: shorts.length ? (shortWins.length / shorts.length) * 100 : 0,
      longPct: closed.length ? (longs.length / closed.length) * 100 : 0,
      shortPct: closed.length ? (shorts.length / closed.length) * 100 : 0,
    };
  }, [history?.trades]);

  // ── Cumulative PnL chart data ────────────────────────────────────────────────
  const cumulativePnlData = useMemo(() => {
    const trades: TradeHistoryItem[] = (history?.trades || [])
      .filter((t: TradeHistoryItem) => t.closedAt || Number(t.pnl || 0) !== 0)
      .sort(
        (a: TradeHistoryItem, b: TradeHistoryItem) =>
          new Date(a.openedAt || 0).getTime() - new Date(b.openedAt || 0).getTime(),
      );
    let cum = 0;
    return trades.map((t: TradeHistoryItem) => {
      cum += Number(t.pnl || 0);
      const d = new Date(t.closedAt || t.openedAt || Date.now());
      return {
        date: d.toLocaleDateString("en-US", { month: "2-digit", day: "2-digit" }),
        pnl: Math.round(cum * 100) / 100,
      };
    });
  }, [history?.trades]);

  if (isLoading) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-20">
        <div className="animate-pulse space-y-6">
          <div className="h-8 w-48 bg-surface-2 rounded" />
          <div className="h-20 w-full bg-surface-2 rounded-lg" />
        </div>
      </div>
    );
  }
  if (!agent) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <h1 className="font-display text-2xl font-bold mb-2">Agent Not Found</h1>
        <Link to="/discover" className="text-neon hover:underline text-sm">
          Back to Discover
        </Link>
      </div>
    );
  }

  const realized = Number(agent.totalPnl || 0);
  const unrealized = pnlData?.unrealizedPnl || 0;
  const totalPnl = realized + unrealized;
  const aum = Number(agent.aum || 0);
  const roi = aum > 0 ? (realized / aum) * 100 : 0;
  const maxPnl = cumulativePnlData.length
    ? Math.max(...cumulativePnlData.map((d) => d.pnl), 0)
    : 0;
  const winRate = Number(agent.winRate || 0);
  const trades = Number(agent.tradeCount || 0);
  const copiers = Number(agent.copiers || 0);
  const skills = (agent.skills || "perp").split(",").map((s: string) => s.trim());
  const isActive = agent.status === "active";
  const isPnlPositive = totalPnl >= 0;

  return (
    <div>
      {/* ── Hero Header ──────────────────────────────────────────────────────── */}
      <div className="relative border-b border-border bg-grid bg-hero">
        <div
          className="absolute inset-0 opacity-40"
          style={{
            background:
              "radial-gradient(ellipse 60% 80% at 20% 0%, var(--neon)33, transparent 70%)",
          }}
        />
        <div className="relative mx-auto max-w-6xl px-4 py-8">
          <Link
            to="/feed"
            className="ticker mb-4 inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-3 w-3" /> back to feed
          </Link>

          <div className="flex flex-wrap items-start gap-4 sm:gap-6">
            <div className="flex h-16 w-16 sm:h-20 sm:w-20 items-center justify-center rounded-xl border border-neon/30 bg-surface-2 font-display text-3xl sm:text-4xl font-bold text-neon">
              {agent.name?.[0] || "?"}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="font-display text-2xl sm:text-3xl font-bold">{agent.name}</h1>
                <Badge
                  variant="outline"
                  className={`ticker text-[10px] ${isActive ? "border-neon/40 text-neon" : "border-amber-400/40 text-amber-400"}`}
                >
                  <span
                    className={`h-1.5 w-1.5 rounded-full mr-1.5 inline-block ${isActive ? "bg-neon animate-pulse" : "bg-amber-400"}`}
                  />
                  {agent.status?.toUpperCase() || "INACTIVE"}
                </Badge>
              </div>
              <div className="ticker mt-1 text-sm text-muted-foreground">
                @{agent.handle || "agent"} · {agent.modelProvider || "ASI1"} · Arc Testnet
              </div>
              <p className="mt-3 max-w-2xl text-sm text-foreground/90">
                {agent.strategy || "AI trading agent running on Trivo"}
              </p>
              <div className="mt-3 flex flex-wrap gap-1.5">
                {skills.map((s: string) => (
                  <Badge
                    key={s}
                    variant="outline"
                    className="ticker text-[10px] border-border bg-surface-2/60"
                  >
                    {s}
                  </Badge>
                ))}
              </div>
            </div>
            <div className="flex w-full flex-row gap-2 sm:w-auto sm:flex-col">
              <Button
                onClick={() => {
                  setCopyAll(true);
                  toast.success(`Copy-trading ${agent.name}`);
                }}
                disabled={copyAll}
                className="flex-1 bg-neon text-primary-foreground hover:bg-neon/90 disabled:bg-muted"
              >
                <Copy className="mr-2 h-4 w-4" />
                {copyAll ? "Copy-trading" : "Copy"}
              </Button>
              <Button
                variant="outline"
                onClick={() => setFollowing((f) => !f)}
                className={following ? "border-violet text-violet" : "border-border"}
              >
                <UserPlus className="mr-2 h-4 w-4" />
                {following ? "Following" : "Follow"}
              </Button>
            </div>

            {agent.circleWalletAddress && (
              <div className="mt-4">
                <AgentWalletCard
                  agentId={agent.id}
                  agentName={agent.name || "Agent"}
                  walletAddress={agent.circleWalletAddress}
                />
              </div>
            )}
          </div>

          {lastEvent && (
            <div className="mt-3 rounded border border-neon/20 bg-neon/5 px-3 py-1.5 text-[11px] text-neon/80 ticker flex items-center gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-neon animate-pulse flex-shrink-0" />
              <span className="uppercase tracking-widest text-muted-foreground/60">
                {lastEvent.event}:
              </span>
              <span>
                {lastEvent.content
                  ? lastEvent.content.length > 120
                    ? lastEvent.content.slice(0, 120) + "…"
                    : lastEvent.content
                  : lastEvent.result
                    ? JSON.stringify(lastEvent.result).slice(0, 120)
                    : ""}
              </span>
            </div>
          )}

          {/* Quick stats bar */}
          <div className="mt-6 grid grid-cols-2 gap-px overflow-hidden rounded-xl border border-border bg-border sm:grid-cols-4">
            <Stat
              label="Total PnL"
              value={`${totalPnl >= 0 ? "+" : ""}${fmtUSD(totalPnl)}`}
              positive={totalPnl >= 0}
            />
            <Stat label="Win Rate" value={`${winRate.toFixed(1)}%`} positive={winRate >= 50} />
            <Stat label="Trades" value={trades.toLocaleString()} />
            <Stat label="Copiers" value={copiers.toLocaleString()} />
          </div>
        </div>
      </div>

      {/* ── Main Content ──────────────────────────────────────────────────────── */}
      <div className="mx-auto max-w-6xl px-4 py-8 space-y-6">
        {/* Chart */}
        <AgentChart
          pair={primarySymbol}
          candles={candles.data?.candles ?? []}
          trades={(history?.trades || [])
            .map((t: TradeHistoryItem) => ({
              id: t.id,
              time: t.closedAt
                ? Math.floor(new Date(t.closedAt).getTime() / 1000)
                : t.openedAt
                  ? Math.floor(new Date(t.openedAt).getTime() / 1000)
                  : Math.floor(Date.now() / 1000),
              price: Number(t.markPrice || t.entryPrice) || 0,
              type: t.status === "open" ? "entry" : "close",
              side: t.side || "long",
              pnl: Number(t.pnl || 0),
              reasoning: t.reasoning,
              size: Number(t.size || 0),
            }))
            .reverse()}
          timeframe={timeframe}
          onTimeframeChange={setTimeframe}
          height={400}
          isLoading={candles.isLoading}
        />

        {/* ── Performance Stats ────────────────────────────────────────────── */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <PerfCard
            icon={<TrendingUp className="h-4 w-4" />}
            label="ROI"
            sublabel="Return Relative To Initial Fund"
            value={`${roi >= 0 ? "+" : ""}${roi.toFixed(2)}%`}
            positive={roi >= 0}
          />
          <PerfCard
            icon={<TrendingDown className="h-4 w-4" />}
            label="Realized PnL"
            sublabel="Total Realized Profit & Loss"
            value={`${realized >= 0 ? "+" : "-"}${fmtUSD(Math.abs(realized), { compact: true })}`}
            positive={realized >= 0}
          />
          <PerfCard
            icon={<Zap className="h-4 w-4" />}
            label="Max PnL"
            sublabel="Peak Profit Achieved"
            value={`+${fmtUSD(maxPnl, { compact: true })}`}
            positive={true}
          />
        </div>

        {/* ── Win Rate Stats ───────────────────────────────────────────────── */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <WinRateCard
            label="Overall Win Rate"
            sublabel="Trade Success Metrics"
            value={tradeStats.overallWinRate}
            barColor="green"
          />
          <WinRateCard
            label="Long Win Rate"
            sublabel="Trade Success Metrics"
            value={tradeStats.longWinRate}
            barColor="green"
          />
          <WinRateCard
            label="Short Win Rate"
            sublabel="Trade Success Metrics"
            value={tradeStats.shortWinRate}
            barColor="red"
          />
          <LongShortRatioCard
            longPct={tradeStats.longPct}
            shortPct={tradeStats.shortPct}
          />
        </div>

        {/* ── Current Positions ────────────────────────────────────────────── */}
        <div className="rounded-xl border border-border bg-card overflow-hidden">
          <div className="px-5 py-3.5 border-b border-border">
            <h3 className="font-display text-sm font-semibold">Current Positions</h3>
          </div>
          {positions.length === 0 ? (
            <div className="px-5 py-12 text-center text-sm text-muted-foreground">
              No positions found.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-surface-2/40">
                    <Th>Symbol</Th>
                    <Th>Side</Th>
                    <Th>Position Size</Th>
                    <Th>Liq Price</Th>
                    <Th>Entry Price</Th>
                    <Th align="right">PnL</Th>
                  </tr>
                </thead>
                <tbody>
                  {positions.map((pos) => {
                    const posPnl = Number(pos.pnl || 0);
                    const isLong = ["long", "yes", "buy"].includes(
                      (pos.side || "").toLowerCase(),
                    );
                    const liqPrice = isLong
                      ? Number(pos.entryPrice || 0) * (1 - 1 / Math.max(Number(pos.leverage || 1), 1))
                      : Number(pos.entryPrice || 0) * (1 + 1 / Math.max(Number(pos.leverage || 1), 1));
                    return (
                      <tr key={pos.id} className="border-b border-border/50 hover:bg-surface-2/30 transition-colors">
                        <Td>
                          <span className="font-display font-medium">{pos.market}</span>
                        </Td>
                        <Td>
                          <SideBadge side={pos.side || "long"} />
                        </Td>
                        <Td>
                          <span className="font-mono">
                            {fmtUSD(Number(pos.size || 0) * Number(pos.entryPrice || 0))}
                          </span>
                        </Td>
                        <Td>
                          <span className="font-mono text-loss">
                            {fmtUSD(liqPrice)}
                          </span>
                        </Td>
                        <Td>
                          <span className="font-mono">{fmtUSD(Number(pos.entryPrice || 0))}</span>
                        </Td>
                        <td className="px-4 py-3 text-right">
                          <span
                            className={`font-display font-semibold ${posPnl >= 0 ? "text-neon" : "text-loss"}`}
                          >
                            {posPnl >= 0 ? "+" : ""}
                            {fmtUSD(posPnl)}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* ── Trade History ────────────────────────────────────────────────── */}
        <div className="rounded-xl border border-border bg-card overflow-hidden">
          <div className="flex items-center justify-between px-5 py-3.5 border-b border-border">
            <h3 className="font-display text-sm font-semibold">Trade History</h3>
            <span className="ticker text-xs text-muted-foreground">
              {history?.totalTrades || tradeStats.total} trades
            </span>
          </div>
          {!history?.trades?.length ? (
            <div className="px-5 py-12 text-center text-sm text-muted-foreground">
              No trade history yet.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-surface-2/40">
                    <Th>Time</Th>
                    <Th>Pair</Th>
                    <Th>Action</Th>
                    <Th>Side</Th>
                    <Th>Open</Th>
                    <Th>Close</Th>
                    <Th align="right">PnL</Th>
                  </tr>
                </thead>
                <tbody>
                  {history.trades.map((t: TradeHistoryItem) => {
                    const pnlNum = Number(t.pnl || 0);
                    const isProfit = pnlNum >= 0;
                    const action = t.status === "open" ? "OPEN" : isProfit ? "TP" : "SL";
                    const closeDate = new Date(t.closedAt || t.openedAt || Date.now());
                    return (
                      <tr
                        key={t.id}
                        className="border-b border-border/50 hover:bg-surface-2/30 transition-colors"
                      >
                        <Td>
                          <span className="ticker text-xs text-muted-foreground whitespace-nowrap">
                            {closeDate.toLocaleDateString("en-US", {
                              month: "2-digit",
                              day: "2-digit",
                            })}{" "}
                            {closeDate.toLocaleTimeString("en-US", {
                              hour: "2-digit",
                              minute: "2-digit",
                              hour12: false,
                            })}
                          </span>
                        </Td>
                        <Td>
                          <span className="font-display font-medium">
                            {t.market || "BTC/USDC"}
                          </span>
                        </Td>
                        <Td>
                          <ActionBadge action={action} />
                        </Td>
                        <Td>
                          <SideBadge side={t.side || "long"} />
                        </Td>
                        <Td>
                          <span className="font-mono">
                            {fmtUSD(Number(t.entryPrice || 0))}
                          </span>
                        </Td>
                        <Td>
                          <span className="font-mono">
                            {fmtUSD(Number(t.markPrice || t.entryPrice || 0))}
                          </span>
                        </Td>
                        <td className="px-4 py-3 text-right">
                          <span
                            className={`font-display font-semibold ${isProfit ? "text-neon" : "text-loss"}`}
                          >
                            {isProfit ? "+" : ""}
                            {fmtUSD(pnlNum)}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* ── Total P&L Chart ──────────────────────────────────────────────── */}
        <div className="rounded-xl border border-border bg-card p-5">
          <div className="mb-4">
            <div className="ticker text-xs text-muted-foreground uppercase tracking-widest mb-1">
              Total P&amp;L
            </div>
            <div className="flex items-baseline gap-3">
              <span
                className={`font-display text-2xl font-bold ${isPnlPositive ? "text-neon" : "text-loss"}`}
              >
                {isPnlPositive ? "+" : ""}
                {fmtUSD(totalPnl)}
              </span>
              {roi !== 0 && (
                <span
                  className={`ticker text-sm font-semibold flex items-center gap-1 ${roi >= 0 ? "text-neon" : "text-loss"}`}
                >
                  <TrendingUp className="h-3.5 w-3.5" />
                  {roi >= 0 ? "+" : ""}
                  {roi.toFixed(2)}%
                </span>
              )}
            </div>
          </div>
          {cumulativePnlData.length > 1 ? (
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={cumulativePnlData} margin={{ top: 4, right: 0, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="pnlGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#22c55e" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(39,39,42,0.5)" vertical={false} />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 10, fill: "#71717a", fontFamily: "monospace" }}
                  tickLine={false}
                  axisLine={false}
                  interval="preserveStartEnd"
                />
                <YAxis
                  tick={{ fontSize: 10, fill: "#71717a", fontFamily: "monospace" }}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(v: number) =>
                    v >= 1000 ? `$${(v / 1000).toFixed(1)}K` : `$${v}`
                  }
                  width={52}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#09090b",
                    border: "1px solid #27272a",
                    borderRadius: "8px",
                    padding: "8px 12px",
                    fontSize: "12px",
                  }}
                  labelStyle={{ color: "#71717a", marginBottom: 4 }}
                  formatter={(v: number) => [
                    <span
                      key="v"
                      style={{ color: v >= 0 ? "#22c55e" : "#ef4444", fontWeight: 600 }}
                    >
                      {v >= 0 ? "+" : ""}
                      {fmtUSD(v)}
                    </span>,
                    "Cumulative PnL",
                  ]}
                />
                <Area
                  type="monotone"
                  dataKey="pnl"
                  stroke="#22c55e"
                  strokeWidth={2}
                  fill="url(#pnlGrad)"
                  dot={false}
                  activeDot={{ r: 4, fill: "#22c55e", stroke: "#09090b", strokeWidth: 2 }}
                />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-[200px] text-sm text-muted-foreground">
              Not enough trade data to render chart.
            </div>
          )}
        </div>

        {/* ── Tabs: Train · Intelligence · Settings ────────────────────────── */}
        <Tabs defaultValue="chat" className="w-full">
          <TabsList className="bg-surface-2">
            <TabsTrigger value="chat">Train Agent</TabsTrigger>
            <TabsTrigger value="intelligence">Intelligence</TabsTrigger>
            <TabsTrigger value="settings">Settings</TabsTrigger>
          </TabsList>

          <TabsContent value="chat" className="mt-4">
            <AgentChat agentId={id} agentName={agent.name} />
          </TabsContent>

          <TabsContent value="intelligence" className="mt-4">
            <div className="grid gap-4 md:grid-cols-3">
              <div className="rounded-lg border border-border bg-card p-4">
                <div className="ticker text-[10px] uppercase tracking-widest text-muted-foreground">
                  Latest Decision
                </div>
                <div className="mt-2 font-display text-lg font-semibold">
                  {decisionsQuery.data?.decisions?.[0]?.action?.toUpperCase() ?? "WAITING"}
                </div>
                <p className="mt-2 text-xs text-muted-foreground">
                  {decisionsQuery.data?.decisions?.[0]?.committeeSummary ??
                    "No committee decision recorded yet."}
                </p>
              </div>
              <div className="rounded-lg border border-border bg-card p-4">
                <div className="ticker text-[10px] uppercase tracking-widest text-muted-foreground">
                  Risk Status
                </div>
                <div className="mt-2 font-display text-lg font-semibold">
                  {decisionsQuery.data?.decisions?.[0]?.riskDecision?.toUpperCase() ?? "UNKNOWN"}
                </div>
                <p className="mt-2 text-xs text-muted-foreground">
                  {decisionsQuery.data?.decisions?.[0]?.riskReason ??
                    "Risk Constitution has not evaluated this agent yet."}
                </p>
              </div>
              <div className="rounded-lg border border-border bg-card p-4">
                <div className="ticker text-[10px] uppercase tracking-widest text-muted-foreground">
                  Trivo Score
                </div>
                <div className="mt-2 font-display text-lg font-semibold text-neon">
                  {scorecardQuery.data?.scorecard?.trivoScore ?? "—"}
                </div>
                <p className="mt-2 text-xs text-muted-foreground">
                  Regime: {regimeQuery.data?.regimes?.[0]?.regime ?? "waiting"}
                </p>
              </div>
            </div>
            <div className="mt-4">
              <div className="ticker mb-3 text-[10px] uppercase tracking-widest text-muted-foreground">
                Agent Reasoning
              </div>
              {thinkingQuery.isLoading ? (
                <div className="space-y-2">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="h-12 animate-pulse rounded bg-surface-2" />
                  ))}
                </div>
              ) : thinkingQuery.data?.traces?.length ? (
                <div className="space-y-2">
                  {thinkingQuery.data.traces.slice(0, 5).map((t) => (
                    <div key={t.id} className="rounded border border-border bg-card p-3">
                      <div className="flex items-center justify-between mb-1">
                        <span className="ticker text-[10px] uppercase tracking-widest text-neon">
                          {t.type}
                        </span>
                        <span className="text-[10px] text-muted-foreground">
                          {t.createdAt ? timeAgo(new Date(t.createdAt).getTime()) : ""}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground/80 line-clamp-2">
                        {t.content || "—"}
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-muted-foreground">
                  No reasoning traces yet — agent will generate them on next cycle.
                </p>
              )}
            </div>
          </TabsContent>

          <TabsContent value="settings" className="mt-4">
            <div className="rounded-lg border border-border bg-card p-6">
              <h3 className="font-display font-semibold mb-4">Agent Configuration</h3>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">Model:</span>{" "}
                  {agent.modelProvider || "ASI1"}
                </div>
                <div>
                  <span className="text-muted-foreground">Status:</span>{" "}
                  {agent.status || "inactive"}
                </div>
                <div>
                  <span className="text-muted-foreground">Max Leverage:</span>{" "}
                  {agent.maxLeverage || "5"}x
                </div>
                <div>
                  <span className="text-muted-foreground">Stop Loss:</span>{" "}
                  {agent.stopLossPct || "10"}%
                </div>
                <div>
                  <span className="text-muted-foreground">Spend Limit:</span> $
                  {agent.spendLimit || "100"}
                </div>
                <div>
                  <span className="text-muted-foreground">Skills:</span> {agent.skills || "perp"}
                </div>
                {agent.erc8004TokenId && (
                  <div className="col-span-2">
                    <span className="text-muted-foreground">ERC-8004:</span> Agent #
                    {agent.erc8004TokenId}{" "}
                    {agent.erc8004TxHash && (
                      <a
                        href={`https://testnet.arcscan.app/tx/${agent.erc8004TxHash}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="ml-2 text-violet hover:underline ticker text-xs"
                      >
                        Arcscan ↗
                      </a>
                    )}
                  </div>
                )}
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

// ── Sub-components ─────────────────────────────────────────────────────────────

function Stat({ label, value, positive }: { label: string; value: string; positive?: boolean }) {
  return (
    <div className="bg-card p-4">
      <div className="ticker text-[10px] uppercase tracking-widest text-muted-foreground">
        {label}
      </div>
      <div
        className={`ticker mt-1 text-lg font-semibold ${positive === undefined ? "" : positive ? "text-neon" : "text-loss"}`}
      >
        {value}
      </div>
    </div>
  );
}

function PerfCard({
  icon,
  label,
  sublabel,
  value,
  positive,
}: {
  icon: React.ReactNode;
  label: string;
  sublabel: string;
  value: string;
  positive?: boolean;
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <div className="flex items-center gap-2 mb-3">
        <div className="flex h-7 w-7 items-center justify-center rounded-full bg-neon/15 text-neon">
          {icon}
        </div>
        <div>
          <div className="font-display text-sm font-semibold">{label}</div>
          <div className="ticker text-[10px] text-muted-foreground">{sublabel}</div>
        </div>
      </div>
      <div
        className={`font-display text-2xl font-bold ${positive === undefined ? "" : positive ? "text-neon" : "text-loss"}`}
      >
        {value}
      </div>
    </div>
  );
}

function WinRateCard({
  label,
  sublabel,
  value,
  barColor,
}: {
  label: string;
  sublabel: string;
  value: number;
  barColor: "green" | "red";
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <div className="font-display text-sm font-semibold mb-0.5">{label}</div>
      <div className="ticker text-[10px] text-muted-foreground mb-3">{sublabel}</div>
      <div
        className={`font-display text-2xl font-bold mb-3 ${barColor === "green" ? "text-neon" : "text-loss"}`}
      >
        {value.toFixed(2)}%
      </div>
      <div className="h-1 w-full rounded-full bg-border overflow-hidden">
        <div
          className={`h-full rounded-full transition-all ${barColor === "green" ? "bg-neon" : "bg-loss"}`}
          style={{ width: `${Math.min(value, 100)}%` }}
        />
      </div>
    </div>
  );
}

function LongShortRatioCard({ longPct, shortPct }: { longPct: number; shortPct: number }) {
  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <div className="font-display text-sm font-semibold mb-0.5">Long / Short Ratio</div>
      <div className="ticker text-[10px] text-muted-foreground mb-3">Trade Success Metrics</div>
      <div className="font-display text-2xl font-bold mb-3 flex items-center gap-1">
        <span className="text-neon">{longPct.toFixed(0)}%</span>
        <span className="text-muted-foreground text-lg">/</span>
        <span className="text-loss">{shortPct.toFixed(0)}%</span>
      </div>
      <div className="h-1 w-full rounded-full bg-border overflow-hidden flex">
        <div
          className="h-full bg-neon transition-all"
          style={{ width: `${Math.min(longPct, 100)}%` }}
        />
        <div
          className="h-full bg-loss transition-all"
          style={{ width: `${Math.min(shortPct, 100)}%` }}
        />
      </div>
    </div>
  );
}

function Th({ children, align = "left" }: { children: React.ReactNode; align?: "left" | "right" }) {
  return (
    <th
      className={`px-4 py-2.5 ticker text-[10px] uppercase tracking-widest text-muted-foreground font-medium text-${align}`}
    >
      {children}
    </th>
  );
}

function Td({ children }: { children: React.ReactNode }) {
  return <td className="px-4 py-3">{children}</td>;
}

function ActionBadge({ action }: { action: string }) {
  if (action === "TP")
    return (
      <span className="inline-flex items-center justify-center h-5 w-8 rounded text-[10px] font-bold ticker bg-neon/15 text-neon border border-neon/30">
        TP
      </span>
    );
  if (action === "SL")
    return (
      <span className="inline-flex items-center justify-center h-5 w-8 rounded text-[10px] font-bold ticker bg-loss/15 text-loss border border-loss/30">
        SL
      </span>
    );
  return (
    <span className="inline-flex items-center justify-center h-5 px-1.5 rounded text-[10px] font-bold ticker bg-surface-2 text-muted-foreground border border-border">
      OPEN
    </span>
  );
}

function SideBadge({ side }: { side: string }) {
  const isLong = ["long", "yes", "add", "buy"].includes(side.toLowerCase());
  const label = isLong ? "Buy" : "Sell";
  return (
    <span
      className={`inline-flex items-center justify-center h-5 px-2 rounded text-[10px] font-bold ticker ${
        isLong
          ? "bg-neon/15 text-neon border border-neon/30"
          : "bg-loss/15 text-loss border border-loss/30"
      }`}
    >
      {label}
    </span>
  );
}
