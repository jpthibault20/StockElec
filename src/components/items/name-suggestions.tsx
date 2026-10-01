"use client";

import { useDeferredValue } from "react";
import Link from "next/link";
import { FolderTree, Package } from "lucide-react";
import { useCategories } from "@/lib/categories";
import { formatQuantity } from "@/lib/format";
import { useItemPickerSearch } from "@/lib/items";
import type { Enum } from "@/lib/supabase/types";

// Autocomplete under the name field of a new item (spec 4.4, manual mode):
// existing items (to avoid a duplicate, opens the item) and categories
// (to pick one in a tap).
export function NameSuggestions({
  query,
  itemType,
  onPickCategory,
}: {
  query: string;
  // Only categories of this item type are suggested.
  itemType: Enum<"item_type">;
  onPickCategory: (categoryId: string) => void;
}) {
  const term = useDeferredValue(query.trim());
  const enabled = term.length >= 2;
  const items = useItemPickerSearch(enabled ? term : "");
  const categories = useCategories();

  if (!enabled) return null;
  const lower = term.toLocaleLowerCase("fr");
  const matchingItems = (items.data ?? []).slice(0, 4);
  const matchingCategories = (categories.data ?? [])
    .filter((category) => category.name.toLocaleLowerCase("fr").includes(lower))
    .filter((category) => categories.suggestedType(category.id) === itemType)
    .slice(0, 3);
  if (matchingItems.length === 0 && matchingCategories.length === 0) return null;

  return (
    <div className="-mt-2 flex flex-col gap-1 rounded-control border border-border bg-surface p-1">
      {matchingItems.map((item) => (
        <Link
          key={item.id}
          href={`/items?id=${item.id}`}
          className="flex min-h-touch items-center gap-2 rounded-control px-2 text-sm hover:bg-surface-muted"
        >
          <Package aria-hidden size={16} className="shrink-0 text-accent-fg" />
          <span className="min-w-0 flex-1 truncate">
            Déjà en stock : <span className="font-medium">{item.name}</span>
          </span>
          <span className="shrink-0 font-semibold tabular-nums">{formatQuantity(item)}</span>
        </Link>
      ))}
      {matchingCategories.map((category) => (
        <button
          key={category.id}
          type="button"
          onClick={() => onPickCategory(category.id)}
          className="flex min-h-touch items-center gap-2 rounded-control px-2 text-left text-sm hover:bg-surface-muted"
        >
          <FolderTree aria-hidden size={16} className="shrink-0 text-muted" />
          <span className="truncate">
            Catégorie : <span className="font-medium">{categories.labelFor(category.id)}</span>
          </span>
        </button>
      ))}
    </div>
  );
}
