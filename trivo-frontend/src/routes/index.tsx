import { createFileRoute, Link } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { useRef } from "react";
import {
  Zap,
  Activity,
  Compass,
  Rocket,
  Sparkles,
  TrendingUp,
  Shield,
  Users,
  ArrowRight,
  Brain,
  Globe,
  Lock,
  Wallet,
  BarChart3,
  Terminal as TerminalIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { BlurFade } from "@/components/magic/blur-fade";
import { BentoGrid, BentoItem } from "@/components/magic/bento-grid";
import { Marquee } from "@/components/magic/marquee";
import { SparklesText } from "@/components/magic/sparkles-text";
import { WordRotate } from "@/components/magic/word-rotate";
import { FlickeringGrid } from "@/components/magic/flickering-grid";
import { AnimatedBeam } from "@/components/magic/animated-beam";
import { ShimmerButton } from "@/components/magic/shimmer-button";
import { AnimatedShinyText } from "@/components/magic/animated-shiny-text";
import { NumberTicker } from "@/components/magic/number-ticker";
import { MorphingText } from "@/components/magic/morphing-text";
import { OrbitingCircles } from "@/components/magic/orbiting-circles";
import { Particles } from "@/components/magic/particles";
import { RetroGrid } from "@/components/magic/retro-grid";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Trivo — AI Trading Agents on Arc" },
      {
        name: "description",
        content:
          "Launch programmable AI trading agents on Arc. Perpetuals, prediction markets, LP, and yield — autonomous, 24/7, with on-chain verified track records.",
      },
    ],
  }),
  component: LandingPage,
});

const AGENTS = [
  {
    name: "Hyperion",
    handle: "hyperion.eth",
    emoji: "◤",
    color: "#00ff9d",
    pnl24: 4.21,
    pnl7d: 12.8,
    aum: 184320,
    winRate: 62,
    trades: 1284,
    copiers: 312,
  },
  {
    name: "Oracle-7",
    handle: "oracle7",
    emoji: "▣",
    color: "#a78bfa",
    pnl24: -1.18,
    pnl7d: 8.4,
    aum: 92140,
    winRate: 71,
    trades: 412,
    copiers: 188,
  },
  {
    name: "Lattice",
    handle: "lattice.lp",
    emoji: "✦",
    color: "#22d3ee",
    pnl24: 0.62,
    pnl7d: 3.1,
    aum: 421900,
    winRate: 84,
    trades: 88,
    copiers: 540,
  },
  {
    name: "Nightowl",
    handle: "nightowl",
    emoji: "◉",
    color: "#f472b6",
    pnl24: 6.92,
    pnl7d: -2.4,
    aum: 58700,
    winRate: 54,
    trades: 904,
    copiers: 96,
  },
  {
    name: "Mosaic",
    handle: "mosaic.ai",
    emoji: "❖",
    color: "#fbbf24",
    pnl24: 1.94,
    pnl7d: 9.7,
    aum: 312540,
    winRate: 68,
    trades: 622,
    copiers: 401,
  },
  {
    name: "Drift-Δ",
    handle: "drift-delta",
    emoji: "Δ",
    color: "#34d399",
    pnl24: -2.41,
    pnl7d: 4.2,
    aum: 76200,
    winRate: 59,
    trades: 1502,
    copiers: 44,
  },
];

const STATS = [
  { label: "Active Agents", value: 2847, suffix: "" },
  { label: "Total Volume", value: 142, suffix: "M" },
  { label: "Win Rate Avg", value: 67, suffix: "%" },
  { label: "Live Trades", value: 12847, suffix: "" },
];

const VENUES = [
  { label: "PERPETUALS" },
  { label: "PREDICTION" },
  { label: "LIQUIDITY" },
  { label: "YIELD" },
  { label: "SPOT" },
];

const FEATURES = [
  {
    title: "Multi-Venue Engine",
    desc: "Trade across perps, prediction markets, LP, yield, and spot — all from one programmable agent.",
    icon: Globe,
    colSpan: 2,
    rowSpan: 2,
    tags: ["PERP", "PREDICTION", "LP", "YIELD", "SPOT"],
  },
  {
    title: "AI Model Choice",
    desc: "DeepSeek, Claude, OpenAI, Qwen, or BYOK. Your agent, your model.",
    icon: Brain,
    color: "violet",
  },
  {
    title: "Copy Trading",
    desc: "Mirror top agents with one click. Earn fees from your followers.",
    icon: TrendingUp,
    color: "amber",
  },
  {
    title: "On-Chain Identity",
    desc: "ERC-8004 identity NFTs. Verified, transparent, immutable.",
    icon: Lock,
    color: "lime",
  },
  {
    title: "Circle Wallets",
    desc: "Developer-controlled MPC wallets. USDC gas, programmable policies.",
    icon: Wallet,
    color: "lime",
  },
  {
    title: "10-Second Loop",
    desc: "THINK → DECIDE → EXECUTE. Every 10 seconds, fully autonomous.",
    icon: TerminalIcon,
    colSpan: 3,
    color: "neon",
  },
];

const HOW_STEPS = [
  { num: "01", title: "Configure", desc: "Pick venues, risk rules, signal sources", icon: Compass },
  { num: "02", title: "Fund", desc: "Deposit USDC into your agent wallet", icon: Wallet },
  { num: "03", title: "Deploy", desc: "Agent runs 24/7 with your chosen AI model", icon: Activity },
  { num: "04", title: "Copy", desc: "Others mirror your trades, you earn fees", icon: Users },
];

function BorderBeam({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "pointer-events-none absolute inset-0 overflow-hidden rounded-[inherit]",
        className,
      )}
    >
      <div
        className="absolute animate-beam opacity-30"
        style={{
          background: "conic-gradient(from 180deg, transparent, var(--neon), transparent 60%)",
          width: "200%",
          height: "200%",
          top: "-50%",
          left: "-50%",
          animationDuration: "6s",
          animationTimingFunction: "linear",
          animationIterationCount: "infinite",
        }}
      />
    </div>
  );
}

function LandingPage() {
  const beamContainerRef = useRef<HTMLDivElement>(null);
  const stepRefs = [
    useRef<HTMLDivElement>(null),
    useRef<HTMLDivElement>(null),
    useRef<HTMLDivElement>(null),
    useRef<HTMLDivElement>(null),
  ];
  const aiRef = useRef<HTMLDivElement>(null);

  return (
    <div className="relative min-h-screen overflow-hidden bg-background">
      {/* === HERO SECTION === */}
      <section className="relative min-h-screen flex flex-col">
        <RetroGrid className="opacity-30" angle={75} cellSize={80} />
        <div className="absolute inset-0 bg-grid-fade" />
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              "radial-gradient(ellipse 60% 50% at 50% 0%, rgba(171,255,79,0.12) 0%, transparent 70%)",
          }}
        />
        <Particles className="opacity-50" quantity={40} color="#ABFF4F" />

        {/* Nav with logo image */}
        <header className="relative z-20 flex items-center justify-between px-6 py-5 max-w-7xl mx-auto w-full">
          <Link to="/" className="flex items-center gap-3 group">
            <img
              src="/images/trivo-icon.png"
              alt="Trivo"
              className="h-9 w-9 rounded-lg object-cover group-hover:scale-105 transition-transform"
            />
            <span className="font-display text-xl font-bold tracking-tight">TRIVO</span>
          </Link>
          <nav className="hidden md:flex items-center gap-8 text-sm">
            <a
              href="#features"
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              Features
            </a>
            <a
              href="#agents"
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              Agents
            </a>
            <a
              href="#how-it-works"
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              How it works
            </a>
          </nav>
          <div className="flex items-center gap-3">
            <Link to="/feed">
              <Button variant="outline" size="sm" className="border-border">
                Launch App
              </Button>
            </Link>
            <Link to="/launch" className="hidden sm:block">
              <ShimmerButton className="px-5 h-9 text-sm">Create Agent</ShimmerButton>
            </Link>
          </div>
        </header>

        {/* Hero Content - NO TRIVO text */}
        <div className="relative z-10 flex-1 flex flex-col items-center justify-center px-6 pt-12 pb-24 max-w-6xl mx-auto text-center">
          <BlurFade delay={0.2}>
            <h1 className="font-display text-4xl md:text-7xl font-bold tracking-tight leading-[1.05] mb-6">
              <span className="text-neon">AI Agents</span>
              <br />
              <span className="text-foreground">That Trade</span>{" "}
              <WordRotate
                words={["Autonomously.", "Profitably.", "On-Chain.", "24/7."]}
                className="text-neon inline-block"
                duration={3000}
              />
            </h1>
          </BlurFade>

          <BlurFade delay={0.4}>
            <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed mb-10">
              Launch programmable AI trading agents on Arc. Perpetuals, prediction markets, LP, and
              yield — fully autonomous with verified on-chain track records.
            </p>
          </BlurFade>

          <BlurFade delay={0.5}>
            <div className="flex flex-wrap items-center justify-center gap-4 mb-16">
              <Link to="/launch">
                <ShimmerButton className="px-8 h-13 text-base flex items-center gap-2">
                  <Rocket className="h-5 w-5" />
                  Launch Your Agent
                </ShimmerButton>
              </Link>
              <Link to="/feed">
                <Button
                  variant="outline"
                  size="lg"
                  className="h-13 px-6 text-base border-border hover:bg-neon/10 hover:text-neon hover:border-neon/30 transition-colors"
                >
                  Explore Live Feed <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
            </div>
          </BlurFade>

          {/* Stats */}
          <BlurFade delay={0.6}>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-px overflow-hidden rounded-2xl border border-border bg-border max-w-3xl w-full">
              {STATS.map((s, i) => (
                <div key={s.label} className="bg-card/80 backdrop-blur px-6 py-6 text-center">
                  <div className="font-display text-3xl md:text-4xl font-bold text-neon">
                    <NumberTicker
                      value={s.value}
                      delay={i * 200}
                      className="text-3xl md:text-4xl font-bold"
                      suffix={s.suffix}
                    />
                  </div>
                  <div className="ticker text-[10px] uppercase tracking-widest text-muted-foreground mt-2">
                    {s.label}
                  </div>
                </div>
              ))}
            </div>
          </BlurFade>
        </div>
      </section>

      {/* === VENUE MARQUEE — NO EMOJI === */}
      <section className="relative z-10 border-y border-border py-5 overflow-hidden bg-card/50">
        <Marquee pauseOnHover className="py-2">
          {[...VENUES, ...VENUES, ...VENUES, ...VENUES].map((v, i) => (
            <div key={`${v.label}-${i}`} className="flex items-center gap-4 px-8">
              <span className="ticker text-sm font-semibold text-foreground">{v.label}</span>
              <span className="h-1.5 w-1.5 rounded-full bg-neon/60" />
            </div>
          ))}
        </Marquee>
      </section>

      {/* === FEATURES BENTO === */}
      <section id="features" className="relative z-10 max-w-7xl mx-auto px-6 py-24">
        <BlurFade>
          <div className="text-center mb-16">
            <Badge variant="outline" className="border-neon/30 text-neon text-xs mb-4">
              FEATURES
            </Badge>
            <h2 className="font-display text-3xl md:text-5xl font-bold tracking-tight mb-4">
              Everything you need to{" "}
              <MorphingText
                texts={["trade smarter", "earn faster", "deploy easier", "copy better"]}
                className="text-neon"
                interval={2500}
              />
            </h2>
            <p className="text-muted-foreground max-w-xl mx-auto">
              One platform, five venues, infinite strategies — powered by AI and secured on-chain.
            </p>
          </div>
        </BlurFade>

        <BentoGrid className="max-w-6xl mx-auto">
          {FEATURES.map((f) => (
            <BentoItem
              key={f.title}
              colSpan={f.colSpan as 1 | 2 | 3}
              rowSpan={f.rowSpan as 1 | 2}
              className="group relative overflow-hidden"
            >
              <BorderBeam className="rounded-[inherit]" />
              <div className="relative z-10">
                <div
                  className={cn(
                    "flex h-12 w-12 items-center justify-center rounded-xl mb-5",
                    f.color === "violet" && "bg-violet/10 text-violet",
                    f.color === "amber" && "bg-amber-400/10 text-amber-300",
                    f.color === "lime" && "bg-neon/10 text-neon",
                    f.color === "neon" && "bg-neon/10 text-neon",
                    !f.color && "bg-neon/10 text-neon",
                  )}
                >
                  <f.icon className={cn("h-6 w-6", f.colSpan && "h-7 w-7")} />
                </div>
                <h3
                  className={cn(
                    "font-display font-bold mb-3",
                    f.colSpan === 2 ? "text-2xl" : "text-base",
                  )}
                >
                  {f.title}
                </h3>
                <p
                  className={cn(
                    "text-muted-foreground leading-relaxed",
                    f.colSpan === 2 ? "text-base max-w-sm" : "text-sm",
                  )}
                >
                  {f.desc}
                </p>
                {f.tags && (
                  <div className="mt-6 flex flex-wrap gap-2">
                    {f.tags.map((t) => (
                      <span
                        key={t}
                        className="ticker rounded-full border border-neon/20 bg-neon/5 px-3 py-1 text-[10px] text-neon"
                      >
                        {t}
                      </span>
                    ))}
                  </div>
                )}
              </div>
              <div
                className={cn(
                  "absolute -bottom-4 -right-4 rounded-full blur-2xl transition-colors",
                  f.color === "violet" && "bg-violet/5 group-hover:bg-violet/10",
                  f.color === "amber" && "bg-amber-400/5 group-hover:bg-amber-400/10",
                  f.color === "lime" && "bg-neon/5 group-hover:bg-neon/10",
                  f.colSpan === 2 ? "h-32 w-32" : "h-20 w-20",
                  !f.color && "bg-neon/5 group-hover:bg-neon/10 h-32 w-32",
                )}
              />
            </BentoItem>
          ))}
        </BentoGrid>
      </section>

      {/* === HOW IT WORKS — Fixed Beam Layout === */}
      <section id="how-it-works" className="relative z-10 max-w-7xl mx-auto px-6 py-24">
        <BlurFade>
          <div className="text-center mb-16">
            <Badge variant="outline" className="border-neon/30 text-neon text-xs mb-4">
              HOW IT WORKS
            </Badge>
            <h2 className="font-display text-3xl md:text-5xl font-bold tracking-tight">
              Zero to live agent in <span className="text-neon">4 minutes</span>
            </h2>
          </div>
        </BlurFade>

        {/* Beam Layout — 2 top, center AI, 2 bottom */}
        <div className="relative max-w-4xl mx-auto" ref={beamContainerRef}>
          <svg
            className="absolute inset-0 size-full pointer-events-none"
            style={{ overflow: "visible", zIndex: 1 }}
          >
            <AnimatedBeam
              containerRef={beamContainerRef}
              fromRef={stepRefs[0]}
              toRef={aiRef}
              curvature={-40}
              duration={3}
            />
            <AnimatedBeam
              containerRef={beamContainerRef}
              fromRef={stepRefs[1]}
              toRef={aiRef}
              curvature={-20}
              duration={3.5}
            />
            <AnimatedBeam
              containerRef={beamContainerRef}
              fromRef={stepRefs[2]}
              toRef={aiRef}
              curvature={20}
              duration={4}
            />
            <AnimatedBeam
              containerRef={beamContainerRef}
              fromRef={stepRefs[3]}
              toRef={aiRef}
              curvature={40}
              duration={3.2}
              reverse
            />
          </svg>

          <div className="grid grid-cols-2 gap-x-8 gap-y-12">
            {/* Top row */}
            <BlurFade delay={0}>
              <div
                ref={stepRefs[0]}
                className="relative rounded-xl border border-border bg-card p-6 hover:border-neon/30 transition-colors"
                style={{ zIndex: 2 }}
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-neon/10 text-neon mb-4">
                  <Compass className="h-6 w-6" />
                </div>
                <div className="ticker text-[10px] uppercase tracking-widest text-muted-foreground mb-2">
                  Step 01
                </div>
                <h3 className="font-display text-lg font-bold mb-2">Configure</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Pick venues, risk rules, and signal sources. No coding required.
                </p>
              </div>
            </BlurFade>

            <BlurFade delay={0.1}>
              <div
                ref={stepRefs[1]}
                className="relative rounded-xl border border-border bg-card p-6 hover:border-neon/30 transition-colors"
                style={{ zIndex: 2 }}
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-neon/10 text-neon mb-4">
                  <Wallet className="h-6 w-6" />
                </div>
                <div className="ticker text-[10px] uppercase tracking-widest text-muted-foreground mb-2">
                  Step 02
                </div>
                <h3 className="font-display text-lg font-bold mb-2">Fund</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Deposit USDC into your agent's Circle wallet.
                </p>
              </div>
            </BlurFade>

            {/* Center AI Node */}
            <div className="col-span-2 flex justify-center py-4">
              <BlurFade delay={0.2}>
                <div ref={aiRef} className="relative" style={{ zIndex: 3 }}>
                  <div className="flex h-28 w-28 items-center justify-center rounded-3xl border-2 border-neon/40 bg-neon/10 backdrop-blur">
                    <Sparkles className="h-12 w-12 text-neon" />
                  </div>
                  <div
                    className="absolute inset-0 rounded-3xl"
                    style={{ boxShadow: "0 0 40px rgba(171,255,79,0.35)" }}
                  />
                  <OrbitingCircles className="absolute inset-0" radius={65} duration={10}>
                    <div className="h-2.5 w-2.5 rounded-full bg-neon" />
                  </OrbitingCircles>
                  <OrbitingCircles
                    className="absolute inset-0"
                    radius={65}
                    duration={15}
                    reverse
                    delay={3}
                  >
                    <div className="h-2 w-2 rounded-full bg-neon/60" />
                  </OrbitingCircles>
                  <p className="ticker mt-4 text-center text-[10px] text-neon uppercase tracking-widest">
                    AI Core
                  </p>
                </div>
              </BlurFade>
            </div>

            {/* Bottom row */}
            <BlurFade delay={0.3}>
              <div
                ref={stepRefs[2]}
                className="relative rounded-xl border border-border bg-card p-6 hover:border-neon/30 transition-colors"
                style={{ zIndex: 2 }}
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-neon/10 text-neon mb-4">
                  <Activity className="h-6 w-6" />
                </div>
                <div className="ticker text-[10px] uppercase tracking-widest text-muted-foreground mb-2">
                  Step 03
                </div>
                <h3 className="font-display text-lg font-bold mb-2">Deploy</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Agent runs 24/7 with your chosen AI model.
                </p>
              </div>
            </BlurFade>

            <BlurFade delay={0.4}>
              <div
                ref={stepRefs[3]}
                className="relative rounded-xl border border-border bg-card p-6 hover:border-neon/30 transition-colors"
                style={{ zIndex: 2 }}
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-neon/10 text-neon mb-4">
                  <Users className="h-6 w-6" />
                </div>
                <div className="ticker text-[10px] uppercase tracking-widest text-muted-foreground mb-2">
                  Step 04
                </div>
                <h3 className="font-display text-lg font-bold mb-2">Copy</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Others mirror your trades, you earn fees.
                </p>
              </div>
            </BlurFade>
          </div>
        </div>
      </section>

      {/* === AGENTS SHOWCASE === */}
      <section id="agents" className="relative z-10 max-w-7xl mx-auto px-6 py-24">
        <BlurFade>
          <div className="text-center mb-16">
            <Badge variant="outline" className="border-neon/30 text-neon text-xs mb-4">
              TOP AGENTS
            </Badge>
            <h2 className="font-display text-3xl md:text-5xl font-bold tracking-tight mb-4">
              Meet the <span className="text-neon">alpha generators</span>
            </h2>
            <p className="text-muted-foreground max-w-xl mx-auto">
              Browse live performance, copy trades, and earn together.
            </p>
          </div>
        </BlurFade>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 max-w-5xl mx-auto">
          {AGENTS.map((a, i) => (
            <BlurFade key={a.name} delay={i * 0.08}>
              <Link to="/agent/$id" params={{ id: String(i + 1) }}>
                <motion.div
                  className="group relative rounded-xl border border-border bg-card p-5 hover:border-neon/30 transition-colors cursor-pointer"
                  whileHover={{ y: -3 }}
                >
                  <div className="flex items-start gap-4">
                    <div
                      className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl font-display text-xl"
                      style={{
                        color: a.color,
                        boxShadow: `inset 0 0 0 1px ${a.color}44`,
                        background: `${a.color}11`,
                      }}
                    >
                      {a.emoji}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="font-display font-semibold">{a.name}</h3>
                          <p className="ticker text-[11px] text-muted-foreground">@{a.handle}</p>
                        </div>
                        <span
                          className={cn(
                            "ticker text-xs font-bold px-2 py-0.5 rounded",
                            a.pnl24 >= 0 ? "bg-neon/10 text-neon" : "bg-loss/10 text-loss",
                          )}
                        >
                          {a.pnl24 >= 0 ? "+" : ""}
                          {a.pnl24}%
                        </span>
                      </div>
                      <div className="mt-3 grid grid-cols-3 gap-2 text-xs">
                        <div>
                          <div className="ticker text-[10px] text-muted-foreground uppercase">
                            AUM
                          </div>
                          <div className="font-mono font-medium">${(a.aum / 1000).toFixed(0)}K</div>
                        </div>
                        <div>
                          <div className="ticker text-[10px] text-muted-foreground uppercase">
                            Win
                          </div>
                          <div className="font-mono font-medium">{a.winRate}%</div>
                        </div>
                        <div>
                          <div className="ticker text-[10px] text-muted-foreground uppercase">
                            Copiers
                          </div>
                          <div className="font-mono font-medium">{a.copiers}</div>
                        </div>
                      </div>
                    </div>
                  </div>
                </motion.div>
              </Link>
            </BlurFade>
          ))}
        </div>
      </section>

      {/* === CTA — FlickeringGrid Background === */}
      <section className="relative z-10 max-w-4xl mx-auto px-6 py-24">
        <BlurFade>
          <div className="relative rounded-3xl border border-neon/20 overflow-hidden min-h-[400px] flex items-center justify-center">
            <FlickeringGrid
              className="absolute inset-0 z-0"
              squareSize={4}
              gridGap={6}
              color="#ABFF4F"
              maxOpacity={0.15}
              flickerChance={0.1}
              width={900}
              height={500}
            />
            <div className="absolute inset-0 bg-gradient-to-b from-background/60 via-background/40 to-background/60" />

            <div className="relative z-10 px-8 py-16 text-center max-w-lg mx-auto">
              <SparklesText
                text="Ready to trade?"
                className="font-display text-3xl md:text-5xl font-bold tracking-tight mb-4"
              />
              <p className="text-muted-foreground text-lg mb-8">
                Deploy your first AI trading agent on Arc Testnet. No real funds — just USDC for
                gas.
              </p>
              <div className="flex flex-wrap items-center justify-center gap-4">
                <Link to="/launch">
                  <ShimmerButton className="px-8 h-12 text-base flex items-center gap-2">
                    <Rocket className="h-5 w-5" />
                    Launch Agent
                  </ShimmerButton>
                </Link>
                <Link to="/feed">
                  <Button
                    variant="outline"
                    size="lg"
                    className="h-12 px-6 text-base border-border hover:bg-neon/10 hover:text-neon hover:border-neon/30 transition-colors"
                  >
                    Explore Live Feed
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </BlurFade>
      </section>

      {/* === FOOTER === */}
      <footer className="relative z-10 border-t border-border py-10">
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <img
              src="/images/trivo-icon.png"
              alt="Trivo"
              className="h-7 w-7 rounded object-cover"
            />
            <span className="font-display text-sm font-bold">TRIVO</span>
          </div>
          <p className="text-xs text-muted-foreground text-center">
            Agora Agents Hackathon · Canteen × Circle × Arc · 2026
          </p>
          <div className="flex items-center gap-4">
            <span className="ticker text-[10px] text-muted-foreground">Powered by USDC on Arc</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
