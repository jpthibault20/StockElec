"use client";

import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { SelectField } from "@/components/ui/select-field";
import { TextField } from "@/components/ui/text-field";
import { useCategories, useCreateCategory, type Category } from "@/lib/categories";
import type { Enum } from "@/lib/supabase/types";

// Creates a category or a sub-category (which inherits its parent's parameters).
export function CategoryDialog({
  open,
  onClose,
  defaultParentId,
  itemType,
  onCreated,
}: {
  open: boolean;
  onClose: () => void;
  defaultParentId: string | null;
  // Item type being entered: offered parents and the type of a new root.
  itemType: Enum<"item_type">;
  onCreated: (category: Category) => void;
}) {
  return (
    <Dialog open={open} title="Nouvelle catégorie" onClose={onClose}>
      {open && <CategoryForm defaultParentId={defaultParentId} itemType={itemType} onClose={onClose} onCreated={onCreated} />}
    </Dialog>
  );
}

function CategoryForm({
  defaultParentId,
  itemType,
  onClose,
  onCreated,
}: {
  defaultParentId: string | null;
  itemType: Enum<"item_type">;
  onClose: () => void;
  onCreated: (category: Category) => void;
}) {
  const { rootsForType } = useCategories();
  const roots = rootsForType(itemType);
  const create = useCreateCategory();
  const [name, setName] = useState("");
  const [parentId, setParentId] = useState(defaultParentId ?? "");

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const category = await create.mutateAsync({ name: name.trim(), parentId: parentId || null, itemType });
    onCreated(category);
    onClose();
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4">
      <TextField label="Nom" required autoFocus maxLength={60} value={name} onChange={(e) => setName(e.target.value)} />
      <SelectField label="Dans la catégorie" value={parentId} onChange={(e) => setParentId(e.target.value)}>
        <option value="">— Aucune (catégorie principale) —</option>
        {roots.map((root) => (
          <option key={root.id} value={root.id}>
            {root.name}
          </option>
        ))}
      </SelectField>
      {create.error && (
        <p role="alert" className="text-sm font-medium text-alert">
          Création impossible. Vérifie la connexion.
        </p>
      )}
      <Button type="submit" size="lg" disabled={create.isPending || !name.trim()}>
        Créer
      </Button>
    </form>
  );
}
