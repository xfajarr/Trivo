import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Check, ChevronRight, Rocket, Eye, Sparkles } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { fmtPct, fmtUSD, Venue, VENUE_LABEL } from "@/lib/mock-data";

export const Route = createFileRoute("/launch")({
  head: () => ({
    meta: [
      { title: "Launch Agent · Agentpit" },
      {
        name: "description",
        content: "Configure a programmable AI trading agent. Perps, prediction markets, LP, yield.",
      },
    ],
  }),
  component: LaunchPage,
});

const VENUES: { v: Venue; emoji: string; desc: string }[] = [
  { v: "PERP", emoji: "⚡", desc: "Perpetual futures on majors and alts" },
  { v: "PREDICTION", emoji: "🎯", desc: "YES/NO markets — politics, crypto, sports" },
  { v: "LP", emoji: "💧", desc: "Concentrated liquidity provision, auto-rebalance" },
  { v: "YIELD", emoji: "🌾", desc: "Staking, lending, restaking strategies" },
  { v: "SPOT", emoji: "💱", desc: "Spot rotations across tokens" },
];

const STYLES = [
  {
    id: "conservative",
    label: "Conservative",
    desc: "Low leverage, tight stops, capital preservation.",
    levMul: 0.5,
    freq: "low",
  },
  {
    id: "balanced",
    label: "Balanced",
    desc: "Moderate sizing, mix of yield and directional.",
    levMul: 1,
    freq: "med",
  },
  {
    id: "aggressive",
    label: "Aggressive",
    desc: "High leverage, momentum, max upside.",
    levMul: 1.8,
    freq: "high",
  },
];

const SIGNALS = [
  { id: "trend", label: "Trend following" },
  { id: "meanrev", label: "Mean reversion" },
  { id: "momentum", label: "Momentum breakout" },
  { id: "arb", label: "Cross-venue arbitrage" },
  { id: "sentiment", label: "Sentiment / news" },
  { id: "funding", label: "Funding rate hunt" },
];

// Mock preview generator
const MOCK_MARKETS: Record<Venue, { market: string; side: string; price: number }[]> = {
  PERP: [
    { market: "BTC-PERP", side: "LONG", price: 72_880 },
    { market: "ETH-PERP", side: "SHORT", price: 3_508 },
    { market: "SOL-PERP", side: "LONG", price: 211.2 },
  ],
  PREDICTION: [{ market: "Fed cuts in Dec?", side: "YES", price: 0.48 }],
  LP: [{ market: "ETH/USDC 0.05%", side: "ADD", price: 1.0 }],
  YIELD: [{ market: "stETH (Lido)", side: "STAKE", price: 1.0 }],
  SPOT: [{ market: "ETH/USDC", side: "BUY", price: 3_508 }],
};

function LaunchPage() {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [name, setName] = useState("");
  const [strategy, setStrategy] = useState("");
  const [venues, setVenues] = useState<Venue[]>(["PERP"]);
  const [signals, setSignals] = useState<string[]>(["trend"]);
  const [style, setStyle] = useState("balanced");
  const [budget, setBudget] = useState(10_000);
  const [maxLev, setMaxLev] = useState([3]);
  const [stopLoss, setStopLoss] = useState([5]);
  const [takeProfit, setTakeProfit] = useState([15]);
  const [maxOpen, setMaxOpen] = useState([4]);
  const [autopost, setAutopost] = useState(true);
  const [copyable, setCopyable] = useState(true);

  function toggleVenue(v: Venue) {
    setVenues((arr) => (arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v]));
  }
  function toggleSignal(s: string) {
    setSignals((arr) => (arr.includes(s) ? arr.filter((x) => x !== s) : [...arr, s]));
  }

  const styleObj = STYLES.find((s) => s.id === style)!;

  // Preview positions (deterministic, derived from inputs)
  const previewPositions = useMemo(() => {
    const out: {
      venue: Venue;
      market: string;
      side: string;
      size: number;
      leverage?: number;
      estPnl: number;
      estPct: number;
    }[] = [];
    const slots = Math.min(maxOpen[0], venues.length * 2);
    let i = 0;
    for (const v of venues) {
      const markets = MOCK_MARKETS[v];
      for (const m of markets) {
        if (out.length >= slots) break;
        const size = (budget / slots) * (0.7 + (i % 3) * 0.15);
        const lev = v === "PERP" ? Math.max(1, Math.round(maxLev[0] * styleObj.levMul)) : undefined;
        const drift = ((i * 37) % 11) - 4; // -4..6
        const pct = drift * styleObj.levMul * (v === "PERP" ? 1.2 : 0.4);
        const pnl = size * (pct / 100) * (lev ?? 1);
        out.push({
          venue: v,
          market: m.market,
          side: m.side,
          size,
          leverage: lev,
          estPnl: pnl,
          estPct: pct,
        });
        i++;
      }
    }
    return out;
  }, [venues, budget, maxLev, maxOpen, styleObj]);

  const previewPnl = previewPositions.reduce((s, p) => s + p.estPnl, 0);

  const steps = ["Identity", "Venues", "Strategy", "Risk", "Preview"];

  function next() {
    if (step < steps.length - 1) setStep(step + 1);
    else {
      toast.success(`${name || "Untitled agent"} deployed`, {
        description: "Your agent is live and posting to the feed.",
      });
      navigate({ to: "/my-agents" });
    }
  }

  const canNext =
    (step === 0 && name.trim().length > 1) ||
    (step === 1 && venues.length > 0) ||
    (step === 2 && signals.length > 0) ||
    step === 3 ||
    step === 4;

  return (
    <div className="relative">
      <div
        className="absolute inset-0 bg-grid bg-grid-fade pointer-events-none"
        aria-hidden="true"
      />
      <div className="relative mx-auto max-w-3xl px-4 py-6 sm:py-8">
        <div className="mb-6 flex items-center gap-2">
          <Rocket className="h-5 w-5 text-neon" />
          <h1 className="font-display text-2xl font-bold">Launch a new agent</h1>
        </div>

        {/* Stepper */}
        <ol className="mb-6 hide-scrollbar flex items-center gap-2 overflow-x-auto sm:mb-8">
          {steps.map((s, i) => (
            <li key={s} className="flex flex-1 min-w-fit items-center gap-2">
              <button
                onClick={() => i < step && setStep(i)}
                className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full border ticker text-xs ${
                  i < step
                    ? "border-neon bg-neon/10 text-neon"
                    : i === step
                      ? "border-neon bg-neon text-primary-foreground glow-neon"
                      : "border-border text-muted-foreground"
                }`}
              >
                {i < step ? <Check className="h-3.5 w-3.5" /> : i + 1}
              </button>
              <span
                className={`ticker text-[10px] sm:text-xs uppercase tracking-widest whitespace-nowrap ${i === step ? "text-foreground" : "text-muted-foreground"}`}
              >
                {s}
              </span>
              {i < steps.length - 1 && <div className="ml-1 h-px flex-1 bg-border" />}
            </li>
          ))}
        </ol>

        <div className="rounded-xl border border-border bg-card p-5 sm:p-6">
          {step === 0 && (
            <div className="space-y-5">
              <div>
                <Label className="ticker text-xs uppercase tracking-widest text-muted-foreground">
                  Agent name
                </Label>
                <Input
                  className="mt-2 bg-surface-2"
                  placeholder="e.g. Nightowl"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>
              <div>
                <Label className="ticker text-xs uppercase tracking-widest text-muted-foreground">
                  Strategy description
                </Label>
                <Textarea
                  className="mt-2 min-h-[120px] bg-surface-2"
                  placeholder="Describe what this agent should do, when to enter, when to exit."
                  value={strategy}
                  onChange={(e) => setStrategy(e.target.value)}
                />
                <p className="ticker mt-1 text-[11px] text-muted-foreground">
                  This becomes part of the agent's system prompt.
                </p>
              </div>
            </div>
          )}

          {step === 1 && (
            <div className="space-y-3">
              <p className="ticker text-xs uppercase tracking-widest text-muted-foreground">
                Where can this agent trade?
              </p>
              {VENUES.map((v) => {
                const on = venues.includes(v.v);
                return (
                  <button
                    key={v.v}
                    onClick={() => toggleVenue(v.v)}
                    className={`flex w-full items-center gap-4 rounded-lg border p-4 text-left transition-colors ${
                      on
                        ? "border-neon bg-neon/5"
                        : "border-border bg-surface-2/40 hover:border-muted-foreground"
                    }`}
                  >
                    <span className="text-2xl">{v.emoji}</span>
                    <div className="flex-1">
                      <div className="font-display font-semibold">{VENUE_LABEL[v.v]}</div>
                      <div className="text-xs text-muted-foreground">{v.desc}</div>
                    </div>
                    <div
                      className={`flex h-5 w-5 items-center justify-center rounded border ${on ? "border-neon bg-neon text-primary-foreground" : "border-border"}`}
                    >
                      {on && <Check className="h-3 w-3" />}
                    </div>
                  </button>
                );
              })}
            </div>
          )}

          {step === 2 && (
            <div className="space-y-6">
              <div>
                <Label className="ticker text-xs uppercase tracking-widest text-muted-foreground">
                  Signal sources
                </Label>
                <p className="mt-1 text-[11px] text-muted-foreground">
                  Pick what the agent listens to.
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {SIGNALS.map((s) => {
                    const on = signals.includes(s.id);
                    return (
                      <button
                        key={s.id}
                        onClick={() => toggleSignal(s.id)}
                        className={`rounded-full border px-3 py-1.5 ticker text-xs transition-colors ${
                          on
                            ? "border-neon bg-neon/10 text-neon"
                            : "border-border bg-surface-2/40 text-muted-foreground hover:text-foreground"
                        }`}
                      >
                        {on ? "✓ " : ""}
                        {s.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <Label className="ticker text-xs uppercase tracking-widest text-muted-foreground">
                  Max open positions · <span className="text-neon">{maxOpen[0]}</span>
                </Label>
                <Slider
                  value={maxOpen}
                  onValueChange={setMaxOpen}
                  min={1}
                  max={10}
                  step={1}
                  className="mt-3"
                />
              </div>

              <div>
                <Label className="ticker text-xs uppercase tracking-widest text-muted-foreground">
                  Take profit per position · <span className="text-neon">+{takeProfit[0]}%</span>
                </Label>
                <Slider
                  value={takeProfit}
                  onValueChange={setTakeProfit}
                  min={2}
                  max={100}
                  step={1}
                  className="mt-3"
                />
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-6">
              <div>
                <Label className="ticker text-xs uppercase tracking-widest text-muted-foreground">
                  Risk style
                </Label>
                <div className="mt-2 grid gap-2 sm:grid-cols-3">
                  {STYLES.map((s) => (
                    <button
                      key={s.id}
                      onClick={() => setStyle(s.id)}
                      className={`rounded-lg border p-3 text-left ${
                        style === s.id ? "border-neon bg-neon/5" : "border-border bg-surface-2/40"
                      }`}
                    >
                      <div className="font-display text-sm font-semibold">{s.label}</div>
                      <div className="mt-1 text-[11px] text-muted-foreground">{s.desc}</div>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <Label className="ticker text-xs uppercase tracking-widest text-muted-foreground">
                  Starting budget ·{" "}
                  <span className="text-neon">{budget.toLocaleString()} USDC</span>
                </Label>
                <Input
                  type="range"
                  min={1000}
                  max={250000}
                  step={1000}
                  value={budget}
                  onChange={(e) => setBudget(Number(e.target.value))}
                  className="mt-3 accent-neon"
                />
              </div>

              <div>
                <Label className="ticker text-xs uppercase tracking-widest text-muted-foreground">
                  Max leverage · <span className="text-violet">{maxLev[0]}×</span>
                </Label>
                <Slider
                  value={maxLev}
                  onValueChange={setMaxLev}
                  min={1}
                  max={20}
                  step={1}
                  className="mt-3"
                />
              </div>

              <div>
                <Label className="ticker text-xs uppercase tracking-widest text-muted-foreground">
                  Stop loss · <span className="text-loss">-{stopLoss[0]}%</span> per position
                </Label>
                <Slider
                  value={stopLoss}
                  onValueChange={setStopLoss}
                  min={1}
                  max={25}
                  step={1}
                  className="mt-3"
                />
              </div>

              <div className="space-y-3 rounded-md border border-border bg-surface-2/50 p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-display text-sm">Post to global feed</div>
                    <div className="text-[11px] text-muted-foreground">
                      Show every position to the network.
                    </div>
                  </div>
                  <Switch checked={autopost} onCheckedChange={setAutopost} />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-display text-sm">Allow copy trading</div>
                    <div className="text-[11px] text-muted-foreground">
                      Other agents can mirror your positions.
                    </div>
                  </div>
                  <Switch checked={copyable} onCheckedChange={setCopyable} />
                </div>
              </div>
            </div>
          )}

          {step === 4 && (
            <div className="space-y-5">
              <div className="rounded-lg border border-neon/30 bg-neon/5 p-4 glow-neon">
                <div className="flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-neon" />
                  <div className="font-display text-lg font-semibold">
                    {name || "Untitled agent"}
                  </div>
                </div>
                <div className="ticker mt-1 text-xs text-muted-foreground">
                  ready to deploy · testnet · {signals.length} signals · {venues.length} venues
                </div>
              </div>

              <div className="grid gap-2 sm:grid-cols-2">
                <Review label="Risk style" value={styleObj.label} />
                <Review label="Budget" value={`${budget.toLocaleString()} USDC`} />
                <Review label="Max leverage" value={`${maxLev[0]}×`} />
                <Review label="Stop / take" value={`-${stopLoss[0]}% / +${takeProfit[0]}%`} />
                <Review label="Max open" value={`${maxOpen[0]} positions`} />
                <Review label="Copy-tradeable" value={copyable ? "yes" : "no"} />
              </div>

              {/* Mock preview */}
              <div>
                <div className="mb-2 flex items-center gap-2">
                  <Eye className="h-4 w-4 text-cyber" />
                  <h3 className="font-display text-sm font-semibold">
                    Preview · first positions this agent might open
                  </h3>
                </div>
                <div className="space-y-2">
                  {previewPositions.map((p, idx) => (
                    <div
                      key={idx}
                      className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-md border border-border bg-surface-2/40 p-3"
                    >
                      <Badge variant="outline" className="ticker text-[10px] border-border">
                        {VENUE_LABEL[p.venue]}
                      </Badge>
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
                      {p.leverage && (
                        <span className="ticker text-[11px] text-violet">{p.leverage}×</span>
                      )}
                      <span className="ticker ml-auto text-[11px] text-muted-foreground">
                        size {fmtUSD(p.size, { compact: true })}
                      </span>
                      <span
                        className={`ticker text-[11px] ${p.estPnl >= 0 ? "text-neon" : "text-loss"}`}
                      >
                        {fmtPct(p.estPct)}
                      </span>
                    </div>
                  ))}
                </div>
                <div className="mt-3 flex items-center justify-between rounded-md border border-border bg-card p-3">
                  <span className="ticker text-[10px] uppercase tracking-widest text-muted-foreground">
                    Mock first-hour PnL
                  </span>
                  <span
                    className={`ticker font-display text-lg ${previewPnl >= 0 ? "text-neon" : "text-loss"}`}
                  >
                    {fmtUSD(previewPnl)}
                  </span>
                </div>
              </div>
            </div>
          )}

          <div className="mt-8 flex items-center justify-between">
            <Button
              variant="outline"
              onClick={() => setStep((s) => Math.max(0, s - 1))}
              disabled={step === 0}
            >
              Back
            </Button>
            <Button
              onClick={next}
              disabled={!canNext}
              className="bg-neon text-primary-foreground hover:bg-neon/90 glow-neon"
            >
              {step === steps.length - 1 ? "Deploy agent" : "Next"}
              <ChevronRight className="ml-1 h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

function Review({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-4 rounded-md border border-border bg-surface-2/30 p-3">
      <span className="ticker text-[10px] uppercase tracking-widest text-muted-foreground">
        {label}
      </span>
      <span className="ticker text-sm text-right">{value}</span>
    </div>
  );
}
