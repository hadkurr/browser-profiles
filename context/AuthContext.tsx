import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { createContext, useCallback, useContext, useEffect, useState } from "react";
import { API_BASE } from "@/utils/apiUrl";

const TOKEN_KEY = "@bpm_auth_token";
const USER_KEY = "@bpm_auth_user";

export interface AuthUser {
  id: string;
  username: string;
  isAdmin: boolean;
  isActive: boolean;
}

interface AuthContextValue {
  user: AuthUser | null;
  token: string | null;
  isLoading: boolean;
  login: (username: string, password: string) => Promise<void>;
  register: (username: string, password: string) => Promise<void>;
  activateKey: (key: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}

async function apiFetch(path: string, options?: RequestInit, token?: string) {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (token) headers["Authorization"] = `Bearer ${token}`;
  const res = await fetch(`${API_BASE}/api${path}`, { ...options, headers: { ...headers, ...(options?.headers ?? {}) } });
  const data = await res.json();
  if (!res.ok) throw new Error((data as any).error ?? "Lỗi server");
  return data;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const [savedToken, savedUser] = await Promise.all([
          AsyncStorage.getItem(TOKEN_KEY),
          AsyncStorage.getItem(USER_KEY),
        ]);
        if (savedToken && savedUser) {
          setToken(savedToken);
          setUser(JSON.parse(savedUser));
        }
      } catch {}
      setIsLoading(false);
    })();
  }, []);

  const persist = useCallback(async (tok: string, usr: AuthUser) => {
    setToken(tok);
    setUser(usr);
    await Promise.all([
      AsyncStorage.setItem(TOKEN_KEY, tok),
      AsyncStorage.setItem(USER_KEY, JSON.stringify(usr)),
    ]);
  }, []);

  const login = useCallback(async (username: string, password: string) => {
    const data = await apiFetch("/auth/login", { method: "POST", body: JSON.stringify({ username, password }) });
    await persist(data.token, data.user);
  }, [persist]);

  const register = useCallback(async (username: string, password: string) => {
    const data = await apiFetch("/auth/register", { method: "POST", body: JSON.stringify({ username, password }) });
    await persist(data.token, data.user);
  }, [persist]);

  const activateKey = useCallback(async (key: string) => {
    if (!token) throw new Error("Chưa đăng nhập");
    const data = await apiFetch("/auth/activate", { method: "POST", body: JSON.stringify({ key }) }, token);
    setUser(data.user);
    await AsyncStorage.setItem(USER_KEY, JSON.stringify(data.user));
  }, [token]);

  const refreshUser = useCallback(async () => {
    if (!token) return;
    try {
      const data = await apiFetch("/auth/me", {}, token);
      setUser(data.user);
      await AsyncStorage.setItem(USER_KEY, JSON.stringify(data.user));
    } catch {}
  }, [token]);

  const logout = useCallback(async () => {
    setUser(null);
    setToken(null);
    await Promise.all([
      AsyncStorage.removeItem(TOKEN_KEY),
      AsyncStorage.removeItem(USER_KEY),
    ]);
  }, []);

  return (
    <AuthContext.Provider value={{ user, token, isLoading, login, register, activateKey, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}
