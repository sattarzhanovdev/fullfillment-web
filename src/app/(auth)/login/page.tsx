"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Package2 } from "lucide-react";
import axios from "axios";
import { apiClient, apiErrorMessage } from "@/lib/api-client";
import { useAuthStore } from "@/lib/auth-store";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { Card } from "@/components/ui/card";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/api";

export default function LoginPage() {
  const router = useRouter();
  const setSession = useAuthStore((s) => s.setSession);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [twoFactorCode, setTwoFactorCode] = useState("");
  const [needsTwoFactor, setNeedsTwoFactor] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await axios.post(
        `${API_URL}/auth/login`,
        { email, password, twoFactorCode: twoFactorCode || undefined },
        { withCredentials: true },
      );

      if (res.data.requiresTwoFactor) {
        setNeedsTwoFactor(true);
        return;
      }

      setSession(res.data.accessToken, res.data.user);
      const meRes = await apiClient.get("/auth/me", {
        headers: { Authorization: `Bearer ${res.data.accessToken}` },
      });
      setSession(res.data.accessToken, meRes.data);
      router.push(meRes.data.role === "CLIENT" ? "/portal" : "/dashboard");
    } catch (err) {
      setError(apiErrorMessage(err, "Неверный email или пароль"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card className="w-full max-w-[380px] p-8">
      <div className="mb-6 flex flex-col items-center text-center">
        <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-[14px] bg-[var(--color-accent)] text-white">
          <Package2 className="h-5.5 w-5.5" />
        </div>
        <h1 className="text-[19px] font-semibold tracking-tight">Fulfillment Center</h1>
        <p className="mt-1 text-[13px] text-[var(--color-foreground-muted)]">Вход в систему</p>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div>
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            required
            autoFocus
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@company.com"
          />
        </div>
        <div>
          <Label htmlFor="password">Пароль</Label>
          <Input
            id="password"
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
          />
        </div>

        {needsTwoFactor && (
          <div>
            <Label htmlFor="code">Код из приложения-аутентификатора</Label>
            <Input
              id="code"
              inputMode="numeric"
              autoFocus
              value={twoFactorCode}
              onChange={(e) => setTwoFactorCode(e.target.value)}
              placeholder="123456"
            />
          </div>
        )}

        {error ? <p className="text-[13px] text-[var(--color-danger)]">{error}</p> : null}

        <Button type="submit" size="lg" disabled={loading} className="mt-1 w-full">
          {loading ? "Входим…" : "Войти"}
        </Button>
      </form>
    </Card>
  );
}
