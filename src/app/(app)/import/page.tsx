"use client";

import { useState } from "react";
import Link from "next/link";
import { useQueryClient } from "@tanstack/react-query";
import { FileUp } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useCategories } from "@/lib/categories";
import { CSV_HEADERS, type ParsedImportRow } from "@/lib/csv";
import { categoryPathIndex, importRows, invalidateAfterImport, readImportFile, type ImportSummary } from "@/lib/import-export";
import { useLocations } from "@/lib/locations";
import { formatDecimal } from "@/lib/units";

// Bulk entry from a CSV file (spec 4.10, desktop use): preview, then import.
export default function ImportPage() {
  const queryClient = useQueryClient();
  const categories = useCategories();
  const { tree } = useLocations();
  const [rows, setRows] = useState<ParsedImportRow[] | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [mergeSameMpn, setMergeSameMpn] = useState(false);
  const [busy, setBusy] = useState(false);
  const [summary, setSummary] = useState<ImportSummary | null>(null);
  const [error, setError] = useState<string | null>(null);

  const valid = rows?.filter((row) => row.errors.length === 0) ?? [];
  const invalid = rows?.filter((row) => row.errors.length > 0) ?? [];

  async function onFile(file: File | undefined) {
    if (!file) return;
    setSummary(null);
    setError(null);
    setFileName(file.name);
    try {
      setRows(await readImportFile(file));
    } catch {
      setRows(null);
      setError("Ce fichier n'a pas pu être lu.");
    }
  }

  async function runImport() {
    if (!rows) return;
    setBusy(true);
    setError(null);
    try {
      const result = await importRows(rows, { mergeSameMpn }, {
        categoryIdByPath: categoryPathIndex((categories.data ?? []).map((c) => c.id), categories.labelFor),
        tree,
      });
      setSummary(result);
      setRows(null);
      invalidateAfterImport(queryClient);
    } catch {
      setError("L'import s'est interrompu (connexion ?). Les lignes déjà importées sont conservées.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-4">
      <PageHeader title="Importer un CSV" />

      <Card className="flex flex-col gap-3">
        <p className="text-muted">
          Même format que l&apos;export (séparateur « ; » ou « , », UTF-8). Colonnes reconnues :{" "}
          <span className="font-mono text-sm text-fg">{CSV_HEADERS.join(", ")}</span>. Seule « nom » est obligatoire.
          Les catégories et emplacements s&apos;écrivent en chemin (« Atelier › Meuble A › Tiroir 3 ») ; les emplacements
          manquants sont créés.
        </p>
        <label className="flex min-h-touch cursor-pointer items-center justify-center gap-2 rounded-control border border-dashed border-border-strong px-4 py-6 font-medium hover:border-primary">
          <FileUp aria-hidden size={22} />
          {fileName ?? "Choisir un fichier CSV"}
          <input type="file" accept=".csv,text/csv" hidden onChange={(event) => onFile(event.target.files?.[0])} />
        </label>
      </Card>

      {error && <p role="alert" className="rounded-control bg-alert-soft px-3 py-2 font-medium text-alert">{error}</p>}

      {summary && (
        <Card role="status" className="flex flex-col gap-1">
          <p className="font-semibold">Import terminé</p>
          <p>
            {summary.created} article(s) créé(s), {summary.merged} quantité(s) ajoutée(s) à des articles existants,{" "}
            {summary.skipped} ignoré(s) (même MPN), {summary.locationsCreated} emplacement(s) créé(s).
          </p>
          <Link href="/items" className="font-medium text-primary underline">
            Voir les articles
          </Link>
        </Card>
      )}

      {rows && (
        <>
          <Card className="flex flex-col gap-3">
            <p>
              <span className="font-semibold">{valid.length}</span> ligne(s) prête(s)
              {invalid.length > 0 && (
                <>
                  , <span className="font-semibold text-alert">{invalid.length}</span> en erreur (ignorées)
                </>
              )}
              .
            </p>
            <label className="flex min-h-touch items-center gap-2">
              <input
                type="checkbox"
                checked={mergeSameMpn}
                onChange={(event) => setMergeSameMpn(event.target.checked)}
                className="size-5 accent-[var(--primary)]"
              />
              Si le MPN existe déjà, ajouter la quantité à l&apos;article existant (sinon la ligne est ignorée)
            </label>
            <Button size="lg" disabled={busy || valid.length === 0} onClick={runImport} className="self-start">
              {busy ? "Import en cours…" : `Importer ${valid.length} ligne(s)`}
            </Button>
          </Card>

          <Card className="overflow-x-auto p-0">
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead className="bg-surface-muted">
                <tr>
                  {["Ligne", "Nom", "Catégorie", "Emplacement", "Quantité", "MPN", "Statut"].map((header) => (
                    <th key={header} scope="col" className="px-3 py-2 font-semibold">
                      {header}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {rows.slice(0, 200).map((row) => (
                  <tr key={row.line} className={row.errors.length > 0 ? "bg-alert-soft" : undefined}>
                    <td className="px-3 py-2 tabular-nums">{row.line}</td>
                    <td className="px-3 py-2">{row.name}</td>
                    <td className="px-3 py-2">{row.categoryPath}</td>
                    <td className="px-3 py-2">{row.locationPath}</td>
                    <td className="px-3 py-2 tabular-nums">{row.mode === "exact" ? formatDecimal(row.quantity) : row.level}</td>
                    <td className="px-3 py-2">{row.mpn}</td>
                    <td className="px-3 py-2">{row.errors.length > 0 ? row.errors.join(", ") : "OK"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {rows.length > 200 && <p className="px-3 py-2 text-sm text-muted">Aperçu limité aux 200 premières lignes.</p>}
          </Card>
        </>
      )}
    </div>
  );
}
