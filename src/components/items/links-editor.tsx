"use client";

import { Plus, Trash2 } from "lucide-react";
import { Button, IconButton } from "@/components/ui/button";
import { TextField } from "@/components/ui/text-field";

export type LinkRow = { key: string; supplier: string; url: string; price: string };

export const SUPPLIERS = ["LCSC", "Mouser", "DigiKey", "Farnell", "RS", "AliExpress", "Amazon", "Conrad"];

// Supplier name from a product URL, to pre-fill the supplier field.
export function supplierFromUrl(url: string): string | null {
  try {
    const host = new URL(url).hostname.toLowerCase();
    return SUPPLIERS.find((supplier) => host.includes(supplier.toLowerCase())) ?? null;
  } catch {
    return null;
  }
}

export function newLinkRow(): LinkRow {
  return { key: crypto.randomUUID(), supplier: "", url: "", price: "" };
}

// Editable list of supplier links with an indicative unit price.
export function LinksEditor({ rows, onChange }: { rows: LinkRow[]; onChange: (rows: LinkRow[]) => void }) {
  const update = (key: string, patch: Partial<LinkRow>) =>
    onChange(rows.map((row) => (row.key === key ? { ...row, ...patch } : row)));

  return (
    <div className="flex flex-col gap-3">
      {rows.map((row, index) => (
        <div key={row.key} className="flex flex-col gap-2 rounded-control border border-border p-3">
          <div className="flex items-end gap-2">
            <TextField
              label="Lien"
              type="url"
              inputMode="url"
              placeholder="https://…"
              value={row.url}
              onChange={(event) => {
                const url = event.target.value;
                update(row.key, { url, supplier: row.supplier || supplierFromUrl(url) || "" });
              }}
              className="flex-1"
            />
            <IconButton label={`Supprimer le lien ${index + 1}`} onClick={() => onChange(rows.filter((r) => r.key !== row.key))}>
              <Trash2 aria-hidden size={18} />
            </IconButton>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <TextField
              label="Fournisseur"
              list="suppliers"
              value={row.supplier}
              onChange={(event) => update(row.key, { supplier: event.target.value })}
            />
            <TextField
              label="Prix unitaire (€)"
              inputMode="decimal"
              placeholder="0,05"
              value={row.price}
              onChange={(event) => update(row.key, { price: event.target.value })}
            />
          </div>
        </div>
      ))}
      <datalist id="suppliers">
        {SUPPLIERS.map((supplier) => (
          <option key={supplier} value={supplier} />
        ))}
      </datalist>
      <Button variant="ghost" icon={<Plus aria-hidden size={18} />} onClick={() => onChange([...rows, newLinkRow()])} className="self-start">
        Ajouter un lien fournisseur
      </Button>
    </div>
  );
}
