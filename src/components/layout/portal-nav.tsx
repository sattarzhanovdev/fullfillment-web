"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { useRouter } from "next/navigation";
import { ClipboardList, FileText, Home, LogOut, Package2, Tag, User } from "lucide-react";
import { apiClient } from "@/lib/api-client";
import { useAuthStore } from "@/lib/auth-store";
import { cn } from "@/lib/utils";

const LINKS = [
  { label: "Главная", href: "/portal", icon: Home },
  { label: "Товары", href: "/portal/products", icon: Tag },
  { label: "Заказы", href: "/portal/orders", icon: ClipboardList },
  { label: "Документы", href: "/portal/documents", icon: FileText },
];

function isActive(pathname: string, href: string) {
  if (href === "/portal") return pathname === "/portal";
  return pathname === href || pathname.startsWith(href + "/");
}

export function PortalNav() {
  const pathname = usePathname();
  const user = useAuthStore((s) => s.user);
  const clear = useAuthStore((s) => s.clear);
  const router = useRouter();

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
    <header className="border-b border-[var(--color-border)] bg-[var(--color-surface)]/80 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-5xl items-center justify-between gap-6 px-6">
        <div className="flex items-center gap-8">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-[10px] bg-[var(--color-accent)] text-white">
              <Package2 className="h-4.5 w-4.5" />
            </div>
            <span className="text-[14px] font-semibold tracking-tight">Личный кабинет</span>
          </div>
          <nav className="hidden items-center gap-1 sm:flex">
            {LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  "flex items-center gap-1.5 rounded-[var(--radius-pill)] px-3.5 py-1.5 text-[13.5px] font-medium text-[var(--color-foreground-muted)] transition-colors hover:bg-[var(--color-surface-2)] hover:text-[var(--color-foreground)]",
                  isActive(pathname, link.href) && "bg-[var(--color-accent)]/12 text-[var(--color-accent)] hover:bg-[var(--color-accent)]/12",
                )}
              >
                <link.icon className="h-3.5 w-3.5" strokeWidth={2} />
                {link.label}
              </Link>
            ))}
          </nav>
        </div>

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
              className="min-w-[180px] rounded-[14px] border border-[var(--color-border)] bg-[var(--color-surface)] p-1.5 shadow-[var(--shadow-elevated)]"
            >
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
      <nav className="flex items-center gap-1 overflow-x-auto px-6 pb-2 sm:hidden">
        {LINKS.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className={cn(
              "flex shrink-0 items-center gap-1.5 rounded-[var(--radius-pill)] px-3.5 py-1.5 text-[13px] font-medium text-[var(--color-foreground-muted)]",
              isActive(pathname, link.href) && "bg-[var(--color-accent)]/12 text-[var(--color-accent)]",
            )}
          >
            <link.icon className="h-3.5 w-3.5" strokeWidth={2} />
            {link.label}
          </Link>
        ))}
      </nav>
    </header>
  );
}
