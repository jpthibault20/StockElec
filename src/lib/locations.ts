"use client";

import { useMemo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { getSupabase } from "@/lib/supabase/client";
import type { Row } from "@/lib/supabase/types";

export type Location = Row<"locations">;

export type LocationTree = {
  byId: Map<string, Location>;
  childrenOf: Map<string | null, Location[]>;
};

export const locationKeys = {
  all: ["locations"] as const,
};

// Suggested values for the free "kind" field.
export const LOCATION_KINDS = ["Pièce", "Meuble", "Étagère", "Tiroir", "Boîte", "Carton", "Bac"];

function byName(a: Location, b: Location): number {
  return a.name.localeCompare(b.name, "fr", { numeric: true, sensitivity: "base" });
}

export function buildTree(locations: Location[]): LocationTree {
  const byId = new Map(locations.map((location) => [location.id, location]));
  const childrenOf = new Map<string | null, Location[]>();
  for (const location of locations) {
    const siblings = childrenOf.get(location.parent_id) ?? [];
    siblings.push(location);
    childrenOf.set(location.parent_id, siblings);
  }
  for (const siblings of childrenOf.values()) siblings.sort(byName);
  return { byId, childrenOf };
}

// Ancestors from the root down to the location itself.
export function pathOf(tree: LocationTree, id: string): Location[] {
  const path: Location[] = [];
  const seen = new Set<string>();
  let current = tree.byId.get(id);
  while (current && !seen.has(current.id)) {
    seen.add(current.id);
    path.unshift(current);
    current = current.parent_id ? tree.byId.get(current.parent_id) : undefined;
  }
  return path;
}

export function pathLabel(tree: LocationTree, id: string): string {
  return pathOf(tree, id)
    .map((location) => location.name)
    .join(" › ");
}

// The location and all its descendants.
export function subtreeIds(tree: LocationTree, id: string): string[] {
  const ids: string[] = [];
  const stack = [id];
  while (stack.length > 0) {
    const current = stack.pop()!;
    ids.push(current);
    for (const child of tree.childrenOf.get(current) ?? []) stack.push(child.id);
  }
  return ids;
}

// Depth-first list of every location with its depth, for pickers and labels.
export function flattenTree(tree: LocationTree): Array<{ location: Location; depth: number }> {
  const result: Array<{ location: Location; depth: number }> = [];
  const visit = (parentId: string | null, depth: number) => {
    for (const location of tree.childrenOf.get(parentId) ?? []) {
      result.push({ location, depth });
      visit(location.id, depth + 1);
    }
  };
  visit(null, 0);
  return result;
}

// All locations are loaded at once: a personal stock has at most a few
// hundred, and the whole tree is needed for paths and pickers.
export function useLocations() {
  const query = useQuery({
    queryKey: locationKeys.all,
    queryFn: async () => {
      const { data, error } = await getSupabase().from("locations").select("*");
      if (error) throw error;
      return data;
    },
  });
  const tree = useMemo(() => buildTree(query.data ?? []), [query.data]);
  return { ...query, tree };
}

export type LocationInput = { name: string; kind: string | null; parent_id: string | null };

export function useSaveLocation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, input }: { id?: string; input: LocationInput }) => {
      const supabase = getSupabase();
      const { data, error } = id
        ? await supabase.from("locations").update(input).eq("id", id).select().single()
        : await supabase.from("locations").insert(input).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: locationKeys.all }),
  });
}

export function useMoveLocation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, parentId }: { id: string; parentId: string | null }) => {
      const { error } = await getSupabase()
        .from("locations")
        .update({ parent_id: parentId })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: locationKeys.all }),
  });
}

export class LocationNotEmptyError extends Error {}

export function useDeleteLocation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await getSupabase().from("locations").delete().eq("id", id);
      // 23503 = foreign key violation: sub-locations still point to it.
      if (error?.code === "23503") throw new LocationNotEmptyError();
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: locationKeys.all });
      queryClient.invalidateQueries({ queryKey: ["items"] });
    },
  });
}
