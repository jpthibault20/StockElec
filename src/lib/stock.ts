import type { Enum } from "@/lib/supabase/types";

type StockFields = {
  quantity: number;
  quantity_mode: Enum<"quantity_mode">;
  approx_level: Enum<"approx_level"> | null;
  min_threshold: number | null;
};

export type StockStatus = "ok" | "low" | "out";

// Exact stock: out at 0, low at or under the threshold (when one is set).
// Bulk stock: low when "Presque vide", never counted as out.
export function stockStatus(item: StockFields): StockStatus {
  if (item.quantity_mode === "approximate") return item.approx_level === "almost_empty" ? "low" : "ok";
  const quantity = Number(item.quantity);
  if (quantity <= 0) return "out";
  if (item.min_threshold != null && quantity <= Number(item.min_threshold)) return "low";
  return "ok";
}

export function inStock(item: StockFields): boolean {
  return stockStatus(item) !== "out";
}

// "À racheter" (spec 4.6): low stock, or out of stock when a threshold is set.
// Items without a threshold are never listed (alerts are opt-in per item).
export function needsRestock(item: StockFields): boolean {
  const status = stockStatus(item);
  if (status === "low") return true;
  return status === "out" && item.min_threshold != null;
}

// Quantity to buy to get back over the threshold (at least 1).
export function suggestedPurchase(item: StockFields): number {
  if (item.quantity_mode === "approximate" || item.min_threshold == null) return 1;
  return Math.max(1, Math.ceil(Number(item.min_threshold) - Number(item.quantity)) + 1);
}
