// Parses a search query into typed tokens: "résistance 10k 0805" →
// category "Résistances", value 10 000 (no unit), package "0805".
// Every token stays a constraint that free text can also satisfy, so items
// without structured data are still found by their name.

import { parseEngineering } from "@/lib/units";
import { compactCode, normalizeText, singular } from "@/lib/search/normalize";

export type QueryToken =
  | { kind: "value"; raw: string; norm: string; value: number; unit: string | null }
  | { kind: "package"; raw: string; norm: string; code: string }
  | { kind: "category"; raw: string; norm: string; categoryIds: string[] }
  | { kind: "text"; raw: string; norm: string };

export type ParsedQuery = { tokens: QueryToken[]; barcode: string | null };

export type QueryContext = {
  categories: Array<{ id: string; name: string }>;
  // Compact codes of the packages present in the stock ("sot23", "0805").
  packages: Set<string>;
};

const UNITS = ["Ω", "F", "H", "V", "A", "W"] as const;

// Common footprints, recognised even when no item uses them yet.
const PACKAGE_PATTERN =
  /^(0201|0402|0603|0805|1206|1210|1812|2010|2512|(sot|sod|soic|so|sop|ssop|tssop|msop|qfn|dfn|qfp|lqfp|tqfp|dip|pdip|to|dpak|d2pak|bga|sma|smb|smc)\d{0,3}[a-z]?)$/;

// Everyday words for categories of the default tree (normalized, singular).
const CATEGORY_SYNONYMS: Record<string, string> = {
  res: "resistance",
  resistor: "resistance",
  condo: "condensateur",
  capa: "condensateur",
  cap: "condensateur",
  capacitor: "condensateur",
  self: "inductance",
  ldo: "regulateur",
  regul: "regulateur",
  ci: "circuits integre",
  ic: "circuits integre",
  mcu: "microcontroleur",
  micro: "microcontroleur",
  ampli: "amplificateur",
  aop: "amplificateur",
  header: "barrette",
  inter: "interrupteur",
  bouton: "interrupteur",
};

function isPackage(code: string, context: QueryContext): boolean {
  return context.packages.has(code) || PACKAGE_PATTERN.test(code);
}

// A value needs a unit, an SI prefix or a decimal part: "10k", "3.3V", "100nF".
// Bare integers ("100") and part numbers ("2N2222") stay text.
function parseValue(raw: string): { value: number; unit: string | null } | null {
  const token = raw.replace(",", ".").replace(/[µμ]/g, "u");
  if (/^\d+[a-z]\d{3,}$/i.test(token)) return null;
  for (const unit of UNITS) {
    const lower = token.toLowerCase();
    const hasUnit =
      unit === "Ω"
        ? /(ω|ohms?|r)$/i.test(token) || /^\d+r\d+$/i.test(token)
        : lower.endsWith(unit.toLowerCase()) || new RegExp(`^\\d+${unit}\\d+$`, "i").test(token);
    if (!hasUnit) continue;
    const value = parseEngineering(token.replace(/ω$/i, ""), unit);
    if (value !== null) return { value, unit };
  }
  if (/^\d*[.]?\d+[pnumkKMG]$|^\d+[pnumkKMG]\d{1,2}$|^\d*\.\d+$/.test(token)) {
    const value = parseEngineering(token);
    if (value !== null) return { value, unit: null };
  }
  return null;
}

function matchCategories(norm: string, context: QueryContext): string[] {
  const word = singular(norm);
  if (word.length < 3) return [];
  const target = CATEGORY_SYNONYMS[word];
  return context.categories
    .filter((category) => {
      const name = normalizeText(category.name);
      if (target) return name.includes(target);
      return name.split(" ").some((part) => singular(part).startsWith(word));
    })
    .map((category) => category.id);
}

export function parseQuery(query: string, context: QueryContext): ParsedQuery {
  const trimmed = query.trim();
  const barcode = /^\d{8}$|^\d{12,13}$/.test(trimmed) ? trimmed : null;
  const tokens: QueryToken[] = [];

  for (const raw of trimmed.split(/\s+/).filter(Boolean)) {
    const norm = normalizeText(raw);
    if (!norm) continue;
    const code = compactCode(raw);

    if (code && isPackage(code, context)) {
      tokens.push({ kind: "package", raw, norm, code });
      continue;
    }
    const value = parseValue(raw);
    if (value) {
      tokens.push({ kind: "value", raw, norm, ...value });
      continue;
    }
    const categoryIds = /\d/.test(norm) ? [] : matchCategories(norm, context);
    if (categoryIds.length > 0) {
      tokens.push({ kind: "category", raw, norm, categoryIds });
      continue;
    }
    tokens.push({ kind: "text", raw, norm });
  }
  return { tokens, barcode };
}
