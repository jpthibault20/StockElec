"use client";

import { Suspense, useDeferredValue, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, Camera, MapPin, Replace, Search, SlidersHorizontal, X } from "lucide-react";
import { ItemRow } from "@/components/items/item-row";
import { LocationPickerDialog } from "@/components/locations/location-picker-dialog";
import { EquivalentsList } from "@/components/search/equivalents-list";
import { Badge } from "@/components/ui/badge";
import { Button, IconButton } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Segmented } from "@/components/ui/segmented";
import { SelectField } from "@/components/ui/select-field";
import { cn } from "@/lib/cn";
import { getIdentificationService } from "@/lib/identification";
import { ITEM_TYPE_LABELS } from "@/lib/items";
import { pathLabel, subtreeIds, useLocations } from "@/lib/locations";
import { compressImage } from "@/lib/photos";
import { hasActiveFilters, NO_FILTERS, search, type SearchFilters } from "@/lib/search/engine";
import { findEquivalents, referenceFromItem, referenceFromQuery } from "@/lib/search/equivalents";
import { parseQuery, type QueryToken } from "@/lib/search/query";
import { useSearchIndex } from "@/lib/search/use-search-index";
import type { Enum } from "@/lib/supabase/types";
import { formatEngineering } from "@/lib/units";
import { SectionTitle } from "@/components/ui/section-title";

export default function SearchPage() {
  return (
    <Suspense>
      <SearchScreen />
    </Suspense>
  );
}

const TYPE_OPTIONS = [
  { value: "all", label: "Tous" },
  ...(Object.keys(ITEM_TYPE_LABELS) as Array<Enum<"item_type">>).map((value) => ({ value, label: ITEM_TYPE_LABELS[value] })),
];

// How the query was understood, shown as chips (parametric search made visible).
function tokenLabel(token: QueryToken, categoryName: (id: string) => string): string | null {
  switch (token.kind) {
    case "value":
      return token.unit ? formatEngineering(token.value, token.unit) : `Valeur ${formatEngineering(token.value)}`;
    case "package":
      return `Boîtier ${token.raw.toUpperCase()}`;
    case "category":
      return `Catégorie ${categoryName(token.categoryIds[0])}`;
    default:
      return null;
  }
}

function SearchScreen() {
  const router = useRouter();
  const params = useSearchParams();
  const [query, setQuery] = useState(params.get("q") ?? "");
  const deferredQuery = useDeferredValue(query);
  // ?category=<id> (home quick access) pre-selects the category filter.
  const initialCategory = params.get("category");
  const [filters, setFilters] = useState<SearchFilters>({ ...NO_FILTERS, categoryId: initialCategory });
  const [filtersOpen, setFiltersOpen] = useState(Boolean(initialCategory));
  const [locationFilter, setLocationFilter] = useState<string | null>(null);
  const [pickingLocation, setPickingLocation] = useState(false);
  const [photoBusy, setPhotoBusy] = useState(false);
  const photoInput = useRef<HTMLInputElement>(null);
  const { index, context, categories, isPending, isError } = useSearchIndex();
  const { tree } = useLocations();
  const identification = getIdentificationService();

  const parsed = useMemo(() => parseQuery(deferredQuery, context), [deferredQuery, context]);
  const results = useMemo(() => search(index, parsed, filters), [index, parsed, filters]);

  // Nothing usable in stock: propose equivalents, from the query itself or from
  // the best out-of-stock match.
  const equivalents = useMemo(() => {
    if (parsed.tokens.length === 0 || results.some((result) => result.entry.status !== "out")) return [];
    const reference =
      referenceFromQuery(parsed, categories) ?? (results[0] ? referenceFromItem(results[0].entry) : null);
    return reference ? findEquivalents(reference, index) : [];
  }, [parsed, results, categories, index]);

  function updateQuery(value: string) {
    setQuery(value);
    // Keep the query in the URL (back navigation, sharing) without a navigation.
    const url = value.trim() ? `/search?q=${encodeURIComponent(value)}` : "/search";
    window.history.replaceState(null, "", url);
  }

  function chooseLocation(id: string | null) {
    setPickingLocation(false);
    setLocationFilter(id);
    setFilters((current) => ({ ...current, locationIds: id ? new Set(subtreeIds(tree, id)) : null }));
  }

  // Photo search (prepared, visible only with AI enabled).
  async function searchByPhoto(file: File | undefined) {
    if (!file) return;
    setPhotoBusy(true);
    try {
      const suggestion = await identification.identify(await compressImage(file), {
        categories: (categories.data ?? []).map((category) => ({
          path: categories.labelFor(category.id),
          params: categories.paramsFor(category.id),
        })),
      });
      const text = suggestion?.mpn ?? suggestion?.name;
      if (text) updateQuery(text);
    } finally {
      setPhotoBusy(false);
      if (photoInput.current) photoInput.current.value = "";
    }
  }

  const chips = parsed.tokens
    .map((token) => tokenLabel(token, (id) => categories.byId.get(id)?.name ?? ""))
    .filter((label): label is string => Boolean(label));
  const activeFilters = hasActiveFilters(filters);
  const showEmpty = !isPending && (parsed.tokens.length > 0 || activeFilters) && results.length === 0;

  return (
    <div className="flex flex-col gap-4">
      <div className="sticky top-0 z-20 -mx-4 -mt-4 flex items-center gap-2 border-b border-chrome-raised bg-chrome px-4 pt-[calc(0.5rem+env(safe-area-inset-top))] pb-2 text-chrome-fg lg:-mx-8 lg:px-8">
        <IconButton label="Retour" tone="chrome" onClick={() => router.back()}>
          <ArrowLeft aria-hidden size={22} />
        </IconButton>
        <label className="flex min-h-touch flex-1 items-center gap-2 rounded-full border border-transparent bg-chrome-raised px-4 focus-within:border-chrome-active">
          <Search aria-hidden size={20} className="text-chrome-muted" />
          <span className="sr-only">Rechercher</span>
          <input
            type="search"
            autoFocus
            enterKeyHint="search"
            placeholder="ex. résistance 10k 0805"
            value={query}
            onChange={(event) => updateQuery(event.target.value)}
            className="min-w-0 flex-1 bg-transparent text-base text-chrome-fg outline-none placeholder:text-chrome-muted"
          />
          {query && (
            <button type="button" aria-label="Effacer" onClick={() => updateQuery("")} className="text-chrome-muted hover:text-chrome-fg">
              <X aria-hidden size={18} />
            </button>
          )}
        </label>
        {identification.enabled && (
          <IconButton label="Rechercher par photo" tone="chrome" onClick={() => photoInput.current?.click()} disabled={photoBusy}>
            <Camera aria-hidden size={22} />
          </IconButton>
        )}
        <IconButton label="Filtres" tone="chrome" active={activeFilters || filtersOpen} onClick={() => setFiltersOpen((open) => !open)}>
          <SlidersHorizontal aria-hidden size={22} />
        </IconButton>
      </div>
      <input
        ref={photoInput}
        type="file"
        accept="image/*"
        capture="environment"
        hidden
        onChange={(event) => searchByPhoto(event.target.files?.[0])}
      />

      {filtersOpen && (
        <Card className="flex flex-col gap-3">
          <Segmented
            label="Type d'article"
            size="sm"
            value={filters.type ?? "all"}
            options={TYPE_OPTIONS}
            onChange={(value) => setFilters((f) => ({ ...f, type: value === "all" ? null : (value as Enum<"item_type">) }))}
          />
          <div className="grid gap-3 sm:grid-cols-2">
            <SelectField
              label="Catégorie"
              value={filters.categoryId ?? ""}
              onChange={(event) => setFilters((f) => ({ ...f, categoryId: event.target.value || null }))}
            >
              <option value="">Toutes</option>
              {categories.roots.map((root) => (
                <optgroup key={root.id} label={root.name}>
                  <option value={root.id}>{root.name} (tout)</option>
                  {categories.childrenOf(root.id).map((child) => (
                    <option key={child.id} value={child.id}>
                      {child.name}
                    </option>
                  ))}
                </optgroup>
              ))}
            </SelectField>
            <div className="flex flex-col gap-1.5">
              <span className="text-sm font-medium">Emplacement</span>
              <button
                type="button"
                onClick={() => setPickingLocation(true)}
                className="flex min-h-touch items-center gap-2 rounded-control border border-border-strong bg-surface px-3 text-left"
              >
                <MapPin aria-hidden size={18} className="text-accent-fg" />
                <span className={cn("truncate", !locationFilter && "text-muted")}>
                  {locationFilter ? pathLabel(tree, locationFilter) : "Tous"}
                </span>
              </button>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            {(
              [
                ["low", "Stock faible"],
                ["out", "En rupture"],
              ] as const
            ).map(([value, label]) => (
              <button
                key={value}
                type="button"
                aria-pressed={filters.stock === value}
                onClick={() => setFilters((f) => ({ ...f, stock: f.stock === value ? null : value }))}
                className={cn(
                  "min-h-touch rounded-full border px-4 text-sm font-medium transition-colors duration-150",
                  filters.stock === value ? "border-alert bg-alert-soft text-alert" : "border-border-strong text-fg",
                )}
              >
                {label}
              </button>
            ))}
          </div>
          {activeFilters && (
            <Button
              variant="ghost"
              className="self-start"
              onClick={() => {
                setFilters(NO_FILTERS);
                setLocationFilter(null);
              }}
            >
              Effacer les filtres
            </Button>
          )}
        </Card>
      )}

      {chips.length > 0 && (
        <div className="flex flex-wrap gap-1.5" aria-label="Recherche comprise comme">
          {chips.map((chip) => (
            <Badge key={chip} tone="accent">
              {chip}
            </Badge>
          ))}
        </div>
      )}

      {isError && <p role="alert" className="text-alert">Chargement impossible. Vérifie la connexion.</p>}

      {results.length > 0 && (
        <Card className="px-3 py-1">
          <p className="pt-2 text-sm text-muted">
            {results.length} résultat{results.length > 1 ? "s" : ""}
          </p>
          <ul className="divide-y divide-border">
            {results.map(({ entry }) => (
              <li key={entry.item.id}>
                <ItemRow
                  item={entry.item}
                  linked
                  subtitle={entry.item.location_id ? pathLabel(tree, entry.item.location_id) : "Sans emplacement"}
                  actions={
                    entry.status === "out" ? (
                      <Badge tone="alert">Rupture</Badge>
                    ) : entry.status === "low" ? (
                      <Badge tone="alert">Faible</Badge>
                    ) : null
                  }
                />
              </li>
            ))}
          </ul>
        </Card>
      )}

      {showEmpty && <p className="text-center text-muted">Aucun article ne correspond.</p>}

      {equivalents.length > 0 && (
        <section aria-labelledby="equivalents-title" className="flex flex-col gap-2">
          <SectionTitle id="equivalents-title" icon={<Replace size={18} />}>
            Pas en stock — équivalents disponibles
          </SectionTitle>
          <EquivalentsList
            equivalents={equivalents}
            locationLabel={(id) => (id ? pathLabel(tree, id) : null)}
          />
        </section>
      )}

      {!query && !activeFilters && (
        <p className="text-center text-sm text-muted">
          Nom, référence, valeur, boîtier… ex. « LDO 3.3V SOT-23 », « condo 100n », « étain ».
        </p>
      )}

      <LocationPickerDialog
        open={pickingLocation}
        title="Filtrer par emplacement"
        onClose={() => setPickingLocation(false)}
        currentId={locationFilter}
        noneLabel="Tous les emplacements"
        onPick={chooseLocation}
      />
    </div>
  );
}
