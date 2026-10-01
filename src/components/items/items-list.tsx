"use client";

import { useDeferredValue, useMemo, useState } from "react";
import Link from "next/link";
import { Package, Search } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { QuantityStepper } from "@/components/items/quantity-stepper";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { useItems } from "@/lib/items";
import { pathLabel, useLocations } from "@/lib/locations";

// All items with a quick filter and inline −1 / +1. Full search is step 7.
export function ItemsList() {
  const { data: items, isPending, isError } = useItems();
  const { tree } = useLocations();
  const [filter, setFilter] = useState("");
  const term = useDeferredValue(filter).trim().toLocaleLowerCase("fr");

  const visible = useMemo(
    () =>
      (items ?? []).filter(
        (item) =>
          !term ||
          [item.name, item.mpn, item.package].some((value) => value?.toLocaleLowerCase("fr").includes(term)),
      ),
    [items, term],
  );

  return (
    <>
      <PageHeader title="Articles" />
      <label className="mb-3 flex min-h-touch items-center gap-2 rounded-full border border-border-strong bg-surface px-4 focus-within:border-primary">
        <Search aria-hidden size={18} className="text-muted" />
        <span className="sr-only">Filtrer les articles</span>
        <input
          type="search"
          placeholder="Filtrer par nom, référence, boîtier…"
          value={filter}
          onChange={(event) => setFilter(event.target.value)}
          className="min-w-0 flex-1 bg-transparent outline-none placeholder:text-muted"
        />
      </label>

      {isError && (
        <p role="alert" className="mb-3 text-alert">
          Chargement impossible. Vérifie la connexion.
        </p>
      )}

      {!isPending && items?.length === 0 ? (
        <EmptyState icon={<Package aria-hidden size={40} />} title="Aucun article">
          Ajoute ta première pièce avec le bouton +.
        </EmptyState>
      ) : (
        <Card className="px-3 py-1">
          <ul className="divide-y divide-border">
            {visible.map((item) => {
              const details = [item.mpn, item.package].filter(Boolean).join(" · ");
              const where = item.location_id ? pathLabel(tree, item.location_id) : null;
              return (
                <li key={item.id} className="flex flex-col gap-2 py-2 sm:flex-row sm:items-center">
                  <Link href={`/items?id=${item.id}`} className="min-w-0 flex-1 rounded-control hover:underline">
                    <p className="truncate font-medium">{item.name}</p>
                    {(details || where) && (
                      <p className="truncate text-sm text-muted">{[details, where].filter(Boolean).join(" — ")}</p>
                    )}
                  </Link>
                  <div className="self-end sm:self-auto">
                    <QuantityStepper item={item} />
                  </div>
                </li>
              );
            })}
          </ul>
          {visible.length === 0 && term && <p className="py-6 text-center text-muted">Aucun article ne correspond.</p>}
        </Card>
      )}
    </>
  );
}
