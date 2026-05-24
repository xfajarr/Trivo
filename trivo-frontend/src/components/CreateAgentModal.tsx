import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Props {
  open: boolean;
  onClose: () => void;
}

export function CreateAgentModal({ open, onClose }: Props) {
  const navigate = useNavigate();
  const [step, setStep] = useState<"choose" | "trivo">("choose");
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-lg rounded-xl border border-border bg-card shadow-2xl">
        <div className="flex items-center justify-between border-b border-border px-6 py-4">
          <div>
            <h2 className="font-display text-lg font-bold">
              {step === "choose" ? "Launch an Agent" : "Trivo Agent Trading"}
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              {step === "choose"
                ? "Choose how you want your agent to run"
                : "Fully managed AI agent with on-chain identity"}
            </p>
          </div>
          <button onClick={onClose} className="rounded-md p-1 hover:bg-surface-2 transition-colors">
            <X className="h-5 w-5 text-muted-foreground" />
          </button>
        </div>

        {step === "choose" ? (
          <div className="p-6 space-y-4">
            <button
              onClick={() => setStep("trivo")}
              className="w-full rounded-lg border border-neon/30 bg-neon/5 p-5 text-left hover:border-neon/60 hover:bg-neon/10 transition-all group"
            >
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="font-display font-semibold text-sm">Trivo Agent Trading</h3>
                  <span className="ticker text-[9px] px-1.5 py-0.5 rounded bg-neon/20 text-neon">
                    RECOMMENDED
                  </span>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Fully managed AI agent hosted on Trivo. We handle the infrastructure — you just
                  set your strategy, fund it, and let it trade autonomously. Includes on-chain
                  identity via ERC-8004, risk guardrails, and real-time PnL tracking.
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {[
                    "Zero setup",
                    "ERC-8004 identity",
                    "Risk guardrails",
                    "24/7 autonomous",
                    "Real PnL",
                  ].map((f) => (
                    <span
                      key={f}
                      className="ticker text-[10px] px-2 py-0.5 rounded border border-neon/20 bg-neon/5 text-neon"
                    >
                      {f}
                    </span>
                  ))}
                </div>
              </div>
            </button>

            <button
              onClick={() => navigate({ to: "/launch" })}
              className="w-full rounded-lg border border-border p-5 text-left hover:border-violet/40 hover:bg-violet/5 transition-all"
            >
              <div>
                <h3 className="font-display font-semibold text-sm mb-1">Run Your Own Agent</h3>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Bring your own AI agent — OpenClaw, Hermes, or custom. Register an endpoint and
                  skill.md. Trivo sends market data, your agent returns decisions. You maintain full
                  control of your infrastructure.
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {["BYO model", "Self-hosted", "Custom strategy", "Full control"].map((f) => (
                    <span
                      key={f}
                      className="ticker text-[10px] px-2 py-0.5 rounded border border-violet/20 bg-violet/5 text-violet"
                    >
                      {f}
                    </span>
                  ))}
                </div>
              </div>
            </button>
          </div>
        ) : (
          <div className="p-6 space-y-5">
            <div className="space-y-3">
              {[
                {
                  step: "1",
                  title: "Define Your Strategy",
                  desc: "Describe your trading strategy in plain English — 'Buy BTC when RSI < 30, take profit at +2%'",
                },
                {
                  step: "2",
                  title: "Set Risk Guardrails",
                  desc: "Configure max leverage, spend limit, stop loss, and position sizing — all enforced automatically",
                },
                {
                  step: "3",
                  title: "On-Chain Identity (ERC-8004)",
                  desc: "Your agent gets a verifiable NFT identity on Arc — portable reputation across venues",
                },
                {
                  step: "4",
                  title: "Fund & Activate",
                  desc: "Deposit USDC into your agent's wallet via Circle. Set spending limits. Then activate — your agent trades 24/7",
                },
              ].map(({ step, title, desc }) => (
                <div key={step} className="flex gap-3">
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-neon/30 bg-neon/10 text-neon ticker text-xs font-bold">
                    {step}
                  </div>
                  <div>
                    <h4 className="font-display text-sm font-semibold">{title}</h4>
                    <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{desc}</p>
                  </div>
                </div>
              ))}
            </div>
            <div className="rounded-lg border border-border bg-surface-2 p-4">
              <p className="text-xs text-muted-foreground mb-3">
                Your agent will run on Arc Testnet with real market data from CoinGecko. All trades
                are on-chain. You can pause, resume, or stop anytime.
              </p>
              <div className="flex gap-2">
                <Button
                  onClick={() => {
                    onClose();
                    navigate({ to: "/launch" });
                  }}
                  className="flex-1 bg-neon text-primary-foreground hover:bg-neon/90 glow-neon"
                >
                  Launch Agent
                </Button>
                <Button variant="outline" onClick={() => setStep("choose")} className="shrink-0">
                  Back
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
