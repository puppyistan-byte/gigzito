import AsyncStorage from "@react-native-async-storage/async-storage";
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";

const BASE_URL = process.env.EXPO_PUBLIC_API_URL || "http://5.78.128.185";

export type User = {
  id: number;
  email: string;
  role: string;
  subscriptionTier: string;
};

export type Profile = {
  username: string;
  displayName: string;
  avatarUrl: string | null;
  bio: string | null;
};

type AuthState = {
  token: string | null;
  user: User | null;
  profile: Profile | null;
  isLoading: boolean;
};

type AuthContextValue = AuthState & {
  login: (email: string, password: string) => Promise<{ mfaRequired: boolean; email?: string }>;
  verifyMfa: (email: string, code: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshMe: () => Promise<void>;
  apiRequest: <T>(path: string, options?: RequestInit) => Promise<T>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AuthState>({
    token: null,
    user: null,
    profile: null,
    isLoading: true,
  });

  useEffect(() => {
    (async () => {
      const token = await AsyncStorage.getItem("gigzito_token");
      if (token) {
        try {
          const res = await fetch(`${BASE_URL}/api/mobile/me`, {
            headers: { Authorization: `Bearer ${token}` },
          });
          if (res.ok) {
            const data = await res.json();
            setState({ token, user: data.user, profile: data.profile, isLoading: false });
            return;
          }
        } catch {}
        await AsyncStorage.removeItem("gigzito_token");
      }
      setState((s) => ({ ...s, isLoading: false }));
    })();
  }, []);

  const apiRequest = useCallback(
    async <T,>(path: string, options: RequestInit = {}): Promise<T> => {
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
        ...(options.headers as Record<string, string>),
      };
      if (state.token) {
        headers["Authorization"] = `Bearer ${state.token}`;
      }
      const res = await fetch(`${BASE_URL}${path}`, { ...options, headers });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ message: "Request failed" }));
        throw new Error(err.message || "Request failed");
      }
      return res.json();
    },
    [state.token]
  );

  const login = useCallback(async (email: string, password: string) => {
    const res = await fetch(`${BASE_URL}/api/mobile/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ message: "Login failed" }));
      throw new Error(err.message || "Login failed");
    }
    const data = await res.json();
    return data as { mfaRequired: boolean; email?: string };
  }, []);

  const verifyMfa = useCallback(async (email: string, code: string) => {
    const res = await fetch(`${BASE_URL}/api/mobile/mfa/verify`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, code }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ message: "MFA failed" }));
      throw new Error(err.message || "MFA verification failed");
    }
    const data = await res.json();
    await AsyncStorage.setItem("gigzito_token", data.token);
    setState({ token: data.token, user: data.user, profile: data.profile ?? null, isLoading: false });
  }, []);

  const logout = useCallback(async () => {
    await AsyncStorage.removeItem("gigzito_token");
    setState({ token: null, user: null, profile: null, isLoading: false });
  }, []);

  const refreshMe = useCallback(async () => {
    if (!state.token) return;
    try {
      const res = await fetch(`${BASE_URL}/api/mobile/me`, {
        headers: { Authorization: `Bearer ${state.token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setState((s) => ({ ...s, user: data.user, profile: data.profile }));
      }
    } catch {}
  }, [state.token]);

  return (
    <AuthContext.Provider value={{ ...state, login, verifyMfa, logout, refreshMe, apiRequest }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}

export { BASE_URL };
