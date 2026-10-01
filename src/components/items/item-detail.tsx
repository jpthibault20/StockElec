"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRightLeft, Copy, ExternalLink, FileText, MapPin, PackageX, Pencil, Trash2 } from "lucide-react";
import { formatParam } from "@/components/items/params-fields";
import { QuantityStepper } from "@/components/items/quantity-stepper";
import { LocationPickerDialog } from "@/components/locations/location-picker-dialog";
import { ItemEquivalents } from "@/components/search/item-equivalents";
import { FilamentCard } from "@/components/items/filament-card";
import { ItemHistory } from "@/components/history/item-history";
import { Badge } from "@/components/ui/badge";
import { Button, ButtonLink, IconButton } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { EmptyState } from "@/components/ui/empty-state";
import { useCategories } from "@/lib/categories";
import { formatQuantity } from "@/lib/format";
import { ITEM_TYPE_LABELS, useDeleteItem, useItem, useMoveItem } from "@/lib/items";
import { locationPath } from "@/lib/location-url";
import { pathLabel, useLocations } from "@/lib/locations";
import { usePhotoUrls } from "@/lib/photos";
import { formatDecimal } from "@/lib/units";

const priceFormat = new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR", maximumFractionDigits: 4 });

export function ItemDetailView({ id }: { id: string }) {
  const router = useRouter();
  const { data: item, isPending, isError } = useItem(id);
  const categories = useCategories();
  const { tree } = useLocations();
  const urls = usePhotoUrls(item?.photos.map((photo) => photo.storage_path) ?? []);
  const moveItem = useMoveItem();
  const deleteItem = useDeleteItem();
  const [panel, setPanel] = useState<"move" | "delete" | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  if (isPending) return null;
  if (isError) {
    return <p role="alert" className="py-8 text-center text-alert">Chargement impossible. Vérifie la connexion.</p>;
  }
  if (!item) {
    return (
      <EmptyState icon={<PackageX aria-hidden size={40} />} title="Article introuvable">
        Il a peut-être été supprimé.{" "}
        <Link href="/items" className="font-medium text-primary underline">
          Voir les articles
        </Link>
      </EmptyState>
    );
  }

  const params = (item.params ?? {}) as Record<string, string | number>;
  const paramRows = categories
    .paramsFor(item.category_id)
    .filter((def) => params[def.key] !== undefined)
    .map((def) => ({ label: def.label, value: formatParam(def, params[def.key]) }));
  const infoRows = [
    { label: "Référence", value: item.mpn },
    { label: "Fabricant", value: item.manufacturer },
    { label: "Boîtier", value: item.package },
    ...paramRows,
  ].filter((row): row is { label: string; value: string } => Boolean(row.value));
  const threshold = item.min_threshold != null ? Number(item.min_threshold) : null;
  const low = item.quantity_mode === "exact" && threshold !== null && Number(item.quantity) <= threshold;
  const categoryLabel = categories.labelFor(item.category_id);

  async function remove() {
    setPanel(null);
    try {
      await deleteItem.mutateAsync(item!);
      router.replace("/items");
    } catch {
      setMessage("Suppression impossible. Vérifie la connexion et réessaie.");
    }
  }

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-4">
      {item.photos.length > 0 && (
        <div className="-mx-4 flex snap-x gap-2 overflow-x-auto px-4 pb-1">
          {item.photos.map((photo, index) => {
            const url = urls.data?.get(photo.storage_path);
            return (
              <div key={photo.id} className="aspect-square w-48 shrink-0 snap-start overflow-hidden rounded-card bg-surface-muted">
                {url && (
                  // Signed URL from private storage: next/image would bring nothing here.
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={url} alt={`${item.name}, photo ${index + 1}`} className="size-full object-cover" />
                )}
              </div>
            );
          })}
        </div>
      )}

      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <h1 className="text-2xl font-bold tracking-tight break-words">{item.name}</h1>
          <div className="mt-1 flex flex-wrap gap-1.5">
            <Badge>{ITEM_TYPE_LABELS[item.type]}</Badge>
            {categoryLabel && <Badge tone="accent">{categoryLabel}</Badge>}
            {low && <Badge tone="alert">Stock faible</Badge>}
          </div>
        </div>
        <div className="flex">
          <ButtonLink href={`/items/edit?id=${item.id}`} variant="ghost" aria-label="Modifier" title="Modifier" className="px-3">
            <Pencil aria-hidden size={20} />
          </ButtonLink>
          <ButtonLink href={`/add?duplicate=${item.id}`} variant="ghost" aria-label="Dupliquer" title="Dupliquer" className="px-3">
            <Copy aria-hidden size={20} />
          </ButtonLink>
          <IconButton label="Supprimer" tone="danger" onClick={() => setPanel("delete")}>
            <Trash2 aria-hidden size={20} />
          </IconButton>
        </div>
      </div>

      {message && (
        <p role="alert" className="rounded-control bg-alert-soft px-3 py-2 font-medium text-alert">
          {message}
        </p>
      )}

      <Card className="flex flex-col items-center gap-2 py-5">
        <QuantityStepper item={item} size="lg" />
        {threshold !== null && (
          <p className="text-sm text-muted">
            Alerte sous {formatQuantity({ ...item, quantity: threshold, quantity_mode: "exact" })}
          </p>
        )}
      </Card>

      {item.filament && <FilamentCard item={item} />}

      <ItemEquivalents itemId={item.id} />

      <Card className="flex items-center gap-3 py-2">
        <MapPin aria-hidden size={20} className="shrink-0 text-accent-fg" />
        {item.location_id ? (
          <Link href={locationPath(item.location_id)} className="min-w-0 flex-1 truncate font-medium hover:underline">
            {pathLabel(tree, item.location_id)}
          </Link>
        ) : (
          <span className="flex-1 text-muted">Sans emplacement</span>
        )}
        <Button variant="ghost" icon={<ArrowRightLeft aria-hidden size={18} />} onClick={() => setPanel("move")}>
          Déplacer
        </Button>
      </Card>

      {infoRows.length > 0 && (
        <Card>
          <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2">
            {infoRows.map((row) => (
              <div key={row.label} className="contents">
                <dt className="text-muted">{row.label}</dt>
                <dd className="font-medium break-words">{row.value}</dd>
              </div>
            ))}
          </dl>
        </Card>
      )}

      {(item.links.length > 0 || item.datasheet_url) && (
        <Card className="flex flex-col gap-2">
          {item.links.map((link) => (
            <a
              key={link.id}
              href={link.url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex min-h-touch items-center gap-3 rounded-control px-2 hover:bg-surface-muted"
            >
              <span className="flex-1 font-medium">{link.supplier}</span>
              {link.unit_price != null && (
                <span className="text-sm text-muted tabular-nums">{priceFormat.format(Number(link.unit_price))} / u</span>
              )}
              <span className="flex items-center gap-1 font-semibold text-primary">
                Commander <ExternalLink aria-hidden size={16} />
              </span>
            </a>
          ))}
          {item.datasheet_url && (
            <a
              href={item.datasheet_url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex min-h-touch items-center gap-3 rounded-control px-2 hover:bg-surface-muted"
            >
              <FileText aria-hidden size={18} className="text-accent-fg" />
              <span className="flex-1 font-medium">Datasheet</span>
              <ExternalLink aria-hidden size={16} className="text-muted" />
            </a>
          )}
        </Card>
      )}

      {(item.notes || (item.tags?.length ?? 0) > 0) && (
        <Card className="flex flex-col gap-3">
          {item.notes && <p className="whitespace-pre-wrap">{item.notes}</p>}
          {(item.tags?.length ?? 0) > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {item.tags!.map((tag) => (
                <Badge key={tag}>#{tag}</Badge>
              ))}
            </div>
          )}
        </Card>
      )}

      <ItemHistory itemId={item.id} />

      <p className="text-center text-xs text-muted">
        Modifié le {new Date(item.updated_at).toLocaleDateString("fr-FR", { dateStyle: "long" })}
        {item.quantity_mode === "exact" && ` · ${formatDecimal(Number(item.quantity))} en stock`}
      </p>

      <LocationPickerDialog
        open={panel === "move"}
        title={`Déplacer « ${item.name} » vers…`}
        allowCreate
        onClose={() => setPanel(null)}
        currentId={item.location_id}
        noneLabel="Sans emplacement"
        onPick={(toLocationId) => {
          setPanel(null);
          moveItem.mutate(
            { item, toLocationId },
            { onError: () => setMessage("Déplacement impossible. Vérifie la connexion.") },
          );
        }}
      />
      <ConfirmDialog
        open={panel === "delete"}
        title={`Supprimer « ${item.name} » ?`}
        description="L'article, ses photos, ses liens et son historique seront supprimés définitivement."
        confirmLabel="Supprimer"
        tone="danger"
        onCancel={() => setPanel(null)}
        onConfirm={remove}
      />
    </div>
  );
}
