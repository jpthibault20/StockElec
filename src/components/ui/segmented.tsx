"use client";

import { cn } from "@/lib/cn";

type SegmentedProps<T extends string> = {
  label: string;
  value: T | null;
  options: Array<{ value: T; label: string }>;
  onChange: (value: T) => void;
  size?: "sm" | "md";
  className?: string;
};

// Single choice among a few options (radio group styled as buttons).
export function Segmented<T extends string>({
  label,
  value,
  options,
  onChange,
  size = "md",
  className,
}: SegmentedProps<T>) {
  return (
    <div role="radiogroup" aria-label={label} className={cn("flex gap-1 rounded-control bg-surface-muted p-1", className)}>
      {options.map((option) => {
        const selected = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={selected}
            onClick={() => onChange(option.value)}
            className={cn(
              "flex-1 rounded-[calc(var(--radius-control)-0.25rem)] px-2 font-medium whitespace-nowrap transition-colors duration-150",
              size === "sm" ? "min-h-9 text-sm" : "min-h-touch",
              selected ? "bg-primary-solid text-on-primary shadow-sm" : "text-muted hover:text-fg",
            )}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
