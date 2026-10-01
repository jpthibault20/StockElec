"use client";

import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { TextField } from "@/components/ui/text-field";
import { LOCATION_KINDS, useSaveLocation, type Location } from "@/lib/locations";

type LocationFormDialogProps = {
  open: boolean;
  onClose: () => void;
  // Edit mode when set, create mode otherwise.
  location?: Location;
  // Parent of a new location (null = root).
  parentId?: string | null;
  parentLabel?: string;
  onSaved?: (location: Location) => void;
};

export function LocationFormDialog(props: LocationFormDialogProps) {
  const title = props.location ? "Modifier l'emplacement" : "Nouvel emplacement";
  return (
    <Dialog open={props.open} title={title} onClose={props.onClose}>
      {/* Remount the form on each opening so fields start from the current values. */}
      {props.open && <LocationForm {...props} />}
    </Dialog>
  );
}

function LocationForm({ location, parentId = null, parentLabel, onClose, onSaved }: LocationFormDialogProps) {
  const [name, setName] = useState(location?.name ?? "");
  const [kind, setKind] = useState(location?.kind ?? "");
  const save = useSaveLocation();

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const saved = await save.mutateAsync({
      id: location?.id,
      input: {
        name: name.trim(),
        kind: kind.trim() || null,
        parent_id: location ? location.parent_id : parentId,
      },
    });
    onSaved?.(saved);
    onClose();
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4">
      {!location && parentLabel && (
        <p className="text-sm text-muted">
          Dans : <span className="font-medium text-fg">{parentLabel}</span>
        </p>
      )}
      <TextField
        label="Nom"
        required
        autoFocus
        maxLength={80}
        placeholder="ex. Tiroir 3"
        value={name}
        onChange={(event) => setName(event.target.value)}
      />
      <TextField
        label="Type"
        hint="Facultatif"
        list="location-kinds"
        maxLength={40}
        placeholder="ex. Tiroir"
        value={kind}
        onChange={(event) => setKind(event.target.value)}
      />
      <datalist id="location-kinds">
        {LOCATION_KINDS.map((value) => (
          <option key={value} value={value} />
        ))}
      </datalist>
      {save.error && (
        <p role="alert" className="text-sm font-medium text-alert">
          Enregistrement impossible. Vérifie la connexion et réessaie.
        </p>
      )}
      <Button type="submit" size="lg" disabled={save.isPending || !name.trim()}>
        {save.isPending ? "Enregistrement…" : "Enregistrer"}
      </Button>
    </form>
  );
}
