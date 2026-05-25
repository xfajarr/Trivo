import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { usePrivy } from "@privy-io/react-auth";
import { AuthContext } from "@/hooks/useAuth";

export function AuthProvider({ children }: { children: ReactNode }) {
  const { ready, authenticated, user, login, logout: privyLogout, getAccessToken } = usePrivy();

  const [userId, setUserId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const mounted = useRef(true);

  // On mount and when auth state changes, sync the token with backend
  useEffect(() => {
    mounted.current = true;

    async function sync() {
      if (!ready) return;

      if (authenticated && user?.id) {
        const token = await getAccessToken();
        if (!mounted.current) return;

        if (token) {
          localStorage.setItem("privy_token", token);
          localStorage.setItem("privy_user_id", user.id);
          setAccessToken(token);
          setUserId(user.id);

          // Verify with backend
          try {
            await fetch(
              `${import.meta.env.VITE_API_URL || "https://trivo-production.up.railway.app"}/api/auth/verify`,
              {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ accessToken: token }),
              },
            );
          } catch {
            // silent — backend may not be running
          }
        }
      } else {
        localStorage.removeItem("privy_token");
        localStorage.removeItem("privy_user_id");
        setAccessToken(null);
        setUserId(null);
      }

      if (mounted.current) setIsLoading(false);
    }

    sync();
  }, [ready, authenticated, user, getAccessToken]);

  const handleLogin = useCallback(() => {
    login();
  }, [login]);

  const handleLogout = useCallback(() => {
    privyLogout();
    localStorage.removeItem("privy_token");
    localStorage.removeItem("privy_user_id");
    setUserId(null);
    setAccessToken(null);
  }, [privyLogout]);

  return (
    <AuthContext.Provider
      value={{
        isAuthenticated: !!userId,
        userId,
        isLoading,
        login: handleLogin,
        logout: handleLogout,
        accessToken,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
