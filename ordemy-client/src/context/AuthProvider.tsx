import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { tokenStorage, UNAUTHORIZED_EVENT } from "../lib/api";
import {
  fetchProfile,
  loginRequest,
  registerRequest,
} from "../pages/auth/auth.helpers";
import type {
  AuthResponse,
  LoginPayload,
  RegisterPayload,
  UserProfile,
} from "../types/auth";
import { AuthContext } from "./auth-context";

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(() => tokenStorage.get());
  const [user, setUser] = useState<UserProfile | null>(null);
  // If a saved token exists, we're "loading" until we've verified it.
  const [loading, setLoading] = useState<boolean>(
    () => tokenStorage.get() !== null,
  );

  const logout = useCallback(() => {
    tokenStorage.clear();
    setToken(null);
    setUser(null);
  }, []);

  // Restore the session on page load.
  useEffect(() => {
    const saved = tokenStorage.get();
    if (!saved) return;

    let cancelled = false;
    fetchProfile(saved)
      .then((profile) => {
        if (!cancelled) setUser(profile);
      })
      .catch(() => {
        if (!cancelled) logout();
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [logout]);

  // Any 401 on a request that carried a token ends the session.
  useEffect(() => {
    window.addEventListener(UNAUTHORIZED_EVENT, logout);
    return () => window.removeEventListener(UNAUTHORIZED_EVENT, logout);
  }, [logout]);

  const startSession = useCallback(async (auth: AuthResponse) => {
    tokenStorage.set(auth.token);
    try {
      const profile = await fetchProfile(auth.token);
      setToken(auth.token);
      setUser(profile);
      return profile;
    } catch (error) {
      tokenStorage.clear();
      throw error;
    }
  }, []);

  const login = useCallback(
    async (payload: LoginPayload) => startSession(await loginRequest(payload)),
    [startSession],
  );

  const register = useCallback(
    async (payload: RegisterPayload) =>
      startSession(await registerRequest(payload)),
    [startSession],
  );

  const refreshProfile = useCallback(async () => {
    const current = tokenStorage.get();
    if (!current) return;
    setUser(await fetchProfile(current));
  }, []);

  const value = useMemo(
    () => ({ user, token, loading, login, register, logout, refreshProfile }),
    [user, token, loading, login, register, logout, refreshProfile],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}