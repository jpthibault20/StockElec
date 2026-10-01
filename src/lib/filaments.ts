"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { getSupabase } from "@/lib/supabase/client";
import type { Insert, Row } from "@/lib/supabase/types";

// 3D printing filament (spec 4.8). For a filament item, `items.quantity` holds
// the remaining grams (unit = gram): it drives alerts, search and history.
// `filaments.remaining_g` / `tare_g` mirror the last values saved.

export type Filament = Row<"filaments">;
export type FilamentFields = Omit<Insert<"filaments">, "item_id" | "user_id">;
export type SpoolTare = Row<"spool_tares">;

export const MATERIALS = ["PLA", "PLA+", "PETG", "ABS", "ASA", "TPU", "Nylon", "PC", "PVA", "HIPS"];
export const DIAMETERS = [1.75, 2.85] as const;

// Remaining filament from a weighing: measured spool weight minus empty spool.
export function remainingFromWeighing(measuredG: number, tareG: number): number {
  return Math.max(0, Math.round((measuredG - tareG) * 10) / 10);
}

export const tareKeys = { all: ["spool-tares"] as const };

export function useSpoolTares() {
  return useQuery({
    queryKey: tareKeys.all,
    queryFn: async (): Promise<SpoolTare[]> => {
      const { data, error } = await getSupabase().from("spool_tares").select("*").order("brand");
      if (error) throw error;
      return data;
    },
  });
}

export function tareForBrand(tares: SpoolTare[] | undefined, brand: string | null | undefined): number | null {
  if (!brand?.trim()) return null;
  const key = brand.trim().toLowerCase();
  const tare = tares?.find((entry) => entry.brand.trim().toLowerCase() === key);
  return tare ? Number(tare.tare_g) : null;
}

// Saves the empty spool weight of a brand (one row per brand and user).
export async function upsertSpoolTare(brand: string, tareG: number): Promise<void> {
  const { error } = await getSupabase()
    .from("spool_tares")
    .upsert({ brand: brand.trim(), tare_g: tareG }, { onConflict: "user_id,brand" });
  if (error) throw error;
}

export function useInvalidateTares() {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: tareKeys.all });
}

export function useSaveTare() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ brand, tareG }: { brand: string; tareG: number }) => upsertSpoolTare(brand, tareG),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: tareKeys.all }),
  });
}
