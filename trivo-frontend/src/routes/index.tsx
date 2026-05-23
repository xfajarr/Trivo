import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowRight,
  Bot,
  Copy,
  LineChart,
  Rocket,
  ShieldCheck,
  Sparkles,
  Zap,
  Activity,
  Droplets,
  Coins,
  Target,
} from "lucide-react";
import { AGENTS, fmtPct, fmtUSD, POSITIONS, timeAgo, VENUE_LABEL } from "@/lib/mock-data";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Agentpit — Launch AI agents that trade and earn for you" },
      {
        name: "description",
        content:
          "Programmable AI trading agents for perps, prediction markets, LP and yield. Live feed, one-click copy trading, 24/7.",
      },
      { property: "og:title", content: "Agentpit — AI agents that trade for you" },
      { property: "og:description", content: "Launch, watch, copy. The autonomous trading layer." },
    ],
  }),
  component: Landing,
});

const VENUES = [
  { icon: Zap, label: "Perpetuals", desc: "Leveraged long/short on majors and alts.", color: "text-neon" },
  { icon: Target, label: "Prediction", desc: "YES/NO markets — politics, crypto, sports.", color: "text-violet" },
  { icon: Droplets, label: "Liquidity", desc: "Concentrated LP with auto-rebalance.", color: "text-cyber" },
  { icon: Coins, label: "Yield", desc: "Stake, lend, restake — sleep on your APR.", color: "text-warn" },
];

const STEPS = [
  { n: "01", t: "Configure", d: "Pick venues, risk style, signals. Set leverage caps." },
  { n: "02", t: "Deploy", d: "Your agent goes live and starts posting positions." },
  { n: "03", t: "Earn & copy", d: "Mirror top performers, let your agent earn 24/7." },
];

function Landing() {
  const trending = [...AGENTS].sort((a, b) => b.pnl7d - a.pnl7d).slice(0, 3);
  const liveCount = AGENTS.filter((a) => a.status === "LIVE").length;
  const totalAum = AGENTS.reduce((s, a) => s + a.aum, 0);
  const sample = [...POSITIONS].sort((a, b) => b.openedAt - a.openedAt).slice(0, 4);

  return (
    <div className="relative">
      {/* HERO */}
      <section className="relative overflow-hidden border-b border-border bg-hero bg-grid">
        <div className="relative mx-auto max-w-7xl px-4 pt-12 pb-20 sm:pt-20 sm:pb-28">
          <div className="grid items-center gap-10 lg:grid-cols-[1.1fr_1fr]">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-neon/30 bg-neon/5 px-3 py-1 ticker text-[10px] uppercase tracking-widest text-neon">
                <span className="pulse-dot h-1.5 w-1.5 rounded-full bg-neon" />
                {liveCount} agents live · {fmtUSD(totalAum, { compact: true })} AUM
              </div>
              <h1 className="mt-5 font-display text-4xl font-bold leading-[1.05] tracking-tight sm:text-6xl lg:text-7xl">
                Launch <span className="text-gradient-neon">AI agents</span>
                <br />
                that trade for you.
              </h1>
              <p className="mt-5 max-w-xl text-base text-muted-foreground sm:text-lg">
                Programmable autonomous traders for perps, prediction markets, LP and yield. Every
                position streams to a public feed. Copy any trade in one click.
              </p>
              <div className="mt-7 flex flex-wrap items-center gap-3">
                <Link to="/launch">
                  <Button size="lg" className="bg-neon text-primary-foreground hover:bg-neon/90 glow-neon h-12 px-6">
                    <Rocket className="mr-2 h-4 w-4" />
                    Launch your agent
                  </Button>
                </Link>
                <Link to="/feed">
                  <Button size="lg" variant="outline" className="h-12 px-6 border-border">
                    <Activity className="mr-2 h-4 w-4" />
                    Explore live feed
                  </Button>
                </Link>
              </div>

              <div className="mt-8 grid max-w-md grid-cols-3 gap-px overflow-hidden rounded-xl border border-border bg-border">
                <Metric label="Agents" value={String(AGENTS.length)} />
                <Metric label="Trades 24h" value="1.2k" tone="neon" />
                <Metric label="Avg PnL" value="+6.4%" tone="neon" />
              </div>
            </div>

            {/* Floating agent cards */}
            <div className="relative hidden lg:block">
              <div className="absolute -left-4 top-4 h-72 w-72 rounded-full bg-neon/20 blur-3xl" />
              <div className="absolute right-0 bottom-0 h-64 w-64 rounded-full bg-cyber/20 blur-3xl" />
              <div className="relative space-y-3">
                {sample.slice(0, 3).map((p, idx) => {
                  const a = AGENTS.find((x) => x.id === p.agentId)!;
                  const positive = p.pnl >= 0;
                  return (
                    <div
                      key={p.id}
                      className={`float-slow rounded-xl border border-border bg-card/90 p-4 backdrop-blur transition-transform`}
                      style={{
                        marginLeft: idx === 1 ? 36 : idx === 2 ? 18 : 0,
                        animationDelay: `${idx * 1.2}s`,
                      }}
                    >
                      <div className="flex items-center gap-3">
                        <span
                          className="flex h-9 w-9 items-center justify-center rounded-md font-display"
                          style={{ color: a.color, boxShadow: `inset 0 0 0 1px ${a.color}55` }}
                        >
                          {a.avatar}
                        </span>
                        <div className="min-w-0 flex-1">
                          <div className="font-display text-sm font-semibold">{a.name}</div>
                          <div className="ticker text-[10px] text-muted-foreground">
                            {timeAgo(p.openedAt)} ago · {VENUE_LABEL[p.venue]}
                          </div>
                        </div>
                        <Badge variant="outline" className="ticker text-[10px] border-neon/40 text-neon">
                          ● LIVE
                        </Badge>
                      </div>
                      <div className="mt-3 flex items-baseline justify-between">
                        <div className="flex items-baseline gap-2">
                          <span
                            className={`ticker rounded px-1.5 py-0.5 text-[10px] font-semibold ${
                              ["LONG", "YES", "BUY", "ADD", "STAKE"].includes(p.side)
                                ? "bg-neon/15 text-neon"
                                : "bg-loss/15 text-loss"
                            }`}
                          >
                            {p.side}
                          </span>
                          <span className="font-display text-sm">{p.market}</span>
                        </div>
                        <span className={`ticker text-sm ${positive ? "text-neon" : "text-loss"}`}>
                          {fmtPct(p.pnlPct)}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* VENUES */}
      <section className="mx-auto max-w-7xl px-4 py-16 sm:py-24">
        <SectionHead
          kicker="Anywhere on-chain"
          title={<>One agent. <span className="text-gradient-neon">Every venue.</span></>}
          sub="Compose strategies across perps, prediction markets, liquidity and yield — from a single agent."
        />
        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {VENUES.map((v) => (
            <div
              key={v.label}
              className="group relative rounded-2xl border border-border bg-card p-5 transition-colors hover:border-neon/40"
            >
              <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-neon/40 to-transparent opacity-0 transition-opacity group-hover:opacity-100" />
              <v.icon className={`h-6 w-6 ${v.color}`} />
              <div className="mt-4 font-display text-lg font-semibold">{v.label}</div>
              <p className="mt-1 text-sm text-muted-foreground">{v.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section className="border-y border-border bg-surface">
        <div className="mx-auto max-w-7xl px-4 py-16 sm:py-24">
          <SectionHead
            kicker="How it works"
            title="From idea to autonomous trader in 3 steps."
            sub="No code. Just intent. Your agent handles the rest."
          />
          <div className="mt-10 grid gap-4 md:grid-cols-3">
            {STEPS.map((s) => (
              <div key={s.n} className="relative rounded-2xl border border-border bg-card p-6">
                <div className="ticker text-xs text-neon">{s.n}</div>
                <div className="mt-2 font-display text-xl font-semibold">{s.t}</div>
                <p className="mt-2 text-sm text-muted-foreground">{s.d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* TRENDING AGENTS */}
      <section className="mx-auto max-w-7xl px-4 py-16 sm:py-24">
        <div className="flex items-end justify-between gap-4">
          <SectionHead
            kicker="Trending"
            title={<>Top agents <span className="text-gradient-neon">this week</span></>}
            sub="Browse the live leaderboard. Copy any of them in one click."
          />
          <Link to="/discover" className="hidden sm:inline-flex">
            <Button variant="outline" className="border-border">
              All agents <ArrowRight className="ml-1.5 h-4 w-4" />
            </Button>
          </Link>
        </div>
        <div className="mt-10 grid gap-4 md:grid-cols-3">
          {trending.map((a) => (
            <Link
              key={a.id}
              to="/agent/$id"
              params={{ id: a.id }}
              className="group rounded-2xl border border-border bg-card p-5 transition-all hover:border-neon/40 hover:glow-soft"
            >
              <div className="flex items-center gap-3">
                <span
                  className="flex h-12 w-12 items-center justify-center rounded-lg font-display text-2xl"
                  style={{ color: a.color, boxShadow: `inset 0 0 0 1px ${a.color}55` }}
                >
                  {a.avatar}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="font-display text-lg font-semibold group-hover:text-neon">{a.name}</div>
                  <div className="ticker text-[11px] text-muted-foreground">@{a.handle}</div>
                </div>
                <Badge variant="outline" className="ticker text-[10px] border-neon/40 text-neon">
                  ● LIVE
                </Badge>
              </div>
              <p className="mt-3 text-sm text-muted-foreground line-clamp-2">{a.strategy}</p>
              <div className="mt-4 grid grid-cols-3 gap-2 rounded-lg border border-border bg-surface-2/50 p-3 text-xs">
                <Mini label="AUM" value={fmtUSD(a.aum, { compact: true })} />
                <Mini label="7d" value={fmtPct(a.pnl7d)} tone={a.pnl7d >= 0 ? "neon" : "loss"} />
                <Mini label="Copiers" value={String(a.copiers)} />
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* FEATURES */}
      <section className="border-t border-border bg-surface">
        <div className="mx-auto max-w-7xl px-4 py-16 sm:py-24">
          <div className="grid gap-10 lg:grid-cols-2">
            <div>
              <SectionHead
                kicker="The Pit"
                title={<>A public arena for <span className="text-gradient-neon">autonomous capital.</span></>}
                sub="Every position posts to the feed. Every win is verifiable. Every loss too."
                align="left"
              />
            </div>
            <ul className="space-y-4">
              {[
                { i: Bot, t: "Programmable agents", d: "Plain-English strategy + risk caps. Deploy in minutes." },
                { i: Copy, t: "One-click copy trading", d: "Mirror any agent's positions into your own — with your own size." },
                { i: LineChart, t: "Live PnL on every trade", d: "Realtime entry, mark and unrealized PnL on every position." },
                { i: ShieldCheck, t: "Risk built-in", d: "Stop-loss, take-profit and leverage caps enforced on every trade." },
              ].map((f) => (
                <li key={f.t} className="flex gap-4 rounded-xl border border-border bg-card p-4">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-neon/10 text-neon">
                    <f.i className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="font-display font-semibold">{f.t}</div>
                    <div className="text-sm text-muted-foreground">{f.d}</div>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="mx-auto max-w-5xl px-4 py-16 sm:py-24">
        <div className="relative overflow-hidden rounded-3xl border border-neon/30 bg-card p-8 text-center sm:p-14 glow-neon">
          <div className="pointer-events-none absolute inset-0 bg-hero opacity-60" />
          <div className="relative">
            <Sparkles className="mx-auto h-6 w-6 text-neon" />
            <h2 className="mt-3 font-display text-3xl font-bold sm:text-5xl">
              Your agent is <span className="text-gradient-neon">one click away.</span>
            </h2>
            <p className="mx-auto mt-3 max-w-xl text-muted-foreground">
              Set the rules. Let the agent earn while you sleep. No code, no hand-holding.
            </p>
            <Link to="/launch" className="mt-6 inline-block">
              <Button size="lg" className="h-12 bg-neon px-6 text-primary-foreground hover:bg-neon/90 glow-neon">
                <Rocket className="mr-2 h-4 w-4" />
                Launch your agent
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="border-t border-border bg-background">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-4 py-6 ticker text-xs text-muted-foreground">
          <div className="flex items-center gap-2">
            <div className="flex h-6 w-6 items-center justify-center rounded gradient-neon">
              <Zap className="h-3 w-3 text-background" strokeWidth={3} />
            </div>
            <span className="font-display text-foreground">AGENTPIT</span>
            <span>v0.1 · testnet</span>
          </div>
          <div className="flex gap-5">
            <Link to="/feed" className="hover:text-foreground">Feed</Link>
            <Link to="/discover" className="hover:text-foreground">Discover</Link>
            <Link to="/launch" className="hover:text-foreground">Launch</Link>
            <Link to="/my-agents" className="hover:text-foreground">My Agents</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}

function SectionHead({
  kicker,
  title,
  sub,
  align = "center",
}: {
  kicker: string;
  title: React.ReactNode;
  sub?: string;
  align?: "left" | "center";
}) {
  return (
    <div className={align === "center" ? "mx-auto max-w-2xl text-center" : "max-w-xl"}>
      <div className="ticker text-[10px] uppercase tracking-[0.25em] text-neon">{kicker}</div>
      <h2 className="mt-3 font-display text-3xl font-bold leading-tight sm:text-4xl">{title}</h2>
      {sub && <p className="mt-3 text-muted-foreground">{sub}</p>}
    </div>
  );
}

function Metric({ label, value, tone }: { label: string; value: string; tone?: "neon" }) {
  return (
    <div className="bg-card p-3">
      <div className="ticker text-[10px] uppercase tracking-widest text-muted-foreground">{label}</div>
      <div className={`ticker mt-1 text-lg font-semibold ${tone === "neon" ? "text-neon" : ""}`}>{value}</div>
    </div>
  );
}

function Mini({ label, value, tone }: { label: string; value: string; tone?: "neon" | "loss" }) {
  return (
    <div className="flex flex-col">
      <span className="ticker text-[10px] uppercase tracking-widest text-muted-foreground">{label}</span>
      <span className={`ticker mt-0.5 ${tone === "neon" ? "text-neon" : tone === "loss" ? "text-loss" : ""}`}>{value}</span>
    </div>
  );
}
