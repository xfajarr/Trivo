import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import React from "react";

import appCss from "../styles.css?url";
import { Button } from "@/components/ui/button";

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

/** Simple server-rendered fallback shell shown while the client bundle loads. */
function ServerFallbackShell() {
  const navLinks = [
    { title: "Feed", url: "/feed" },
    { title: "Discover", url: "/discover" },
    { title: "Launch", url: "/launch" },
    { title: "My Agents", url: "/my-agents" },
    { title: "Wallet", url: "/wallet" },
  ];

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="sticky top-0 z-30 flex h-14 items-center justify-center border-b border-border bg-background/90 backdrop-blur-md">
        <div className="flex w-full max-w-7xl items-center justify-between px-4">
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
          <nav className="hidden md:flex items-center gap-1">
            {navLinks.map((link) => (
              <Link
                key={link.url}
                to={link.url}
                className="px-4 py-2 rounded-lg text-sm font-medium text-muted-foreground/60"
              >
                {link.title}
              </Link>
            ))}
          </nav>
          {/* Placeholder for ConnectWallet / UsdcBalance — Populated client-side */}
          <div className="flex items-center gap-2" />
        </div>
      </header>
      <main className="flex-1 pb-20 md:pb-0">
        <Outlet />
      </main>
    </div>
  );
}

function RootComponent() {
  const [ShellComp, setShellComp] = React.useState<React.ComponentType<{
    children: React.ReactNode;
  }> | null>(null);

  React.useEffect(() => {
    // Dynamic import via useEffect guarantees the import() never fires during
    // SSR in Cloudflare Workers. React.lazy + Suspense resolves dynamic imports
    // during streaming SSR, which would evaluate @privy-io/react-auth's
    // crypto.randomUUID() at module scope.
    import("@/components/ClientRootShell").then((mod) => {
      setShellComp(() => mod.ClientRootShell);
    });
  }, []);

  // Server-rendered content: show the lightweight shell WITHOUT Privy
  if (!ShellComp) {
    return (
      <QueryClientProvider client={queryClient}>
        <ServerFallbackShell />
      </QueryClientProvider>
    );
  }

  // Client-only content: fully loaded shell with PrivyProvider + AuthProvider
  return (
    <QueryClientProvider client={queryClient}>
      <ShellComp>
        <Outlet />
      </ShellComp>
    </QueryClientProvider>
  );
}
