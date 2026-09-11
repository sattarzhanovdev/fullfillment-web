"use client";

import * as DropdownMenuPrimitive from "@radix-ui/react-dropdown-menu";
import { cn } from "@/lib/utils";

export const DropdownMenu = DropdownMenuPrimitive.Root;
export const DropdownMenuTrigger = DropdownMenuPrimitive.Trigger;

export function DropdownMenuContent({ className, sideOffset = 8, align = "end", ...props }: DropdownMenuPrimitive.DropdownMenuContentProps) {
  return (
    <DropdownMenuPrimitive.Portal>
      <DropdownMenuPrimitive.Content
        align={align}
        sideOffset={sideOffset}
        className={cn(
          "z-50 min-w-[200px] rounded-[14px] border border-[var(--color-border)] bg-[var(--color-surface)] p-1.5 shadow-[var(--shadow-elevated)]",
          className,
        )}
        {...props}
      />
    </DropdownMenuPrimitive.Portal>
  );
}

export function DropdownMenuItem({ className, danger, ...props }: DropdownMenuPrimitive.DropdownMenuItemProps & { danger?: boolean }) {
  return (
    <DropdownMenuPrimitive.Item
      className={cn(
        "flex cursor-pointer items-center gap-2 rounded-[10px] px-3 py-2 text-[13px] outline-none",
        danger
          ? "text-[var(--color-danger)] hover:bg-[var(--color-danger-bg)]"
          : "text-[var(--color-foreground)] hover:bg-[var(--color-surface-2)]",
        className,
      )}
      {...props}
    />
  );
}

export function DropdownMenuSeparator({ className, ...props }: DropdownMenuPrimitive.DropdownMenuSeparatorProps) {
  return <DropdownMenuPrimitive.Separator className={cn("my-1 h-px bg-[var(--color-border)]", className)} {...props} />;
}
