import { useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { X, Sparkles, User, Shield, Wallet, Zap, ArrowRight } from "lucide-react";
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
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      
      {/* Modal */}
      <div className="relative w-full max-w-lg rounded-xl border border-border bg-card shadow-2xl">
        {/* Header */}
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
          /* Step 1: Choose option */
          <div className="p-6 space-y-4">
            {/* Option 1: Trivo Agent */}
            <button
              onClick={() => setStep("trivo")}
              className="w-full rounded-lg border border-neon/30 bg-neon/5 p-5 text-left hover:border-neon/60 hover:bg-neon/10 transition-all group"
            >
              <div className="flex items-start gap-4">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-neon/10 text-neon group-hover:scale-110 transition-transform">
                  <Sparkles className="h-6 w-6" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-display font-semibold text-sm">Trivo Agent Trading</h3>
                    <span className="ticker text-[9px] px-1.5 py-0.5 rounded bg-neon/20 text-neon">RECOMMENDED</span>
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Fully managed AI agent hosted on Trivo. We handle the infrastructure — you just set your strategy, fund it, and let it trade autonomously. Includes on-chain identity via ERC-8004, risk guardrails, and real-time PnL tracking.
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {["Zero setup", "ERC-8004 identity", "Risk guardrails", "24/7 autonomous", "Real PnL"].map((f) => (
                      <span key={f} className="ticker text-[10px] px-2 py-0.5 rounded border border-neon/20 bg-neon/5 text-neon">
                        {f}
                      </span>
                    ))}
                  </div>
                </div>
                <ArrowRight className="h-5 w-5 text-neon shrink-0 mt-1 opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
            </button>

            {/* Option 2: Self-hosted */}
            <button
              onClick={() => navigate({ to: "/launch", search: { type: "self_hosted" } })}
              className="w-full rounded-lg border border-border p-5 text-left hover:border-violet/40 hover:bg-violet/5 transition-all group"
            >
              <div className="flex items-start gap-4">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-violet/10 text-violet group-hover:scale-110 transition-transform">
                  <User className="h-6 w-6" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-display font-semibold text-sm mb-1">Run Your Own Agent</h3>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Bring your own AI agent — OpenClaw, Hermes, or custom. Register an endpoint and skill.md. Trivo sends market data, your agent returns decisions. You maintain full control of your infrastructure.
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {["BYO model", "Self-hosted", "Custom strategy", "Full control"].map((f) => (
                      <span key={f} className="ticker text-[10px] px-2 py-0.5 rounded border border-violet/20 bg-violet/5 text-violet">
                        {f}
                      </span>
                    ))}
                  </div>
                </div>
                <ArrowRight className="h-5 w-5 text-violet shrink-0 mt-1 opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
            </button>
          </div>
        ) : (
          /* Step 2: Trivo Agent Detail */
          <div className="p-6 space-y-5">
            {/* Flow steps */}
            <div className="space-y-3">
              <FlowStep 
                icon={<Sparkles className="h-4 w-4" />}
                step="1" 
                title="Define Your Strategy" 
                desc="Describe your trading strategy in plain English — 'Buy BTC when RSI < 30, take profit at +2%'" 
                color="neon"
              />
              <FlowStep 
                icon={<Shield className="h-4 w-4" />}
                step="2" 
                title="Set Risk Guardrails" 
                desc="Configure max leverage, spend limit, stop loss, and position sizing — all enforced automatically" 
                color="amber"
              />
              <FlowStep 
                icon={<Zap className="h-4 w-4" />}
                step="3" 
                title="On-Chain Identity (ERC-8004)" 
                desc="Your agent gets a verifiable NFT identity on Arc — portable reputation across venues" 
                color="violet"
              />
              <FlowStep 
                icon={<Wallet className="h-4 w-4" />}
                step="4" 
                title="Fund & Activate" 
                desc="Deposit USDC into your agent's wallet via Circle. Set spending limits. Then activate — your agent trades 24/7" 
                color="emerald"
              />
            </div>

            {/* CTA */}
            <div className="rounded-lg border border-border bg-surface-2 p-4">
              <p className="text-xs text-muted-foreground mb-3">
                Your agent will run on <span className="text-neon">Arc Testnet</span> with real market data from CoinGecko. All trades are on-chain. You can pause, resume, or stop anytime.
              </p>
              <div className="flex gap-2">
                <Button 
                  onClick={() => { onClose(); navigate({ to: "/launch" }); }}
                  className="flex-1 bg-neon text-primary-foreground hover:bg-neon/90 glow-neon"
                >
                  <Sparkles className="mr-2 h-4 w-4" /> Launch Agent
                </Button>
                <Button variant="outline" onClick={() => setStep("choose")} className="shrink-0">
                  ← Back
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function FlowStep({ icon, step, title, desc, color }: {
  icon: React.ReactNode;
  step: string;
  title: string;
  desc: string;
  color: string;
}) {
  return (
    <div className="flex gap-3">
      <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-${color}/30 bg-${color}/10 text-${color} ticker text-xs font-bold`}>
        {step}
      </div>
      <div>
        <div className="flex items-center gap-2">
          <span className={`text-${color}`}>{icon}</span>
          <h4 className="font-display text-sm font-semibold">{title}</h4>
        </div>
        <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{desc}</p>
      </div>
    </div>
  );
}
