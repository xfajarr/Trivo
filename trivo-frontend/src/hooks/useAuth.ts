import { createContext, useContext } from "react";

export interface AuthState {
  isAuthenticated: boolean;
  userId: string | null;
  isLoading: boolean;
  login: () => void;
  logout: () => void;
  accessToken: string | null;
}

export const AuthContext = createContext<AuthState | null>(null);

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
