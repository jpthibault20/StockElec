// CSV format of the stock (spec 4.10): export for backup, import for bulk
// entry on desktop. Pure functions only (no network), shared by both ways.
//
// Format: UTF-8 with BOM, ";" separator (opens directly in Excel FR), RFC 4180
// quoting. Paths use " › " like the app. Tags are separated by "|".

import type { Enum } from "@/lib/supabase/types";

export const CSV_HEADERS = [
  "nom",
  "type",
  "categorie",
  "emplacement",
  "quantite",
  "unite",
  "mode",
  "niveau",
  "seuil",
  "mpn",
  "fabricant",
  "boitier",
  "code_barres",
  "parametres",
  "tags",
  "fournisseur",
  "lien",
  "prix",
  "notes",
] as const;

export type CsvHeader = (typeof CSV_HEADERS)[number];
export type CsvRecord = Record<CsvHeader, string>;

export const PATH_SEPARATOR = " › ";

const TYPE_LABELS: Record<Enum<"item_type">, string> = {
  component: "Composant",
  consumable: "Consommable",
  tool: "Outillage",
  printing_3d: "Impression 3D",
};
const UNIT_LABELS: Record<Enum<"quantity_unit">, string> = { piece: "pièce", meter: "mètre", gram: "gramme", spool: "bobine" };
const MODE_LABELS: Record<Enum<"quantity_mode">, string> = { exact: "exacte", approximate: "approximative" };
const LEVEL_LABELS: Record<Enum<"approx_level">, string> = { plenty: "Beaucoup", some: "Un peu", almost_empty: "Presque vide" };

export const labels = { type: TYPE_LABELS, unit: UNIT_LABELS, mode: MODE_LABELS, level: LEVEL_LABELS };

function escapeCell(value: string, separator: string): string {
  return /["\r\n]/.test(value) || value.includes(separator) ? `"${value.replace(/"/g, '""')}"` : value;
}

export function toCsv(rows: string[][], separator = ";"): string {
  const body = rows.map((row) => row.map((cell) => escapeCell(cell, separator)).join(separator)).join("\r\n");
  return `﻿${body}\r\n`;
}

const numberFormat = new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 4, useGrouping: false });

export function formatCsvNumber(value: number | null | undefined): string {
  return value == null ? "" : numberFormat.format(Number(value));
}

// --- Import -------------------------------------------------------------

function normalize(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .trim()
    .toLowerCase();
}

// Accepts the code ("component"), the label ("Composant") or a close spelling.
function lookup<T extends string>(table: Record<T, string>, raw: string): T | null {
  const value = normalize(raw);
  if (!value) return null;
  for (const [code, label] of Object.entries(table) as Array<[T, string]>) {
    const name = normalize(label);
    if (value === code || value === name || value.replace(/s$/, "") === name.replace(/s$/, "")) return code;
  }
  return null;
}

// Header cell → canonical header ("Catégorie" → "categorie", "Code-barres" → "code_barres").
export function canonicalHeader(raw: string): string {
  return normalize(raw).replace(/[\s-]+/g, "_");
}

function parseNumber(raw: string): number | null {
  const text = raw.trim().replace(/\s/g, "").replace(",", ".");
  if (!text) return null;
  const value = Number(text);
  return Number.isFinite(value) ? value : NaN;
}

export type ParsedImportRow = {
  line: number;
  errors: string[];
  name: string;
  type: Enum<"item_type">;
  categoryPath: string;
  locationPath: string;
  quantity: number;
  unit: Enum<"quantity_unit">;
  mode: Enum<"quantity_mode">;
  level: Enum<"approx_level"> | null;
  threshold: number | null;
  mpn: string | null;
  manufacturer: string | null;
  package: string | null;
  barcode: string | null;
  params: Record<string, string | number>;
  tags: string[];
  supplier: string | null;
  url: string | null;
  price: number | null;
  notes: string | null;
};

// Validates and converts one CSV record. `line` is the 1-based file line.
export function parseImportRecord(record: Partial<Record<string, string>>, line: number): ParsedImportRow {
  const get = (header: CsvHeader) => (record[header] ?? "").trim();
  const errors: string[] = [];
  const text = (header: CsvHeader) => get(header) || null;

  const name = get("nom");
  if (!name) errors.push("nom manquant");

  const typeRaw = get("type");
  const type = typeRaw ? lookup(TYPE_LABELS, typeRaw) : "component";
  if (!type) errors.push(`type inconnu « ${typeRaw} »`);

  const unitRaw = get("unite");
  const unit = unitRaw ? lookup(UNIT_LABELS, unitRaw) : "piece";
  if (!unit) errors.push(`unité inconnue « ${unitRaw} »`);

  const modeRaw = get("mode");
  const mode = modeRaw ? lookup(MODE_LABELS, modeRaw) : "exact";
  if (!mode) errors.push(`mode inconnu « ${modeRaw} »`);

  const levelRaw = get("niveau");
  const level = levelRaw ? lookup(LEVEL_LABELS, levelRaw) : null;
  if (levelRaw && !level) errors.push(`niveau inconnu « ${levelRaw} »`);

  const quantity = parseNumber(get("quantite"));
  if (Number.isNaN(quantity) || (quantity !== null && quantity < 0)) errors.push("quantité invalide");
  const threshold = parseNumber(get("seuil"));
  if (Number.isNaN(threshold) || (threshold !== null && threshold < 0)) errors.push("seuil invalide");
  const price = parseNumber(get("prix"));
  if (Number.isNaN(price)) errors.push("prix invalide");

  let params: Record<string, string | number> = {};
  const paramsRaw = get("parametres");
  if (paramsRaw) {
    try {
      const parsed: unknown = JSON.parse(paramsRaw);
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) params = parsed as Record<string, string | number>;
      else errors.push("paramètres : objet JSON attendu");
    } catch {
      errors.push("paramètres : JSON invalide");
    }
  }

  return {
    line,
    errors,
    name,
    type: type ?? "component",
    categoryPath: get("categorie"),
    locationPath: get("emplacement"),
    quantity: quantity !== null && !Number.isNaN(quantity) ? quantity : 0,
    unit: unit ?? "piece",
    mode: mode ?? "exact",
    level: mode === "approximate" ? (level ?? "plenty") : null,
    threshold: threshold !== null && !Number.isNaN(threshold) ? threshold : null,
    mpn: text("mpn"),
    manufacturer: text("fabricant"),
    package: text("boitier"),
    barcode: text("code_barres"),
    params,
    tags: get("tags")
      .split(/[|,]/)
      .map((tag) => tag.trim())
      .filter(Boolean),
    supplier: text("fournisseur"),
    url: text("lien"),
    price: price !== null && !Number.isNaN(price) ? price : null,
    notes: text("notes"),
  };
}

export function splitPath(path: string): string[] {
  return path
    .split(/\s*[›>/]\s*/)
    .map((part) => part.trim())
    .filter(Boolean);
}
