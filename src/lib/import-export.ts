"use client";

import Papa from "papaparse";
import type { QueryClient } from "@tanstack/react-query";
import { supplierFromUrl } from "@/components/items/links-editor";
import {
  CSV_HEADERS,
  canonicalHeader,
  formatCsvNumber,
  labels,
  parseImportRecord,
  splitPath,
  toCsv,
  type ParsedImportRow,
} from "@/lib/csv";
import { pathLabel, type LocationTree } from "@/lib/locations";
import { getSupabase } from "@/lib/supabase/client";
import type { Insert } from "@/lib/supabase/types";

// --- Export ---------------------------------------------------------------

type CategoryLabel = (id: string | null) => string;

// Downloads the whole stock as CSV (spec section 7: full export at any time).
export async function exportStockCsv(categoryLabel: CategoryLabel, tree: LocationTree): Promise<number> {
  const { data, error } = await getSupabase()
    .from("items")
    .select("*, links:item_links(supplier, url, unit_price)")
    .order("name");
  if (error) throw error;

  const rows: string[][] = [[...CSV_HEADERS]];
  for (const item of data) {
    const link = item.links[0];
    rows.push([
      item.name,
      labels.type[item.type],
      categoryLabel(item.category_id),
      item.location_id ? pathLabel(tree, item.location_id) : "",
      formatCsvNumber(item.quantity),
      labels.unit[item.unit],
      labels.mode[item.quantity_mode],
      item.approx_level ? labels.level[item.approx_level] : "",
      formatCsvNumber(item.min_threshold),
      item.mpn ?? "",
      item.manufacturer ?? "",
      item.package ?? "",
      item.barcode ?? "",
      item.params && Object.keys(item.params).length > 0 ? JSON.stringify(item.params) : "",
      (item.tags ?? []).join("|"),
      link?.supplier ?? "",
      link?.url ?? "",
      formatCsvNumber(link?.unit_price),
      item.notes ?? "",
    ]);
  }

  const blob = new Blob([toCsv(rows)], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `stockelec-${new Date().toISOString().slice(0, 10)}.csv`;
  anchor.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  return data.length;
}

// --- Import ---------------------------------------------------------------

// Reads a CSV file (separator detected: ";" or ",") into validated rows.
export function readImportFile(file: File): Promise<ParsedImportRow[]> {
  return new Promise((resolve, reject) => {
    Papa.parse<Record<string, string>>(file, {
      header: true,
      skipEmptyLines: "greedy",
      transformHeader: canonicalHeader,
      complete: (result) => resolve(result.data.map((record, index) => parseImportRecord(record, index + 2))),
      error: reject,
    });
  });
}

export type ImportOptions = { mergeSameMpn: boolean };
export type ImportSummary = { created: number; merged: number; skipped: number; locationsCreated: number };

function normalizePath(path: string): string {
  return splitPath(path)
    .map((part) => part.toLowerCase())
    .join("/");
}

// Imports valid rows: resolves categories by path, creates missing locations,
// merges or skips items whose MPN already exists, then inserts the rest by
// batches of 100 with their supplier link. History is written by the trigger.
export async function importRows(
  rows: ParsedImportRow[],
  options: ImportOptions,
  context: { categoryIdByPath: Map<string, string>; tree: LocationTree },
): Promise<ImportSummary> {
  const supabase = getSupabase();
  const summary: ImportSummary = { created: 0, merged: 0, skipped: 0, locationsCreated: 0 };
  const valid = rows.filter((row) => row.errors.length === 0);

  // Existing MPNs (case and spaces ignored).
  const { data: existing, error: existingError } = await supabase.from("items").select("id, mpn, quantity_mode").not("mpn", "is", null);
  if (existingError) throw existingError;
  const mpnKey = (mpn: string) => mpn.toLowerCase().replace(/\s+/g, "");
  const byMpn = new Map(existing.map((item) => [mpnKey(item.mpn!), item]));

  // Location paths → ids, created level by level when missing.
  const locationIds = new Map<string, string>();
  for (const location of context.tree.byId.values()) {
    locationIds.set(normalizePath(pathLabel(context.tree, location.id)), location.id);
  }
  async function resolveLocation(path: string): Promise<string | null> {
    const parts = splitPath(path);
    let parentId: string | null = null;
    for (let depth = 1; depth <= parts.length; depth++) {
      const key = parts.slice(0, depth).join("/").toLowerCase();
      let id: string | undefined = locationIds.get(key);
      if (!id) {
        const inserted: { data: { id: string } | null; error: unknown } = await supabase
          .from("locations")
          .insert({ name: parts[depth - 1], parent_id: parentId })
          .select("id")
          .single();
        if (inserted.error || !inserted.data) throw inserted.error;
        id = inserted.data.id;
        locationIds.set(key, id);
        summary.locationsCreated++;
      }
      parentId = id;
    }
    return parentId;
  }

  const toInsert: Array<{ fields: Insert<"items">; row: ParsedImportRow }> = [];
  for (const row of valid) {
    const match = row.mpn ? byMpn.get(mpnKey(row.mpn)) : undefined;
    if (match) {
      if (options.mergeSameMpn && match.quantity_mode === "exact" && row.quantity > 0) {
        const { error } = await supabase.rpc("adjust_item_quantity", { p_item_id: match.id, p_delta: row.quantity });
        if (error) throw error;
        summary.merged++;
      } else {
        summary.skipped++;
      }
      continue;
    }
    toInsert.push({
      row,
      fields: {
        name: row.name,
        type: row.type,
        category_id: row.categoryPath ? (context.categoryIdByPath.get(normalizePath(row.categoryPath)) ?? null) : null,
        location_id: row.locationPath ? await resolveLocation(row.locationPath) : null,
        quantity: row.mode === "exact" ? row.quantity : 0,
        unit: row.unit,
        quantity_mode: row.mode,
        approx_level: row.level,
        min_threshold: row.threshold,
        mpn: row.mpn,
        manufacturer: row.manufacturer,
        package: row.package,
        barcode: row.barcode,
        params: row.params,
        tags: row.tags,
        notes: row.notes,
      },
    });
    // Same MPN twice in the file: the second one is merged or skipped too.
    if (row.mpn) byMpn.set(mpnKey(row.mpn), { id: "", mpn: row.mpn, quantity_mode: "approximate" });
  }

  for (let start = 0; start < toInsert.length; start += 100) {
    const batch = toInsert.slice(start, start + 100);
    const { data, error } = await supabase.from("items").insert(batch.map((entry) => entry.fields)).select("id");
    if (error) throw error;
    summary.created += data.length;
    const links = batch.flatMap((entry, index) =>
      entry.row.url
        ? [
            {
              item_id: data[index].id,
              url: entry.row.url,
              supplier: entry.row.supplier ?? supplierFromUrl(entry.row.url) ?? "Fournisseur",
              unit_price: entry.row.price,
            },
          ]
        : [],
    );
    if (links.length > 0) {
      const { error: linkError } = await supabase.from("item_links").insert(links);
      if (linkError) throw linkError;
    }
  }
  return summary;
}

export function categoryPathIndex(ids: string[], label: CategoryLabel): Map<string, string> {
  return new Map(ids.map((id) => [normalizePath(label(id)), id]));
}

export function invalidateAfterImport(queryClient: QueryClient) {
  queryClient.invalidateQueries({ queryKey: ["items"] });
  queryClient.invalidateQueries({ queryKey: ["locations"] });
}
