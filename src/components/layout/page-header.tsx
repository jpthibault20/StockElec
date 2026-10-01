import type { ReactNode } from "react";

// Title row at the top of a screen, with optional actions on the right.
export function PageHeader({ title, actions }: { title: string; actions?: ReactNode }) {
  return (
    <div className="mb-4 flex min-h-touch items-center justify-between gap-3">
      <h1 className="flex items-center gap-2.5 text-2xl font-bold tracking-tight">
        <span aria-hidden className="h-6 w-1.5 rounded-full bg-primary-solid" />
        {title}
      </h1>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  );
}
