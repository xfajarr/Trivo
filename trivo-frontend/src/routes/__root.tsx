import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { motion, AnimatePresence } from "framer-motion";

import appCss from "../styles.css?url";
import { PrivyProvider } from "@privy-io/react-auth";
import { arcTestnet } from "@/lib/chain";
import { MobileBottomNav } from "@/components/MobileBottomNav";
import { ConnectWallet } from "@/components/ConnectWallet";
import { UsdcBalance } from "@/components/UsdcBalance";
import { Toaster } from "@/components/ui/sonner";
import { Button } from "@/components/ui/button";

import { AuthProvider } from "@/providers/AuthProvider";

const queryClient = new QueryClient();

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1, viewport-fit=cover" },
      { name: "theme-color", content: "#050706" },
      { title: "Trivo — Launch AI agents that trade for you" },
      {
        name: "description",
        content: "Programmable AI trading agents for perps, prediction markets, LP and yield.",
      },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Sora:wght@400;600;700;800&family=Manrope:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;600&display=swap",
      },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="font-display text-7xl font-bold text-neon">404</h1>
        <h2 className="mt-4 text-xl font-semibold">Signal lost</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          That route doesn't exist on the terminal.
        </p>
        <Link to="/" className="mt-6 inline-block">
          <Button className="bg-neon text-primary-foreground hover:bg-neon/90">Back home</Button>
        </Link>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  const router = useRouter();
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="font-display text-xl font-semibold">Terminal error</h1>
        <p className="mt-2 text-sm text-muted-foreground">Something glitched. Try again.</p>
        <Button
          onClick={() => {
            router.invalidate();
            reset();
          }}
          className="mt-6 bg-neon text-primary-foreground hover:bg-neon/90"
        >
          Retry
        </Button>
      </div>
    </div>
  );
}

function RootShell({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

const pageVariants = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -8 },
};

function RootComponent() {
  const router = useRouter();
  const pathname = router.state.location.pathname;

  const navLinks = [
    { title: "Feed", url: "/feed" },
    { title: "Discover", url: "/discover" },
    { title: "Launch", url: "/launch" },
    { title: "My Agents", url: "/my-agents" },
    { title: "Wallet", url: "/wallet" },
  ];

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
      <QueryClientProvider client={queryClient}>
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
                  variants={pageVariants}
                  initial="initial"
                  animate="animate"
                  exit="exit"
                  transition={{ duration: 0.2, ease: "easeOut" }}
                >
                  <Outlet />
                </motion.div>
              </AnimatePresence>
            </main>
          </div>

          {/* Mobile Bottom Nav */}
          <MobileBottomNav />
          <Toaster theme="dark" />
        </AuthProvider>
      </QueryClientProvider>
    </PrivyProvider>
  );
}
