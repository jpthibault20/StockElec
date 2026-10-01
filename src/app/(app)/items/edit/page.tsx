"use client";

import { Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { PageHeader } from "@/components/layout/page-header";
import { ItemForm } from "@/components/items/item-form";
import { useItem } from "@/lib/items";

export default function EditItemPage() {
  return (
    <Suspense>
      <EditItemScreen />
    </Suspense>
  );
}

function EditItemScreen() {
  const router = useRouter();
  const id = useSearchParams().get("id");
  const { data: item, isPending } = useItem(id);

  if (!id || (!isPending && !item)) {
    return <p className="py-8 text-center text-muted">Article introuvable.</p>;
  }
  return (
    <>
      <PageHeader title="Modifier l'article" />
      {item && <ItemForm key={item.id} item={item} onSaved={(savedId) => router.replace(`/items?id=${savedId}`)} />}
    </>
  );
}
