import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import { api, setAccessToken } from "./api";

type User = { id: string; username: string; email: string; avatarUrl?: string };

type AuthCtx = {
  user: User | null;
  accessToken: string | null;
  setSession: (token: string, user: User) => void;
  clearSession: () => Promise<void>;
};

const Ctx = createContext<AuthCtx | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [accessToken, setToken] = useState<string | null>(localStorage.getItem("accessToken"));
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    setAccessToken(accessToken);
  }, [accessToken]);

  useEffect(() => {
    const boot = async () => {
      if (!accessToken) return;
      try {
        const r = await api.get("/users/me");
        setUser(r.data);
      } catch {
        localStorage.removeItem("accessToken");
        setToken(null);
      }
    };
    boot();
  }, []);

  const value = useMemo<AuthCtx>(
    () => ({
      user,
      accessToken,
      setSession: (token, u) => {
        localStorage.setItem("accessToken", token);
        setToken(token);
        setUser(u);
      },
      clearSession: async () => {
        try {
          await api.post("/auth/logout");
        } catch {}
        localStorage.removeItem("accessToken");
        setToken(null);
        setUser(null);
      }
    }),
    [user, accessToken]
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAuth() {
  const v = useContext(Ctx);
  if (!v) throw new Error("AuthProvider missing");
  return v;
}
