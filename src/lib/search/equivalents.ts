// Rule-based equivalences (spec 4.5, V1 without AI): items in stock that can
// replace a reference that is out of stock, with their differences listed.
//
// Rules per parameter:
// - key values (resistance, capacitance, inductance, output voltage, pitch,
//   pins, diameter, width): must be equal (±1 %);
// - ratings (voltage, current, power): equal or higher is fine, lower excludes;
// - tolerance: tighter is fine, looser is listed as a warning;
// - other parameters and the package: a difference is listed as a warning.

import { compactCode, normalizeText } from "@/lib/search/normalize";
import { sameValue, type CategoryHelpers, type IndexedItem } from "@/lib/search/engine";
import type { ParsedQuery } from "@/lib/search/query";
import type { ParamDef } from "@/lib/categories";
import { formatDecimal, formatEngineering, parseDecimal } from "@/lib/units";

const KEY_EQUAL = new Set(["resistance", "capacitance", "inductance", "output_voltage", "pitch", "pins", "diameter", "width"]);
const RATING_MIN = new Set(["voltage", "current", "power"]);
const TOLERANCE_MAX = new Set(["tolerance"]);

export type Reference = {
  id?: string;
  rootCategoryId: string | null;
  params: Record<string, string | number>;
  package: string | null;
};

export type Difference = { text: string; warning: boolean };
export type Equivalent = { entry: IndexedItem; differences: Difference[] };

function display(def: ParamDef | undefined, value: string | number): string {
  if (typeof value !== "number") return def?.unit && def.kind === "select" ? `${value} ${def.unit}` : value;
  return def?.kind === "engineering" ? formatEngineering(value, def.unit) : formatDecimal(value, def?.unit);
}

function asNumber(value: string | number | undefined): number | null {
  if (value === undefined) return null;
  return typeof value === "number" ? value : parseDecimal(value);
}

export function findEquivalents(reference: Reference, index: IndexedItem[], limit = 10): Equivalent[] {
  const keys = Object.keys(reference.params).filter((key) => KEY_EQUAL.has(key));
  if (!reference.rootCategoryId || keys.length === 0) return [];
  const results: Array<Equivalent & { penalty: number }> = [];

  for (const entry of index) {
    if (entry.item.id === reference.id || entry.status === "out") continue;
    if (entry.lineage[0] !== reference.rootCategoryId) continue;
    const defs = new Map(entry.paramDefs.map((def) => [def.key, def]));
    const differences: Difference[] = [];
    let compatible = true;

    for (const [key, wanted] of Object.entries(reference.params)) {
      const def = defs.get(key);
      const label = def?.label ?? key;
      const actual = entry.params[key];

      if (KEY_EQUAL.has(key)) {
        if (typeof actual !== "number" || typeof wanted !== "number" || !sameValue(actual, wanted)) compatible = false;
      } else if (RATING_MIN.has(key)) {
        const a = asNumber(actual);
        const w = asNumber(wanted);
        if (a === null) differences.push({ text: `${label} non renseignée`, warning: true });
        else if (w !== null && a < w && !sameValue(a, w)) compatible = false;
        else if (w !== null && !sameValue(a, w)) {
          differences.push({ text: `${label} ${display(def, a)} (≥ ${display(def, w)} demandé)`, warning: false });
        }
      } else if (TOLERANCE_MAX.has(key)) {
        const a = asNumber(actual);
        const w = asNumber(wanted);
        if (a === null) differences.push({ text: `${label} non renseignée`, warning: true });
        else if (w !== null && a > w) {
          differences.push({ text: `${label} ${display(def, String(actual))} (moins précise que ${display(def, String(wanted))})`, warning: true });
        } else if (w !== null && a < w) {
          differences.push({ text: `${label} ${display(def, String(actual))} (plus précise)`, warning: false });
        }
      } else if (actual === undefined) {
        differences.push({ text: `${label} non renseigné(e)`, warning: true });
      } else if (normalizeText(String(actual)) !== normalizeText(String(wanted))) {
        differences.push({ text: `${label} ${display(def, actual)} au lieu de ${display(def, wanted)}`, warning: true });
      }
      if (!compatible) break;
    }
    if (!compatible) continue;

    if (reference.package && compactCode(entry.item.package ?? "") !== compactCode(reference.package)) {
      differences.push({
        text: entry.item.package
          ? `Boîtier ${entry.item.package} au lieu de ${reference.package}`
          : "Boîtier non renseigné",
        warning: true,
      });
    }
    const penalty = differences.reduce((total, d) => total + (d.warning ? 2 : 1), 0);
    results.push({ entry, differences, penalty });
  }

  return results
    .sort((a, b) => a.penalty - b.penalty || Number(b.entry.item.quantity) - Number(a.entry.item.quantity))
    .slice(0, limit)
    .map(({ entry, differences }) => ({ entry, differences }));
}

export function referenceFromItem(entry: IndexedItem): Reference {
  return {
    id: entry.item.id,
    rootCategoryId: entry.lineage[0] ?? null,
    params: entry.params,
    package: entry.item.package,
  };
}

// Reference described by a query ("résistance 10k 0805"): the category gives
// the parameter set; each value is assigned to the matching parameter (by
// unit, or the first key parameter when the value has no unit).
export function referenceFromQuery(
  query: ParsedQuery,
  categories: CategoryHelpers & { roots: Array<{ id: string }> },
): Reference | null {
  const values = query.tokens.filter((token) => token.kind === "value");
  if (values.length === 0) return null;

  let rootId: string | null = null;
  const categoryToken = query.tokens.find((token) => token.kind === "category");
  if (categoryToken) {
    rootId = categories.lineage(categoryToken.categoryIds[0])[0]?.id ?? null;
  } else {
    // No category word: infer it when the units point to a single root.
    const units = values.map((value) => value.unit).filter(Boolean);
    const roots = categories.roots.filter((root) =>
      categories
        .paramsFor(root.id)
        .some((def) => KEY_EQUAL.has(def.key) && units.includes(def.unit ?? null)),
    );
    if (roots.length === 1) rootId = roots[0].id;
  }
  if (!rootId) return null;

  const defs = categories.paramsFor(rootId);
  const params: Record<string, number> = {};
  for (const value of values) {
    const def =
      defs.find((d) => !(d.key in params) && d.unit === value.unit && value.unit !== null) ??
      (value.unit === null ? defs.find((d) => !(d.key in params) && KEY_EQUAL.has(d.key)) : undefined);
    if (def) params[def.key] = value.value;
  }
  const packageToken = query.tokens.find((token) => token.kind === "package");
  return { rootCategoryId: rootId, params, package: packageToken ? packageToken.raw : null };
}
