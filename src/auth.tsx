import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import * as api from "./lib/api";
import type { SessionUser } from "./types";

interface AuthValue {
  user: SessionUser | null;
  csrfToken: string | null;
  loading: boolean;
  error: string | null;
  login(email: string, password: string): Promise<void>;
  logout(): Promise<void>;
}
const AuthContext = createContext<AuthValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<SessionUser | null>(null);
  const [csrfToken, setCsrfToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const refresh = useCallback(async () => {
    const session = await api.getSession();
    setUser(session?.user ?? null);
    setCsrfToken(session?.csrfToken ?? null);
  }, []);
  useEffect(() => {
    void refresh()
      .catch(() => setError("Unable to reach the authentication service."))
      .finally(() => setLoading(false));
  }, [refresh]);
  const handleLogin = useCallback(async (email: string, password: string) => {
    setError(null);
    const session = await api.login(email, password);
    setUser(session.user);
    setCsrfToken(session.csrfToken);
  }, []);
  const handleLogout = useCallback(async () => {
    if (csrfToken) await api.logout(csrfToken);
    setUser(null);
    setCsrfToken(null);
  }, [csrfToken]);
  const value = useMemo(
    () => ({ user, csrfToken, loading, error, login: handleLogin, logout: handleLogout }),
    [user, csrfToken, loading, error, handleLogin, handleLogout],
  );
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthValue {
  const value = useContext(AuthContext);
  if (!value) throw new Error("useAuth must be used inside AuthProvider");
  return value;
}
