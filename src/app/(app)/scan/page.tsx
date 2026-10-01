"use client";

import { useCallback } from "react";
import { useRouter } from "next/navigation";
import { PageHeader } from "@/components/layout/page-header";
import { BarcodeScanner } from "@/components/scan/barcode-scanner";
import { locationPath, parseLocationQr } from "@/lib/location-url";

const FORMATS = ["qr_code", "data_matrix", "code_128", "code_39", "ean_13", "ean_8", "upc_a", "upc_e"] as const;

// Global scan: a location QR opens its content; any other code (supplier
// label, EAN) opens the quick add form pre-filled from it.
export default function ScanPage() {
  const router = useRouter();

  const onDetect = useCallback(
    (value: string, format: string) => {
      const locationId = parseLocationQr(value);
      if (locationId) router.push(locationPath(locationId));
      else router.push(`/add?scan=${encodeURIComponent(value)}&format=${encodeURIComponent(format)}`);
    },
    [router],
  );

  return (
    <>
      <PageHeader title="Scanner" />
      <BarcodeScanner formats={[...FORMATS]} onDetect={onDetect} />
      <p role="status" className="mt-4 text-center text-muted">
        Vise le QR d&apos;un emplacement, l&apos;étiquette d&apos;un sachet (LCSC, Mouser, DigiKey…) ou un code-barres.
      </p>
    </>
  );
}
