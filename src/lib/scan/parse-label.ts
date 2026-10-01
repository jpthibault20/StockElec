// Decodes the content of a scanned barcode into item fields.
//
// Supported:
// - LCSC bag labels (QR): "{pbn:…,on:…,pc:C25804,pm:0603WAF1002T5E,qty:100,…}"
// - ISO/IEC 15434 labels (DataMatrix), used by DigiKey, Mouser and many
//   distributors: "[)>␞06␝P<supplier PN>␝1P<MPN>␝Q<qty>…␞␄"
// - EAN / UPC of consumer products (digits only)
// Anything else is returned as "unknown" with its raw text.

export type ScannedSupplier = "LCSC" | "DigiKey" | "Mouser";

export type ScannedLabel =
  | {
      kind: "supplier";
      supplier: ScannedSupplier | null;
      mpn: string | null;
      supplierPartNumber: string | null;
      quantity: number | null;
      manufacturer: string | null;
      raw: string;
    }
  | { kind: "ean"; barcode: string; raw: string }
  | { kind: "unknown"; raw: string };

const GS = "\x1d";
const RS = "\x1e";
const EOT = "\x04";

function positiveInt(value: string | undefined | null): number | null {
  if (!value) return null;
  const number = Number.parseInt(value.replace(/\D/g, ""), 10);
  return Number.isFinite(number) && number > 0 ? number : null;
}

function clean(value: string | undefined | null): string | null {
  const text = value?.trim();
  return text ? text : null;
}

function parseLcsc(raw: string): ScannedLabel | null {
  const text = raw.trim();
  if (!text.startsWith("{") || !/\bpc:/.test(text)) return null;
  const fields = new Map<string, string>();
  for (const pair of text.replace(/^\{|\}$/g, "").split(",")) {
    const index = pair.indexOf(":");
    if (index > 0) fields.set(pair.slice(0, index).trim(), pair.slice(index + 1).trim());
  }
  return {
    kind: "supplier",
    supplier: "LCSC",
    mpn: clean(fields.get("pm")),
    supplierPartNumber: clean(fields.get("pc")),
    quantity: positiveInt(fields.get("qty")),
    manufacturer: null,
    raw,
  };
}

// Data identifiers of ISO 15434 format 06 (ANSI MH10.8.2).
function parseIso15434(raw: string): ScannedLabel | null {
  const start = raw.indexOf("[)>");
  if (start === -1) return null;
  const body = raw
    .slice(start + 3)
    .replace(new RegExp(`^${RS}?06${GS}?`), "")
    .replace(new RegExp(`[${RS}${EOT}]+$`), "");
  const fields = new Map<string, string>();
  for (const segment of body.split(GS)) {
    const match = segment.match(/^(\d{0,2}[A-Z])(.*)$/);
    if (match && !fields.has(match[1])) fields.set(match[1], match[2]);
  }
  if (fields.size === 0) return null;

  // DigiKey adds 11Z/12Z/13Z fields; Mouser adds 14K (order line) and 1V.
  const supplier: ScannedSupplier | null =
    fields.has("11Z") || fields.has("12Z") || fields.has("13Z")
      ? "DigiKey"
      : fields.has("14K") || fields.has("1V")
        ? "Mouser"
        : null;

  return {
    kind: "supplier",
    supplier,
    mpn: clean(fields.get("1P")),
    supplierPartNumber: clean(fields.get("P")),
    quantity: positiveInt(fields.get("Q")),
    manufacturer: supplier === "Mouser" ? clean(fields.get("1V")) : null,
    raw,
  };
}

// GTIN check digit (EAN-8, UPC-A, EAN-13).
function validGtin(digits: string): boolean {
  const numbers = digits.split("").map(Number);
  const check = numbers.pop()!;
  const sum = numbers
    .reverse()
    .reduce((total, digit, index) => total + digit * (index % 2 === 0 ? 3 : 1), 0);
  return (10 - (sum % 10)) % 10 === check;
}

export function parseScannedLabel(raw: string, format?: string): ScannedLabel {
  const lcsc = parseLcsc(raw);
  if (lcsc) return lcsc;
  const iso = parseIso15434(raw);
  if (iso) return iso;

  const digits = raw.trim();
  const isEanFormat = format ? /^(ean_13|ean_8|upc_a|upc_e)$/.test(format) : false;
  if (/^\d{8}$|^\d{12,13}$/.test(digits) && (isEanFormat || validGtin(digits))) {
    return { kind: "ean", barcode: digits, raw };
  }
  return { kind: "unknown", raw };
}

// Product page of a supplier part number, to pre-fill the supplier link.
export function supplierUrl(supplier: ScannedSupplier, partNumber: string): string {
  const query = encodeURIComponent(partNumber);
  switch (supplier) {
    case "LCSC":
      return `https://www.lcsc.com/product-detail/${query}.html`;
    case "DigiKey":
      return `https://www.digikey.fr/fr/products/result?keywords=${query}`;
    case "Mouser":
      return `https://www.mouser.fr/c/?q=${query}`;
  }
}
