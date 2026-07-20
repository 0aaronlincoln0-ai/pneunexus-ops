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
import type { RegisterAccountInput } from "./lib/api";
import type { SessionUser } from "./types";

interface AuthValue {
  user: SessionUser | null;
  csrfToken: string | null;
  loading: boolean;
  error: string | null;
  login(email: string, password: string): Promise<void>;
  register(input: RegisterAccountInput): Promise<void>;
  logout(): Promise<void>;
}
const AuthContext = createContext<AuthValue | null>(null);
const SESSION_IDLE_MS = 30 * 60_000;

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
  const handleRegister = useCallback(async (input: RegisterAccountInput) => {
    setError(null);
    const session = await api.registerAccount(input);
    setUser(session.user);
    setCsrfToken(session.csrfToken);
  }, []);
  const handleLogout = useCallback(async () => {
    if (csrfToken) await api.logout(csrfToken);
    setUser(null);
    setCsrfToken(null);
  }, [csrfToken]);
  useEffect(() => {
    if (!user) return;
    let timeoutId: number | undefined;
    const expireSession = () => {
      void (csrfToken ? api.logout(csrfToken).catch(() => undefined) : Promise.resolve()).finally(() => {
        setUser(null);
        setCsrfToken(null);
      });
    };
    const resetTimer = () => {
      if (timeoutId) window.clearTimeout(timeoutId);
      timeoutId = window.setTimeout(expireSession, SESSION_IDLE_MS);
    };
    const events = ["pointerdown", "keydown", "touchstart", "scroll"] as const;
    events.forEach((event) => window.addEventListener(event, resetTimer, { passive: true }));
    resetTimer();
    return () => {
      if (timeoutId) window.clearTimeout(timeoutId);
      events.forEach((event) => window.removeEventListener(event, resetTimer));
    };
  }, [csrfToken, user]);
  const value = useMemo(
    () => ({
      user,
      csrfToken,
      loading,
      error,
      login: handleLogin,
      register: handleRegister,
      logout: handleLogout,
    }),
    [user, csrfToken, loading, error, handleLogin, handleRegister, handleLogout],
  );
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthValue {
  const value = useContext(AuthContext);
  if (!value) throw new Error("useAuth must be used inside AuthProvider");
  return value;
}
