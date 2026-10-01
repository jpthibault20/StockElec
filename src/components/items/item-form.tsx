"use client";

import { useEffect, useRef, useState, type FormEvent, type ReactNode } from "react";
import { MapPin, Minus, Plus } from "lucide-react";
import { useAuth } from "@/components/auth-provider";
import { CategoryDialog } from "@/components/items/category-dialog";
import { DuplicateDialog } from "@/components/items/duplicate-dialog";
import { FilamentFieldsSection, filamentDraft, filamentFields, type FilamentDraft } from "@/components/items/filament-fields";
import { LinksEditor, newLinkRow, type LinkRow } from "@/components/items/links-editor";
import { NameSuggestions } from "@/components/items/name-suggestions";
import { ParamsFields, paramToInput, parseParams, type ParamInputs, type ParamValues } from "@/components/items/params-fields";
import { PhotoField, type NewPhoto } from "@/components/items/photo-field";
import { LocationPickerDialog } from "@/components/locations/location-picker-dialog";
import { Button, IconButton } from "@/components/ui/button";
import { Segmented } from "@/components/ui/segmented";
import { SelectField } from "@/components/ui/select-field";
import { TextAreaField, TextField } from "@/components/ui/text-field";
import { useCategories } from "@/lib/categories";
import { tareForBrand, useSpoolTares } from "@/lib/filaments";
import { APPROX_LABELS } from "@/lib/format";
import {
  ITEM_TYPE_LABELS,
  UNIT_OPTIONS,
  attachPhotos,
  findSimilarItems,
  useAdjustQuantity,
  useSaveItem,
  type ItemDetail,
  type ItemFields,
  type ItemPhoto,
  type ItemSummary,
} from "@/lib/items";
import { pathLabel, useLocations } from "@/lib/locations";
import type { Enum } from "@/lib/supabase/types";
import { formatDecimal, parseDecimal } from "@/lib/units";

// Values proposed for a new item by a scan or a photo identification.
export type ItemPrefill = {
  name?: string | null;
  mpn?: string | null;
  manufacturer?: string | null;
  package?: string | null;
  barcode?: string | null;
  quantity?: number | null;
  categoryId?: string | null;
  // Parameter values as typed text ("10k"), parsed on save.
  paramInputs?: Record<string, string>;
  links?: Array<{ supplier: string; url: string }>;
  photos?: NewPhoto[];
};

type ItemFormProps = {
  // Edit mode when set.
  item?: ItemDetail;
  // Duplicate: new item pre-filled from this one (photos excluded).
  template?: ItemDetail;
  prefill?: ItemPrefill;
  // Runs the anti-duplicate check as soon as the form opens (after a scan).
  checkDuplicatesOnOpen?: boolean;
  defaultLocationId?: string | null;
  onSaved: (itemId: string) => void;
};

// Examples shown in the fields, adapted to the kind of item being entered.
const PLACEHOLDERS: Record<
  Enum<"item_type">,
  { name: string; mpn: string; manufacturer: string; package: string; tags: string; notes: string }
> = {
  component: {
    name: "ex. Résistance 10 kΩ 0805",
    mpn: "ex. 0805W8F1002T5E",
    manufacturer: "ex. Uni-Royal",
    package: "0805, SOT-23…",
    tags: "ex. cms, e24",
    notes: "ex. Rabiot du kit de démarrage",
  },
  consumable: {
    name: "ex. Étain sans plomb 0,8 mm",
    mpn: "ex. SN100C-0.8",
    manufacturer: "ex. Stannol",
    package: "ex. Bobine 250 g, seringue 10 ml",
    tags: "ex. soudure, sans plomb",
    notes: "ex. À racheter avant la fin",
  },
  tool: {
    name: "ex. Fer à souder TS101",
    mpn: "ex. TS101-B",
    manufacturer: "ex. Miniware",
    package: "ex. Panne BC2, embout PH1",
    tags: "ex. soudure, établi",
    notes: "ex. Pannes de rechange dans le tiroir 2",
  },
  printing_3d: {
    name: "ex. PLA noir 1 kg",
    mpn: "ex. Référence fabricant",
    manufacturer: "ex. Prusament, Bambu Lab",
    package: "ex. Bobine 1 kg, buse 0,4 mm",
    tags: "ex. pla, noir",
    notes: "ex. Bien sécher avant impression",
  },
};

const TYPE_OPTIONS = (Object.keys(ITEM_TYPE_LABELS) as Array<Enum<"item_type">>).map((value) => ({
  value,
  label: ITEM_TYPE_LABELS[value],
}));
const APPROX_OPTIONS = (Object.keys(APPROX_LABELS) as Array<Enum<"approx_level">>).map((value) => ({
  value,
  label: APPROX_LABELS[value],
}));

// Waits for categories and locations so every field starts from final values.
export function ItemForm(props: ItemFormProps) {
  const categories = useCategories();
  const locations = useLocations();
  if (!categories.data?.length || locations.isPending) {
    return <p className="py-8 text-center text-muted">Chargement…</p>;
  }
  return <ItemFormFields {...props} />;
}

function Section({ title, open, children }: { title: string; open?: boolean; children: ReactNode }) {
  return (
    <details open={open} className="group rounded-card border border-border bg-surface shadow-card">
      <summary className="flex min-h-touch cursor-pointer list-none items-center justify-between px-4 font-semibold">
        {title}
        <Plus aria-hidden size={18} className="text-muted transition-transform duration-200 group-open:rotate-45" />
      </summary>
      <div className="flex flex-col gap-4 px-4 pb-4">{children}</div>
    </details>
  );
}

function ItemFormFields({
  item,
  template,
  prefill,
  checkDuplicatesOnOpen = false,
  defaultLocationId = null,
  onSaved,
}: ItemFormProps) {
  const auth = useAuth();
  const categories = useCategories();
  const { tree } = useLocations();
  const save = useSaveItem();
  const adjust = useAdjustQuantity();
  const tares = useSpoolTares();
  const source = item ?? template;
  const sourceParams = (source?.params ?? {}) as ParamValues;

  const [type, setType] = useState<Enum<"item_type">>(source?.type ?? "component");
  const [typeTouched, setTypeTouched] = useState(Boolean(source));
  const [name, setName] = useState(source?.name ?? prefill?.name ?? "");
  const [nameFocused, setNameFocused] = useState(false);
  const [categoryId, setCategoryId] = useState<string | null>(source?.category_id ?? prefill?.categoryId ?? null);
  const [locationId, setLocationId] = useState<string | null>(source ? source.location_id : defaultLocationId);
  const [quantityMode, setQuantityMode] = useState<Enum<"quantity_mode">>(source?.quantity_mode ?? "exact");
  const [quantity, setQuantity] = useState(
    source ? formatDecimal(Number(source.quantity)) : formatDecimal(prefill?.quantity ?? 1),
  );
  const [unit, setUnit] = useState<Enum<"quantity_unit">>(source?.unit ?? "piece");
  const [approxLevel, setApproxLevel] = useState<Enum<"approx_level">>(source?.approx_level ?? "plenty");
  const [mpn, setMpn] = useState(source?.mpn ?? prefill?.mpn ?? "");
  const [manufacturer, setManufacturer] = useState(source?.manufacturer ?? prefill?.manufacturer ?? "");
  const [pkg, setPkg] = useState(source?.package ?? prefill?.package ?? "");
  const [barcode, setBarcode] = useState(source?.barcode ?? prefill?.barcode ?? "");
  const [paramInputs, setParamInputs] = useState<ParamInputs>(() => ({
    ...Object.fromEntries(
      categories.paramsFor(source?.category_id ?? null).map((def) => [def.key, paramToInput(def, sourceParams[def.key])]),
    ),
    ...prefill?.paramInputs,
  }));
  const [minThreshold, setMinThreshold] = useState(
    source?.min_threshold != null ? formatDecimal(Number(source.min_threshold)) : "",
  );
  const [datasheetUrl, setDatasheetUrl] = useState(source?.datasheet_url ?? "");
  const [notes, setNotes] = useState(source?.notes ?? "");
  const [tags, setTags] = useState((source?.tags ?? []).join(", "));
  const [links, setLinks] = useState<LinkRow[]>(
    source?.links.map((link) => ({
      key: link.id,
      supplier: link.supplier,
      url: link.url,
      price: link.unit_price != null ? formatDecimal(Number(link.unit_price)) : "",
    })) ?? prefill?.links?.map((link) => ({ ...newLinkRow(), ...link })) ?? [],
  );
  const [keptPhotos, setKeptPhotos] = useState<ItemPhoto[]>(item?.photos ?? []);
  const [removedPhotos, setRemovedPhotos] = useState<ItemPhoto[]>([]);
  const [newPhotos, setNewPhotos] = useState<NewPhoto[]>(prefill?.photos ?? []);
  const [filament, setFilament] = useState<FilamentDraft>(() => filamentDraft(source?.filament, null));

  const [invalidParams, setInvalidParams] = useState<string[]>([]);
  const [formError, setFormError] = useState<string | null>(null);
  const [panel, setPanel] = useState<"location" | "category" | null>(null);
  const [duplicates, setDuplicates] = useState<{ matches: ItemSummary[]; fields: ItemFields } | null>(null);
  const [checking, setChecking] = useState(false);

  const lineage = categories.lineage(categoryId);
  const rootId = lineage[0]?.id ?? "";
  const subId = lineage[1]?.id ?? "";
  const paramDefs = categories.paramsFor(categoryId);
  const placeholders = PLACEHOLDERS[type];
  // Filament details for 3D printing items in a "Filament" category (or that
  // already have them). Quantity is then the remaining weight in grams.
  const isFilament =
    type === "printing_3d" && (lineage.some((category) => category.name === "Filament") || Boolean(source?.filament));
  const knownTare = tareForBrand(tares.data, manufacturer);
  const userId = auth.session?.user.id;
  const busy = save.isPending || adjust.isPending || checking;
  const detailsOpen =
    Boolean(item) || invalidParams.length > 0 || Boolean(prefill?.mpn || prefill?.barcode || prefill?.paramInputs);

  function chooseCategory(id: string | null) {
    setCategoryId(id);
    if (!typeTouched) {
      const suggested = categories.suggestedType(id);
      if (suggested) setType(suggested);
    }
  }

  // Pure: form state -> item fields, or the validation problem.
  function computeFields(): { fields: ItemFields | null; error: string | null; invalid: string[] } {
    const { values, invalid } = parseParams(paramDefs, paramInputs);
    const parsedQuantity = quantityMode === "exact" || isFilament ? parseDecimal(quantity) : 0;
    const parsedThreshold = minThreshold.trim() ? parseDecimal(minThreshold) : null;
    const fail = (error: string) => ({ fields: null, error, invalid });
    if (invalid.length > 0) return fail("Certains paramètres ne sont pas reconnus.");
    if (parsedQuantity === null || parsedQuantity < 0) return fail("La quantité doit être un nombre positif.");
    if (minThreshold.trim() && (parsedThreshold === null || parsedThreshold < 0)) {
      return fail("Le seuil d'alerte doit être un nombre positif.");
    }
    const text = (value: string) => value.trim() || null;
    const fields: ItemFields = {
      type,
      name: name.trim(),
      category_id: categoryId,
      location_id: locationId,
      mpn: text(mpn),
      manufacturer: text(manufacturer),
      package: text(pkg),
      barcode: text(barcode),
      params: values,
      quantity_mode: isFilament ? "exact" : quantityMode,
      quantity: quantityMode === "exact" || isFilament ? parsedQuantity : item ? Number(item.quantity) : 0,
      unit: isFilament ? "gram" : unit,
      approx_level: quantityMode === "approximate" ? approxLevel : null,
      min_threshold: parsedThreshold,
      datasheet_url: text(datasheetUrl),
      notes: text(notes),
      tags: tags
        .split(",")
        .map((tag) => tag.trim())
        .filter(Boolean),
    };
    return { fields, error: null, invalid };
  }

  // computeFields + shows the validation problem in the form.
  function buildFields(): ItemFields | null {
    const result = computeFields();
    setInvalidParams(result.invalid);
    setFormError(result.error);
    return result.fields;
  }

  async function persist(fields: ItemFields) {
    if (!userId) return;
    try {
      const id = await save.mutateAsync({
        id: item?.id,
        userId,
        fields,
        links: links
          .filter((link) => link.url.trim())
          .map((link) => ({
            supplier: link.supplier.trim() || "Fournisseur",
            url: link.url.trim(),
            unit_price: link.price.trim() ? parseDecimal(link.price) : null,
          })),
        keptPhotos,
        removedPhotos,
        newPhotos: newPhotos.map((photo) => photo.blob),
        filament: isFilament ? filamentFields(filament, Number(fields.quantity ?? 0)) : undefined,
        rememberTare:
          isFilament && filament.rememberTare && manufacturer.trim() && parseDecimal(filament.tare) !== null
            ? { brand: manufacturer, tareG: parseDecimal(filament.tare)! }
            : undefined,
      });
      onSaved(id);
    } catch {
      setFormError("Enregistrement impossible. Vérifie la connexion et réessaie.");
    }
  }

  // Returns true when similar items were found (the merge dialog is then open).
  async function checkDuplicates(fields: ItemFields): Promise<boolean> {
    setChecking(true);
    try {
      const matches = await findSimilarItems(fields);
      if (matches.length === 0) return false;
      setDuplicates({ matches, fields });
      return true;
    } catch {
      // The check is a convenience: never block saving because of it.
      return false;
    } finally {
      setChecking(false);
    }
  }

  // After a scan, tell right away if the part is already in stock.
  const checkedOnOpen = useRef(false);
  useEffect(() => {
    if (!checkDuplicatesOnOpen || item || checkedOnOpen.current) return;
    checkedOnOpen.current = true;
    const { fields } = computeFields();
    if (!fields) return;
    findSimilarItems(fields)
      .then((matches) => {
        if (matches.length > 0) setDuplicates({ matches, fields });
      })
      .catch(() => undefined);
    // Runs once, with the initial (pre-filled) values.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const fields = buildFields();
    if (!fields) return;
    if (!item && (await checkDuplicates(fields))) return;
    await persist(fields);
  }

  async function mergeInto(existing: ItemSummary) {
    if (!userId || !duplicates) return;
    const delta = Number(duplicates.fields.quantity ?? 0);
    try {
      if (existing.quantity_mode === "exact" && quantityMode === "exact" && delta > 0) {
        await adjust.mutateAsync({ id: existing.id, delta });
      }
      // V1 photo mode: a photo taken while adding is kept on the existing item,
      // after its own photos (high start position, only used for ordering).
      await attachPhotos(userId, existing.id, newPhotos.map((photo) => photo.blob), 1000);
      onSaved(existing.id);
    } catch {
      setDuplicates(null);
      setFormError("La fusion a échoué. Vérifie la connexion et réessaie.");
    }
  }

  const step = (delta: number) => {
    const current = parseDecimal(quantity) ?? 0;
    setQuantity(formatDecimal(Math.max(0, current + delta)));
  };

  return (
    <form onSubmit={onSubmit} className="mx-auto flex max-w-2xl flex-col gap-4">
      <Segmented
        label="Type d'article"
        value={type}
        options={TYPE_OPTIONS}
        onChange={(value) => {
          setType(value);
          setTypeTouched(true);
          // Keep the category only if it belongs to the new type (no resistors for
          // a filament); when the type has a single root category, pre-select it.
          const roots = categories.rootsForType(value);
          const keep = categoryId !== null && categories.suggestedType(categoryId) === value;
          if (!keep) setCategoryId(roots.length === 1 ? roots[0].id : null);
        }}
        size="sm"
      />

      <TextField
        label="Nom"
        required
        autoFocus={!item}
        maxLength={120}
        placeholder={placeholders.name}
        value={name}
        onChange={(event) => setName(event.target.value)}
        onFocus={() => setNameFocused(true)}
        onBlur={() => setTimeout(() => setNameFocused(false), 200)}
      />
      {!item && nameFocused && <NameSuggestions query={name} itemType={type} onPickCategory={chooseCategory} />}

      <div className="grid grid-cols-2 gap-3">
        <SelectField label="Catégorie" value={rootId} onChange={(event) => chooseCategory(event.target.value || null)}>
          <option value="">—</option>
          {categories.rootsForType(type).map((root) => (
            <option key={root.id} value={root.id}>
              {root.name}
            </option>
          ))}
        </SelectField>
        <SelectField
          label="Sous-catégorie"
          value={subId}
          disabled={!rootId}
          onChange={(event) => chooseCategory(event.target.value || rootId || null)}
        >
          <option value="">—</option>
          {rootId &&
            categories.childrenOf(rootId).map((child) => (
              <option key={child.id} value={child.id}>
                {child.name}
              </option>
            ))}
        </SelectField>
      </div>
      <button type="button" onClick={() => setPanel("category")} className="-mt-2 self-start text-sm font-medium text-primary underline">
        Nouvelle catégorie
      </button>

      <div className="flex flex-col gap-2">
        <span className="text-sm font-medium">{isFilament ? "Poids restant (g)" : "Quantité"}</span>
        {!isFilament && (
          <Segmented
            label="Mode de quantité"
            size="sm"
            value={quantityMode}
            options={[
              { value: "exact", label: "Exacte" },
              { value: "approximate", label: "Approximative (vrac)" },
            ]}
            onChange={setQuantityMode}
          />
        )}
        {quantityMode === "exact" || isFilament ? (
          <div className="flex items-center gap-2">
            <IconButton label="Moins 1" onClick={() => step(-1)} round className="border border-border-strong bg-surface">
              <Minus aria-hidden size={20} />
            </IconButton>
            <input
              aria-label="Quantité"
              inputMode="decimal"
              value={quantity}
              onChange={(event) => setQuantity(event.target.value)}
              onFocus={(event) => event.target.select()}
              className="min-h-touch w-24 rounded-control border border-border-strong bg-surface px-3 text-center text-lg font-semibold tabular-nums focus:border-primary"
            />
            <IconButton label="Plus 1" tone="primary" round onClick={() => step(1)}>
              <Plus aria-hidden size={20} />
            </IconButton>
            {isFilament ? (
              <span className="flex-1 px-1 font-medium">grammes</span>
            ) : (
              <select
                aria-label="Unité"
                value={unit}
                onChange={(event) => setUnit(event.target.value as Enum<"quantity_unit">)}
                className="min-h-touch flex-1 rounded-control border border-border-strong bg-surface px-3 focus:border-primary"
              >
                {UNIT_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            )}
          </div>
        ) : (
          <Segmented label="Niveau de stock" value={approxLevel} options={APPROX_OPTIONS} onChange={setApproxLevel} />
        )}
      </div>

      <div className="flex flex-col gap-1.5">
        <span className="text-sm font-medium">Emplacement</span>
        <button
          type="button"
          onClick={() => setPanel("location")}
          className="flex min-h-touch items-center gap-2 rounded-control border border-border-strong bg-surface px-3 text-left hover:border-primary"
        >
          <MapPin aria-hidden size={18} className="text-accent-fg" />
          <span className={locationId ? "truncate" : "text-muted"}>
            {locationId ? pathLabel(tree, locationId) : tree.byId.size > 0 ? "Choisir un emplacement" : "Créer un emplacement"}
          </span>
        </button>
      </div>

      <PhotoField
        kept={keptPhotos}
        added={newPhotos}
        onRemoveKept={(photo) => {
          setKeptPhotos((photos) => photos.filter((p) => p.id !== photo.id));
          setRemovedPhotos((photos) => [...photos, photo]);
        }}
        onAdd={(photo) => setNewPhotos((photos) => [...photos, photo])}
        onRemoveAdded={(photo) => setNewPhotos((photos) => photos.filter((p) => p !== photo))}
      />

      {isFilament && (
        <Section title="Filament" open>
          <FilamentFieldsSection
            draft={filament}
            onChange={setFilament}
            brand={manufacturer}
            knownTare={knownTare}
            onRemaining={(grams) => setQuantity(formatDecimal(grams))}
          />
          <TextField
            label="Marque"
            placeholder={placeholders.manufacturer}
            value={manufacturer}
            onChange={(e) => setManufacturer(e.target.value)}
          />
        </Section>
      )}

      <Section title="Référence et paramètres" open={detailsOpen}>
        <div className="grid grid-cols-2 gap-3">
          <TextField
            label="Référence (MPN)"
            placeholder={placeholders.mpn}
            value={mpn}
            onChange={(e) => setMpn(e.target.value)}
            className="col-span-2"
          />
          <TextField
            label="Fabricant"
            placeholder={placeholders.manufacturer}
            value={manufacturer}
            onChange={(e) => setManufacturer(e.target.value)}
          />
          <TextField label="Boîtier" placeholder={placeholders.package} value={pkg} onChange={(e) => setPkg(e.target.value)} />
          <TextField
            label="Code-barres (EAN)"
            inputMode="numeric"
            value={barcode}
            onChange={(e) => setBarcode(e.target.value)}
            className="col-span-2"
          />
        </div>
        <ParamsFields defs={paramDefs} inputs={paramInputs} invalid={invalidParams} onChange={setParamInputs} />
      </Section>

      <Section title="Fournisseurs" open={Boolean(item) && links.length > 0}>
        <LinksEditor rows={links} onChange={setLinks} />
      </Section>

      <Section title="Alerte, notes et tags" open={Boolean(item) && Boolean(minThreshold || notes || tags || datasheetUrl)}>
        <TextField
          label="Alerte stock faible sous"
          hint={
            type === "consumable"
              ? "Recommandé pour les consommables. Vide = pas d'alerte."
              : "Facultatif. Vide = pas d'alerte."
          }
          inputMode="decimal"
          value={minThreshold}
          onChange={(e) => setMinThreshold(e.target.value)}
        />
        <TextField label="Datasheet (lien)" type="url" inputMode="url" value={datasheetUrl} onChange={(e) => setDatasheetUrl(e.target.value)} />
        <TextField
          label="Tags"
          hint="Séparés par des virgules"
          placeholder={placeholders.tags}
          value={tags}
          onChange={(e) => setTags(e.target.value)}
        />
        <TextAreaField label="Notes" placeholder={placeholders.notes} value={notes} onChange={(e) => setNotes(e.target.value)} />
      </Section>

      {formError && (
        <p role="alert" className="rounded-control bg-alert-soft px-3 py-2 font-medium text-alert">
          {formError}
        </p>
      )}

      <div className="sticky bottom-[calc(4.5rem+env(safe-area-inset-bottom))] z-10 -mx-4 bg-bg/95 px-4 py-2 backdrop-blur lg:bottom-0">
        <Button type="submit" size="lg" disabled={busy || !name.trim()} className="w-full">
          {busy ? "Enregistrement…" : item ? "Enregistrer" : "Ajouter au stock"}
        </Button>
      </div>

      <LocationPickerDialog
        open={panel === "location"}
        title="Ranger dans…"
        allowCreate
        onClose={() => setPanel(null)}
        currentId={locationId}
        noneLabel="Sans emplacement"
        onPick={(id) => {
          setLocationId(id);
          setPanel(null);
        }}
      />
      <CategoryDialog
        open={panel === "category"}
        onClose={() => setPanel(null)}
        defaultParentId={rootId || null}
        itemType={type}
        onCreated={(category) => chooseCategory(category.id)}
      />
      <DuplicateDialog
        open={duplicates !== null}
        matches={duplicates?.matches ?? []}
        quantity={quantityMode === "exact" ? Number(duplicates?.fields.quantity ?? 0) : 0}
        busy={busy}
        onMerge={mergeInto}
        onCreateAnyway={() => {
          const fields = duplicates?.fields;
          setDuplicates(null);
          if (fields) persist(fields);
        }}
        onClose={() => setDuplicates(null)}
      />
    </form>
  );
}
