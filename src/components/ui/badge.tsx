import type { ComponentProps } from "react";
import { cn } from "@/lib/cn";

type Tone = "neutral" | "accent" | "alert";

const tones: Record<Tone, string> = {
  neutral: "bg-surface-muted text-fg",
  accent: "bg-accent text-on-accent",
  alert: "bg-alert-soft text-alert",
};

export function Badge({ tone = "neutral", className, ...props }: ComponentProps<"span"> & { tone?: Tone }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-sm font-semibold tabular-nums",
        tones[tone],
        className,
      )}
      {...props}
    />
  );
}
