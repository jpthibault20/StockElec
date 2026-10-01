import type { ReactNode } from "react";

// Placeholder for empty lists and screens.
export function EmptyState({
  icon,
  title,
  children,
}: {
  icon?: ReactNode;
  title: string;
  children?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center gap-3 px-6 py-12 text-center">
      {icon && <div className="flex size-20 items-center justify-center rounded-full bg-accent-soft text-accent-fg">{icon}</div>}
      <h2 className="text-lg font-semibold">{title}</h2>
      {children && <div className="max-w-sm text-muted">{children}</div>}
    </div>
  );
}
