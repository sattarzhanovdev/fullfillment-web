import { cn } from "@/lib/utils";
import { Card } from "./card";

export function StatCard({
  label,
  value,
  hint,
  tone = "neutral",
  className,
}: {
  label: string;
  value: React.ReactNode;
  hint?: React.ReactNode;
  tone?: "neutral" | "success" | "warning" | "danger";
  className?: string;
}) {
  const toneClass = {
    neutral: "text-[var(--color-foreground)]",
    success: "text-[var(--color-success)]",
    warning: "text-[var(--color-warning)]",
    danger: "text-[var(--color-danger)]",
  }[tone];

  return (
    <Card className={cn("p-5", className)}>
      <div className="text-[12.5px] font-medium text-[var(--color-foreground-muted)]">{label}</div>
      <div className={cn("mt-2 text-[26px] font-semibold tracking-tight", toneClass)}>{value}</div>
      {hint ? <div className="mt-1 text-[12px] text-[var(--color-foreground-muted)]">{hint}</div> : null}
    </Card>
  );
}
