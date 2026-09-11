import * as React from "react";
import { cn } from "@/lib/utils";

/** Панель фильтров/поиска над таблицей — визуально группирует контролы вместо «голых» инпутов на фоне страницы. */
export function Toolbar({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "mb-4 flex flex-wrap items-center gap-3 rounded-[var(--radius-card)] border border-[var(--color-border)] bg-[var(--color-surface-3)] p-3",
        className,
      )}
      {...props}
    />
  );
}
