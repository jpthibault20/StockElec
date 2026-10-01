"use client";

import { useDeferredValue, useState } from "react";
import { Plus, Search } from "lucide-react";
import { ItemRow } from "@/components/items/item-row";
import { ButtonLink } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { useItemPickerSearch, type ItemSummary } from "@/lib/items";

type ItemPickerDialogProps = {
  open: boolean;
  title: string;
  onClose: () => void;
  onPick: (item: ItemSummary) => void;
  // Link to create a new item instead (e.g. pre-filled with a location).
  createHref?: string;
};

// Finds an existing item by name or MPN.
export function ItemPickerDialog({ open, title, onClose, onPick, createHref }: ItemPickerDialogProps) {
  const [query, setQuery] = useState("");
  const deferredQuery = useDeferredValue(query);
  const results = useItemPickerSearch(deferredQuery);

  return (
    <Dialog open={open} title={title} onClose={onClose}>
      <div className="flex flex-col gap-3">
        <label className="flex min-h-touch items-center gap-2 rounded-full border border-border-strong bg-surface px-4 focus-within:border-primary">
          <Search aria-hidden size={18} className="text-muted" />
          <span className="sr-only">Rechercher un article</span>
          <input
            type="search"
            autoFocus
            placeholder="Nom ou référence…"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            className="min-w-0 flex-1 bg-transparent outline-none placeholder:text-muted"
          />
        </label>
        {createHref && (
          <ButtonLink href={createHref} variant="secondary" icon={<Plus aria-hidden size={20} />}>
            Créer un nouvel article ici
          </ButtonLink>
        )}
        <ul className="divide-y divide-border">
          {results.data?.map((item) => (
            <li key={item.id}>
              <button
                type="button"
                onClick={() => onPick(item)}
                className="w-full rounded-control px-2 text-left transition-colors duration-150 hover:bg-surface-muted"
              >
                <ItemRow item={item} />
              </button>
            </li>
          ))}
        </ul>
        {results.isError && (
          <p role="alert" className="text-center text-alert">
            Recherche impossible. Vérifie la connexion.
          </p>
        )}
        {results.data?.length === 0 && (
          <p className="py-4 text-center text-muted">Aucun article trouvé.</p>
        )}
      </div>
    </Dialog>
  );
}
