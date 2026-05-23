import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { AuthContext } from "@/hooks/useAuth";

export function AuthProvider({ children }: { children: ReactNode }) {
  const [userId, setUserId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    const token = localStorage.getItem("privy_token");
    const stored = localStorage.getItem("privy_user_id");
    if (token && stored && mounted.current) {
      setUserId(stored);
    }
    setIsLoading(false);
    return () => {
      mounted.current = false;
    };
  }, []);

  const login = useCallback((token: string, id: string) => {
    localStorage.setItem("privy_token", token);
    localStorage.setItem("privy_user_id", id);
    setUserId(id);
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem("privy_token");
    localStorage.removeItem("privy_user_id");
    setUserId(null);
  }, []);

  return (
    <AuthContext.Provider value={{ isAuthenticated: !!userId, userId, isLoading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}
