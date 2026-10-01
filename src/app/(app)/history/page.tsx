"use client";

import { useState } from "react";
import { History } from "lucide-react";
import { MovementList } from "@/components/history/movement-list";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Segmented } from "@/components/ui/segmented";
import { MOVEMENT_LABELS, useMovements } from "@/lib/history";
import type { Enum } from "@/lib/supabase/types";

const FILTERS = [
  { value: "all", label: "Tout" },
  ...(Object.keys(MOVEMENT_LABELS) as Array<Enum<"movement_type">>).map((value) => ({ value, label: MOVEMENT_LABELS[value] })),
];

// Journal of every stock movement, newest first.
export default function HistoryPage() {
  const [filter, setFilter] = useState("all");
  const movements = useMovements({ type: filter === "all" ? null : (filter as Enum<"movement_type">) });
  const rows = movements.data?.pages.flat() ?? [];

  return (
    <>
      <PageHeader title="Historique" />
      <Segmented label="Type de mouvement" size="sm" value={filter} options={FILTERS} onChange={setFilter} className="mb-4" />
      {movements.isError && <p role="alert" className="mb-3 text-alert">Chargement impossible. Vérifie la connexion.</p>}
      {!movements.isPending && rows.length === 0 ? (
        <EmptyState icon={<History aria-hidden size={40} />} title="Aucun mouvement">
          Les ajouts, retraits et déplacements apparaîtront ici.
        </EmptyState>
      ) : (
        <Card className="px-3 py-1">
          <MovementList movements={rows} />
        </Card>
      )}
      {movements.hasNextPage && (
        <Button
          variant="ghost"
          className="mt-3 w-full"
          disabled={movements.isFetchingNextPage}
          onClick={() => movements.fetchNextPage()}
        >
          {movements.isFetchingNextPage ? "Chargement…" : "Voir plus"}
        </Button>
      )}
    </>
  );
}
