"use client";

import { useEffect, type ReactNode } from "react";
import axios from "axios";
import { useAuthStore, type AuthUser } from "@/lib/auth-store";
import { apiClient } from "@/lib/api-client";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/api";

export function AuthProvider({ children }: { children: ReactNode }) {
  const setSession = useAuthStore((s) => s.setSession);
  const setStatus = useAuthStore((s) => s.setStatus);

  useEffect(() => {
    let cancelled = false;

    async function hydrate() {
      try {
        const refreshRes = await axios.post<{ accessToken: string }>(
          `${API_URL}/auth/refresh`,
          {},
          { withCredentials: true },
        );
        const accessToken = refreshRes.data.accessToken;
        const meRes = await apiClient.get<AuthUser>("/auth/me", {
          headers: { Authorization: `Bearer ${accessToken}` },
        });
        if (!cancelled) {
          setSession(accessToken, meRes.data);
        }
      } catch {
        if (!cancelled) {
          setStatus("unauthenticated");
        }
      }
    }

    hydrate();
    return () => {
      cancelled = true;
    };
  }, [setSession, setStatus]);

  return <>{children}</>;
}
