"use client";

import { useMemo, useState } from "react";
import { Printer } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { downloadLabelSheet } from "@/lib/labels-pdf";
import { flattenTree, pathOf, useLocations } from "@/lib/locations";

// Selects locations and downloads their QR label sheet (A4, Avery L7160).
export default function LabelsPage() {
  const { tree, isPending } = useLocations();
  const rows = useMemo(() => flattenTree(tree), [tree]);
  // Every location is selected until the user changes the selection.
  const [selection, setSelection] = useState<Set<string> | null>(null);
  const selected = selection ?? new Set(rows.map(({ location }) => location.id));
  const [pending, setPending] = useState(false);
  const [failed, setFailed] = useState(false);

  function toggle(id: string) {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelection(next);
  }

  async function generate() {
    setPending(true);
    setFailed(false);
    try {
      const labels = rows
        .filter(({ location }) => selected.has(location.id))
        .map(({ location }) => ({
          id: location.id,
          name: location.name,
          parentPath: pathOf(tree, location.id)
            .slice(0, -1)
            .map((ancestor) => ancestor.name)
            .join(" / "),
        }));
      await downloadLabelSheet(labels);
    } catch {
      setFailed(true);
    } finally {
      setPending(false);
    }
  }

  const sheets = Math.ceil(selected.size / 21);

  return (
    <>
      <PageHeader title="Étiquettes QR" />
      <p className="mb-4 text-muted">
        Planche A4 de 21 étiquettes (63,5 × 38,1 mm, format Avery L7160). Imprime à 100 %, sans mise à l&apos;échelle.
      </p>

      <div className="mb-2 flex gap-2">
        <Button variant="ghost" onClick={() => setSelection(new Set(rows.map(({ location }) => location.id)))}>
          Tout sélectionner
        </Button>
        <Button variant="ghost" onClick={() => setSelection(new Set())}>
          Aucun
        </Button>
      </div>

      {!isPending && rows.length === 0 ? (
        <p className="py-6 text-center text-muted">Aucun emplacement à imprimer.</p>
      ) : (
        <Card className="p-2">
          <ul>
            {rows.map(({ location, depth }) => (
              <li key={location.id}>
                <label
                  className="flex min-h-touch cursor-pointer items-center gap-3 rounded-control px-2 hover:bg-surface-muted"
                  style={{ paddingLeft: `${0.5 + depth * 1.25}rem` }}
                >
                  <input
                    type="checkbox"
                    checked={selected.has(location.id)}
                    onChange={() => toggle(location.id)}
                    className="size-5 accent-[var(--primary)]"
                  />
                  <span className="truncate">{location.name}</span>
                </label>
              </li>
            ))}
          </ul>
        </Card>
      )}

      {failed && (
        <p role="alert" className="mt-4 font-medium text-alert">
          La génération du PDF a échoué. Réessaie.
        </p>
      )}

      <Button
        size="lg"
        icon={<Printer aria-hidden size={22} />}
        disabled={pending || selected.size === 0}
        onClick={generate}
        className="mt-4 w-full sm:w-auto"
      >
        {pending
          ? "Préparation…"
          : `Télécharger ${selected.size} étiquette${selected.size > 1 ? "s" : ""} (${sheets} page${sheets > 1 ? "s" : ""})`}
      </Button>
    </>
  );
}
