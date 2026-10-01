// In-memory search over the whole stock: fast (< 300 ms on thousands of
// items), typo-tolerant, parametric, and usable offline on cached data.

import type { ParamDef } from "@/lib/categories";
import type { Row } from "@/lib/supabase/types";
import { stockStatus, type StockStatus } from "@/lib/stock";
import { allowedTypos, compactCode, editDistance, normalizeText } from "@/lib/search/normalize";
import type { ParsedQuery, QueryToken } from "@/lib/search/query";

export const SEARCH_COLUMNS =
  "id, name, mpn, manufacturer, package, barcode, notes, tags, params, quantity, unit, quantity_mode, approx_level, min_threshold, category_id, location_id, type" as const;

export type SearchItem = Pick<
  Row<"items">,
  | "id"
  | "name"
  | "mpn"
  | "manufacturer"
  | "package"
  | "barcode"
  | "notes"
  | "tags"
  | "params"
  | "quantity"
  | "unit"
  | "quantity_mode"
  | "approx_level"
  | "min_threshold"
  | "category_id"
  | "location_id"
  | "type"
>;

export type IndexedItem = {
  item: SearchItem;
  // Normalized searchable text: name, MPN, manufacturer, package, notes, tags, category.
  haystack: string;
  words: string[];
  // Compact MPN / package / barcode for reference matching.
  codes: string[];
  packageCode: string;
  // Category ids from the root down.
  lineage: string[];
  params: Record<string, string | number>;
  paramDefs: ParamDef[];
  status: StockStatus;
};

export type CategoryHelpers = {
  lineage: (id: string | null) => Array<{ id: string; name: string }>;
  paramsFor: (id: string | null) => ParamDef[];
};

export function buildIndex(items: SearchItem[], categories: CategoryHelpers): IndexedItem[] {
  return items.map((item) => {
    const lineage = categories.lineage(item.category_id);
    const haystack = normalizeText(
      [
        item.name,
        item.mpn,
        item.manufacturer,
        item.package,
        item.notes,
        ...(item.tags ?? []),
        ...lineage.map((category) => category.name),
      ]
        .filter(Boolean)
        .join(" "),
    );
    return {
      item,
      haystack,
      words: [...new Set(haystack.split(" "))],
      codes: [item.mpn, item.package, item.barcode].filter(Boolean).map((code) => compactCode(code!)),
      packageCode: item.package ? compactCode(item.package) : "",
      lineage: lineage.map((category) => category.id),
      params: (item.params ?? {}) as Record<string, string | number>,
      paramDefs: categories.paramsFor(item.category_id),
      status: stockStatus(item),
    };
  });
}

export function sameValue(a: number, b: number): boolean {
  return a === b || Math.abs(a - b) <= Math.max(Math.abs(a), Math.abs(b)) * 0.01;
}

// Free-text score of one query word: 3 reference, 2.5 substring, 2 word
// prefix, 1 typo-tolerant word match, 0 no match.
function textScore(norm: string, entry: IndexedItem): number {
  const code = compactCode(norm);
  if (code.length >= 3 && entry.codes.some((c) => c.startsWith(code))) return 3;
  if (entry.haystack.includes(norm)) return 2.5;
  if (code.length >= 3 && entry.codes.some((c) => c.includes(code))) return 2.5;
  const typos = allowedTypos(norm.length);
  if (typos === 0) return 0;
  for (const word of entry.words) {
    if (word.startsWith(norm.slice(0, Math.max(3, norm.length - typos)))) return 2;
    if (editDistance(norm, word, typos) <= typos) return 1;
    // Typo inside a longer word: compare with its prefix of the same length.
    if (word.length > norm.length && editDistance(norm, word.slice(0, norm.length), typos) <= typos) return 1;
  }
  return 0;
}

function tokenScore(token: QueryToken, entry: IndexedItem): number {
  switch (token.kind) {
    case "value": {
      const match = entry.paramDefs.some(
        (def) =>
          (def.kind === "engineering" || def.kind === "decimal") &&
          (token.unit === null || def.unit === token.unit) &&
          typeof entry.params[def.key] === "number" &&
          sameValue(entry.params[def.key] as number, token.value),
      );
      return match ? 4 : textScore(token.norm, entry);
    }
    case "package":
      return entry.packageCode === token.code ? 4 : textScore(token.norm, entry);
    case "category":
      return entry.lineage.some((id) => token.categoryIds.includes(id)) ? 3 : textScore(token.norm, entry);
    case "text":
      return textScore(token.norm, entry);
  }
}

export type SearchFilters = {
  type: Row<"items">["type"] | null;
  categoryId: string | null;
  // Location and its sub-locations.
  locationIds: Set<string> | null;
  stock: "low" | "out" | null;
};

export const NO_FILTERS: SearchFilters = { type: null, categoryId: null, locationIds: null, stock: null };

function passesFilters(entry: IndexedItem, filters: SearchFilters): boolean {
  if (filters.type && entry.item.type !== filters.type) return false;
  if (filters.categoryId && !entry.lineage.includes(filters.categoryId)) return false;
  if (filters.locationIds && !(entry.item.location_id && filters.locationIds.has(entry.item.location_id))) return false;
  if (filters.stock && entry.status !== filters.stock) return false;
  return true;
}

export type SearchResult = { entry: IndexedItem; score: number };

export function hasActiveFilters(filters: SearchFilters): boolean {
  return Boolean(filters.type || filters.categoryId || filters.locationIds || filters.stock);
}

// Every query word must match (AND). Results: best score first, in-stock
// items before out-of-stock ones, then by name.
export function search(index: IndexedItem[], query: ParsedQuery, filters: SearchFilters, limit = 100): SearchResult[] {
  if (query.tokens.length === 0 && !hasActiveFilters(filters)) return [];
  const results: SearchResult[] = [];

  for (const entry of index) {
    if (!passesFilters(entry, filters)) continue;
    if (query.barcode && entry.item.barcode === query.barcode) {
      results.push({ entry, score: 100 });
      continue;
    }
    let score = 0;
    let matched = true;
    for (const token of query.tokens) {
      const tokenValue = tokenScore(token, entry);
      if (tokenValue === 0) {
        matched = false;
        break;
      }
      score += tokenValue;
    }
    if (matched) results.push({ entry, score });
  }

  return results
    .sort(
      (a, b) =>
        b.score - a.score ||
        Number(b.entry.status !== "out") - Number(a.entry.status !== "out") ||
        a.entry.item.name.localeCompare(b.entry.item.name, "fr"),
    )
    .slice(0, limit);
}
