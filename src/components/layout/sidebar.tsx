"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { ChevronDown, Package2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/lib/auth-store";
import { NAV_SECTIONS, isNavVisible } from "./nav-config";

function isActive(pathname: string, href?: string) {
  if (!href) return false;
  return pathname === href || pathname.startsWith(href + "/");
}

export function Sidebar() {
  const pathname = usePathname();
  const role = useAuthStore((s) => s.user?.role);
  const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>({});

  if (!role) return null;

  return (
    <aside className="hidden w-64 shrink-0 flex-col border-r border-[var(--color-border)] bg-[var(--color-surface-2)] lg:flex print:hidden">
      <div className="flex h-16 items-center gap-2 px-5">
        <div className="flex h-8 w-8 items-center justify-center rounded-[10px] bg-[var(--color-accent)] text-white">
          <Package2 className="h-4.5 w-4.5" />
        </div>
        <span className="text-[14px] font-semibold tracking-tight">Fulfillment</span>
      </div>
      <nav className="flex-1 overflow-y-auto px-3 pb-6">
        {NAV_SECTIONS.filter((s) => isNavVisible(s.roles, role)).map((section) => {
          const visibleItems = section.items?.filter((i) => isNavVisible(i.roles, role));
          const hasItems = visibleItems && visibleItems.length > 0;
          const active = isActive(pathname, section.href) || visibleItems?.some((i) => isActive(pathname, i.href));
          const collapsed = collapsedGroups[section.label];
          const SectionIcon = section.icon;

          if (!hasItems && section.href) {
            return (
              <Link
                key={section.label}
                href={section.href}
                className={cn(
                  "mb-0.5 flex items-center gap-2.5 rounded-[10px] px-3 py-2 text-[13.5px] font-medium text-[var(--color-foreground-muted)] transition-colors hover:bg-[var(--color-border)]/40 hover:text-[var(--color-foreground)]",
                  active && "bg-[var(--color-accent)]/12 text-[var(--color-accent)] hover:bg-[var(--color-accent)]/12",
                )}
              >
                {SectionIcon ? <SectionIcon className="h-4 w-4 shrink-0" strokeWidth={2} /> : null}
                {section.label}
              </Link>
            );
          }

          return (
            <div key={section.label} className="mb-1">
              <button
                type="button"
                onClick={() => setCollapsedGroups((c) => ({ ...c, [section.label]: !c[section.label] }))}
                className={cn(
                  "flex w-full items-center justify-between rounded-[10px] px-3 py-2 text-[13.5px] font-medium text-[var(--color-foreground-muted)] hover:bg-[var(--color-border)]/40 hover:text-[var(--color-foreground)]",
                  active && "text-[var(--color-foreground)]",
                )}
              >
                <span className="flex items-center gap-2.5">
                  {SectionIcon ? <SectionIcon className="h-4 w-4 shrink-0" strokeWidth={2} /> : null}
                  {section.label}
                </span>
                <ChevronDown className={cn("h-3.5 w-3.5 shrink-0 transition-transform", collapsed && "-rotate-90")} />
              </button>
              {!collapsed && (
                <div className="ml-[18px] mt-0.5 flex flex-col gap-0.5 border-l border-[var(--color-border)] pl-3">
                  {visibleItems!.map((item) => {
                    const ItemIcon = item.icon;
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        className={cn(
                          "flex items-center gap-2.5 rounded-[8px] px-3 py-1.5 text-[13px] text-[var(--color-foreground-muted)] transition-colors hover:bg-[var(--color-border)]/40 hover:text-[var(--color-foreground)]",
                          isActive(pathname, item.href) && "bg-[var(--color-accent)]/12 text-[var(--color-accent)] hover:bg-[var(--color-accent)]/12",
                        )}
                      >
                        {ItemIcon ? <ItemIcon className="h-3.5 w-3.5 shrink-0" strokeWidth={2} /> : null}
                        {item.label}
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </nav>
    </aside>
  );
}
