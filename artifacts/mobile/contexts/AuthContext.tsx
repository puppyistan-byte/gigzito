import * as SecureStore from "expo-secure-store";
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";

const BASE_URL = "https://www.gigzito.com";
const TOKEN_KEY = "gigzito_token";

export type User = {
  id: number;
  email: string;
  role: string;
  subscriptionTier: string;
  username?: string;
  displayName?: string;
  avatarUrl?: string | null;
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

type LoginResult = {
  mfaRequired: boolean;
  email?: string;
  emailNotVerified?: boolean;
  devCode?: string;
};

type AuthContextValue = AuthState & {
  login: (email: string, password: string) => Promise<LoginResult>;
  verifyMfa: (email: string, code: string) => Promise<void>;
  resendMfaCode: (email: string) => Promise<{ message: string; waitSeconds?: number }>;
  resendVerification: (email: string) => Promise<void>;
  forgotPassword: (email: string) => Promise<void>;
  resetPassword: (token: string, password: string) => Promise<void>;
  changePassword: (currentPassword: string, newPassword: string) => Promise<void>;
  resetMfa: () => Promise<void>;
  logout: () => Promise<void>;
  refreshMe: () => Promise<void>;
  apiRequest: <T>(path: string, options?: RequestInit) => Promise<T>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

async function saveToken(token: string) {
  try {
    await SecureStore.setItemAsync(TOKEN_KEY, token);
  } catch {
    /* SecureStore not available on web */
  }
}

async function getToken(): Promise<string | null> {
  try {
    return await SecureStore.getItemAsync(TOKEN_KEY);
  } catch {
    return null;
  }
}

async function deleteToken() {
  try {
    await SecureStore.deleteItemAsync(TOKEN_KEY);
  } catch {
    /* ignore */
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AuthState>({
    token: null,
    user: null,
    profile: null,
    isLoading: true,
  });

  useEffect(() => {
    (async () => {
      const token = await getToken();
      if (token) {
        try {
          const res = await fetch(`${BASE_URL}/api/mobile/refresh`, {
            method: "POST",
            headers: { Authorization: `Bearer ${token}` },
          });
          if (res.ok) {
            const data = await res.json();
            await saveToken(data.token);
            setState({
              token: data.token,
              user: data.user,
              profile: data.profile ?? null,
              isLoading: false,
            });
            return;
          }
        } catch {}
        await deleteToken();
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

  const login = useCallback(async (email: string, password: string): Promise<LoginResult> => {
    const res = await fetch(`${BASE_URL}/api/mobile/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    const data = await res.json().catch(() => ({ message: "Login failed" }));
    if (!res.ok) {
      const err: any = new Error(data.message || "Login failed");
      if (data.emailNotVerified) err.emailNotVerified = true;
      throw err;
    }
    return data as LoginResult;
  }, []);

  const verifyMfa = useCallback(async (email: string, code: string) => {
    const res = await fetch(`${BASE_URL}/api/mobile/mfa/verify`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, code }),
    });
    const data = await res.json().catch(() => ({ message: "MFA failed" }));
    if (!res.ok) {
      throw new Error(data.message || "MFA verification failed");
    }
    await saveToken(data.token);
    const user: User = data.user;
    const profile: Profile | null = data.profile ?? {
      username: user.username ?? "",
      displayName: user.displayName ?? user.email,
      avatarUrl: user.avatarUrl ?? null,
      bio: null,
    };
    setState({ token: data.token, user, profile, isLoading: false });
  }, []);

  const resendMfaCode = useCallback(async (email: string) => {
    const res = await fetch(`${BASE_URL}/api/mobile/mfa/resend`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });
    const data = await res.json().catch(() => ({ message: "Failed to resend" }));
    if (!res.ok) {
      const err: any = new Error(data.message || "Failed to resend code");
      const match = data.message?.match(/(\d+)\s+second/);
      if (match) err.waitSeconds = parseInt(match[1], 10);
      throw err;
    }
    return data as { message: string };
  }, []);

  const resendVerification = useCallback(async (email: string) => {
    const res = await fetch(`${BASE_URL}/api/auth/resend-verification`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });
    const data = await res.json().catch(() => ({ message: "Failed" }));
    if (!res.ok) throw new Error(data.message || "Failed to resend verification");
  }, []);

  const forgotPassword = useCallback(async (email: string) => {
    const res = await fetch(`${BASE_URL}/api/auth/forgot-password`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });
    const data = await res.json().catch(() => ({ message: "Request failed" }));
    if (!res.ok) throw new Error(data.message || "Failed to send reset email");
  }, []);

  const resetPassword = useCallback(async (token: string, password: string) => {
    const res = await fetch(`${BASE_URL}/api/auth/reset-password`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, password }),
    });
    const data = await res.json().catch(() => ({ message: "Request failed" }));
    if (!res.ok) throw new Error(data.message || "Password reset failed");
  }, []);

  const changePassword = useCallback(async (currentPassword: string, newPassword: string) => {
    if (!state.token) throw new Error("Not signed in");
    const res = await fetch(`${BASE_URL}/api/auth/change-password`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${state.token}`,
      },
      body: JSON.stringify({ currentPassword, newPassword }),
    });
    const data = await res.json().catch(() => ({ message: "Request failed" }));
    if (!res.ok) throw new Error(data.message || "Failed to change password");
  }, [state.token]);

  const resetMfa = useCallback(async () => {
    if (!state.token) throw new Error("Not signed in");
    const res = await fetch(`${BASE_URL}/api/auth/mfa/reset`, {
      method: "POST",
      headers: { Authorization: `Bearer ${state.token}` },
    });
    const data = await res.json().catch(() => ({ message: "Request failed" }));
    if (!res.ok) throw new Error(data.message || "Failed to reset MFA");
  }, [state.token]);

  const logout = useCallback(async () => {
    if (state.token) {
      try {
        await fetch(`${BASE_URL}/api/auth/logout`, {
          method: "POST",
          headers: { Authorization: `Bearer ${state.token}` },
        });
      } catch {}
    }
    await deleteToken();
    setState({ token: null, user: null, profile: null, isLoading: false });
  }, [state.token]);

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
    <AuthContext.Provider
      value={{ ...state, login, verifyMfa, resendMfaCode, resendVerification, forgotPassword, resetPassword, changePassword, resetMfa, logout, refreshMe, apiRequest }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}

const ADMIN_ROLES = ["ADMIN", "SUPERADMIN", "SUPER_ADMIN", "SUPERUSER"];

export function getEffectiveTier(user: User | null): string {
  if (!user) return "GZLurker";
  if (ADMIN_ROLES.includes(user.role)) return "GZEnterprise";
  return user.subscriptionTier || "GZLurker";
}

export function isAdminUser(user: User | null): boolean {
  if (!user) return false;
  return ADMIN_ROLES.includes(user.role);
}

export { BASE_URL };
