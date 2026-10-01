"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { ItemDetailView } from "@/components/items/item-detail";
import { ItemsList } from "@/components/items/items-list";

// /items lists every item; /items?id=<uuid> shows one (static page, offline-friendly).
export default function ItemsPage() {
  return (
    <Suspense>
      <ItemsScreen />
    </Suspense>
  );
}

function ItemsScreen() {
  const id = useSearchParams().get("id");
  return id ? <ItemDetailView key={id} id={id} /> : <ItemsList />;
}
