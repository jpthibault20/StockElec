"use client";

import { useInfiniteQuery } from "@tanstack/react-query";
import { getSupabase } from "@/lib/supabase/client";
import type { Enum } from "@/lib/supabase/types";

// Stock movements journal (spec 4.10), written by the items_log_movement trigger.

const PAGE_SIZE = 50;

const MOVEMENT_COLUMNS = `id, type, delta, created_at, item_id,
  item:items(name, unit, quantity_mode),
  from:locations!stock_movements_from_location_id_fkey(name),
  to:locations!stock_movements_to_location_id_fkey(name)` as const;

export const MOVEMENT_LABELS: Record<Enum<"movement_type">, string> = {
  add: "Ajout",
  remove: "Retrait",
  move: "Déplacement",
};

export function useMovements({ itemId, type, pageSize = PAGE_SIZE }: { itemId?: string; type?: Enum<"movement_type"> | null; pageSize?: number }) {
  return useInfiniteQuery({
    queryKey: ["items", "movements", itemId ?? "all", type ?? "all", pageSize],
    initialPageParam: 0,
    queryFn: async ({ pageParam }) => {
      let request = getSupabase()
        .from("stock_movements")
        .select(MOVEMENT_COLUMNS)
        .order("created_at", { ascending: false })
        .range(pageParam * pageSize, pageParam * pageSize + pageSize - 1);
      if (itemId) request = request.eq("item_id", itemId);
      if (type) request = request.eq("type", type);
      const { data, error } = await request;
      if (error) throw error;
      return data;
    },
    getNextPageParam: (lastPage, pages) => (lastPage.length === pageSize ? pages.length : undefined),
  });
}

export type Movement = NonNullable<ReturnType<typeof useMovements>["data"]>["pages"][number][number];
