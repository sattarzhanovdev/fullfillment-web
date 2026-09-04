import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center gap-1.5 rounded-[var(--radius-pill)] px-2.5 py-1 text-[11.5px] font-medium leading-none",
  {
    variants: {
      variant: {
        neutral: "bg-[var(--color-surface-2)] text-[var(--color-foreground-muted)] border border-[var(--color-border)]",
        accent: "bg-[var(--color-accent)]/12 text-[var(--color-accent)]",
        success: "bg-[var(--color-success-bg)] text-[var(--color-success)]",
        warning: "bg-[var(--color-warning-bg)] text-[var(--color-warning)]",
        danger: "bg-[var(--color-danger-bg)] text-[var(--color-danger)]",
        reserve: "bg-[var(--color-reserve-bg)] text-[var(--color-reserve)]",
      },
    },
    defaultVariants: { variant: "neutral" },
  },
);

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement>, VariantProps<typeof badgeVariants> {}

export function Badge({ className, variant, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ variant }), className)} {...props} />;
}
