import { createContext, useContext } from "react";

interface AuthState {
  isAuthenticated: boolean;
  userId: string | null;
  isLoading: boolean;
  login: (token: string, userId: string) => void;
  logout: () => void;
}

export const AuthContext = createContext<AuthState | null>(null);

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
