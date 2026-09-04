"use client";

import type { HTMLAttributes } from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

export const Dialog = DialogPrimitive.Root;
export const DialogTrigger = DialogPrimitive.Trigger;
export const DialogClose = DialogPrimitive.Close;

export function DialogContent({
  className,
  children,
  title,
  description,
  ...props
}: DialogPrimitive.DialogContentProps & { title: string; description?: string }) {
  return (
    <DialogPrimitive.Portal>
      <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/35 backdrop-blur-[3px] data-[state=open]:animate-[overlay-in_0.18s_ease-out] data-[state=closed]:animate-[overlay-out_0.15s_ease-in]" />
      <DialogPrimitive.Content
        className={cn(
          "fixed left-1/2 top-1/2 z-50 flex max-h-[85vh] w-[92vw] max-w-lg -translate-x-1/2 -translate-y-1/2 flex-col overflow-hidden rounded-[var(--radius-card)] border border-[var(--color-border)] bg-[var(--color-surface)] shadow-[var(--shadow-elevated)] focus:outline-none",
          "data-[state=open]:animate-[dialog-in_0.18s_cubic-bezier(0.16,1,0.3,1)] data-[state=closed]:animate-[dialog-out_0.15s_ease-in]",
          className,
        )}
        {...props}
      >
        <div className="flex shrink-0 items-start justify-between gap-4 px-6 pb-4 pt-6">
          <div className="min-w-0">
            <DialogPrimitive.Title className="text-[16px] font-semibold tracking-tight text-[var(--color-foreground)]">
              {title}
            </DialogPrimitive.Title>
            {description ? (
              <DialogPrimitive.Description className="mt-1 text-[13px] leading-relaxed text-[var(--color-foreground-muted)]">
                {description}
              </DialogPrimitive.Description>
            ) : null}
          </div>
          <DialogPrimitive.Close className="shrink-0 rounded-full p-1.5 text-[var(--color-foreground-muted)] transition-colors hover:bg-[var(--color-surface-2)] hover:text-[var(--color-foreground)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)]">
            <X className="h-4 w-4" />
            <span className="sr-only">Закрыть</span>
          </DialogPrimitive.Close>
        </div>
        <div className="min-h-0 overflow-y-auto px-6 pb-6">{children}</div>
      </DialogPrimitive.Content>
    </DialogPrimitive.Portal>
  );
}

/** Единообразный футер с кнопками действий — с разделителем сверху, прилипает к низу диалога. */
export function DialogFooter({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "-mx-6 -mb-6 mt-6 flex shrink-0 items-center justify-end gap-2 border-t border-[var(--color-border)] bg-[var(--color-surface-2)]/60 px-6 py-4",
        className,
      )}
      {...props}
    />
  );
}
