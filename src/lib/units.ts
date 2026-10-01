// Engineering notation for component values: "10k" ⇄ 10000, "4,7µ" ⇄ 0.0000047.
// Values are stored as plain numbers in items.params so they can be compared
// and searched; prefixes are only an input/display concern.

const PREFIXES: Record<string, number> = {
  p: 1e-12,
  n: 1e-9,
  u: 1e-6,
  µ: 1e-6,
  μ: 1e-6,
  m: 1e-3,
  k: 1e3,
  K: 1e3,
  M: 1e6,
  G: 1e9,
};

const DISPLAY_PREFIXES: Array<[number, string]> = [
  [1e9, "G"],
  [1e6, "M"],
  [1e3, "k"],
  [1, ""],
  [1e-3, "m"],
  [1e-6, "µ"],
  [1e-9, "n"],
  [1e-12, "p"],
];

// Parses "10k", "4.7 µF", "4k7", "2,2nF", "100" (unit symbol optional).
// Returns null when the text is not a number.
export function parseEngineering(input: string, unit = ""): number | null {
  let text = input.trim().replace(/\s+/g, "").replace(",", ".");
  if (unit && text.toLowerCase().endsWith(unit.toLowerCase())) text = text.slice(0, -unit.length);
  if (unit === "Ω") text = text.replace(/(ohms?|r)$/i, "");
  if (!text) return null;

  // "3V3" = 3.3 V: the unit letter used as decimal separator.
  if (unit.length === 1) {
    const unitMarking = text.match(new RegExp(`^(\\d+)${unit}(\\d+)$`, "i"));
    if (unitMarking) return Number(`${unitMarking[1]}.${unitMarking[2]}`);
  }

  // "4k7" = 4.7k, "2R2" = 2.2 (resistor marking style).
  const marking = text.match(/^(\d+)([pnuµμmkKMGR])(\d+)$/);
  if (marking) {
    const [, whole, prefix, decimals] = marking;
    const factor = prefix === "R" ? 1 : PREFIXES[prefix];
    return Number(`${whole}.${decimals}`) * factor;
  }

  const match = text.match(/^(-?\d*\.?\d+(?:e-?\d+)?)([pnuµμmkKMG])?$/);
  if (!match) return null;
  const value = Number(match[1]) * (match[2] ? PREFIXES[match[2]] : 1);
  return Number.isFinite(value) ? value : null;
}

const numberFormat = new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 3 });

// 10000 → "10 kΩ", 0.0000047 → "4,7 µF". Without a unit, prefixes are still used.
export function formatEngineering(value: number, unit = ""): string {
  if (value === 0) return `0${unit ? ` ${unit}` : ""}`;
  const abs = Math.abs(value);
  const [factor, prefix] = DISPLAY_PREFIXES.find(([f]) => abs >= f * 0.9995) ?? [1e-12, "p"];
  const scaled = Number((value / factor).toPrecision(4));
  const suffix = `${prefix}${unit}`;
  return `${numberFormat.format(scaled)}${suffix ? ` ${suffix}` : ""}`;
}

// Plain-number input for non-engineering params ("5" %, "1,75" mm).
export function parseDecimal(input: string): number | null {
  const text = input.trim().replace(/\s+/g, "").replace(",", ".");
  if (!text) return null;
  const value = Number(text);
  return Number.isFinite(value) ? value : null;
}

export function formatDecimal(value: number, unit = ""): string {
  return `${numberFormat.format(value)}${unit ? ` ${unit}` : ""}`;
}
