"use client";

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useCategories } from "@/lib/categories";
import { getSupabase } from "@/lib/supabase/client";
import { buildIndex, SEARCH_COLUMNS, type SearchItem } from "@/lib/search/engine";
import { compactCode } from "@/lib/search/normalize";
import type { QueryContext } from "@/lib/search/query";

// Loads the searchable fields of every item once and indexes them in memory.
// Under the "items" key, so any item mutation refreshes it.
export function useSearchIndex() {
  const categories = useCategories();
  const query = useQuery({
    queryKey: ["items", "search-index"],
    queryFn: async (): Promise<SearchItem[]> => {
      const { data, error } = await getSupabase().from("items").select(SEARCH_COLUMNS);
      if (error) throw error;
      return data;
    },
  });

  // The category helpers change only when categories are reloaded.
  const { lineage, paramsFor } = categories;
  const index = useMemo(() => buildIndex(query.data ?? [], { lineage, paramsFor }), [query.data, lineage, paramsFor]);

  const context = useMemo<QueryContext>(
    () => ({
      categories: (categories.data ?? []).map((category) => ({ id: category.id, name: category.name })),
      packages: new Set((query.data ?? []).flatMap((item) => (item.package ? [compactCode(item.package)] : []))),
    }),
    [categories.data, query.data],
  );

  return { index, context, categories, isPending: query.isPending || categories.isPending, isError: query.isError };
}
