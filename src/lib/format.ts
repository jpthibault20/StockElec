import type { Enum } from "@/lib/supabase/types";

export const APPROX_LABELS: Record<Enum<"approx_level">, string> = {
  plenty: "Beaucoup",
  some: "Un peu",
  almost_empty: "Presque vide",
};

const UNIT_LABELS: Record<Enum<"quantity_unit">, [singular: string, plural: string]> = {
  piece: ["pièce", "pièces"],
  meter: ["m", "m"],
  gram: ["g", "g"],
  spool: ["bobine", "bobines"],
};

const numberFormat = new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 3 });

type QuantityFields = {
  quantity: number;
  unit: Enum<"quantity_unit">;
  quantity_mode: Enum<"quantity_mode">;
  approx_level: Enum<"approx_level"> | null;
};

// "12 pièces", "3,5 m", or "Un peu" for approximate stock.
export function formatQuantity(item: QuantityFields): string {
  if (item.quantity_mode === "approximate") {
    return item.approx_level ? APPROX_LABELS[item.approx_level] : "—";
  }
  const [singular, plural] = UNIT_LABELS[item.unit];
  const value = Number(item.quantity);
  return `${numberFormat.format(value)} ${value > 1 ? plural : singular}`;
}
