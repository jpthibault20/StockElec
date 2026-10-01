"use client";

import { useMutation, useQuery, useQueryClient, type QueryClient } from "@tanstack/react-query";
import { getSupabase } from "@/lib/supabase/client";
import type { Enum, Insert, Row } from "@/lib/supabase/types";
import { removeItemPhotos, uploadItemPhoto } from "@/lib/photos";
import { upsertSpoolTare, type Filament, type FilamentFields } from "@/lib/filaments";
import { notifyLowStock } from "@/lib/notifications";

export const ITEM_TYPE_LABELS: Record<Enum<"item_type">, string> = {
  component: "Composant",
  consumable: "Consommable",
  tool: "Outillage",
  printing_3d: "Impression 3D",
};

export const UNIT_OPTIONS: Array<{ value: Enum<"quantity_unit">; label: string }> = [
  { value: "piece", label: "pièce(s)" },
  { value: "meter", label: "mètre(s)" },
  { value: "gram", label: "gramme(s)" },
  { value: "spool", label: "bobine(s)" },
];

// Columns needed to list an item.
const SUMMARY_COLUMNS =
  "id, name, mpn, package, quantity, unit, quantity_mode, approx_level, min_threshold, location_id, category_id" as const;

export type ItemSummary = Pick<
  Row<"items">,
  | "id"
  | "name"
  | "mpn"
  | "package"
  | "quantity"
  | "unit"
  | "quantity_mode"
  | "approx_level"
  | "min_threshold"
  | "location_id"
  | "category_id"
>;

export type ItemPhoto = Row<"item_photos">;
export type ItemLink = Row<"item_links">;
export type ItemDetail = Row<"items"> & { photos: ItemPhoto[]; links: ItemLink[]; filament: Filament | null };

export const itemKeys = {
  all: ["items"] as const,
  list: ["items", "list"] as const,
  detail: (id: string) => ["items", "detail", id] as const,
  inLocations: (ids: string[]) => ["items", "in-locations", ids] as const,
  countsByLocation: ["items", "counts-by-location"] as const,
  pickerSearch: (query: string) => ["items", "picker", query] as const,
};

// Every item, for the list screen (a personal stock stays small enough).
export function useItems() {
  return useQuery({
    queryKey: itemKeys.list,
    queryFn: async (): Promise<ItemSummary[]> => {
      const { data, error } = await getSupabase().from("items").select(SUMMARY_COLUMNS).order("name");
      if (error) throw error;
      return data;
    },
  });
}

export function useItem(id: string | null) {
  return useQuery({
    queryKey: itemKeys.detail(id ?? ""),
    enabled: Boolean(id),
    queryFn: async (): Promise<ItemDetail | null> => {
      const { data, error } = await getSupabase()
        .from("items")
        .select("*, photos:item_photos(*), links:item_links(*), filament:filaments(*)")
        .eq("id", id!)
        .maybeSingle();
      if (error) throw error;
      if (!data) return null;
      data.photos.sort((a, b) => a.position - b.position);
      return data;
    },
  });
}

export function useItemsInLocations(locationIds: string[]) {
  return useQuery({
    queryKey: itemKeys.inLocations(locationIds),
    enabled: locationIds.length > 0,
    queryFn: async (): Promise<ItemSummary[]> => {
      const { data, error } = await getSupabase()
        .from("items")
        .select(SUMMARY_COLUMNS)
        .in("location_id", locationIds)
        .order("name");
      if (error) throw error;
      return data;
    },
  });
}

// Number of items stored directly in each location.
export function useItemCountsByLocation() {
  return useQuery({
    queryKey: itemKeys.countsByLocation,
    queryFn: async () => {
      const { data, error } = await getSupabase()
        .from("items")
        .select("location_id")
        .not("location_id", "is", null);
      if (error) throw error;
      const counts = new Map<string, number>();
      for (const { location_id } of data) {
        if (location_id) counts.set(location_id, (counts.get(location_id) ?? 0) + 1);
      }
      return counts;
    },
  });
}

// Escapes PostgREST filter syntax characters in a user query.
function sanitizeQuery(query: string): string {
  return query.replace(/[,()*%\\]/g, " ").trim();
}

// Simple name / MPN lookup used by pickers. Full search comes in step 7.
export function useItemPickerSearch(query: string) {
  const term = sanitizeQuery(query);
  return useQuery({
    queryKey: itemKeys.pickerSearch(term),
    queryFn: async (): Promise<ItemSummary[]> => {
      let request = getSupabase().from("items").select(SUMMARY_COLUMNS).order("name").limit(30);
      if (term) request = request.or(`name.ilike.*${term}*,mpn.ilike.*${term}*`);
      const { data, error } = await request;
      if (error) throw error;
      return data;
    },
  });
}

// Moves an item to a location. The database trigger records the move in the history.
export function useMoveItem() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ item, toLocationId }: { item: ItemSummary; toLocationId: string | null }) => {
      if (item.location_id === toLocationId) return;
      const { error } = await getSupabase()
        .from("items")
        .update({ location_id: toLocationId })
        .eq("id", item.id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: itemKeys.all }),
  });
}

// Applies a change to one item in every cached item list or detail.
function patchCachedItem(queryClient: QueryClient, id: string, patch: (item: ItemSummary) => Partial<ItemSummary>) {
  queryClient.setQueriesData({ queryKey: itemKeys.all }, (old: unknown) => {
    if (Array.isArray(old)) {
      return old.map((item: ItemSummary) => (item.id === id ? { ...item, ...patch(item) } : item));
    }
    if (old && typeof old === "object" && "id" in old && (old as ItemSummary).id === id) {
      return { ...old, ...patch(old as ItemSummary) };
    }
    return old;
  });
}

const ADJUST_KEY = ["adjust-quantity"];

// +1 / −1 (or any delta). The screen updates immediately; the database applies
// the change atomically and logs it in the history.
export function useAdjustQuantity() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationKey: ADJUST_KEY,
    mutationFn: async ({ id, delta }: { id: string; delta: number; item?: ItemSummary }) => {
      const { data, error } = await getSupabase().rpc("adjust_item_quantity", { p_item_id: id, p_delta: delta });
      if (error) throw error;
      return data;
    },
    onSuccess: (quantity, { item }) => {
      // Optional notification when this change crosses the alert threshold.
      const threshold = item?.min_threshold;
      if (item && threshold != null && Number(item.quantity) > threshold && quantity <= threshold) {
        void notifyLowStock(item.name, item.id);
      }
    },
    onMutate: async ({ id, delta }) => {
      await queryClient.cancelQueries({ queryKey: itemKeys.all });
      patchCachedItem(queryClient, id, (item) => ({ quantity: Math.max(0, Number(item.quantity) + delta) }));
    },
    onSettled: () => {
      // Refresh once the last pending tap is done, to avoid flicker.
      if (queryClient.isMutating({ mutationKey: ADJUST_KEY }) === 1) {
        queryClient.invalidateQueries({ queryKey: itemKeys.all });
      }
    },
  });
}

export function useSetApproxLevel() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, level }: { id: string; level: Enum<"approx_level"> }) => {
      const { error } = await getSupabase().from("items").update({ approx_level: level }).eq("id", id);
      if (error) throw error;
    },
    onMutate: ({ id, level }) => patchCachedItem(queryClient, id, () => ({ approx_level: level })),
    onSettled: () => queryClient.invalidateQueries({ queryKey: itemKeys.all }),
  });
}

export type ItemFields = Omit<Insert<"items">, "id" | "user_id" | "created_at" | "updated_at">;
export type LinkDraft = { supplier: string; url: string; unit_price: number | null };

export type SaveItemInput = {
  id?: string;
  userId: string;
  fields: ItemFields;
  links: LinkDraft[];
  // Existing photos to keep, in display order.
  keptPhotos: ItemPhoto[];
  // Existing photos removed in the form.
  removedPhotos: ItemPhoto[];
  // New compressed photos to upload.
  newPhotos: Blob[];
  // 3D printing filament details (one-to-one), saved when set.
  filament?: FilamentFields;
  // Empty spool weight to remember for the item's brand.
  rememberTare?: { brand: string; tareG: number };
};

// Uploads photos and attaches them to an item, after its existing ones.
export async function attachPhotos(userId: string, itemId: string, blobs: Blob[], startPosition: number) {
  if (blobs.length === 0) return;
  const paths = await Promise.all(blobs.map((blob) => uploadItemPhoto(userId, itemId, blob)));
  const { error } = await getSupabase()
    .from("item_photos")
    .insert(paths.map((storage_path, index) => ({ item_id: itemId, storage_path, position: startPosition + index })));
  if (error) throw error;
}

// Creates or updates an item with its supplier links and photos.
export function useSaveItem() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: SaveItemInput): Promise<string> => {
      const supabase = getSupabase();
      const { data: item, error } = input.id
        ? await supabase.from("items").update(input.fields).eq("id", input.id).select("id").single()
        : await supabase.from("items").insert(input.fields).select("id").single();
      if (error) throw error;
      const itemId = item.id;

      // Links are few: replace them all.
      const { error: deleteLinksError } = await supabase.from("item_links").delete().eq("item_id", itemId);
      if (deleteLinksError) throw deleteLinksError;
      if (input.links.length > 0) {
        const { error: linksError } = await supabase
          .from("item_links")
          .insert(input.links.map((link) => ({ ...link, item_id: itemId })));
        if (linksError) throw linksError;
      }

      if (input.removedPhotos.length > 0) {
        await removeItemPhotos(input.removedPhotos.map((photo) => photo.storage_path));
        const { error: photoDeleteError } = await supabase
          .from("item_photos")
          .delete()
          .in("id", input.removedPhotos.map((photo) => photo.id));
        if (photoDeleteError) throw photoDeleteError;
      }

      await attachPhotos(input.userId, itemId, input.newPhotos, input.keptPhotos.length);

      if (input.filament) {
        const { error: filamentError } = await supabase
          .from("filaments")
          .upsert({ ...input.filament, item_id: itemId }, { onConflict: "item_id" });
        if (filamentError) throw filamentError;
      }
      if (input.rememberTare) await upsertSpoolTare(input.rememberTare.brand, input.rememberTare.tareG);
      return itemId;
    },
    onSuccess: (_id, input) => {
      queryClient.invalidateQueries({ queryKey: itemKeys.all });
      if (input.rememberTare) queryClient.invalidateQueries({ queryKey: ["spool-tares"] });
    },
  });
}

export function useDeleteItem() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (item: ItemDetail) => {
      await removeItemPhotos(item.photos.map((photo) => photo.storage_path));
      const { error } = await getSupabase().from("items").delete().eq("id", item.id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: itemKeys.all }),
  });
}

type Params = Record<string, string | number>;

// Same value for a parameter: numbers within 1 %, text case-insensitive.
function sameParam(a: string | number, b: string | number): boolean {
  if (typeof a === "number" && typeof b === "number") {
    return a === b || Math.abs(a - b) <= Math.max(Math.abs(a), Math.abs(b)) * 0.01;
  }
  return String(a).trim().toLowerCase() === String(b).trim().toLowerCase();
}

function normalize(text: string | null | undefined): string {
  return (text ?? "").trim().toLowerCase().replace(/\s+/g, "");
}

// Anti-duplicate (spec 4.4): existing items with the same MPN or barcode, or in the same
// category with the same package and the same values for all shared params.
export async function findSimilarItems(fields: ItemFields, excludeId?: string): Promise<ItemSummary[]> {
  const mpn = normalize(fields.mpn);
  const barcode = normalize(fields.barcode);
  const params = (fields.params ?? {}) as Params;
  const paramKeys = Object.keys(params);
  const filters: string[] = [];
  if (mpn) filters.push(`mpn.ilike.${sanitizeQuery(fields.mpn ?? "")}`);
  if (barcode) filters.push(`barcode.eq.${sanitizeQuery(fields.barcode ?? "")}`);
  if (fields.category_id && paramKeys.length > 0) filters.push(`category_id.eq.${fields.category_id}`);
  if (filters.length === 0) return [];

  const { data, error } = await getSupabase()
    .from("items")
    .select(`${SUMMARY_COLUMNS}, params, barcode`)
    .or(filters.join(","))
    .limit(50);
  if (error) throw error;

  return data
    .filter((item) => item.id !== excludeId)
    .filter((item) => {
      if (mpn && normalize(item.mpn) === mpn) return true;
      if (barcode && normalize(item.barcode) === barcode) return true;
      if (item.category_id !== fields.category_id) return false;
      if (normalize(item.package) !== normalize(fields.package)) return false;
      const other = (item.params ?? {}) as Params;
      const shared = paramKeys.filter((key) => key in other);
      return shared.length > 0 && shared.every((key) => sameParam(params[key], other[key]));
    })
    .map((item): ItemSummary => {
      const summary: ItemSummary & { params?: unknown; barcode?: unknown } = { ...item };
      delete summary.params;
      delete summary.barcode;
      return summary;
    });
}

// Last modified items, for the home screen.
export function useRecentItems(limit = 8) {
  return useQuery({
    queryKey: ["items", "recent", limit],
    queryFn: async (): Promise<ItemSummary[]> => {
      const { data, error } = await getSupabase()
        .from("items")
        .select(SUMMARY_COLUMNS)
        .order("updated_at", { ascending: false })
        .limit(limit);
      if (error) throw error;
      return data;
    },
  });
}
