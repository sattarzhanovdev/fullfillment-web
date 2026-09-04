"use client";

import type { ReactNode } from "react";
import { Sidebar } from "@/components/layout/sidebar";
import { Topbar } from "@/components/layout/topbar";
import { AuthGuard } from "@/components/layout/auth-guard";

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return (
    <AuthGuard allow={["ADMIN", "DIRECTOR", "MANAGER", "STOREKEEPER", "PACKER"]}>
      <div className="flex h-screen overflow-hidden bg-[var(--color-background)] print:h-auto print:overflow-visible">
        <Sidebar />
        <div className="flex min-w-0 flex-1 flex-col print:overflow-visible">
          <Topbar />
          <main className="flex-1 overflow-y-auto px-6 py-6 lg:px-8 print:overflow-visible print:px-0 print:py-0">
            {children}
          </main>
        </div>
      </div>
    </AuthGuard>
  );
}
