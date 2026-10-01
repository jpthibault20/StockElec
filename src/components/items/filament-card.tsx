"use client";

import { useState, type FormEvent } from "react";
import { Scale } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Dialog } from "@/components/ui/dialog";
import { TextField } from "@/components/ui/text-field";
import { remainingFromWeighing, tareForBrand, useSpoolTares } from "@/lib/filaments";
import { useAdjustQuantity, type ItemDetail } from "@/lib/items";
import { getSupabase } from "@/lib/supabase/client";
import { formatDecimal, parseDecimal } from "@/lib/units";

function formatDate(value: string | null): string | null {
  return value ? new Date(`${value}T00:00:00`).toLocaleDateString("fr-FR", { dateStyle: "medium" }) : null;
}

// Filament details on the item screen, with the weighing shortcut.
export function FilamentCard({ item }: { item: ItemDetail }) {
  const filament = item.filament!;
  const [weighing, setWeighing] = useState(false);
  const rows = [
    { label: "Matière", value: filament.material },
    { label: "Marque", value: item.manufacturer },
    { label: "Diamètre", value: `${formatDecimal(Number(filament.diameter_mm))} mm` },
    {
      label: "Températures",
      value:
        filament.nozzle_temp_c || filament.bed_temp_c
          ? `Buse ${filament.nozzle_temp_c ?? "—"} °C · Plateau ${filament.bed_temp_c ?? "—"} °C`
          : null,
    },
    { label: "Ouvert le", value: formatDate(filament.opened_on) },
    { label: "Dernier séchage", value: formatDate(filament.dried_on) },
  ].filter((row): row is { label: string; value: string } => Boolean(row.value));

  return (
    <Card className="flex flex-col gap-3">
      <div className="flex items-center gap-3">
        <span
          aria-label={filament.color_hex ? `Couleur ${filament.color_hex}` : "Couleur non renseignée"}
          className="size-10 shrink-0 rounded-full border border-border-strong"
          style={{ background: filament.color_hex ?? "transparent" }}
        />
        <p className="flex-1 font-semibold">Filament</p>
        <Button variant="secondary" icon={<Scale aria-hidden size={18} />} onClick={() => setWeighing(true)}>
          Peser la bobine
        </Button>
      </div>
      <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2">
        {rows.map((row) => (
          <div key={row.label} className="contents">
            <dt className="text-muted">{row.label}</dt>
            <dd className="font-medium">{row.value}</dd>
          </div>
        ))}
      </dl>
      <WeighDialog item={item} open={weighing} onClose={() => setWeighing(false)} />
    </Card>
  );
}

function WeighDialog({ item, open, onClose }: { item: ItemDetail; open: boolean; onClose: () => void }) {
  return (
    <Dialog open={open} title="Peser la bobine" onClose={onClose}>
      {open && <WeighForm item={item} onClose={onClose} />}
    </Dialog>
  );
}

function WeighForm({ item, onClose }: { item: ItemDetail; onClose: () => void }) {
  const tares = useSpoolTares();
  const adjust = useAdjustQuantity();
  const defaultTare = item.filament?.tare_g ?? tareForBrand(tares.data, item.manufacturer);
  const [measured, setMeasured] = useState("");
  const [tare, setTare] = useState(defaultTare != null ? formatDecimal(Number(defaultTare)) : "");
  const [failed, setFailed] = useState(false);

  const measuredG = parseDecimal(measured);
  const tareG = parseDecimal(tare);
  const remaining = measuredG !== null && tareG !== null ? remainingFromWeighing(measuredG, tareG) : null;

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (remaining === null) return;
    setFailed(false);
    try {
      // The difference goes through the atomic RPC, so the history logs it.
      const delta = remaining - Number(item.quantity);
      if (delta !== 0) await adjust.mutateAsync({ id: item.id, delta });
      const { error } = await getSupabase()
        .from("filaments")
        .update({ remaining_g: remaining, tare_g: tareG })
        .eq("item_id", item.id);
      if (error) throw error;
      onClose();
    } catch {
      setFailed(true);
    }
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4">
      <p className="text-muted">Pose la bobine sur la balance : le reste = poids mesuré − tare de la bobine vide.</p>
      <div className="grid grid-cols-2 gap-3">
        <TextField label="Poids mesuré (g)" inputMode="decimal" autoFocus required value={measured} onChange={(e) => setMeasured(e.target.value)} />
        <TextField label="Tare (g)" inputMode="decimal" required value={tare} onChange={(e) => setTare(e.target.value)} />
      </div>
      {remaining !== null && (
        <p className="text-center text-lg">
          Reste <span className="font-bold tabular-nums">{formatDecimal(remaining)} g</span>
          <span className="block text-sm text-muted">Actuellement {formatDecimal(Number(item.quantity))} g en stock</span>
        </p>
      )}
      {failed && (
        <p role="alert" className="text-sm font-medium text-alert">
          Enregistrement impossible. Vérifie la connexion.
        </p>
      )}
      <Button type="submit" size="lg" disabled={remaining === null || adjust.isPending}>
        Mettre à jour le stock
      </Button>
    </form>
  );
}
