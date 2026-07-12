import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import * as WebBrowser from "expo-web-browser";
import * as Linking from "expo-linking";
import { Platform } from "react-native";

import {
  AuthUser,
  clearSessionToken,
  exchangeSession,
  fetchMe,
  getSessionToken,
  logout as apiLogout,
} from "@/src/lib/api";

interface Ctx {
  user: AuthUser | null;
  loading: boolean;
  signIn: () => Promise<AuthUser | null>;
  signOut: () => Promise<void>;
  refresh: () => Promise<void>;
}

const AuthContext = createContext<Ctx | null>(null);

function parseSessionIdFromUrl(url: string): string | null {
  try {
    const u = new URL(url);
    // Try hash first: #session_id=...
    if (u.hash) {
      const params = new URLSearchParams(u.hash.replace(/^#/, ""));
      const s = params.get("session_id");
      if (s) return s;
    }
    // Then query string
    const s = u.searchParams.get("session_id");
    if (s) return s;
  } catch {
    // Fallback regex
    const m = url.match(/session_id=([^&#]+)/);
    if (m) return decodeURIComponent(m[1]);
  }
  return null;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    const token = await getSessionToken();
    if (!token) {
      setUser(null);
      setLoading(false);
      return;
    }
    const me = await fetchMe();
    if (!me) await clearSessionToken();
    setUser(me);
    setLoading(false);
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const signIn = useCallback(async (): Promise<AuthUser | null> => {
    const redirect = Platform.OS === "web" ? window.location.origin + "/" : Linking.createURL("");
    const authUrl = `https://auth.emergentagent.com/?redirect=${encodeURIComponent(redirect)}`;

    let sessionId: string | null = null;

    if (Platform.OS === "web") {
      window.location.href = authUrl;
      return null;
    }

    const result = await WebBrowser.openAuthSessionAsync(authUrl, redirect);
    if (result.type === "success" && result.url) {
      sessionId = parseSessionIdFromUrl(result.url);
    }
    if (!sessionId) return null;

    try {
      const u = await exchangeSession(sessionId);
      setUser(u);
      return u;
    } catch (e) {
      console.warn("exchange session failed", e);
      return null;
    }
  }, []);

  const signOut = useCallback(async () => {
    await apiLogout();
    setUser(null);
  }, []);

  const value = useMemo<Ctx>(() => ({ user, loading, signIn, signOut, refresh }), [user, loading, signIn, signOut, refresh]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const c = useContext(AuthContext);
  if (!c) throw new Error("useAuth must be used inside <AuthProvider>");
  return c;
}
