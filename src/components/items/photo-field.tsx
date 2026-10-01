"use client";

import { useRef, useState } from "react";
import { Camera, X } from "lucide-react";
import { compressImage, usePhotoUrls } from "@/lib/photos";
import type { ItemPhoto } from "@/lib/items";

export type NewPhoto = { blob: Blob; preview: string };

type PhotoFieldProps = {
  kept: ItemPhoto[];
  added: NewPhoto[];
  onRemoveKept: (photo: ItemPhoto) => void;
  onAdd: (photo: NewPhoto) => void;
  onRemoveAdded: (photo: NewPhoto) => void;
};

const thumb = "relative size-20 shrink-0 overflow-hidden rounded-control border border-border bg-surface-muted";

// Photo thumbnails with add (camera or gallery) and remove. New photos are
// compressed on the device before upload.
export function PhotoField({ kept, added, onRemoveKept, onAdd, onRemoveAdded }: PhotoFieldProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);
  const urls = usePhotoUrls(kept.map((photo) => photo.storage_path));

  async function onFiles(files: FileList | null) {
    if (!files?.length) return;
    setBusy(true);
    setFailed(false);
    try {
      for (const file of Array.from(files)) {
        const blob = await compressImage(file);
        onAdd({ blob, preview: URL.createObjectURL(blob) });
      }
    } catch {
      setFailed(true);
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  const removeButton = (label: string, onClick: () => void) => (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      className="absolute top-1 right-1 flex size-7 items-center justify-center rounded-full bg-black/60 text-white"
    >
      <X aria-hidden size={16} />
    </button>
  );

  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-sm font-medium">Photos</span>
      <div className="flex gap-2 overflow-x-auto pb-1">
        {kept.map((photo, index) => (
          <div key={photo.id} className={thumb}>
            {urls.data?.get(photo.storage_path) && (
              // Signed URL from private storage: next/image would bring nothing here.
              // eslint-disable-next-line @next/next/no-img-element
              <img src={urls.data.get(photo.storage_path)} alt={`Photo ${index + 1}`} className="size-full object-cover" />
            )}
            {removeButton(`Supprimer la photo ${index + 1}`, () => onRemoveKept(photo))}
          </div>
        ))}
        {added.map((photo, index) => (
          <div key={photo.preview} className={thumb}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={photo.preview} alt={`Nouvelle photo ${index + 1}`} className="size-full object-cover" />
            {removeButton(`Retirer la nouvelle photo ${index + 1}`, () => onRemoveAdded(photo))}
          </div>
        ))}
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={busy}
          className={`${thumb} flex flex-col items-center justify-center gap-1 border-dashed border-border-strong text-xs font-medium text-muted hover:text-fg`}
        >
          <Camera aria-hidden size={22} />
          {busy ? "…" : "Ajouter"}
        </button>
      </div>
      <input ref={inputRef} type="file" accept="image/*" multiple hidden onChange={(event) => onFiles(event.target.files)} />
      {failed && (
        <p role="alert" className="text-sm font-medium text-alert">
          Cette image n&apos;a pas pu être lue.
        </p>
      )}
    </div>
  );
}
