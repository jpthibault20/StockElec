"use client";

import { useMemo, useState, type FormEvent } from "react";
import Link from "next/link";
import { ExternalLink, PackagePlus, ShoppingCart, Store, Trash2 } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { ItemPickerDialog } from "@/components/items/item-picker-dialog";
import { Badge } from "@/components/ui/badge";
import { Button, IconButton } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { cn } from "@/lib/cn";
import { formatQuantity } from "@/lib/format";
import {
  buildShoppingGroups,
  useAddShoppingEntry,
  useClearPurchased,
  useDeleteShoppingEntry,
  useRestockItems,
  useShoppingEntries,
  useSupplierLinks,
  useTogglePurchased,
  type ShoppingLine,
} from "@/lib/shopping";
import { useSearchIndex } from "@/lib/search/use-search-index";
import { formatDecimal, parseDecimal } from "@/lib/units";
import { SectionTitle } from "@/components/ui/section-title";

// Shopping list grouped by supplier (spec 4.7): items under their threshold
// plus manual entries, each checkable once bought.
export default function ShoppingPage() {
  const restock = useRestockItems();
  const entries = useShoppingEntries();
  const { index } = useSearchIndex();
  const itemIds = useMemo(
    () =>
      [
        ...new Set([
          ...restock.items.map((entry) => entry.item.id),
          ...(entries.data ?? []).flatMap((entry) => (entry.item_id ? [entry.item_id] : [])),
        ]),
      ].sort(),
    [restock.items, entries.data],
  );
  const links = useSupplierLinks(itemIds);
  const toggle = useTogglePurchased();
  const remove = useDeleteShoppingEntry();
  const clear = useClearPurchased();
  const add = useAddShoppingEntry();
  const [label, setLabel] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [picking, setPicking] = useState(false);

  const names = useMemo(() => new Map(index.map((entry) => [entry.item.id, entry.item.name])), [index]);
  const groups = useMemo(
    () => buildShoppingGroups(restock.items, entries.data ?? [], links.data ?? [], (id) => names.get(id) ?? null),
    [restock.items, entries.data, links.data, names],
  );
  const lineCount = groups.reduce((total, group) => total + group.lines.length, 0);
  const purchasedCount = groups.reduce((total, group) => total + group.lines.filter((l) => l.purchased).length, 0);
  const loading = restock.isPending || entries.isPending;

  async function addManual(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!label.trim()) return;
    await add.mutateAsync({ label: label.trim(), quantity: parseDecimal(quantity) ?? 1 });
    setLabel("");
    setQuantity("1");
  }

  return (
    <>
      <PageHeader
        title="Courses"
        actions={
          purchasedCount > 0 && (
            <Button variant="ghost" onClick={() => clear.mutate()} disabled={clear.isPending}>
              Vider les achetés
            </Button>
          )
        }
      />

      {!loading && lineCount === 0 && (
        <EmptyState icon={<ShoppingCart aria-hidden size={40} />} title="Rien à racheter">
          Les articles passent ici automatiquement sous leur seuil d&apos;alerte. Tu peux aussi ajouter une ligne à la main.
        </EmptyState>
      )}

      <div className="flex flex-col gap-4">
        {groups.map((group) => (
          <section key={group.supplier} aria-labelledby={`supplier-${group.supplier}`}>
            <div className="mb-2">
              <SectionTitle id={`supplier-${group.supplier}`} icon={<Store size={18} />}>
                {group.supplier}
                <Badge>{group.lines.length}</Badge>
              </SectionTitle>
            </div>
            <Card className="px-3 py-1">
              <ul className="divide-y divide-border">
                {group.lines.map((line) => (
                  <ShoppingRow
                    key={line.key}
                    line={line}
                    onToggle={() => toggle.mutate(line)}
                    onRemove={line.entry && !line.auto ? () => remove.mutate(line.entry!.id) : undefined}
                  />
                ))}
              </ul>
            </Card>
          </section>
        ))}
      </div>

      <Card className="mt-6 flex flex-col gap-3">
        <h2 className="font-semibold">Ajouter à la liste</h2>
        <form onSubmit={addManual} className="flex gap-2">
          <input
            aria-label="Article à acheter"
            placeholder="ex. Gaine thermo 3 mm"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            className="min-h-touch min-w-0 flex-1 rounded-control border border-border-strong bg-surface px-3 focus:border-primary"
          />
          <input
            aria-label="Quantité"
            inputMode="decimal"
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
            className="min-h-touch w-16 rounded-control border border-border-strong bg-surface px-2 text-center focus:border-primary"
          />
          <Button type="submit" disabled={!label.trim() || add.isPending}>
            Ajouter
          </Button>
        </form>
        <Button variant="ghost" icon={<PackagePlus aria-hidden size={18} />} onClick={() => setPicking(true)} className="self-start">
          Ajouter un article du stock
        </Button>
      </Card>

      <ItemPickerDialog
        open={picking}
        title="Ajouter à la liste de courses"
        onClose={() => setPicking(false)}
        onPick={(item) => {
          setPicking(false);
          add.mutate({ itemId: item.id, quantity: 1 });
        }}
      />
    </>
  );
}

function ShoppingRow({ line, onToggle, onRemove }: { line: ShoppingLine; onToggle: () => void; onRemove?: () => void }) {
  return (
    <li className="flex min-h-14 items-center gap-3 py-2">
      <input
        type="checkbox"
        aria-label={`${line.label} acheté`}
        checked={line.purchased}
        onChange={onToggle}
        className="size-6 shrink-0 accent-[var(--primary)]"
      />
      <div className={cn("min-w-0 flex-1", line.purchased && "text-muted line-through")}>
        {line.itemId ? (
          <Link href={`/items?id=${line.itemId}`} className="block truncate font-medium hover:underline">
            {line.label}
          </Link>
        ) : (
          <p className="truncate font-medium">{line.label}</p>
        )}
        <p className="truncate text-sm text-muted">
          À acheter : {formatDecimal(line.quantity)}
          {line.stockItem && ` · en stock ${formatQuantity(line.stockItem.item)}`}
          {line.auto && " · sous le seuil"}
        </p>
      </div>
      {line.link && (
        <a
          href={line.link.url}
          target="_blank"
          rel="noopener noreferrer"
          className="flex min-h-touch shrink-0 items-center gap-1 rounded-control px-2 text-sm font-semibold text-primary hover:bg-surface-muted"
        >
          Commander <ExternalLink aria-hidden size={14} />
        </a>
      )}
      {onRemove && (
        <IconButton label={`Retirer ${line.label}`} onClick={onRemove}>
          <Trash2 aria-hidden size={18} />
        </IconButton>
      )}
    </li>
  );
}
