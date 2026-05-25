// Renders PrivyProvider only on the client side — prevents SSR module init issues on Cloudflare Workers
import { useState, useEffect, type ReactNode } from "react";
import { PrivyProvider } from "@privy-io/react-auth";
import { arcTestnet } from "@/lib/chain";

function ClientOnly({ children, fallback }: { children: ReactNode; fallback?: ReactNode }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted) return fallback ?? null;
  return <>{children}</>;
}

export function ClientOnlyPrivy({ children }: { children: ReactNode }) {
  return (
    <ClientOnly>
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
        {children}
      </PrivyProvider>
    </ClientOnly>
  );
}
