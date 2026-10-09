import React, { createContext, useContext, useEffect, useState } from "react";
import { API_BASE_URL } from "../shared/utils/apiConfig";

export interface AuthUser {
  userId: number;
  officerId: string | null;
  username?: string | null;
  phoneNumber?: string | null;
  role: "superadmin" | "jc" | "mtp" | "atp" | "bi" | "operator";
  name: string;
  zone: string | null;
  block?: string | null;
  blocks?: string[] | null;
  designation?: string | null;
}

export interface AuthContextValue {
  user: AuthUser | null;
  token: string | null;
  login: (identifier: string, password: string) => Promise<void>;
  logout: () => void;
  isLoading: boolean;
  updateToken: (newToken: string) => void;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

const TOKEN_KEY = "mcl_token";
const USER_KEY = "mcl_user";

// Global fetch interceptor to attach Bearer token to all /api requests (relative & absolute)
if (typeof window !== "undefined" && !(window as unknown as { __mcl_fetch_patched?: boolean }).__mcl_fetch_patched) {
  (window as unknown as { __mcl_fetch_patched?: boolean }).__mcl_fetch_patched = true;
  const originalFetch = window.fetch.bind(window);

  window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
    const token = window.localStorage.getItem(TOKEN_KEY);

    if (token) {
      const url =
        typeof input === "string"
          ? input
          : input instanceof URL
          ? input.href
          : (input as Request).url;

      // Match relative /api paths and absolute URLs containing /api (e.g. http://localhost:5000/api/...)
      if (url.startsWith("/api") || url.includes("/api")) {
        const headers = new Headers(init?.headers);
        if (!headers.has("Authorization")) {
          headers.set("Authorization", `Bearer ${token}`);
        }
        init = {
          ...init,
          headers,
        };
      }
    }

    return originalFetch(input, init);
  };
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [token, setToken] = useState<string | null>(() => {
    try {
      return localStorage.getItem(TOKEN_KEY);
    } catch {
      return null;
    }
  });

  const [user, setUser] = useState<AuthUser | null>(() => {
    try {
      const storedUser = localStorage.getItem(USER_KEY);
      return storedUser ? (JSON.parse(storedUser) as AuthUser) : null;
    } catch {
      return null;
    }
  });

  const [isLoading] = useState(false);

  // Sync latest user profile with /api/auth/me on mount if logged in
  useEffect(() => {
    if (!token) return;

    let active = true;
    fetch(`${API_BASE_URL}/auth/me`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (active && data?.success && data.user) {
          setUser(data.user as AuthUser);
          localStorage.setItem(USER_KEY, JSON.stringify(data.user));
        }
      })
      .catch(() => {});

    return () => {
      active = false;
    };
  }, [token]);

  const login = async (identifier: string, password: string): Promise<void> => {
    const loginUrl = `${API_BASE_URL}/auth/login`;

    let response: Response;
    try {
      response = await fetch(loginUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ identifier, password }),
      });
    } catch {
      throw new Error("Unable to connect to server. Please ensure the backend is running.");
    }

    if (response.status === 200) {
      const data = await response.json();
      const nextToken: string = data.token;
      const nextUser: AuthUser = data.user;

      localStorage.setItem(TOKEN_KEY, nextToken);
      localStorage.setItem(USER_KEY, JSON.stringify(nextUser));

      setToken(nextToken);
      setUser(nextUser);
      return;
    }

    if (response.status === 401) {
      throw new Error("Invalid credentials");
    }

    if (response.status === 423) {
      const data = await response.json().catch(() => ({}));
      const remainingMinutes = data.remainingMinutes ?? 15;
      throw new Error(`Account locked. Try again in ${remainingMinutes} minutes.`);
    }

    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.message || "Login failed. Please try again.");
  };

  const updateToken = (newToken: string) => {
    localStorage.setItem(TOKEN_KEY, newToken);
    setToken(newToken);
  };

  const refreshUser = async () => {
    const curToken = token || localStorage.getItem(TOKEN_KEY);
    if (!curToken) return;
    try {
      const res = await fetch(`${API_BASE_URL}/auth/me`, {
        headers: { Authorization: `Bearer ${curToken}` },
      });
      if (res.ok) {
        const data = await res.json();
        if (data?.success && data.user) {
          setUser(data.user as AuthUser);
          localStorage.setItem(USER_KEY, JSON.stringify(data.user));
        }
      }
    } catch {
      // ignore
    }
  };

  const logout = () => {
    const currentToken = token || localStorage.getItem(TOKEN_KEY);

    if (currentToken) {
      const logoutUrl = `${API_BASE_URL}/auth/logout`;

      // Best-effort call; do not await or block logout flow
      fetch(logoutUrl, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${currentToken}`,
        },
      }).catch(() => {});
    }

    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    setToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, token, login, logout, isLoading, updateToken, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
};

// eslint-disable-next-line react-refresh/only-export-components
export const useAuth = (): AuthContextValue => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};

