"use client";

import { SelectField } from "@/components/ui/select-field";
import { TextField } from "@/components/ui/text-field";
import type { ParamDef } from "@/lib/categories";
import { formatDecimal, formatEngineering, parseDecimal, parseEngineering } from "@/lib/units";

export type ParamValues = Record<string, string | number>;
export type ParamInputs = Record<string, string>;

// Stored value → text shown in the input ("10k", "1,75").
export function paramToInput(def: ParamDef, value: string | number | undefined): string {
  if (value === undefined || value === null) return "";
  if (typeof value === "number") {
    return def.kind === "engineering" ? formatEngineering(value).replace(/\s/g, "") : formatDecimal(value);
  }
  return value;
}

// Stored value → display text with unit ("10 kΩ").
export function formatParam(def: ParamDef, value: string | number): string {
  if (typeof value === "number") {
    return def.kind === "engineering" ? formatEngineering(value, def.unit) : formatDecimal(value, def.unit);
  }
  return def.unit && def.kind === "select" ? `${value} ${def.unit}` : value;
}

// Input texts → stored values. Returns the keys whose number could not be read.
export function parseParams(defs: ParamDef[], inputs: ParamInputs): { values: ParamValues; invalid: string[] } {
  const values: ParamValues = {};
  const invalid: string[] = [];
  for (const def of defs) {
    const raw = (inputs[def.key] ?? "").trim();
    if (!raw) continue;
    if (def.kind === "engineering" || def.kind === "decimal") {
      const number = def.kind === "engineering" ? parseEngineering(raw, def.unit) : parseDecimal(raw);
      if (number === null) invalid.push(def.key);
      else values[def.key] = number;
    } else {
      values[def.key] = raw;
    }
  }
  return { values, invalid };
}

// Inputs for the structured parameters of a category.
export function ParamsFields({
  defs,
  inputs,
  invalid,
  onChange,
}: {
  defs: ParamDef[];
  inputs: ParamInputs;
  invalid: string[];
  onChange: (inputs: ParamInputs) => void;
}) {
  if (defs.length === 0) return null;
  const set = (key: string, value: string) => onChange({ ...inputs, [key]: value });

  return (
    <div className="grid grid-cols-2 gap-3">
      {defs.map((def) => {
        const label = def.unit ? `${def.label} (${def.unit})` : def.label;
        if (def.kind === "select") {
          return (
            <SelectField key={def.key} label={label} value={inputs[def.key] ?? ""} onChange={(e) => set(def.key, e.target.value)}>
              <option value="">—</option>
              {def.options?.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </SelectField>
          );
        }
        return (
          <TextField
            key={def.key}
            label={label}
            inputMode={def.kind === "text" ? "text" : "decimal"}
            placeholder={def.kind === "engineering" ? "ex. 10k, 4,7µ" : undefined}
            value={inputs[def.key] ?? ""}
            onChange={(e) => set(def.key, e.target.value)}
            error={invalid.includes(def.key) ? "Valeur non reconnue" : null}
          />
        );
      })}
    </div>
  );
}
