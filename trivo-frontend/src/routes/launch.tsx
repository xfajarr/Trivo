import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { useCreateAgent } from "@/hooks/useAgents";
import type { ModelProvider } from "@/lib/types";

const STEPS = ["Identity", "Strategy", "Risk", "Deploy"];

const VENUES = [
  { id: "perp", label: "Perpetual Futures", desc: "Trade BTC, ETH, SOL with leverage" },
  { id: "prediction", label: "Prediction Markets", desc: "Bet on BTC/ETH/SOL price direction" },
  { id: "lp", label: "Liquidity Provision", desc: "Provide concentrated liquidity, earn fees" },
];

const SIGNALS = [
  { id: "trend", label: "Trend following" },
  { id: "meanrev", label: "Mean reversion" },
  { id: "momentum", label: "Momentum breakout" },
  { id: "arb", label: "Cross-venue arbitrage" },
  { id: "sentiment", label: "Sentiment analysis" },
  { id: "funding", label: "Funding rate" },
];

const MODELS = [
  { id: "asi1-mini", label: "ASI1 Mini", desc: "Fast, cheap inference" },
  { id: "asi1", label: "ASI1", desc: "Balanced performance" },
  { id: "asi1-ultra", label: "ASI1 Ultra", desc: "Deepest reasoning, 500 tool calls" },
];

const STYLES = [
  {
    id: "conservative",
    label: "Conservative",
    desc: "Low leverage, capital preservation",
    levMul: 0.5,
  },
  {
    id: "balanced",
    label: "Balanced",
    desc: "Moderate sizing, mix of yield and directional",
    levMul: 1,
  },
  {
    id: "aggressive",
    label: "Aggressive",
    desc: "High leverage, momentum, max upside",
    levMul: 1.8,
  },
];

export const Route = createFileRoute("/launch")({
  head: () => ({
    meta: [
      { title: "Launch Agent · Trivo" },
      {
        name: "description",
        content: "Configure a programmable AI trading agent with on-chain identity.",
      },
    ],
  }),
  component: LaunchPage,
});

function LaunchPage() {
  const navigate = useNavigate();
  const createAgent = useCreateAgent();
  const [step, setStep] = useState(0);

  // Form state
  const [name, setName] = useState("");
  const [handle, setHandle] = useState("");
  const [strategy, setStrategy] = useState("");
  const [venues, setVenues] = useState<string[]>(["perp"]);
  const [signals, setSignals] = useState<string[]>(["trend"]);
  const [model, setModel] = useState("asi1-mini");
  const [style, setStyle] = useState("balanced");
  const [budget, setBudget] = useState(100);
  const [maxLev, setMaxLev] = useState([2]);
  const [stopLoss, setStopLoss] = useState([5]);
  const [takeProfit, setTakeProfit] = useState([15]);
  const [copyable, setCopyable] = useState(true);

  const styleObj = STYLES.find((s) => s.id === style)!;

  function toggleVenue(v: string) {
    setVenues((arr) => (arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v]));
  }
  function toggleSignal(s: string) {
    setSignals((arr) => (arr.includes(s) ? arr.filter((x) => x !== s) : [...arr, s]));
  }

  const canNext =
    (step === 0 && name.trim().length > 1 && handle.trim().length > 1) ||
    (step === 1 && venues.length > 0) ||
    step === 2 ||
    step === 3;

  async function deploy() {
    try {
      const result = await createAgent.mutateAsync({
        name: name.trim(),
        handle: handle
          .trim()
          .toLowerCase()
          .replace(/[^a-z0-9_-]/g, ""),
        strategy: strategy.trim(),
        skills: venues.join(","),
        modelProvider: model as ModelProvider,
        modelConfig: JSON.stringify({ model, signals: signals.join(","), style: styleObj.id }),
        spendLimit: String(budget),
        maxLeverage: String(maxLev[0]),
        stopLossPct: String(stopLoss[0]),
        hostingType: "trivo",
      });

      toast.success(`${name} deployed`, {
        description: `Agent created with ERC-8004 identity on Arc Testnet. Agent is now active and trading.`,
      });

      const agentId = result?.agent?.id;
      if (agentId) navigate({ to: "/agent/$id", params: { id: agentId } });
      else navigate({ to: "/my-agents" });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Please try again.";
      toast.error("Deployment failed", {
        description: message,
      });
    }
  }

  return (
    <div className="relative">
      <div
        className="absolute inset-0 bg-grid bg-grid-fade pointer-events-none"
        aria-hidden="true"
      />
      <div className="relative mx-auto max-w-3xl px-4 py-6 sm:py-8">
        <div className="mb-6">
          <h1 className="font-display text-2xl font-bold">Launch a new agent</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Configure your AI trading agent with on-chain identity
          </p>
        </div>

        {/* Stepper */}
        <ol className="mb-6 flex items-center gap-2 overflow-x-auto sm:mb-8">
          {STEPS.map((s, i) => (
            <li key={s} className="flex flex-1 min-w-fit items-center gap-2">
              <div
                className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full border ticker text-xs ${
                  i < step
                    ? "border-neon bg-neon/10 text-neon"
                    : i === step
                      ? "border-neon bg-neon text-primary-foreground"
                      : "border-border text-muted-foreground"
                }`}
              >
                {i < step ? "✓" : i + 1}
              </div>
              <span
                className={`ticker text-[10px] sm:text-xs uppercase tracking-widest whitespace-nowrap ${i === step ? "text-foreground" : "text-muted-foreground"}`}
              >
                {s}
              </span>
              {i < STEPS.length - 1 && <div className="ml-1 h-px flex-1 bg-border" />}
            </li>
          ))}
        </ol>

        <div className="rounded-xl border border-border bg-card p-5 sm:p-6">
          {/* Step 0: Identity */}
          {step === 0 && (
            <div className="space-y-5">
              <div>
                <Label className="ticker text-xs uppercase tracking-widest text-muted-foreground mb-2 block">
                  Agent Name
                </Label>
                <Input
                  value={name}
                  onChange={(e) => {
                    setName(e.target.value);
                    if (!handle)
                      setHandle(e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, ""));
                  }}
                  placeholder="e.g., MomentumMaster"
                  maxLength={32}
                />
              </div>
              <div>
                <Label className="ticker text-xs uppercase tracking-widest text-muted-foreground mb-2 block">
                  Handle
                </Label>
                <Input
                  value={handle}
                  onChange={(e) =>
                    setHandle(e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, ""))
                  }
                  placeholder="momentummaster"
                  maxLength={32}
                />
                <p className="text-[10px] text-muted-foreground mt-1">
                  Unique identifier. Used in URLs and mentions.
                </p>
              </div>
              <div>
                <Label className="ticker text-xs uppercase tracking-widest text-muted-foreground mb-2 block">
                  AI Model
                </Label>
                <div className="grid gap-2 sm:grid-cols-3">
                  {MODELS.map((m) => (
                    <button
                      key={m.id}
                      onClick={() => setModel(m.id)}
                      className={`rounded-lg border p-3 text-left transition-colors ${model === m.id ? "border-neon/60 bg-neon/5" : "border-border hover:border-neon/30"}`}
                    >
                      <div className="font-display text-sm font-semibold">{m.label}</div>
                      <div className="text-[10px] text-muted-foreground mt-0.5">{m.desc}</div>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Step 1: Strategy */}
          {step === 1 && (
            <div className="space-y-5">
              <div>
                <Label className="ticker text-xs uppercase tracking-widest text-muted-foreground mb-2 block">
                  Trading Venues
                </Label>
                <p className="text-xs text-muted-foreground mb-3">
                  Select where your agent can trade
                </p>
                <div className="grid gap-2 sm:grid-cols-3">
                  {VENUES.map((v) => (
                    <button
                      key={v.id}
                      onClick={() => toggleVenue(v.id)}
                      className={`rounded-lg border p-3 text-left transition-colors ${venues.includes(v.id) ? "border-neon/60 bg-neon/5" : "border-border hover:border-neon/30"}`}
                    >
                      <div className="font-display text-sm font-semibold">{v.label}</div>
                      <div className="text-[10px] text-muted-foreground mt-0.5">{v.desc}</div>
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <Label className="ticker text-xs uppercase tracking-widest text-muted-foreground mb-2 block">
                  Strategy
                </Label>
                <Textarea
                  value={strategy}
                  onChange={(e) => setStrategy(e.target.value)}
                  placeholder="Describe your strategy in plain English, e.g.: Trade BTC momentum with 2x leverage. Buy when RSI < 30 and MACD bullish. Take profit at 2%, stop loss at 1%."
                  rows={4}
                  className="text-sm"
                />
              </div>
              <div>
                <Label className="ticker text-xs uppercase tracking-widest text-muted-foreground mb-2 block">
                  Signals
                </Label>
                <div className="flex flex-wrap gap-2">
                  {SIGNALS.map((s) => (
                    <button
                      key={s.id}
                      onClick={() => toggleSignal(s.id)}
                      className={`h-7 px-3 rounded border ticker text-[10px] tracking-wider transition-colors ${signals.includes(s.id) ? "border-neon bg-neon/10 text-neon" : "border-border bg-transparent text-muted-foreground hover:text-foreground"}`}
                    >
                      {s.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Step 2: Risk */}
          {step === 2 && (
            <div className="space-y-5">
              <div>
                <Label className="ticker text-xs uppercase tracking-widest text-muted-foreground mb-2 block">
                  Risk Style
                </Label>
                <div className="grid gap-2 sm:grid-cols-3">
                  {STYLES.map((s) => (
                    <button
                      key={s.id}
                      onClick={() => setStyle(s.id)}
                      className={`rounded-lg border p-3 text-left transition-colors ${style === s.id ? "border-neon/60 bg-neon/5" : "border-border hover:border-neon/30"}`}
                    >
                      <div className="font-display text-sm font-semibold">{s.label}</div>
                      <div className="text-[10px] text-muted-foreground mt-0.5">{s.desc}</div>
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <Label className="ticker text-xs uppercase tracking-widest text-muted-foreground mb-2 block">
                    Spend Limit: ${budget}
                  </Label>
                  <Slider
                    value={[budget]}
                    onValueChange={(v) => setBudget(v[0])}
                    min={10}
                    max={1000}
                    step={10}
                  />
                </div>
                <div>
                  <Label className="ticker text-xs uppercase tracking-widest text-muted-foreground mb-2 block">
                    Max Leverage: {maxLev[0]}x
                  </Label>
                  <Slider value={maxLev} onValueChange={setMaxLev} min={1} max={10} step={1} />
                </div>
                <div>
                  <Label className="ticker text-xs uppercase tracking-widest text-muted-foreground mb-2 block">
                    Stop Loss: {stopLoss[0]}%
                  </Label>
                  <Slider value={stopLoss} onValueChange={setStopLoss} min={1} max={20} step={1} />
                </div>
                <div>
                  <Label className="ticker text-xs uppercase tracking-widest text-muted-foreground mb-2 block">
                    Take Profit: {takeProfit[0]}%
                  </Label>
                  <Slider
                    value={takeProfit}
                    onValueChange={setTakeProfit}
                    min={1}
                    max={50}
                    step={1}
                  />
                </div>
              </div>

              <div className="flex items-center justify-between rounded-lg border border-border p-4">
                <div>
                  <div className="font-display text-sm">Allow copy trading</div>
                  <div className="text-[11px] text-muted-foreground">
                    Other agents can mirror your positions. You earn fees.
                  </div>
                </div>
                <Switch checked={copyable} onCheckedChange={setCopyable} />
              </div>
            </div>
          )}

          {/* Step 3: Deploy */}
          {step === 3 && (
            <div className="space-y-5">
              <div className="rounded-lg border border-neon/30 bg-neon/5 p-4">
                <div className="font-display text-lg font-semibold text-neon">
                  {name || "Untitled agent"}
                </div>
                <div className="ticker mt-1 text-xs text-muted-foreground">
                  @{handle} · {model} · {venues.length} venues · {signals.length} signals
                </div>
              </div>

              <div className="grid gap-2 sm:grid-cols-2">
                <Review label="Risk style" value={styleObj.label} />
                <Review label="Budget" value={`${budget} USDC`} />
                <Review label="Max leverage" value={`${maxLev[0]}x`} />
                <Review label="Stop / take" value={`-${stopLoss[0]}% / +${takeProfit[0]}%`} />
                <Review label="Model" value={model} />
                <Review label="Copy-tradeable" value={copyable ? "yes" : "no"} />
              </div>

              <div className="rounded-lg border border-border bg-surface-2 p-4 text-xs text-muted-foreground">
                Your agent will be deployed with ERC-8004 on-chain identity on Arc Testnet. All
                trades use real market data from CoinGecko. Mock execution — no real USDC at risk.
                You can activate, pause, or stop your agent anytime.
              </div>

              <Button
                onClick={deploy}
                disabled={createAgent.isPending}
                className="w-full bg-neon text-primary-foreground hover:bg-neon/90 glow-neon h-12 text-base"
              >
                {createAgent.isPending ? "Deploying..." : "Deploy Agent"}
              </Button>
            </div>
          )}

          {/* Navigation */}
          <div className="mt-8 flex items-center justify-between">
            <Button
              variant="outline"
              onClick={() => setStep((s) => Math.max(0, s - 1))}
              disabled={step === 0}
            >
              Back
            </Button>
            {step < STEPS.length - 1 && (
              <Button
                onClick={() => setStep((s) => s + 1)}
                disabled={!canNext}
                className="bg-neon text-primary-foreground hover:bg-neon/90"
              >
                Next
              </Button>
            )}
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
