"use client";

import { Suspense, useCallback, useRef, useState, type ReactNode } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Camera, Keyboard, ScanLine } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { ItemForm, type ItemPrefill } from "@/components/items/item-form";
import { BarcodeScanner } from "@/components/scan/barcode-scanner";
import { Dialog } from "@/components/ui/dialog";
import { cn } from "@/lib/cn";
import { useCategories } from "@/lib/categories";
import { getIdentificationService, type IdentificationSuggestion } from "@/lib/identification";
import { useItem } from "@/lib/items";
import { parseLocationQr } from "@/lib/location-url";
import { pathLabel, useLocations } from "@/lib/locations";
import { compressImage } from "@/lib/photos";
import { parseScannedLabel, supplierUrl, type ScannedLabel } from "@/lib/scan/parse-label";

// Formats read when adding: supplier labels (QR, DataMatrix, Code 128) and EAN.
const ADD_FORMATS = ["qr_code", "data_matrix", "code_128", "code_39", "ean_13", "ean_8", "upc_a", "upc_e"] as const;

// Quick add (spec 4.4): photo, scan or manual entry, all ending in the same
// pre-filled form that the user validates.
// ?location=<id> pre-selects a location, ?duplicate=<id> pre-fills from an
// item, ?scan=<raw>&format=<f> applies a code read on the /scan screen.
export default function AddPage() {
  return (
    <Suspense>
      <AddScreen />
    </Suspense>
  );
}

type Start = { prefill: ItemPrefill; checkDuplicates: boolean; notice: string | null };

function startFromLabel(label: ScannedLabel): Start {
  if (label.kind === "supplier") {
    const link =
      label.supplier && label.supplierPartNumber
        ? [{ supplier: label.supplier, url: supplierUrl(label.supplier, label.supplierPartNumber) }]
        : [];
    return {
      prefill: {
        name: label.mpn ?? label.supplierPartNumber,
        mpn: label.mpn,
        manufacturer: label.manufacturer,
        quantity: label.quantity,
        links: link,
      },
      checkDuplicates: true,
      notice: `Étiquette ${label.supplier ?? "fournisseur"} lue : vérifie et complète.`,
    };
  }
  if (label.kind === "ean") {
    return {
      prefill: { barcode: label.barcode },
      checkDuplicates: true,
      notice: "Code-barres lu. Donne un nom à l'article.",
    };
  }
  const usable = label.raw.length <= 40 && !/\s/.test(label.raw);
  return {
    prefill: usable ? { mpn: label.raw, name: label.raw } : {},
    checkDuplicates: usable,
    notice: usable ? "Code non reconnu : utilisé comme référence." : "Code non reconnu.",
  };
}

function AddScreen() {
  const router = useRouter();
  const params = useSearchParams();
  const duplicateId = params.get("duplicate");
  const scanned = params.get("scan");
  const template = useItem(duplicateId);
  const categories = useCategories();
  const { tree } = useLocations();

  const [start, setStart] = useState<Start>(() =>
    scanned
      ? startFromLabel(parseScannedLabel(scanned, params.get("format") ?? undefined))
      : { prefill: {}, checkDuplicates: false, notice: null },
  );
  const [formKey, setFormKey] = useState(0);
  const [locationId, setLocationId] = useState<string | null>(params.get("location"));
  const [mode, setMode] = useState<"manual" | "scan" | "photo">(scanned ? "scan" : "manual");
  const [scanning, setScanning] = useState(false);
  const [scanNotice, setScanNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const photoInput = useRef<HTMLInputElement>(null);

  const restart = (next: Start) => {
    setStart(next);
    setFormKey((key) => key + 1);
  };

  const onDetect = useCallback(
    (value: string, format: string) => {
      const scannedLocation = parseLocationQr(value);
      if (scannedLocation) {
        // Scanning a bin first stores the new part there.
        setLocationId(scannedLocation);
        setFormKey((key) => key + 1);
        setScanNotice(`Emplacement choisi : ${pathLabel(tree, scannedLocation) || "inconnu"}. Scanne maintenant la pièce.`);
        return;
      }
      setScanning(false);
      setScanNotice(null);
      restart(startFromLabel(parseScannedLabel(value, format)));
    },
    [tree],
  );

  // Maps an AI suggestion onto the form, matching the category by its path.
  function prefillFromSuggestion(suggestion: IdentificationSuggestion): ItemPrefill {
    const category = (categories.data ?? []).find((c) => categories.labelFor(c.id) === suggestion.categoryPath);
    return {
      name: suggestion.name,
      mpn: suggestion.mpn,
      manufacturer: suggestion.manufacturer,
      package: suggestion.package,
      categoryId: category?.id ?? null,
      paramInputs: Object.fromEntries(suggestion.params.map((param) => [param.key, param.value])),
    };
  }

  async function onPhoto(file: File | undefined) {
    if (!file) return;
    setBusy("Préparation de la photo…");
    try {
      const blob = await compressImage(file);
      const photo = { blob, preview: URL.createObjectURL(blob) };
      const service = getIdentificationService();
      let prefill: ItemPrefill = {};
      let notice = "Photo enregistrée sur l'article. Complète la fiche.";
      if (service.enabled) {
        setBusy("Identification en cours…");
        try {
          const suggestion = await service.identify(blob, {
            categories: (categories.data ?? []).map((category) => ({
              path: categories.labelFor(category.id),
              params: categories.paramsFor(category.id),
            })),
          });
          if (suggestion) {
            prefill = prefillFromSuggestion(suggestion);
            notice = "Proposition de l'IA : vérifie chaque champ avant d'enregistrer.";
          } else {
            notice = "La pièce n'a pas été reconnue. Complète la fiche.";
          }
        } catch {
          notice = "Identification indisponible. Complète la fiche.";
        }
      }
      restart({ prefill: { ...prefill, photos: [photo] }, checkDuplicates: Boolean(prefill.mpn), notice });
    } catch {
      restart({ prefill: {}, checkDuplicates: false, notice: "Cette photo n'a pas pu être lue." });
    } finally {
      setBusy(null);
      if (photoInput.current) photoInput.current.value = "";
    }
  }

  if (duplicateId && template.isPending) return null;

  return (
    <>
      <PageHeader title={duplicateId ? "Dupliquer l'article" : "Ajouter une pièce"} />

      {!duplicateId && (
        <div className="mx-auto mb-4 grid max-w-2xl grid-cols-3 gap-2">
          <ModeButton
            label="Photo"
            icon={<Camera aria-hidden size={22} />}
            active={mode === "photo"}
            onClick={() => {
              setMode("photo");
              photoInput.current?.click();
            }}
          />
          <ModeButton
            label="Scanner"
            icon={<ScanLine aria-hidden size={22} />}
            active={mode === "scan"}
            onClick={() => {
              setMode("scan");
              setScanning(true);
            }}
          />
          <ModeButton
            label="Manuel"
            icon={<Keyboard aria-hidden size={22} />}
            active={mode === "manual"}
            onClick={() => {
              setMode("manual");
              restart({ prefill: {}, checkDuplicates: false, notice: null });
            }}
          />
        </div>
      )}
      <input
        ref={photoInput}
        type="file"
        accept="image/*"
        capture="environment"
        hidden
        onChange={(event) => onPhoto(event.target.files?.[0])}
      />

      {(busy || start.notice) && (
        <p role="status" className="mx-auto mb-4 max-w-2xl rounded-control bg-surface-muted px-3 py-2 text-sm font-medium">
          {busy ?? start.notice}
        </p>
      )}

      {!busy && (
        <ItemForm
          key={`${duplicateId ?? "new"}-${formKey}`}
          template={template.data ?? undefined}
          prefill={start.prefill}
          checkDuplicatesOnOpen={start.checkDuplicates}
          defaultLocationId={locationId}
          onSaved={(id) => router.replace(`/items?id=${id}`)}
        />
      )}

      <Dialog open={scanning} title="Scanner une étiquette" onClose={() => setScanning(false)}>
        {scanning && <BarcodeScanner formats={[...ADD_FORMATS]} onDetect={onDetect} />}
        <p role="status" className="mt-3 text-center text-sm text-muted">
          {scanNotice ?? "Étiquette LCSC, Mouser, DigiKey, code-barres EAN… ou le QR d'un emplacement pour y ranger la pièce."}
        </p>
      </Dialog>
    </>
  );
}

function ModeButton({
  label,
  icon,
  active,
  onClick,
}: {
  label: string;
  icon: ReactNode;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "flex min-h-16 flex-col items-center justify-center gap-1 rounded-card border text-sm font-semibold transition-colors duration-150",
        active ? "border-primary bg-surface text-primary" : "border-border bg-surface text-fg hover:bg-surface-muted",
      )}
    >
      {icon}
      {label}
    </button>
  );
}
