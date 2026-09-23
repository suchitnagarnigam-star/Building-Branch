import React, { createContext, useContext, useEffect, useState } from "react";

export interface AuthUser {
  userId: number;
  officerId: string | null;
  role: "superadmin" | "jc" | "mtp" | "atp" | "bi" | "operator";
  name: string;
  zone: string | null;
}

export interface AuthContextValue {
  user: AuthUser | null;
  token: string | null;
  login: (identifier: string, password: string) => Promise<void>;
  logout: () => void;
  isLoading: boolean;
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
  const [user, setUser] = useState<AuthUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Initialize auth state from localStorage on mount
  useEffect(() => {
    try {
      const storedToken = localStorage.getItem(TOKEN_KEY);
      const storedUser = localStorage.getItem(USER_KEY);

      if (storedToken && storedUser) {
        setToken(storedToken);
        setUser(JSON.parse(storedUser) as AuthUser);
      }
    } catch (err) {
      console.error("Failed to parse stored auth session:", err);
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem(USER_KEY);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const login = async (identifier: string, password: string): Promise<void> => {
    const apiBase = (import.meta.env.VITE_API_BASE_URL as string | undefined) ?? "/api";
    const loginUrl = `${apiBase.replace(/\/$/, "")}/auth/login`;

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

  const logout = () => {
    const currentToken = token || localStorage.getItem(TOKEN_KEY);

    if (currentToken) {
      const apiBase = (import.meta.env.VITE_API_BASE_URL as string | undefined) ?? "/api";
      const logoutUrl = `${apiBase.replace(/\/$/, "")}/auth/logout`;

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
    <AuthContext.Provider value={{ user, token, login, logout, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextValue => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};

