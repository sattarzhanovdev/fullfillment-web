"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/lib/auth-store";

export default function RootPage() {
  const router = useRouter();
  const status = useAuthStore((s) => s.status);
  const role = useAuthStore((s) => s.user?.role);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.replace("/login");
    } else if (status === "authenticated") {
      router.replace(role === "CLIENT" ? "/portal" : "/dashboard");
    }
  }, [status, role, router]);

  return (
    <div className="flex h-screen items-center justify-center bg-[var(--color-background)] text-[13.5px] text-[var(--color-foreground-muted)]">
      Загрузка…
    </div>
  );
}
