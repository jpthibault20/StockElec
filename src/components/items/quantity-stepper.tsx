"use client";

import { Minus, Plus } from "lucide-react";
import { Segmented } from "@/components/ui/segmented";
import { cn } from "@/lib/cn";
import { APPROX_LABELS, formatQuantity } from "@/lib/format";
import { useAdjustQuantity, useSetApproxLevel, type ItemSummary } from "@/lib/items";
import type { Enum } from "@/lib/supabase/types";

const APPROX_OPTIONS = (Object.keys(APPROX_LABELS) as Array<Enum<"approx_level">>).map((value) => ({
  value,
  label: APPROX_LABELS[value],
}));

// −1 / +1 for exact stock, or Beaucoup / Un peu / Presque vide for bulk stock.
// Updates are instant on screen and saved in the background.
export function QuantityStepper({ item, size = "md" }: { item: ItemSummary; size?: "sm" | "md" | "lg" }) {
  const adjust = useAdjustQuantity();
  const setLevel = useSetApproxLevel();

  if (item.quantity_mode === "approximate") {
    return (
      <Segmented
        label={`Niveau de stock de ${item.name}`}
        size={size === "lg" ? "md" : "sm"}
        value={item.approx_level}
        options={APPROX_OPTIONS}
        onChange={(level) => setLevel.mutate({ id: item.id, level })}
        className={size === "lg" ? "w-full" : "w-full sm:w-auto"}
      />
    );
  }

  const base = cn(
    "inline-flex shrink-0 items-center justify-center rounded-full",
    "transition-[transform,background-color,filter] duration-150 active:scale-90 disabled:opacity-40",
    size === "lg" ? "size-14" : "size-touch",
  );
  const minusButton = cn(base, "border border-border-strong bg-surface hover:bg-surface-muted");
  const plusButton = cn(base, "bg-primary-solid text-on-primary shadow-sm hover:brightness-110");
  const quantity = Number(item.quantity);

  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        aria-label={`Retirer 1 ${item.name}`}
        className={minusButton}
        disabled={quantity <= 0}
        onClick={() => adjust.mutate({ id: item.id, delta: -1, item })}
      >
        <Minus aria-hidden size={size === "lg" ? 26 : 20} />
      </button>
      <span
        aria-live="polite"
        className={cn(
          "min-w-16 text-center font-semibold tabular-nums",
          size === "lg" ? "text-2xl" : "text-sm",
          quantity === 0 && "text-alert",
        )}
      >
        {formatQuantity(item)}
      </span>
      <button
        type="button"
        aria-label={`Ajouter 1 ${item.name}`}
        className={plusButton}
        onClick={() => adjust.mutate({ id: item.id, delta: 1 })}
      >
        <Plus aria-hidden size={size === "lg" ? 26 : 20} />
      </button>
    </div>
  );
}
