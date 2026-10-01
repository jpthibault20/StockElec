"use client";

import { Scale } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Segmented } from "@/components/ui/segmented";
import { TextField } from "@/components/ui/text-field";
import { DIAMETERS, MATERIALS, remainingFromWeighing, type Filament, type FilamentFields } from "@/lib/filaments";
import { formatDecimal, parseDecimal } from "@/lib/units";

// Form state of the filament section (texts as typed).
export type FilamentDraft = {
  material: string;
  colorHex: string;
  diameter: string;
  nozzle: string;
  bed: string;
  openedOn: string;
  driedOn: string;
  tare: string;
  measured: string;
  rememberTare: boolean;
};

export function filamentDraft(filament: Filament | null | undefined, tare: number | null): FilamentDraft {
  return {
    material: filament?.material ?? "PLA",
    colorHex: filament?.color_hex ?? "#2B2118",
    diameter: String(filament?.diameter_mm ?? DIAMETERS[0]),
    nozzle: filament?.nozzle_temp_c != null ? String(filament.nozzle_temp_c) : "",
    bed: filament?.bed_temp_c != null ? String(filament.bed_temp_c) : "",
    openedOn: filament?.opened_on ?? "",
    driedOn: filament?.dried_on ?? "",
    tare: filament?.tare_g != null ? formatDecimal(Number(filament.tare_g)) : tare != null ? formatDecimal(tare) : "",
    measured: "",
    rememberTare: false,
  };
}

// Draft → filaments row values. `remainingG` is the item quantity in grams.
export function filamentFields(draft: FilamentDraft, remainingG: number): FilamentFields {
  const int = (value: string) => (value.trim() ? Math.round(Number(value)) || null : null);
  return {
    material: draft.material.trim() || "PLA",
    color_hex: /^#[0-9a-f]{6}$/i.test(draft.colorHex) ? draft.colorHex.toUpperCase() : null,
    diameter_mm: Number(draft.diameter) || DIAMETERS[0],
    nozzle_temp_c: int(draft.nozzle),
    bed_temp_c: int(draft.bed),
    opened_on: draft.openedOn || null,
    dried_on: draft.driedOn || null,
    tare_g: parseDecimal(draft.tare),
    remaining_g: remainingG,
  };
}

// Filament details with the weighing helper: measured weight − spool tare
// gives the remaining grams, written into the item quantity.
export function FilamentFieldsSection({
  draft,
  onChange,
  brand,
  knownTare,
  onRemaining,
}: {
  draft: FilamentDraft;
  onChange: (draft: FilamentDraft) => void;
  brand: string;
  // Tare remembered for this brand, used when the field is left empty.
  knownTare: number | null;
  onRemaining: (grams: number) => void;
}) {
  const set = (patch: Partial<FilamentDraft>) => onChange({ ...draft, ...patch });
  const measured = parseDecimal(draft.measured);
  const tare = parseDecimal(draft.tare) ?? knownTare;
  const computed = measured !== null && tare !== null ? remainingFromWeighing(measured, tare) : null;

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-3">
        <TextField label="Matière" list="materials" value={draft.material} onChange={(e) => set({ material: e.target.value })} />
        <datalist id="materials">
          {MATERIALS.map((material) => (
            <option key={material} value={material} />
          ))}
        </datalist>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="filament-color" className="text-sm font-medium">
            Couleur
          </label>
          <div className="flex min-h-touch items-center gap-2 rounded-control border border-border-strong bg-surface px-2">
            <input
              id="filament-color"
              type="color"
              value={draft.colorHex}
              onChange={(e) => set({ colorHex: e.target.value })}
              className="size-8 cursor-pointer rounded-full border-0 bg-transparent p-0"
            />
            <span className="font-mono text-sm uppercase">{draft.colorHex}</span>
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <span className="text-sm font-medium">Diamètre</span>
        <Segmented
          label="Diamètre du filament"
          size="sm"
          value={draft.diameter}
          options={DIAMETERS.map((d) => ({ value: String(d), label: `${formatDecimal(d)} mm` }))}
          onChange={(diameter) => set({ diameter })}
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <TextField label="Buse (°C)" inputMode="numeric" value={draft.nozzle} onChange={(e) => set({ nozzle: e.target.value })} />
        <TextField label="Plateau (°C)" inputMode="numeric" value={draft.bed} onChange={(e) => set({ bed: e.target.value })} />
        <TextField label="Ouvert le" type="date" value={draft.openedOn} onChange={(e) => set({ openedOn: e.target.value })} />
        <TextField label="Dernier séchage" type="date" value={draft.driedOn} onChange={(e) => set({ driedOn: e.target.value })} />
      </div>

      <div className="flex flex-col gap-3 rounded-control border border-border p-3">
        <p className="flex items-center gap-2 font-medium">
          <Scale aria-hidden size={18} className="text-accent-fg" />
          Pesée de la bobine
        </p>
        <div className="grid grid-cols-2 gap-3">
          <TextField
            label="Poids mesuré (g)"
            inputMode="decimal"
            value={draft.measured}
            onChange={(e) => set({ measured: e.target.value })}
          />
          <TextField
            label="Tare bobine vide (g)"
            inputMode="decimal"
            hint={
              knownTare != null && !draft.tare.trim()
                ? `Tare mémorisée : ${formatDecimal(knownTare)} g`
                : brand.trim()
                  ? undefined
                  : "Renseigne la marque pour la mémoriser"
            }
            placeholder={knownTare != null ? formatDecimal(knownTare) : undefined}
            value={draft.tare}
            onChange={(e) => set({ tare: e.target.value })}
          />
        </div>
        {brand.trim() && (
          <label className="flex min-h-touch items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={draft.rememberTare}
              onChange={(e) => set({ rememberTare: e.target.checked })}
              className="size-5 accent-[var(--primary)]"
            />
            Mémoriser cette tare pour la marque « {brand.trim()} »
          </label>
        )}
        <Button variant="secondary" disabled={computed === null} onClick={() => computed !== null && onRemaining(computed)}>
          {computed !== null ? `Reste ${formatDecimal(computed)} g : utiliser` : "Saisis le poids et la tare"}
        </Button>
      </div>
    </div>
  );
}
