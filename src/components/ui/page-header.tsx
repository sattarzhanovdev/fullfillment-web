import type { ReactNode } from "react";

export function PageHeader({
  title,
  description,
  actions,
}: {
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <div className="mb-7 flex flex-wrap items-start justify-between gap-4 border-b border-[var(--color-border)] pb-5">
      <div>
        <h1 className="text-[23px] font-semibold tracking-tight text-[var(--color-foreground)]">{title}</h1>
        {description ? <p className="mt-1.5 text-[13.5px] text-[var(--color-foreground-muted)]">{description}</p> : null}
      </div>
      {actions ? <div className="flex items-center gap-2">{actions}</div> : null}
    </div>
  );
}
