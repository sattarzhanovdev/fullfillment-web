"use client";

import type { ReactNode } from "react";
import { PortalNav } from "@/components/layout/portal-nav";
import { AuthGuard } from "@/components/layout/auth-guard";

export default function PortalLayout({ children }: { children: ReactNode }) {
  return (
    <AuthGuard allow={["CLIENT"]}>
      <div className="min-h-screen bg-[var(--color-background)]">
        <PortalNav />
        <main className="mx-auto max-w-5xl px-6 py-8">{children}</main>
      </div>
    </AuthGuard>
  );
}
