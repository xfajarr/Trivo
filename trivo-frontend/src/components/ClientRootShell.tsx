"use client";

import { type ReactNode } from "react";
import { PrivyProvider } from "@privy-io/react-auth";
import { arcTestnet } from "@/lib/chain";
import { AuthProvider } from "@/providers/AuthProvider";
import { ConnectWallet } from "@/components/ConnectWallet";
import { UsdcBalance } from "@/components/UsdcBalance";
import { MobileBottomNav } from "@/components/MobileBottomNav";
import { Toaster } from "@/components/ui/sonner";
import { Button } from "@/components/ui/button";

import { Link, useRouterState } from "@tanstack/react-router";
import { motion, AnimatePresence } from "framer-motion";

const navLinks = [
  { title: "Feed", url: "/feed" },
  { title: "Discover", url: "/discover" },
  { title: "Launch", url: "/launch" },
  { title: "My Agents", url: "/my-agents" },
  { title: "Wallet", url: "/wallet" },
];

export function ClientRootShell({ children }: { children: ReactNode }) {
  const pathname = useRouterState({ select: (r) => r.location.pathname });

  return (
    <PrivyProvider
      appId={import.meta.env.VITE_PRIVY_APP_ID || ""}
      config={{
        defaultChain: arcTestnet,
        supportedChains: [arcTestnet],
        embeddedWallets: {
          ethereum: {
            createOnLogin: "users-without-wallets",
          },
        },
        appearance: {
          theme: "dark",
          accentColor: "#ABFF4F",
        },
      }}
    >
      <AuthProvider>
        <div className="flex min-h-screen flex-col bg-background">
          {/* Top Navbar — always visible, transparent on landing */}
          <header className="sticky top-0 z-30 flex h-14 items-center justify-center border-b border-border bg-background/90 backdrop-blur-md">
            <div className="flex w-full max-w-7xl items-center justify-between px-4">
              {/* Left: Logo */}
              <Link to="/" className="flex items-center gap-2.5 shrink-0">
                <img
                  src="/images/trivo-green-hirest.png"
                  alt="Trivo"
                  className="h-8 w-auto object-contain"
                />
                <span className="font-display text-base font-bold tracking-tight hidden sm:block">
                  TRIVO
                </span>
              </Link>

              {/* Center: Desktop Nav */}
              <nav className="hidden md:flex items-center gap-1">
                {navLinks.map((link) => {
                  const active =
                    link.url === "/feed" ? pathname === link.url : pathname.startsWith(link.url);
                  return (
                    <Link
                      key={link.url}
                      to={link.url}
                      className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                        active
                          ? "bg-neon/10 text-neon"
                          : "text-muted-foreground/60 hover:text-foreground hover:bg-muted/50"
                      }`}
                    >
                      {link.title}
                    </Link>
                  );
                })}
              </nav>

              {/* Right: USDC Balance + Connect Wallet */}
              <div className="flex items-center gap-2">
                <UsdcBalance />
                <ConnectWallet />
              </div>
            </div>
          </header>

          {/* Main Content with page transitions */}
          <main className="flex-1 pb-20 md:pb-0">
            <AnimatePresence mode="wait">
              <motion.div
                key={pathname}
                variants={{
                  initial: { opacity: 0, y: 12 },
                  animate: { opacity: 1, y: 0 },
                  exit: { opacity: 0, y: -8 },
                }}
                initial="initial"
                animate="animate"
                exit="exit"
                transition={{ duration: 0.2, ease: "easeOut" }}
              >
                {children}
              </motion.div>
            </AnimatePresence>
          </main>
        </div>

        {/* Mobile Bottom Nav */}
        <MobileBottomNav />
        <Toaster theme="dark" />
      </AuthProvider>
    </PrivyProvider>
  );
}
