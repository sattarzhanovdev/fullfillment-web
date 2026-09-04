import { cn } from "@/lib/utils";

export function Spinner({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "inline-block h-4 w-4 animate-spin rounded-full border-2 border-[var(--color-border)] border-t-[var(--color-accent)]",
        className,
      )}
    />
  );
}

export function LoadingBlock({ label = "Загрузка…" }: { label?: string }) {
  return (
    <div className="flex items-center gap-2 py-16 text-[13.5px] text-[var(--color-foreground-muted)] justify-center">
      <Spinner />
      {label}
    </div>
  );
}
