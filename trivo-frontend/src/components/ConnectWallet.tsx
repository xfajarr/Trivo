import { useState, useRef, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useWallets } from "@privy-io/react-auth";
import { Button } from "@/components/ui/button";
import { Copy, LogOut, ChevronDown } from "lucide-react";

export function ConnectWallet() {
  const { isAuthenticated, isLoading: authLoading, login, logout } = useAuth();
  const { wallets } = useWallets();
  const [open, setOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const wallet = wallets[0];
  const address = wallet?.address ?? null;
  const shortAddress = address ? `${address.slice(0, 6)}…${address.slice(-4)}` : null;

  // Close dropdown on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  const handleCopy = async () => {
    if (address) {
      await navigator.clipboard.writeText(address);
      setOpen(false);
    }
  };

  const handleDisconnect = () => {
    logout();
    setOpen(false);
  };

  if (authLoading) {
    return (
      <div className="flex items-center gap-2 rounded-lg border border-border bg-surface/50 px-3 py-1.5">
        <span className="h-2 w-2 animate-pulse rounded-full bg-muted-foreground" />
        <span className="ticker text-[10px] uppercase tracking-widest text-muted-foreground">
          Loading
        </span>
      </div>
    );
  }

  if (isAuthenticated && address) {
    return (
      <div className="relative" ref={dropdownRef}>
        <button
          onClick={() => setOpen(!open)}
          className="flex items-center gap-2 rounded-lg border border-border bg-surface/50 px-3 py-1.5 hover:bg-muted/50 transition-colors cursor-pointer"
        >
          <span className="hidden sm:inline ticker text-[11px] text-muted-foreground">
            {shortAddress}
          </span>
          <span className="sm:hidden ticker text-[11px] text-muted-foreground">
            {address?.slice(0, 6)}…
          </span>
          <ChevronDown className={`h-3 w-3 text-muted-foreground transition-transform ${open ? "rotate-180" : ""}`} />
        </button>

        {/* Dropdown */}
        {open && (
          <div className="absolute right-0 top-full mt-1.5 z-50 min-w-[200px] rounded-lg border border-border bg-surface shadow-lg shadow-black/40 overflow-hidden">
            <div className="px-3 py-2 border-b border-border">
              <p className="ticker text-[10px] text-muted-foreground uppercase tracking-widest">
                Address
              </p>
              <p className="ticker text-xs text-foreground mt-0.5 font-mono">{shortAddress}</p>
            </div>
            <button
              onClick={handleCopy}
              className="flex w-full items-center gap-2 px-3 py-2.5 text-sm text-foreground hover:bg-muted/50 transition-colors cursor-pointer"
            >
              <Copy className="h-3.5 w-3.5 text-muted-foreground" />
              Copy Address
            </button>
            <button
              onClick={handleDisconnect}
              className="flex w-full items-center gap-2 px-3 py-2.5 text-sm text-loss hover:bg-loss/10 transition-colors cursor-pointer"
            >
              <LogOut className="h-3.5 w-3.5" />
              Disconnect
            </button>
          </div>
        )}
      </div>
    );
  }

  return (
    <Button
      onClick={login}
      size="sm"
      className="h-8 bg-neon text-primary-foreground hover:bg-neon/90 text-xs font-medium px-3"
    >
      Connect Wallet
    </Button>
  );
}
