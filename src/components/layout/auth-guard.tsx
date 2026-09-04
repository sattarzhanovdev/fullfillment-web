"use client";

import { useEffect, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore, type UserRole } from "@/lib/auth-store";

export function AuthGuard({ children, allow }: { children: ReactNode; allow?: UserRole[] }) {
  const status = useAuthStore((s) => s.status);
  const user = useAuthStore((s) => s.user);
  const router = useRouter();

  useEffect(() => {
    if (status === "unauthenticated") {
      router.replace("/login");
    }
  }, [status, router]);

  const forbidden = status === "authenticated" && !!user && !!allow && !allow.includes(user.role);

  useEffect(() => {
    if (forbidden) {
      router.replace(user!.role === "CLIENT" ? "/portal" : "/dashboard");
    }
  }, [forbidden, user, router]);

  if (status === "loading") {
    return (
      <div className="flex h-screen items-center justify-center bg-[var(--color-background)] text-[13.5px] text-[var(--color-foreground-muted)]">
        Загрузка…
      </div>
    );
  }

  if (status === "unauthenticated" || forbidden) {
    return null;
  }

  return <>{children}</>;
}
