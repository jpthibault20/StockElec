"use client";

import { useMemo } from "react";
import { EquivalentsList } from "@/components/search/equivalents-list";
import { pathLabel, useLocations } from "@/lib/locations";
import { findEquivalents, referenceFromItem } from "@/lib/search/equivalents";
import { useSearchIndex } from "@/lib/search/use-search-index";
import { Replace } from "lucide-react";
import { SectionTitle } from "@/components/ui/section-title";

// On an out-of-stock item: in-stock items that can replace it (spec 4.5).
export function ItemEquivalents({ itemId }: { itemId: string }) {
  const { index } = useSearchIndex();
  const { tree } = useLocations();

  const equivalents = useMemo(() => {
    const entry = index.find((candidate) => candidate.item.id === itemId);
    return entry && entry.status === "out" ? findEquivalents(referenceFromItem(entry), index) : [];
  }, [index, itemId]);

  if (equivalents.length === 0) return null;
  return (
    <section aria-labelledby="item-equivalents-title" className="flex flex-col gap-2">
      <SectionTitle id="item-equivalents-title" icon={<Replace size={18} />}>
        Équivalents en stock
      </SectionTitle>
      <EquivalentsList equivalents={equivalents} locationLabel={(id) => (id ? pathLabel(tree, id) : null)} />
    </section>
  );
}
