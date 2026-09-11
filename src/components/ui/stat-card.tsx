import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { Card } from "./card";

const TONE_STYLES = {
  neutral: { text: "text-[var(--color-foreground)]", bar: "bg-[var(--color-border-strong)]", chipBg: "bg-[var(--color-surface-3)]", chipFg: "text-[var(--color-foreground-muted)]" },
  success: { text: "text-[var(--color-success)]", bar: "bg-[var(--color-success)]", chipBg: "bg-[var(--color-success-bg)]", chipFg: "text-[var(--color-success)]" },
  warning: { text: "text-[var(--color-warning)]", bar: "bg-[var(--color-warning)]", chipBg: "bg-[var(--color-warning-bg)]", chipFg: "text-[var(--color-warning)]" },
  danger: { text: "text-[var(--color-danger)]", bar: "bg-[var(--color-danger)]", chipBg: "bg-[var(--color-danger-bg)]", chipFg: "text-[var(--color-danger)]" },
  accent: { text: "text-[var(--color-accent)]", bar: "bg-[var(--color-accent)]", chipBg: "bg-[var(--color-accent)]/12", chipFg: "text-[var(--color-accent)]" },
} as const;

export function StatCard({
  label,
  value,
  hint,
  tone = "neutral",
  icon: Icon,
  className,
}: {
  label: string;
  value: React.ReactNode;
  hint?: React.ReactNode;
  tone?: "neutral" | "success" | "warning" | "danger" | "accent";
  icon?: LucideIcon;
  className?: string;
}) {
  const t = TONE_STYLES[tone];

  return (
    <Card className={cn("relative overflow-hidden p-5 pl-6", className)}>
      <span className={cn("absolute inset-y-0 left-0 w-[3px]", t.bar)} aria-hidden />
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-[12.5px] font-medium text-[var(--color-foreground-muted)]">{label}</div>
          <div className={cn("mt-2 text-[27px] font-semibold tracking-tight tabular-nums", t.text)}>{value}</div>
          {hint ? <div className="mt-1 text-[12px] text-[var(--color-foreground-muted)]">{hint}</div> : null}
        </div>
        {Icon ? (
          <span className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-[11px]", t.chipBg, t.chipFg)}>
            <Icon className="h-4.5 w-4.5" />
          </span>
        ) : null}
      </div>
    </Card>
  );
}
