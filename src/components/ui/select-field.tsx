import { useId, type ComponentProps } from "react";
import { cn } from "@/lib/cn";

type SelectFieldProps = ComponentProps<"select"> & { label: string };

// Labelled native select (fast and accessible on mobile).
export function SelectField({ label, className, id, children, ...props }: SelectFieldProps) {
  const generatedId = useId();
  const selectId = id ?? generatedId;
  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <label htmlFor={selectId} className="text-sm font-medium">
        {label}
      </label>
      <select
        id={selectId}
        className="min-h-touch rounded-control border border-border-strong bg-surface px-3 text-base text-fg focus:border-primary"
        {...props}
      >
        {children}
      </select>
    </div>
  );
}
