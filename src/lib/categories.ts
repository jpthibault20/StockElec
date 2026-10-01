"use client";

import { useEffect, useMemo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { getSupabase } from "@/lib/supabase/client";
import type { Enum, Row } from "@/lib/supabase/types";

export type Category = Row<"categories">;

// One structured technical parameter of a category.
// - engineering: number entered with SI prefixes ("10k", "4,7µ")
// - decimal: plain number ("1,75")
// - select: one of `options`
// - text: free text
export type ParamDef = {
  key: string;
  label: string;
  kind: "engineering" | "decimal" | "select" | "text";
  unit?: string;
  options?: string[];
};

type Seed = { name: string; params?: ParamDef[]; children?: Seed[] };

const voltage: ParamDef = { key: "voltage", label: "Tension", kind: "engineering", unit: "V" };
const current: ParamDef = { key: "current", label: "Courant", kind: "engineering", unit: "A" };
const diameter: ParamDef = { key: "diameter", label: "Diamètre", kind: "decimal", unit: "mm" };

// Default tree created on first use. A sub-category inherits its parent's
// parameters and may add its own.
const DEFAULT_CATEGORIES: Seed[] = [
  {
    name: "Résistances",
    params: [
      { key: "resistance", label: "Valeur", kind: "engineering", unit: "Ω" },
      { key: "tolerance", label: "Tolérance", kind: "select", unit: "%", options: ["0,1", "0,5", "1", "2", "5", "10", "20"] },
      { key: "power", label: "Puissance", kind: "engineering", unit: "W" },
    ],
    children: [{ name: "CMS" }, { name: "Traversantes" }, { name: "Potentiomètres" }],
  },
  {
    name: "Condensateurs",
    params: [
      { key: "capacitance", label: "Capacité", kind: "engineering", unit: "F" },
      voltage,
      {
        key: "dielectric",
        label: "Diélectrique",
        kind: "select",
        options: ["C0G/NP0", "X7R", "X5R", "Y5V", "Électrolytique", "Tantale", "Film", "Polymère"],
      },
    ],
    children: [{ name: "Céramique" }, { name: "Électrolytiques" }, { name: "Tantale" }, { name: "Film" }],
  },
  {
    name: "Inductances",
    params: [{ key: "inductance", label: "Inductance", kind: "engineering", unit: "H" }, current],
  },
  {
    name: "Diodes",
    params: [voltage, current],
    children: [
      { name: "Redressement" },
      { name: "Schottky" },
      { name: "Zener" },
      { name: "LED", params: [{ key: "color", label: "Couleur", kind: "text" }] },
    ],
  },
  {
    name: "Transistors",
    params: [
      { ...voltage, label: "Tension max" },
      { ...current, label: "Courant max" },
    ],
    children: [{ name: "NPN" }, { name: "PNP" }, { name: "MOSFET canal N" }, { name: "MOSFET canal P" }],
  },
  {
    name: "Circuits intégrés",
    children: [
      { name: "Microcontrôleurs" },
      {
        name: "Régulateurs de tension",
        params: [{ ...voltage, key: "output_voltage", label: "Tension de sortie" }, { ...current, label: "Courant max" }],
      },
      { name: "Amplificateurs opérationnels" },
      { name: "Logique" },
      { name: "Mémoires" },
      { name: "Interfaces et communication" },
      { name: "Capteurs" },
    ],
  },
  {
    name: "Connecteurs",
    params: [
      { key: "pitch", label: "Pas", kind: "decimal", unit: "mm" },
      { key: "pins", label: "Nombre de broches", kind: "decimal" },
    ],
    children: [{ name: "Barrettes" }, { name: "JST" }, { name: "Borniers" }, { name: "USB" }],
  },
  {
    name: "Modules",
    params: [
      { ...voltage, label: "Alimentation" },
      { key: "interface", label: "Interface", kind: "text" },
    ],
    children: [
      { name: "Cartes microcontrôleur" },
      { name: "Capteurs" },
      { name: "Afficheurs" },
      { name: "Communication" },
      { name: "Alimentation" },
    ],
  },
  {
    name: "Électromécanique",
    children: [{ name: "Relais" }, { name: "Interrupteurs et boutons" }, { name: "Moteurs" }, { name: "Buzzers" }],
  },
  {
    name: "Consommables",
    children: [
      { name: "Étain", params: [diameter] },
      { name: "Flux" },
      { name: "Tresse à dessouder", params: [{ key: "width", label: "Largeur", kind: "decimal", unit: "mm" }] },
      { name: "Gaine thermorétractable", params: [diameter] },
      { name: "Fil électrique", params: [{ key: "gauge", label: "Section / AWG", kind: "text" }] },
    ],
  },
  {
    name: "Outillage",
    children: [{ name: "Soudure" }, { name: "Mesure" }, { name: "Prototypage" }, { name: "Pinces et tournevis" }],
  },
  {
    name: "Impression 3D",
    children: [
      { name: "Filament" },
      { name: "Buses", params: [diameter] },
      { name: "Plateaux" },
      { name: "Courroies" },
      { name: "Ventilateurs" },
      { name: "Pièces de rechange" },
    ],
  },
];

// Item type of each root of the default tree (stored in categories.item_type;
// this map is the fallback for roots saved before that column existed).
const TYPE_BY_ROOT_NAME: Record<string, Enum<"item_type">> = {
  Consommables: "consumable",
  Outillage: "tool",
  "Impression 3D": "printing_3d",
};

export const categoryKeys = { all: ["categories"] as const };

function byName(a: Category, b: Category): number {
  return a.name.localeCompare(b.name, "fr", { sensitivity: "base" });
}

function asParams(value: Category["params_schema"]): ParamDef[] {
  return Array.isArray(value) ? (value as unknown as ParamDef[]) : [];
}

async function seedDefaults(): Promise<void> {
  const supabase = getSupabase();
  const { data: roots, error } = await supabase
    .from("categories")
    .insert(
      DEFAULT_CATEGORIES.map((seed) => ({
        name: seed.name,
        params_schema: seed.params ?? [],
        item_type: TYPE_BY_ROOT_NAME[seed.name] ?? "component",
      })),
    )
    .select("id, name");
  if (error) throw error;
  const idByName = new Map(roots.map((root) => [root.name, root.id]));
  const children = DEFAULT_CATEGORIES.flatMap((seed) =>
    (seed.children ?? []).map((child) => ({
      name: child.name,
      parent_id: idByName.get(seed.name)!,
      params_schema: child.params ?? [],
    })),
  );
  const { error: childError } = await supabase.from("categories").insert(children);
  if (childError) throw childError;
}

// One seeding for the whole app: every screen calling useCategories shares
// this promise, and the table is checked again right before inserting.
let seedPromise: Promise<void> | null = null;

function seedOnce(): Promise<void> {
  seedPromise ??= (async () => {
    const { count, error } = await getSupabase().from("categories").select("id", { count: "exact", head: true });
    if (error) throw error;
    if ((count ?? 0) === 0) await seedDefaults();
  })().catch((error: unknown) => {
    seedPromise = null;
    throw error;
  });
  return seedPromise;
}

export function useCategories() {
  const queryClient = useQueryClient();
  const query = useQuery({
    queryKey: categoryKeys.all,
    queryFn: async () => {
      const { data, error } = await getSupabase().from("categories").select("*");
      if (error) throw error;
      return data;
    },
    staleTime: 5 * 60_000,
  });

  // First use: create the default tree once.
  useEffect(() => {
    if (query.data?.length !== 0) return;
    seedOnce()
      .then(() => queryClient.invalidateQueries({ queryKey: categoryKeys.all }))
      .catch(() => undefined);
  }, [query.data, queryClient]);

  const helpers = useMemo(() => {
    const categories = query.data ?? [];
    const byId = new Map(categories.map((category) => [category.id, category]));
    const roots = categories.filter((category) => !category.parent_id).sort(byName);
    const childrenOf = (id: string) => categories.filter((category) => category.parent_id === id).sort(byName);

    // Root first, then the category itself.
    const lineage = (id: string | null): Category[] => {
      const result: Category[] = [];
      let current = id ? byId.get(id) : undefined;
      while (current && result.length < 10) {
        result.unshift(current);
        current = current.parent_id ? byId.get(current.parent_id) : undefined;
      }
      return result;
    };

    // Parameters of a category, inherited ones first; a child overrides by key.
    const paramsFor = (id: string | null): ParamDef[] => {
      const merged = new Map<string, ParamDef>();
      for (const category of lineage(id)) {
        for (const param of asParams(category.params_schema)) merged.set(param.key, param);
      }
      return [...merged.values()];
    };

    const labelFor = (id: string | null) =>
      lineage(id)
        .map((category) => category.name)
        .join(" › ");

    // Item type of a category: the one of its root.
    const typeOf = (category: Category): Enum<"item_type"> =>
      category.item_type ?? TYPE_BY_ROOT_NAME[category.name] ?? "component";

    const suggestedType = (id: string | null): Enum<"item_type"> | undefined => {
      const root = lineage(id)[0];
      return root ? typeOf(root) : undefined;
    };

    // Root categories relevant for an item type (no resistors for 3D printing).
    const rootsForType = (type: Enum<"item_type">) => roots.filter((root) => typeOf(root) === type);

    return { byId, roots, childrenOf, lineage, paramsFor, labelFor, suggestedType, rootsForType };
  }, [query.data]);

  return { ...query, ...helpers };
}

export function useCreateCategory() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      name,
      parentId,
      itemType,
    }: {
      name: string;
      parentId: string | null;
      // Only stored on root categories; sub-categories inherit their root's.
      itemType: Enum<"item_type">;
    }) => {
      const { data, error } = await getSupabase()
        .from("categories")
        .insert({ name, parent_id: parentId, item_type: parentId ? null : itemType })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: categoryKeys.all }),
  });
}
