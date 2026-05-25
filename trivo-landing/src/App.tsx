import { motion } from "framer-motion";
import { useState, useEffect } from "react";
import { Button } from "./components/ui/button";
import { Badge } from "./components/ui/badge";
import { BlurFade } from "./components/magic/blur-fade";
import { BentoGrid, BentoItem } from "./components/magic/bento-grid";
import { Marquee } from "./components/magic/marquee";
import { WordRotate } from "./components/magic/word-rotate";
import { FlickeringGrid } from "./components/magic/flickering-grid";
import { ShimmerButton } from "./components/magic/shimmer-button";
import { NumberTicker } from "./components/magic/number-ticker";
import { MorphingText } from "./components/magic/morphing-text";
import { Particles } from "./components/magic/particles";
import { RetroGrid } from "./components/magic/retro-grid";
import { cn } from "./lib/utils";
import { AccessCodeDialog } from "./components/AccessCodeDialog";

const AGENTS = [
  {
    name: "Hyperion",
    handle: "hyperion.eth",
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
  { src: "/images/arc-network-text-dark.svg", alt: "Arc" },
  { src: "/images/Uniswap_horizontallogo_pink.png", alt: "Uniswap" },
  { src: "/images/HL logo_green and white.png", alt: "Hyperliquid" },
  { src: "/images/polymarket-logos/logo-white.svg", alt: "Polymarket" },
];

const FEATURES = [
  {
    title: "Multi-Venue Engine",
    desc: "One agent trades across perpetuals, prediction markets, concentrated LP, yield strategies, and spot — no silos, no switching tools.",
    colSpan: 2,
    rowSpan: 2,
    tags: ["PERP", "PREDICTION", "LP", "YIELD", "SPOT"],
    stat: "5 venues · 1 agent",
    accent: "neon",
  },
  {
    title: "AI Model Freedom",
    desc: "DeepSeek, Claude, OpenAI, Qwen, or bring your own API key. Swap models anytime without rewriting strategies.",
    accent: "violet",
  },
  {
    title: "Copy Trading",
    desc: "Mirror top performers in one click. Creators earn fee revenue from every follower — attribution is on-chain.",
    accent: "amber",
    stat: "10% creator fee",
  },
  {
    title: "On-Chain Identity",
    desc: "Every agent gets an ERC-8004 NFT. Immutable identity, verifiable track record, composable across DeFi.",
    accent: "lime",
  },
  {
    title: "Circle MPC Wallets",
    desc: "Developer-controlled wallets with programmable spending policies. USDC as native gas on Arc — no ETH needed.",
    accent: "lime",
    stat: "Gas: USDC only",
  },
  {
    title: "10-Second Autonomy",
    desc: "THINK → DECIDE → EXECUTE. Every 10 seconds, your agent reads the market, reasons through strategy, and acts — fully autonomous, 24/7.",
    colSpan: 3,
    accent: "neon",
  },
];

const APP_URL = "https://trivo.xfajarr-web3.workers.dev";


export default function App() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 80);
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const [showAccessDialog, setShowAccessDialog] = useState(false);
  const [pendingNav, setPendingNav] = useState<string | null>(null);

  const handleAccessSuccess = (code: string) => {
    console.log("Access granted:", code);
    if (pendingNav) {
      window.open(pendingNav, "_self");
      setPendingNav(null);
    }
  };

  const openAccessDialog = (navTo: string) => {
    setPendingNav(navTo);
    setShowAccessDialog(true);
  };


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

        {/* Nav */}
        <header
          className={`z-20 fixed top-0 left-1/2 -translate-x-1/2 flex items-center justify-between px-6 w-full transition-all duration-300 ease-out ${
            scrolled
              ? "mt-2 py-2 px-4 max-w-2xl bg-background/85 backdrop-blur-xl rounded-xl border border-border/40 shadow-lg shadow-black/10"
              : "mt-0 py-5 max-w-7xl bg-transparent shadow-none border-0"
          }`}
        >
          <a href="/" className="flex items-center gap-3 group">
            <img
              src="/images/trivo-green-hirest.png"
              alt="Trivo"
              className={`rounded-lg object-cover group-hover:scale-105 transition-transform ${
                scrolled ? "h-8 w-8" : "h-11 w-11"
              }`}
            />
            <span
              className={`font-display font-bold tracking-tight transition-all ${
                scrolled ? "text-sm hidden sm:block" : "text-xl"
              }`}
            >
              TRIVO
            </span>
          </a>
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

          </nav>
          <div className="flex items-center gap-0">
            <ShimmerButton
              className="px-5 h-9 text-sm"
              onClick={() => openAccessDialog(APP_URL + "/feed")}
            >
              Launch App
            </ShimmerButton>
          </div>
        </header>

        {/* Hero Content */}
        <div className="relative z-10 flex-1 flex flex-col items-center justify-center px-6 pt-28 pb-24 max-w-6xl mx-auto text-center">
          <BlurFade delay={0}>
            <div className="relative inline-flex items-center gap-2 rounded-full border border-neon/20 bg-neon/5 px-4 py-1.5 mb-8 overflow-hidden">
              {/* Shimmer sweep across the full badge */}
              <span
                className="pointer-events-none absolute inset-0 rounded-full z-0"
                style={{
                  background:
                    "linear-gradient(90deg, transparent 5%, rgba(255,255,255,0.25) 40%, rgba(255,255,255,0.4) 50%, rgba(255,255,255,0.25) 60%, transparent 95%)",
                  backgroundSize: "400% 100%",
                  animation: "shiny-text-sweep 12s ease-in-out infinite",
                }}
              />
              <span className="relative z-10 text-neon text-lg leading-none">✦</span>
              <span className="relative z-10 text-[11px] text-neon font-mono tracking-wider uppercase">
                Now Live on Arc Testnet
              </span>
            </div>
          </BlurFade>

          <BlurFade delay={0.2}>
            <h1 className="font-display text-3xl sm:text-4xl md:text-6xl font-bold tracking-tight leading-[1.1] mb-6">
              <span className="text-neon">AI Agents</span>
              <br />
              <span className="text-foreground">That Trade</span>{" "}
              <WordRotate
                words={["Autonomously.", "Profitably.", "On-Chain.", "24/7."]}
                className="text-neon inline-block"
                duration={4500}
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
              <ShimmerButton
                className="px-8 h-13 text-base"
                onClick={() => openAccessDialog(APP_URL + "/launch")}
              >
                Launch Your Agent
              </ShimmerButton>
              {/* <a href={APP_URL + "/feed"}>
                <Button
                  variant="outline"
                  size="lg"
                  className="h-13 px-6 text-base border-border hover:bg-neon/10 hover:text-neon hover:border-neon/30 transition-colors"
                >
                  Explore Live Feed
                </Button>
              </a> */}
            </div>
          </BlurFade>

          {/* Stats */}
          <BlurFade delay={0.6}>
            <div className="mx-auto max-w-3xl rounded-2xl border border-border/60 bg-card/40 backdrop-blur-sm overflow-hidden">
              <div className="grid grid-cols-2 md:grid-cols-4 divide-y md:divide-y-0 md:divide-x divide-border/40">
                {STATS.map((s, i) => (
                  <div
                    key={s.label}
                    className="group relative py-6 px-4 text-center transition-all duration-300 hover:bg-neon/[0.02]"
                  >
                    <div className="relative z-10">
                      <NumberTicker
                        value={s.value}
                        delay={i * 200}
                        className="font-display text-3xl md:text-4xl font-bold text-neon"
                        suffix={s.suffix}
                      />
                    </div>
                    <div className="relative z-10 ticker text-[10px] uppercase tracking-[0.15em] text-muted-foreground/70 mt-2">
                      {s.label}
                    </div>
                    {/* glow dot */}
                    <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-neon/40 group-hover:bg-neon/80 transition-colors duration-500" />
                  </div>
                ))}
              </div>
            </div>
          </BlurFade>
        </div>
      </section>

      {/* === VENUE MARQUEE === */}
      <section className="relative z-10 border-y border-border py-8 overflow-hidden bg-card/50">
        <div className="max-w-7xl mx-auto px-6 mb-6">
          <p className="text-center text-[13px] uppercase tracking-[0.2em] text-white/70">
            Supported Ecosystem & Protocols
          </p>
        </div>
        <Marquee pauseOnHover className="py-2">
          {[...VENUES, ...VENUES].map((v, i) => (
            <img
              key={`${v.alt}-${i}`}
              src={v.src}
              alt={v.alt}
              className="h-8 mx-8 w-auto object-contain opacity-90 transition-all duration-300 hover:opacity-100"
            />
          ))}
        </Marquee>
      </section>

      {/* === FEATURES === */}
      <section id="features" className="relative z-10 max-w-7xl mx-auto px-6 py-24">
        <BlurFade>
          <div className="text-center mb-20">
            <div className="inline-flex items-center gap-2 mb-6 rounded-full border border-neon/20 bg-neon/5 px-4 py-1.5">
              <div className="h-1.5 w-1.5 rounded-full bg-neon animate-pulse" />
              <span className="ticker text-[11px] uppercase tracking-widest text-neon font-medium">
                Platform Capabilities
              </span>
            </div>
            <h2 className="font-display text-4xl md:text-6xl font-bold tracking-tight mb-6 leading-[1.1]">
              Built for{" "}
              <MorphingText
                texts={["autonomy", "speed", "alpha", "scale"]}
                className="text-neon"
                interval={2800}
              />
            </h2>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto leading-relaxed">
              Every feature designed from scratch for AI-native trading — 
              not a dashboard with a chatbot bolted on.
            </p>
          </div>
        </BlurFade>

        <BentoGrid className="max-w-6xl mx-auto gap-4">
          {FEATURES.map((f, idx) => {
            const isWide = (f.colSpan ?? 1) > 1;
            const accentColor =
              f.accent === "violet" ? "var(--violet)" :
              f.accent === "amber" ? "#fcd34d" :
              "var(--neon)";

            return (
              <BentoItem
                key={f.title}
                colSpan={f.colSpan as 1 | 2 | 3}
                rowSpan={f.rowSpan as 1 | 2}
              >
                <BlurFade delay={idx * 0.06}>
                  <div
                    className={cn(
                      "group relative h-full rounded-xl border border-border/60 bg-surface/80 backdrop-blur-sm p-6 md:p-8 transition-all duration-500",
                      "hover:border-border hover:bg-surface",
                      f.accent === "neon" && "hover:border-neon/25",
                      f.accent === "violet" && "hover:border-violet/25",
                      f.accent === "amber" && "hover:border-amber-400/25",
                    )}
                  >
                    {/* Left accent line */}
                    <div
                      className="absolute left-0 top-6 bottom-6 w-[3px] rounded-r-full transition-all duration-500"
                      style={{
                        background: `linear-gradient(180deg, ${accentColor}20, ${accentColor}40 50%, ${accentColor}20)`,
                      }}
                    />

                    {/* Hover glow */}
                    <div
                      className="absolute inset-0 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none"
                      style={{
                        background: `radial-gradient(600px circle at var(--mouse-x, 50%) var(--mouse-y, 50%), ${accentColor}06, transparent 60%)`,
                      }}
                    />

                    <div className="relative z-10 flex flex-col h-full pl-2">
                      {/* Index number + Title */}
                      <div className="flex items-baseline gap-3 mb-4">
                        <span
                          className="ticker text-xs font-semibold tabular-nums opacity-40 group-hover:opacity-70 transition-opacity duration-300"
                          style={{ color: accentColor }}
                        >
                          {String(idx + 1).padStart(2, "0")}
                        </span>
                        <div>
                          <h3
                            className={cn(
                              "font-display font-bold tracking-tight leading-tight",
                              isWide ? "text-2xl md:text-3xl" : "text-lg",
                            )}
                          >
                            {f.title}
                          </h3>
                          {f.stat && (
                            <span className="ticker text-[10px] text-muted-foreground mt-0.5 block">
                              {f.stat}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Description */}
                      <p
                        className={cn(
                          "text-muted-foreground/80 leading-relaxed flex-1",
                          isWide ? "text-base max-w-lg" : "text-sm",
                        )}
                      >
                        {f.desc}
                      </p>

                      {/* Tags */}
                      {f.tags && (
                        <div className="mt-5 flex flex-wrap gap-1.5">
                          {f.tags.map((t) => (
                            <span
                              key={t}
                              className="ticker rounded-[4px] border border-border/50 bg-surface-2/60 px-2 py-0.5 text-[10px] font-medium text-muted-foreground transition-colors duration-300"
                            >
                              {t}
                            </span>
                          ))}
                        </div>
                      )}

                      {/* Bottom accent dot */}
                      <div className="mt-4 flex items-center gap-2">
                        <div
                          className="h-1 w-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-500"
                          style={{ background: accentColor }}
                        />
                        <div
                          className="h-px flex-1 opacity-0 group-hover:opacity-100 transition-opacity duration-500"
                          style={{
                            background: `linear-gradient(90deg, ${accentColor}30, transparent)`,
                          }}
                        />
                      </div>
                    </div>
                  </div>
                </BlurFade>
              </BentoItem>
            );
          })}
        </BentoGrid>
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
              <a href={`${APP_URL}/agent/${i + 1}`}>
                <motion.div
                  className="group relative rounded-xl border border-border bg-card p-5 hover:border-neon/30 transition-colors cursor-pointer"
                  whileHover={{ y: -3 }}
                >
                  <div className="flex items-start gap-4">
                    <div
                      className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl font-display text-lg font-bold"
                      style={{
                        color: a.color,
                        boxShadow: `inset 0 0 0 1px ${a.color}44`,
                        background: `${a.color}11`,
                      }}
                    >
                      {a.name[0]}
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
              </a>
            </BlurFade>
          ))}
        </div>
      </section>

      {/* === CTA === */}
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
              <h2 className="font-display text-3xl md:text-5xl font-bold tracking-tight mb-4 text-foreground">
                Ready to trade?
              </h2>
              <p className="text-muted-foreground text-lg mb-8">
                Deploy your first AI trading agent on Arc Testnet. No real funds — just USDC for
                gas.
              </p>
              <div className="flex flex-wrap items-center justify-center gap-4">
                <ShimmerButton
                  className="px-8 h-12 text-base"
                  onClick={() => openAccessDialog(APP_URL + "/launch")}
                >
                  Launch Agent
                </ShimmerButton>
                {/* <a href={APP_URL + "/feed"}>
                  <Button
                    variant="outline"
                    size="lg"
                    className="h-12 px-6 text-base border-border hover:bg-neon/10 hover:text-neon hover:border-neon/30 transition-colors"
                  >
                    Explore Live Feed
                  </Button>
                </a> */}
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
              src="/images/trivo-green-hirest.png"
              alt="Trivo"
              className="h-8 w-8 rounded object-cover"
            />
            <span className="font-display text-sm font-bold">TRIVO</span>
          </div>
          <p className="text-xs text-muted-foreground text-center">
            Agora Agents Hackathon · Canteen × Circle · Arc · 2026
          </p>
          <div className="flex items-center gap-4">
            <span className="ticker text-[10px] text-muted-foreground">Powered by USDC on Arc</span>
          </div>
        </div>
      </footer>      <AccessCodeDialog
        open={showAccessDialog}
        onClose={() => setShowAccessDialog(false)}
        onSuccess={handleAccessSuccess}
      />
    </div>
  );
}
