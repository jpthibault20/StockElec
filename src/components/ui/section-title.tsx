import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

// Section heading with its icon in a tinted tile, and an optional action.
export function SectionTitle({
  id,
  icon,
  tone = "accent",
  action,
  children,
}: {
  id?: string;
  icon: ReactNode;
  tone?: "accent" | "alert";
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-2">
      <h2 id={id} className="flex items-center gap-2.5 text-lg font-semibold">
        <span
          aria-hidden
          className={cn(
            "flex size-8 shrink-0 items-center justify-center rounded-control",
            tone === "alert" ? "bg-alert-soft text-alert" : "bg-accent-soft text-accent-fg",
          )}
        >
          {icon}
        </span>
        {children}
      </h2>
      {action}
    </div>
  );
}
