"use client";

import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { formatQuantity } from "@/lib/format";
import type { ItemSummary } from "@/lib/items";
import { pathLabel, useLocations } from "@/lib/locations";

type DuplicateDialogProps = {
  open: boolean;
  matches: ItemSummary[];
  // Quantity typed in the form, offered to add to the existing item.
  quantity: number;
  busy: boolean;
  onMerge: (item: ItemSummary) => void;
  onCreateAnyway: () => void;
  onClose: () => void;
};

// Anti-duplicate: proposes adding the quantity to a similar existing item
// instead of creating a new one.
export function DuplicateDialog({ open, matches, quantity, busy, onMerge, onCreateAnyway, onClose }: DuplicateDialogProps) {
  const { tree } = useLocations();

  return (
    <Dialog open={open} title="Article similaire déjà en stock" onClose={onClose}>
      <div className="flex flex-col gap-4">
        <p className="text-muted">Pour éviter un doublon, ajoute plutôt la quantité à l&apos;article existant.</p>
        <ul className="flex flex-col gap-3">
          {matches.map((item) => {
            const approximate = item.quantity_mode === "approximate";
            return (
              <li key={item.id} className="flex flex-col gap-2 rounded-control border border-border p-3">
                <div>
                  <p className="font-semibold">{item.name}</p>
                  <p className="text-sm text-muted">
                    {[item.mpn, item.package].filter(Boolean).join(" · ")}
                    {item.location_id && ` — ${pathLabel(tree, item.location_id)}`}
                  </p>
                  <p className="text-sm font-medium">En stock : {formatQuantity(item)}</p>
                </div>
                <Button onClick={() => onMerge(item)} disabled={busy}>
                  {approximate || quantity <= 0 ? "Ouvrir cet article" : `Ajouter ${quantity} à cet article`}
                </Button>
              </li>
            );
          })}
        </ul>
        <Button variant="ghost" onClick={onCreateAnyway} disabled={busy}>
          Créer quand même un nouvel article
        </Button>
      </div>
    </Dialog>
  );
}
