"use client";

import { MovementList } from "@/components/history/movement-list";
import { Card } from "@/components/ui/card";
import { useMovements } from "@/lib/history";
import { History } from "lucide-react";
import { SectionTitle } from "@/components/ui/section-title";

// Last movements of one item, on its screen.
export function ItemHistory({ itemId }: { itemId: string }) {
  const movements = useMovements({ itemId, pageSize: 10 });
  const rows = movements.data?.pages[0] ?? [];
  if (rows.length === 0) return null;
  return (
    <section aria-labelledby="item-history-title" className="flex flex-col gap-2">
      <SectionTitle id="item-history-title" icon={<History size={18} />}>
        Derniers mouvements
      </SectionTitle>
      <Card className="px-3 py-1">
        <MovementList movements={rows} showItem={false} />
      </Card>
    </section>
  );
}
