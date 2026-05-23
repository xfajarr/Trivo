import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  useRouterState,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";

import appCss from "../styles.css?url";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { MarketTicker } from "@/components/MarketTicker";
import { MobileBottomNav } from "@/components/MobileBottomNav";
import { Toaster } from "@/components/ui/sonner";
import { Button } from "@/components/ui/button";
import { Zap } from "lucide-react";
import { AuthProvider } from "@/providers/AuthProvider";

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

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  const pathname = useRouterState({ select: (r) => r.location.pathname });
  const isLanding = pathname === "/";

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <SidebarProvider>
          <div className="flex min-h-screen w-full bg-background">
            {!isLanding && <AppSidebar />}
            <div className="flex min-w-0 flex-1 flex-col">
              <header
                className="sticky top-0 z-30 flex h-12 items-center gap-2 border-b border-border bg-background/80 px-3 backdrop-blur"
                style={{ display: isLanding ? "none" : "flex" }}
              >
                {!isLanding && <SidebarTrigger className="hidden md:inline-flex" />}
                <Link to="/" className="flex items-center gap-2 md:hidden">
                  <div className="flex h-6 w-6 items-center justify-center rounded gradient-neon">
                    <Zap className="h-3 w-3 text-background" strokeWidth={3} />
                  </div>
                  <span className="font-display text-sm font-bold">TRIVO</span>
                </Link>
              </header>
              {!isLanding && <MarketTicker />}
              <main className={`flex-1 ${!isLanding ? "pb-20 md:pb-0" : ""}`}>
                <Outlet />
              </main>
            </div>
          </div>
          {!isLanding && <MobileBottomNav />}
          <Toaster theme="dark" />
        </SidebarProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}
