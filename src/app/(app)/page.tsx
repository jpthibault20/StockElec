"use client";

import Link from "next/link";
import { ChevronRight, FolderTree, Package, Plus, ScanLine, TriangleAlert } from "lucide-react";
import { ItemRow } from "@/components/items/item-row";
import { Badge } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { SectionTitle } from "@/components/ui/section-title";
import { useCategories } from "@/lib/categories";
import { useRecentItems } from "@/lib/items";
import { pathLabel, useLocations } from "@/lib/locations";
import { useRestockItems } from "@/lib/shopping";

// Home (spec 4.9): search in the header, quick add and scan, restock alerts,
// recently modified items and quick access to categories.
export default function HomePage() {
  const restock = useRestockItems();
  const recent = useRecentItems();
  const categories = useCategories();
  const { tree } = useLocations();
  const restockCount = restock.items.length;

  return (
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-2 gap-3">
        <ButtonLink href="/add" size="lg" icon={<Plus aria-hidden size={22} />}>
          Ajouter
        </ButtonLink>
        <ButtonLink href="/scan" size="lg" variant="secondary" icon={<ScanLine aria-hidden size={22} />}>
          Scanner
        </ButtonLink>
      </div>

      <section aria-labelledby="restock-title" className="flex flex-col gap-3">
        <SectionTitle
          id="restock-title"
          tone="alert"
          icon={<TriangleAlert size={18} />}
          action={
            restockCount > 0 && (
              <Link href="/shopping" className="flex items-center text-sm font-medium text-primary">
                Liste de courses <ChevronRight aria-hidden size={16} />
              </Link>
            )
          }
        >
          À racheter
          {restockCount > 0 && <Badge tone="alert">{restockCount}</Badge>}
        </SectionTitle>
        {restockCount === 0 ? (
          <Card className="text-muted">{restock.isPending ? "Chargement…" : "Aucune alerte de stock pour le moment."}</Card>
        ) : (
          <Card className="border-l-4 border-l-alert px-3 py-1">
            <ul className="divide-y divide-border">
              {restock.items.slice(0, 5).map((entry) => (
                <li key={entry.item.id}>
                  <ItemRow
                    item={entry.item}
                    linked
                    subtitle={entry.item.location_id ? pathLabel(tree, entry.item.location_id) : undefined}
                  />
                </li>
              ))}
            </ul>
            {restockCount > 5 && (
              <Link href="/shopping" className="block py-2 text-center text-sm font-medium text-primary">
                Voir les {restockCount} articles
              </Link>
            )}
          </Card>
        )}
      </section>

      <section aria-labelledby="recent-title" className="flex flex-col gap-3">
        <SectionTitle id="recent-title" icon={<Package size={18} />}>
          Derniers articles modifiés
        </SectionTitle>
        {recent.data && recent.data.length > 0 ? (
          <Card className="px-3 py-1">
            <ul className="divide-y divide-border">
              {recent.data.map((item) => (
                <li key={item.id}>
                  <ItemRow item={item} linked subtitle={item.location_id ? pathLabel(tree, item.location_id) : undefined} />
                </li>
              ))}
            </ul>
          </Card>
        ) : (
          <Card className="text-muted">{recent.isPending ? "Chargement…" : "Aucun article pour le moment."}</Card>
        )}
      </section>

      {categories.roots.length > 0 && (
        <section aria-labelledby="categories-title" className="flex flex-col gap-3">
          <SectionTitle id="categories-title" icon={<FolderTree size={18} />}>
            Catégories
          </SectionTitle>
          <div className="flex flex-wrap gap-2">
            {categories.roots.map((category) => (
              <Link
                key={category.id}
                href={`/search?category=${category.id}`}
                className="flex min-h-touch items-center rounded-full bg-accent-soft px-4 text-sm font-semibold text-fg transition-colors duration-150 hover:bg-accent hover:text-on-accent"
              >
                {category.name}
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
