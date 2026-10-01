"use client";

import { Fragment, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRightLeft, FolderTree, MapPinOff, Package, Pencil, Plus, QrCode, Search, Trash2 } from "lucide-react";
import { ItemPickerDialog } from "@/components/items/item-picker-dialog";
import { ItemRow } from "@/components/items/item-row";
import { LocationFormDialog } from "@/components/locations/location-form-dialog";
import { LocationPickerDialog } from "@/components/locations/location-picker-dialog";
import { LocationQrDialog } from "@/components/locations/location-qr-dialog";
import { LocationRow } from "@/components/locations/location-row";
import { Badge } from "@/components/ui/badge";
import { Button, IconButton } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { EmptyState } from "@/components/ui/empty-state";
import { SectionTitle } from "@/components/ui/section-title";
import { useItemCountsByLocation, useItemsInLocations, useMoveItem, type ItemSummary } from "@/lib/items";
import { locationPath } from "@/lib/location-url";
import {
  LocationNotEmptyError,
  pathLabel,
  pathOf,
  subtreeIds,
  useDeleteLocation,
  useLocations,
  useMoveLocation,
} from "@/lib/locations";

type Panel = "edit" | "add-child" | "move" | "delete" | "qr" | "store" | null;

// One location: breadcrumb, sub-locations, searchable content and actions.
export function LocationDetail({ id }: { id: string }) {
  const router = useRouter();
  const { tree, isPending } = useLocations();
  const counts = useItemCountsByLocation();
  const subtree = useMemo(() => (tree.byId.has(id) ? subtreeIds(tree, id) : []), [tree, id]);
  const items = useItemsInLocations(subtree);
  const moveItem = useMoveItem();
  const moveLocation = useMoveLocation();
  const deleteLocation = useDeleteLocation();

  const [panel, setPanel] = useState<Panel>(null);
  const [movingItem, setMovingItem] = useState<ItemSummary | null>(null);
  const [filter, setFilter] = useState("");
  const [message, setMessage] = useState<string | null>(null);

  const location = tree.byId.get(id);
  if (!location) {
    if (isPending) return null;
    return (
      <EmptyState icon={<MapPinOff aria-hidden size={40} />} title="Emplacement introuvable">
        Il a peut-être été supprimé.{" "}
        <Link href="/locations" className="font-medium text-primary underline">
          Voir les emplacements
        </Link>
      </EmptyState>
    );
  }

  const path = pathOf(tree, id);
  const parentPath = path
    .slice(0, -1)
    .map((ancestor) => ancestor.name)
    .join(" / ");
  const children = tree.childrenOf.get(id) ?? [];
  const term = filter.trim().toLocaleLowerCase("fr");
  // Without a filter: items stored directly here. With a filter: the whole subtree.
  const visibleItems = (items.data ?? []).filter((item) =>
    term
      ? [item.name, item.mpn, item.package].some((value) => value?.toLocaleLowerCase("fr").includes(term))
      : item.location_id === id,
  );
  const directCount = counts.data?.get(id) ?? 0;

  const fail = () => setMessage("L'opération a échoué. Vérifie la connexion et réessaie.");

  async function confirmDelete() {
    setPanel(null);
    if (children.length > 0) return;
    try {
      await deleteLocation.mutateAsync(id);
      router.replace(location!.parent_id ? locationPath(location!.parent_id) : "/locations");
    } catch (error) {
      if (error instanceof LocationNotEmptyError) {
        setMessage("Cet emplacement contient des sous-emplacements : déplace-les ou supprime-les d'abord.");
      } else fail();
    }
  }

  return (
    <>
      <nav aria-label="Fil d'Ariane" className="mb-2 flex flex-wrap items-center gap-1 text-sm text-muted">
        <Link href="/locations" className="hover:text-fg hover:underline">
          Emplacements
        </Link>
        {path.slice(0, -1).map((ancestor) => (
          <Fragment key={ancestor.id}>
            <span aria-hidden>›</span>
            <Link href={locationPath(ancestor.id)} className="hover:text-fg hover:underline">
              {ancestor.name}
            </Link>
          </Fragment>
        ))}
      </nav>

      <div className="mb-4 flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <h1 className="text-2xl font-bold tracking-tight break-words">{location.name}</h1>
          {location.kind && <Badge className="mt-1">{location.kind}</Badge>}
        </div>
        <div className="flex">
          <IconButton label="QR code" onClick={() => setPanel("qr")}>
            <QrCode aria-hidden size={20} />
          </IconButton>
          <IconButton label="Modifier" onClick={() => setPanel("edit")}>
            <Pencil aria-hidden size={20} />
          </IconButton>
          <IconButton label="Déplacer" onClick={() => setPanel("move")}>
            <ArrowRightLeft aria-hidden size={20} />
          </IconButton>
          <IconButton label="Supprimer" tone="danger" onClick={() => setPanel("delete")}>
            <Trash2 aria-hidden size={20} />
          </IconButton>
        </div>
      </div>

      {message && (
        <p role="alert" className="mb-4 rounded-control bg-alert-soft px-3 py-2 font-medium text-alert">
          {message}
        </p>
      )}

      <div className="mb-6 grid gap-2 sm:grid-cols-2">
        <Button size="lg" icon={<Plus aria-hidden size={22} />} onClick={() => setPanel("store")}>
          Ranger un article ici
        </Button>
        <Button size="lg" variant="secondary" onClick={() => setPanel("add-child")}>
          Ajouter un sous-emplacement
        </Button>
      </div>

      {children.length > 0 && (
        <section aria-labelledby="children-title" className="mb-6">
          <div className="mb-2">
            <SectionTitle id="children-title" icon={<FolderTree size={18} />}>
              Sous-emplacements
            </SectionTitle>
          </div>
          <Card className="p-2">
            <ul className="divide-y divide-border">
              {children.map((child) => (
                <li key={child.id}>
                  <LocationRow
                    location={child}
                    childCount={tree.childrenOf.get(child.id)?.length ?? 0}
                    itemCount={counts.data?.get(child.id) ?? 0}
                  />
                </li>
              ))}
            </ul>
          </Card>
        </section>
      )}

      <section aria-labelledby="content-title">
        <div className="mb-2">
          <SectionTitle id="content-title" icon={<Package size={18} />}>
            Contenu
          </SectionTitle>
        </div>
        <label className="mb-2 flex min-h-touch items-center gap-2 rounded-full border border-border-strong bg-surface px-4 focus-within:border-primary">
          <Search aria-hidden size={18} className="text-muted" />
          <span className="sr-only">Rechercher dans cet emplacement</span>
          <input
            type="search"
            placeholder={children.length > 0 ? "Rechercher ici et dans les sous-emplacements…" : "Rechercher ici…"}
            value={filter}
            onChange={(event) => setFilter(event.target.value)}
            className="min-w-0 flex-1 bg-transparent outline-none placeholder:text-muted"
          />
        </label>
        {visibleItems.length > 0 ? (
          <Card className="px-3 py-1">
            <ul className="divide-y divide-border">
              {visibleItems.map((item) => (
                <li key={item.id}>
                  <ItemRow
                    item={item}
                    linked
                    subtitle={item.location_id !== id && item.location_id ? pathLabel(tree, item.location_id) : undefined}
                    actions={
                      <IconButton label={`Déplacer ${item.name}`} onClick={() => setMovingItem(item)}>
                        <ArrowRightLeft aria-hidden size={18} />
                      </IconButton>
                    }
                  />
                </li>
              ))}
            </ul>
          </Card>
        ) : (
          !items.isPending && (
            <p className="py-6 text-center text-muted">
              {term ? "Aucun article ne correspond." : "Aucun article rangé directement ici."}
            </p>
          )
        )}
      </section>

      <LocationQrDialog
        open={panel === "qr"}
        onClose={() => setPanel(null)}
        label={{ id, name: location.name, parentPath }}
      />
      <LocationFormDialog open={panel === "edit"} onClose={() => setPanel(null)} location={location} />
      <LocationFormDialog
        open={panel === "add-child"}
        onClose={() => setPanel(null)}
        parentId={id}
        parentLabel={pathLabel(tree, id)}
      />
      <LocationPickerDialog
        open={panel === "move"}
        title={`Déplacer « ${location.name} » dans…`}
        onClose={() => setPanel(null)}
        currentId={location.parent_id}
        excludeIds={subtree}
        noneLabel="Aucun (premier niveau)"
        onPick={(parentId) => {
          setPanel(null);
          moveLocation.mutate({ id, parentId }, { onError: fail });
        }}
      />
      <ItemPickerDialog
        open={panel === "store"}
        title={`Ranger dans « ${location.name} »`}
        onClose={() => setPanel(null)}
        createHref={`/add?location=${id}`}
        onPick={(item) => {
          setPanel(null);
          moveItem.mutate({ item, toLocationId: id }, { onError: fail });
        }}
      />
      <LocationPickerDialog
        open={movingItem !== null}
        title={movingItem ? `Déplacer « ${movingItem.name} » vers…` : ""}
        allowCreate
        onClose={() => setMovingItem(null)}
        currentId={movingItem?.location_id ?? null}
        noneLabel="Sans emplacement"
        onPick={(toLocationId) => {
          if (movingItem) moveItem.mutate({ item: movingItem, toLocationId }, { onError: fail });
          setMovingItem(null);
        }}
      />
      <ConfirmDialog
        open={panel === "delete"}
        title={children.length > 0 ? "Suppression impossible" : `Supprimer « ${location.name} » ?`}
        description={
          children.length > 0
            ? `Cet emplacement contient ${children.length} sous-emplacement(s). Déplace-les ou supprime-les d'abord.`
            : directCount > 0
              ? `Les ${directCount} article(s) rangés ici resteront dans le stock, sans emplacement.`
              : "Cette action est définitive."
        }
        confirmLabel={children.length > 0 ? "Compris" : "Supprimer"}
        tone={children.length > 0 ? "primary" : "danger"}
        onCancel={() => setPanel(null)}
        onConfirm={confirmDelete}
      />
    </>
  );
}
