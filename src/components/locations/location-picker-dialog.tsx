"use client";

import { useMemo, useState } from "react";
import { Check, Plus, Search } from "lucide-react";
import { Dialog } from "@/components/ui/dialog";
import { cn } from "@/lib/cn";
import { splitPath } from "@/lib/csv";
import { flattenTree, pathLabel, useLocations, useSaveLocation, type Location } from "@/lib/locations";

type LocationPickerDialogProps = {
  open: boolean;
  title: string;
  onClose: () => void;
  onPick: (locationId: string | null) => void;
  // Current location, shown as selected.
  currentId?: string | null;
  // Locations that cannot be chosen (e.g. a location and its own subtree).
  excludeIds?: string[];
  // Label of the "no location" choice; hidden when absent.
  noneLabel?: string;
  // Offers to create the typed location when it does not exist yet.
  allowCreate?: boolean;
};

const normalize = (text: string) => text.trim().toLocaleLowerCase("fr");

// Chooses a destination in the location tree, with a filter for long trees.
// With `allowCreate`, typing a name that does not exist offers to create it;
// "Atelier › Tiroir 3" (or "Atelier / Tiroir 3") creates the missing levels.
export function LocationPickerDialog({
  open,
  title,
  onClose,
  onPick,
  currentId = null,
  excludeIds = [],
  noneLabel,
  allowCreate = false,
}: LocationPickerDialogProps) {
  const { tree } = useLocations();
  const save = useSaveLocation();
  const [filter, setFilter] = useState("");
  const [failed, setFailed] = useState(false);

  const rows = useMemo(() => {
    const excluded = new Set(excludeIds);
    const term = normalize(filter);
    return flattenTree(tree)
      .filter(({ location }) => !excluded.has(location.id))
      .map(({ location, depth }) => ({ location, depth, path: pathLabel(tree, location.id) }))
      .filter(({ path }) => !term || path.toLocaleLowerCase("fr").includes(term));
  }, [tree, excludeIds, filter]);

  const parts = splitPath(filter);
  const typedPath = parts.join(" › ");
  const exists = rows.some(({ path }) => normalize(path) === normalize(typedPath));
  const canCreate = allowCreate && parts.length > 0 && !exists;
  const isEmpty = tree.byId.size === 0;

  const choose = (id: string | null) => {
    setFilter("");
    setFailed(false);
    onPick(id);
  };

  // Walks the typed path from the top level, reusing existing locations and
  // creating the missing ones, then selects the last one.
  async function createTyped() {
    setFailed(false);
    let parentId: string | null = null;
    try {
      for (const name of parts) {
        const siblings: Location[] = tree.childrenOf.get(parentId) ?? [];
        const existing = siblings.find((child) => normalize(child.name) === normalize(name));
        if (existing) {
          parentId = existing.id;
          continue;
        }
        const created: Location = await save.mutateAsync({ input: { name, kind: null, parent_id: parentId } });
        parentId = created.id;
      }
      choose(parentId);
    } catch {
      setFailed(true);
    }
  }

  const rowClass = (selected: boolean) =>
    cn(
      "flex min-h-touch w-full items-center gap-2 rounded-control px-3 text-left transition-colors duration-150",
      selected ? "bg-accent-soft font-semibold text-primary" : "hover:bg-surface-muted",
    );

  return (
    <Dialog open={open} title={title} onClose={onClose}>
      <div className="flex flex-col gap-3">
        <label className="flex min-h-touch items-center gap-2 rounded-full border border-border-strong bg-surface px-4 focus-within:border-primary">
          <Search aria-hidden size={18} className="text-muted" />
          <span className="sr-only">{allowCreate ? "Chercher ou créer un emplacement" : "Filtrer les emplacements"}</span>
          <input
            type="search"
            enterKeyHint={canCreate ? "done" : "search"}
            autoFocus={allowCreate && isEmpty}
            placeholder={allowCreate ? "Chercher ou créer, ex. Atelier › Tiroir 3" : "Filtrer…"}
            value={filter}
            onChange={(event) => setFilter(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && canCreate && rows.length === 0) {
                event.preventDefault();
                void createTyped();
              }
            }}
            className="min-w-0 flex-1 bg-transparent outline-none placeholder:text-muted"
          />
        </label>

        {canCreate && (
          <button
            type="button"
            onClick={createTyped}
            disabled={save.isPending}
            className="flex min-h-touch w-full items-center gap-2 rounded-control border border-dashed border-primary px-3 text-left font-medium text-primary transition-colors duration-150 hover:bg-accent-soft"
          >
            <Plus aria-hidden size={18} />
            <span className="flex-1 truncate">
              {save.isPending ? "Création…" : `Créer l'emplacement « ${typedPath} »`}
            </span>
          </button>
        )}
        {failed && (
          <p role="alert" className="text-sm font-medium text-alert">
            Création impossible. Vérifie la connexion.
          </p>
        )}

        <ul className="flex flex-col gap-0.5">
          {noneLabel && !filter && (
            <li>
              <button type="button" onClick={() => choose(null)} className={rowClass(currentId === null)}>
                <span className="flex-1 italic">{noneLabel}</span>
                {currentId === null && <Check aria-hidden size={18} />}
              </button>
            </li>
          )}
          {rows.map(({ location, depth, path }) => {
            const selected = location.id === currentId;
            return (
              <li key={location.id}>
                <button
                  type="button"
                  onClick={() => choose(location.id)}
                  className={rowClass(selected)}
                  style={filter ? undefined : { paddingLeft: `${0.75 + depth * 1.25}rem` }}
                >
                  <span className="flex-1 truncate">{filter ? path : location.name}</span>
                  {selected && <Check aria-hidden size={18} />}
                </button>
              </li>
            );
          })}
        </ul>
        {rows.length === 0 && !canCreate && (
          <p className="py-4 text-center text-muted">
            {allowCreate && isEmpty ? "Aucun emplacement : tape un nom pour créer le premier." : "Aucun emplacement."}
          </p>
        )}
      </div>
    </Dialog>
  );
}
