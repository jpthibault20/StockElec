"use client";

import { useMemo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { getSupabase } from "@/lib/supabase/client";
import type { Row } from "@/lib/supabase/types";
import type { IndexedItem } from "@/lib/search/engine";
import { useSearchIndex } from "@/lib/search/use-search-index";
import { needsRestock, suggestedPurchase } from "@/lib/stock";

// Shopping list (spec 4.7): items under their threshold are computed from the
// stock; the `shopping_list` table holds manual entries and the "purchased"
// state of computed ones (row with the item id).

export type ShoppingEntry = Row<"shopping_list">;
type Link = Pick<Row<"item_links">, "item_id" | "supplier" | "url" | "unit_price">;

export const shoppingKeys = {
  entries: ["shopping", "entries"] as const,
  links: (ids: string[]) => ["items", "shopping-links", ids] as const,
};

// Items to buy again, from the in-memory stock index.
export function useRestockItems() {
  const { index, isPending } = useSearchIndex();
  const items = useMemo(
    () =>
      index
        .filter((entry) => needsRestock(entry.item))
        .sort((a, b) => a.item.name.localeCompare(b.item.name, "fr")),
    [index],
  );
  return { items, isPending };
}

export function useShoppingEntries() {
  return useQuery({
    queryKey: shoppingKeys.entries,
    queryFn: async (): Promise<ShoppingEntry[]> => {
      const { data, error } = await getSupabase().from("shopping_list").select("*").order("created_at");
      if (error) throw error;
      return data;
    },
  });
}

export function useSupplierLinks(itemIds: string[]) {
  return useQuery({
    queryKey: shoppingKeys.links(itemIds),
    enabled: itemIds.length > 0,
    queryFn: async (): Promise<Link[]> => {
      const { data, error } = await getSupabase()
        .from("item_links")
        .select("item_id, supplier, url, unit_price")
        .in("item_id", itemIds);
      if (error) throw error;
      return data;
    },
  });
}

export type ShoppingLine = {
  key: string;
  label: string;
  quantity: number;
  // Computed from the stock (under threshold) or added by hand.
  auto: boolean;
  entry: ShoppingEntry | null;
  stockItem: IndexedItem | null;
  itemId: string | null;
  purchased: boolean;
  link: Link | null;
};

// Cheapest link first (no price last).
function bestLink(links: Link[]): Link | null {
  return (
    [...links].sort((a, b) => (a.unit_price ?? Infinity) - (b.unit_price ?? Infinity))[0] ?? null
  );
}

// Merges computed and manual lines, then groups them by supplier.
export function buildShoppingGroups(
  restock: IndexedItem[],
  entries: ShoppingEntry[],
  links: Link[],
  nameOf: (itemId: string) => string | null,
): Array<{ supplier: string; lines: ShoppingLine[] }> {
  const linksByItem = new Map<string, Link[]>();
  for (const link of links) linksByItem.set(link.item_id, [...(linksByItem.get(link.item_id) ?? []), link]);
  const entryByItem = new Map(entries.filter((e) => e.item_id).map((e) => [e.item_id!, e]));

  const lines: ShoppingLine[] = restock.map((stockItem) => {
    const entry = entryByItem.get(stockItem.item.id) ?? null;
    return {
      key: `auto-${stockItem.item.id}`,
      label: stockItem.item.name,
      quantity: entry?.quantity ? Number(entry.quantity) : suggestedPurchase(stockItem.item),
      auto: true,
      entry,
      stockItem,
      itemId: stockItem.item.id,
      purchased: entry?.purchased ?? false,
      link: bestLink(linksByItem.get(stockItem.item.id) ?? []),
    };
  });

  const restockIds = new Set(restock.map((entry) => entry.item.id));
  for (const entry of entries) {
    // Rows of items still under threshold are already merged above. Purchased
    // rows stay visible (checked) until "Vider les achetés".
    if (entry.item_id && restockIds.has(entry.item_id)) continue;
    lines.push({
      key: entry.id,
      label: entry.label ?? (entry.item_id ? nameOf(entry.item_id) : null) ?? "Article supprimé",
      quantity: Number(entry.quantity),
      auto: false,
      entry,
      stockItem: null,
      itemId: entry.item_id,
      purchased: entry.purchased,
      link: entry.item_id ? bestLink(linksByItem.get(entry.item_id) ?? []) : null,
    });
  }

  const groups = new Map<string, ShoppingLine[]>();
  for (const line of lines) {
    const supplier = line.link?.supplier ?? "Sans fournisseur";
    groups.set(supplier, [...(groups.get(supplier) ?? []), line]);
  }
  return [...groups.entries()]
    .sort(([a], [b]) => (a === "Sans fournisseur" ? 1 : b === "Sans fournisseur" ? -1 : a.localeCompare(b, "fr")))
    .map(([supplier, groupLines]) => ({
      supplier,
      lines: groupLines.sort((a, b) => Number(a.purchased) - Number(b.purchased) || a.label.localeCompare(b.label, "fr")),
    }));
}

export function useAddShoppingEntry() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: { label?: string; itemId?: string; quantity: number }) => {
      const { error } = await getSupabase()
        .from("shopping_list")
        .insert({ label: input.label ?? null, item_id: input.itemId ?? null, quantity: input.quantity });
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: shoppingKeys.entries }),
  });
}

// Checks or unchecks a line. A computed line gets a row the first time.
export function useTogglePurchased() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (line: ShoppingLine) => {
      const supabase = getSupabase();
      const purchased = !line.purchased;
      if (line.entry) {
        const { error } = await supabase.from("shopping_list").update({ purchased }).eq("id", line.entry.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("shopping_list")
          .insert({ item_id: line.itemId, quantity: line.quantity, purchased });
        if (error) throw error;
      }
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: shoppingKeys.entries }),
  });
}

export function useDeleteShoppingEntry() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await getSupabase().from("shopping_list").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: shoppingKeys.entries }),
  });
}

export function useClearPurchased() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const { error } = await getSupabase().from("shopping_list").delete().eq("purchased", true);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: shoppingKeys.entries }),
  });
}
