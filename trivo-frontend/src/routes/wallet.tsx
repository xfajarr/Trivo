import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useWallets } from "@privy-io/react-auth";
import { useUsdcBalance } from "@/hooks/useUsdcBalance";
import {
  useBridgeChains,
  useBridgeWithdraw,
  useUnifiedBalance,
  useUnifiedDeposit,
} from "@/hooks/useBridge";
import { usePlatformSend } from "@/hooks/useTransfer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  ArrowUpRight,
  ArrowLeftRight,
  Wallet,
  Copy,
  Check,
  ExternalLink,
  Banknote,
} from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/wallet")({
  head: () => ({
    meta: [
      { title: "Wallet · Trivo" },
      { name: "description", content: "Manage your USDC on Arc." },
    ],
  }),
  component: WalletPage,
});

function WalletPage() {
  const { isAuthenticated } = useAuth();
  const { wallets } = useWallets();
  const { balance, isLoading: balanceLoading } = useUsdcBalance();
  const { data: bridgeData, isLoading: bridgeLoading } = useBridgeChains();

  const wallet = wallets[0];
  const address = wallet?.address ?? null;

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      {/* Header */}
      <div className="mb-6">
        <h1 className="font-display text-2xl font-bold">Wallet</h1>
        <p className="text-sm text-muted-foreground mt-1">Manage USDC on Arc Testnet</p>
      </div>

      {!isAuthenticated ? (
        <div className="rounded-lg border border-border bg-card p-12 text-center">
          <Wallet className="mx-auto h-10 w-10 text-muted-foreground/40" />
          <h3 className="font-display text-lg font-semibold mt-4 mb-2">Connect your wallet</h3>
          <p className="text-sm text-muted-foreground">Sign in to manage USDC on Arc.</p>
        </div>
      ) : (
        <>
          {/* Balance Card */}
          <div className="mb-6 rounded-xl border border-border bg-gradient-to-br from-surface via-surface to-surface-2 p-6 shadow-lg shadow-black/20">
            <div className="flex items-center justify-between">
              <div>
                <div className="ticker text-[10px] uppercase tracking-widest text-muted-foreground mb-1">
                  USDC Balance
                </div>
                <div className="font-display text-4xl font-bold tracking-tight">
                  {balanceLoading ? (
                    <span className="animate-pulse text-muted-foreground">—</span>
                  ) : (
                    `${parseFloat(balance ?? "0").toFixed(2)}`
                  )}
                </div>
                <div className="ticker text-[11px] text-muted-foreground mt-1 flex items-center gap-1.5">
                  <span>Arc Testnet</span>
                  <span className="h-1 w-1 rounded-full bg-muted-foreground/30" />
                  <span>Chain {import.meta.env.VITE_ARC_CHAIN_ID || "5042002"}</span>
                </div>
              </div>
              <div className="hidden sm:block">
                <img src="/images/trivo-green-hirest.png" alt="" className="h-14 w-14 opacity-20" />
              </div>
            </div>

            {address && (
              <div className="mt-4 flex items-center gap-2 rounded-md bg-surface-2/80 px-3 py-2 text-xs font-mono">
                <span className="text-muted-foreground">Wallet:</span>
                <span className="text-foreground/80 truncate">{address}</span>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(address);
                    toast.success("Address copied");
                  }}
                  className="shrink-0 text-muted-foreground hover:text-foreground"
                  aria-label="Copy address"
                >
                  <Copy className="h-3.5 w-3.5" />
                </button>
              </div>
            )}
          </div>

          {/* Tabbed Actions */}
          <Tabs defaultValue="send" className="w-full">
            <TabsList className="w-full justify-start border-b border-border rounded-none bg-transparent h-auto p-0 mb-6">
              <TabsTrigger
                value="send"
                className="rounded-none border-b-2 border-transparent data-[state=active]:border-neon data-[state=active]:text-neon px-4 py-3 text-xs ticker uppercase tracking-widest"
              >
                Send USDC
              </TabsTrigger>
              <TabsTrigger
                value="bridge"
                className="rounded-none border-b-2 border-transparent data-[state=active]:border-neon data-[state=active]:text-neon px-4 py-3 text-xs ticker uppercase tracking-widest"
              >
                Bridge
              </TabsTrigger>
              <TabsTrigger
                value="gateway"
                className="rounded-none border-b-2 border-transparent data-[state=active]:border-neon data-[state=active]:text-neon px-4 py-3 text-xs ticker uppercase tracking-widest"
              >
                Gateway
              </TabsTrigger>
            </TabsList>

            <TabsContent value="send">
              <SendTab address={address} />
            </TabsContent>

            <TabsContent value="bridge">
              <BridgeTab
                address={address}
                destinations={bridgeData?.destinations ?? []}
                sourceChain={bridgeData?.source?.chain}
                loading={bridgeLoading}
              />
            </TabsContent>

            <TabsContent value="gateway">
              <GatewayTab address={address} />
            </TabsContent>
          </Tabs>
        </>
      )}
    </div>
  );
}

// ── Send Tab ──

function SendTab({ address }: { address: string | null }) {
  const [toAddress, setToAddress] = useState("");
  const [sendAmount, setSendAmount] = useState("");
  const platformSend = usePlatformSend();

  const handleSend = () => {
    if (!toAddress || !sendAmount || Number(sendAmount) <= 0) {
      toast.error("Enter a valid address and amount");
      return;
    }
    platformSend.mutate({ to: toAddress, amount: sendAmount });
  };

  return (
    <div className="rounded-lg border border-border bg-card p-6 space-y-4">
      <div className="flex items-center gap-2 text-sm">
        <ArrowUpRight className="h-4 w-4 text-neon" />
        <span className="font-medium">Send USDC to any address on Arc</span>
      </div>

      <div>
        <label className="ticker text-[10px] uppercase tracking-widest text-muted-foreground mb-1.5 block">
          From (Your Wallet)
        </label>
        <div className="rounded-md bg-surface-2/50 px-3 py-2 text-xs font-mono text-foreground/60">
          {address ? `${address.slice(0, 10)}...${address.slice(-6)}` : "Connect wallet"}
        </div>
      </div>

      <div>
        <label className="ticker text-[10px] uppercase tracking-widest text-muted-foreground mb-1.5 block">
          To Address
        </label>
        <Input
          value={toAddress}
          onChange={(e) => setToAddress(e.target.value)}
          placeholder="0x..."
          className="font-mono text-xs"
        />
      </div>

      <div>
        <label className="ticker text-[10px] uppercase tracking-widest text-muted-foreground mb-1.5 block">
          Amount (USDC)
        </label>
        <div className="flex items-center gap-2">
          <div className="flex-1 relative">
            <Input
              type="number"
              value={sendAmount}
              onChange={(e) => setSendAmount(e.target.value)}
              placeholder="0.00"
              min={0}
              step="0.01"
              className="pr-12"
            />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
              USDC
            </span>
          </div>
          <Button
            onClick={handleSend}
            disabled={platformSend.isPending}
            className="bg-neon text-primary-foreground hover:bg-neon/90"
          >
            {platformSend.isPending ? "Preparing & signing..." : "Send"}
          </Button>
        </div>
        <div className="flex gap-2 mt-2">
          {[10, 50, 100].map((n) => (
            <button
              key={n}
              onClick={() => setSendAmount(String(n))}
              className={`text-[10px] px-2 py-1 rounded border ticker transition-colors ${
                sendAmount === String(n)
                  ? "border-neon bg-neon/10 text-neon"
                  : "border-border text-muted-foreground hover:text-foreground"
              }`}
            >
              ${n}
            </button>
          ))}
        </div>
      </div>

      <p className="text-[10px] text-muted-foreground">
        You will sign the transaction with your connected wallet. Settles on Arc in ~1-2 sec.
      </p>
    </div>
  );
}

// ── Bridge Tab ──

function BridgeTab({
  address,
  destinations,
  sourceChain,
  loading,
}: {
  address: string | null;
  destinations: { id: string; chain: string }[];
  sourceChain: string;
  loading: boolean;
}) {
  const [destination, setDestination] = useState("");
  const [bridgeAmount, setBridgeAmount] = useState("");
  const [destAddress, setDestAddress] = useState(address ?? "");
  const bridge = useBridgeWithdraw();

  const handleBridge = () => {
    if (!destination || !bridgeAmount || !destAddress) {
      toast.error("Fill in all fields");
      return;
    }
    bridge.mutate({
      destination,
      amount: bridgeAmount,
      destinationAddress: destAddress,
    });
  };

  return (
    <div className="rounded-lg border border-border bg-card p-6 space-y-4">
      <div className="flex items-center gap-2 text-sm">
        <ArrowLeftRight className="h-4 w-4 text-neon" />
        <span className="font-medium">Bridge USDC from Arc to another chain</span>
      </div>

      {/* Source */}
      <div>
        <label className="ticker text-[10px] uppercase tracking-widest text-muted-foreground mb-1.5 block">
          From
        </label>
        <div className="rounded-md bg-surface-2/50 px-3 py-2 text-xs font-medium">
          {sourceChain || "Arc Testnet"}
        </div>
      </div>

      {/* Destination */}
      <div>
        <label className="ticker text-[10px] uppercase tracking-widest text-muted-foreground mb-1.5 block">
          Destination Chain
        </label>
        <div className="relative">
          <select
            value={destination}
            onChange={(e) => setDestination(e.target.value)}
            className="w-full rounded-md border border-border bg-surface px-3 py-2 text-xs font-mono text-foreground focus:outline-none focus:ring-2 focus:ring-neon/50 appearance-none"
          >
            <option value="">Select chain...</option>
            {loading ? (
              <option disabled>Loading...</option>
            ) : (
              destinations.map((d: { id: string; chain: string }) => (
                <option key={d.id} value={d.id}>
                  {d.chain}
                </option>
              ))
            )}
          </select>
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none">
            ▾
          </span>
        </div>
      </div>

      {/* Destination Address */}
      <div>
        <label className="ticker text-[10px] uppercase tracking-widest text-muted-foreground mb-1.5 block">
          Destination Address
        </label>
        <Input
          value={destAddress}
          onChange={(e) => setDestAddress(e.target.value)}
          placeholder="0x... or Solana address"
          className="font-mono text-xs"
        />
      </div>

      {/* Amount */}
      <div>
        <label className="ticker text-[10px] uppercase tracking-widest text-muted-foreground mb-1.5 block">
          Amount (USDC)
        </label>
        <div className="flex items-center gap-2">
          <div className="flex-1 relative">
            <Input
              type="number"
              value={bridgeAmount}
              onChange={(e) => setBridgeAmount(e.target.value)}
              placeholder="0.00"
              min={0}
              step="0.01"
              className="pr-12"
            />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
              USDC
            </span>
          </div>
          <Button
            onClick={handleBridge}
            disabled={bridge.isPending}
            className="bg-neon text-primary-foreground hover:bg-neon/90"
          >
            {bridge.isPending ? "Preparing & signing..." : "Bridge"}
          </Button>
        </div>
      </div>

      <p className="text-[10px] text-muted-foreground">
        Uses CCTP v2. After initiating, wait ~2-5 min for attestation, then claim on destination.
      </p>
    </div>
  );
}

// ── Gateway Tab ──

function GatewayTab({ address }: { address: string | null }) {
  const { data: gwBalance, isLoading: gwBalanceLoading } = useUnifiedBalance(address);
  const [depositAmount, setDepositAmount] = useState("");
  const deposit = useUnifiedDeposit();

  return (
    <div className="space-y-4">
      {/* Unified Balance */}
      <div className="rounded-lg border border-border bg-card p-6 space-y-4">
        <div className="flex items-center gap-2 text-sm">
          <Banknote className="h-4 w-4 text-neon" />
          <span className="font-medium">Gateway Unified Balance</span>
        </div>

        <div className="rounded-md bg-surface-2/50 px-4 py-3">
          <div className="ticker text-[10px] uppercase tracking-widest text-muted-foreground">
            Gateway Balance
          </div>
          <div className="font-display text-2xl font-bold mt-1">
            {gwBalanceLoading ? (
              <span className="animate-pulse text-muted-foreground">—</span>
            ) : (
              `${parseFloat(gwBalance?.balanceDisplay ?? "0.00")} USDC`
            )}
          </div>
          <div className="ticker text-[10px] text-muted-foreground mt-1">
            Chain-abstracted · Spendable on any supported chain
          </div>
        </div>

        {address && (
          <div>
            <label className="ticker text-[10px] uppercase tracking-widest text-muted-foreground mb-1.5 block">
              Deposit to Gateway (Testnet)
            </label>
            <div className="flex items-center gap-2">
              <div className="flex-1 relative">
                <Input
                  type="number"
                  value={depositAmount}
                  onChange={(e) => setDepositAmount(e.target.value)}
                  placeholder="0.00"
                  className="pr-12"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
                  USDC
                </span>
              </div>
              <Button
                onClick={() => {
                  if (!depositAmount || Number(depositAmount) <= 0) {
                    toast.error("Enter a valid deposit amount");
                    return;
                  }
                  deposit.mutate({ owner: address!, amount: depositAmount });
                }}
                disabled={deposit.isPending}
                className="bg-neon text-primary-foreground hover:bg-neon/90"
              >
                {deposit.isPending ? "Preparing & signing..." : "Deposit"}
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
