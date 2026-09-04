"use client";

import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { Bell, LogOut, Search, User } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { apiClient } from "@/lib/api-client";
import { useAuthStore } from "@/lib/auth-store";
import { ROLE_LABELS } from "@/lib/status";
import { cn } from "@/lib/utils";

export function Topbar() {
  const user = useAuthStore((s) => s.user);
  const clear = useAuthStore((s) => s.clear);
  const router = useRouter();

  const { data: unreadCount } = useQuery({
    queryKey: ["notifications", "unread-count"],
    queryFn: async () => (await apiClient.get<number>("/notifications/unread-count")).data,
    refetchInterval: 30_000,
    enabled: !!user,
  });

  async function handleLogout() {
    try {
      await apiClient.post("/auth/logout");
    } catch {
      // no-op
    }
    clear();
    router.push("/login");
  }

  if (!user) return null;

  return (
    <header className="flex h-16 items-center justify-between gap-4 border-b border-[var(--color-border)] bg-[var(--color-surface)]/80 px-6 backdrop-blur-md print:hidden">
      <div className="relative w-full max-w-sm">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--color-foreground-muted)]" />
        <input
          placeholder="Артикул / штрихкод / название"
          className="h-9 w-full rounded-[var(--radius-pill)] border border-[var(--color-border)] bg-[var(--color-surface-2)] pl-9 pr-4 text-[13.5px] outline-none focus:border-[var(--color-accent)] focus:ring-2 focus:ring-[var(--color-accent)]/20"
        />
      </div>

      <div className="flex items-center gap-3">
        <Link
          href="/notifications"
          className="relative flex h-9 w-9 items-center justify-center rounded-full text-[var(--color-foreground-muted)] hover:bg-[var(--color-surface-2)]"
        >
          <Bell className="h-4.5 w-4.5" />
          {!!unreadCount && unreadCount > 0 && (
            <span className="absolute right-1 top-1 flex h-2 w-2 rounded-full bg-[var(--color-danger)]" />
          )}
        </Link>

        <DropdownMenu.Root>
          <DropdownMenu.Trigger asChild>
            <button className="flex items-center gap-2 rounded-full border border-[var(--color-border)] py-1 pl-1 pr-3 hover:bg-[var(--color-surface-2)]">
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[var(--color-accent)]/15 text-[var(--color-accent)]">
                <User className="h-3.5 w-3.5" />
              </span>
              <span className="text-[13px] font-medium">{user.fullName}</span>
            </button>
          </DropdownMenu.Trigger>
          <DropdownMenu.Portal>
            <DropdownMenu.Content
              align="end"
              sideOffset={8}
              className={cn(
                "min-w-[200px] rounded-[14px] border border-[var(--color-border)] bg-[var(--color-surface)] p-1.5 shadow-[var(--shadow-elevated)]",
              )}
            >
              <div className="px-3 py-2">
                <p className="text-[13px] font-medium">{user.fullName}</p>
                <p className="text-[12px] text-[var(--color-foreground-muted)]">{ROLE_LABELS[user.role]}</p>
              </div>
              <DropdownMenu.Separator className="my-1 h-px bg-[var(--color-border)]" />
              <DropdownMenu.Item
                onSelect={handleLogout}
                className="flex cursor-pointer items-center gap-2 rounded-[10px] px-3 py-2 text-[13px] text-[var(--color-danger)] outline-none hover:bg-[var(--color-danger-bg)]"
              >
                <LogOut className="h-3.5 w-3.5" />
                Выйти
              </DropdownMenu.Item>
            </DropdownMenu.Content>
          </DropdownMenu.Portal>
        </DropdownMenu.Root>
      </div>
    </header>
  );
}
