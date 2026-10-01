"use client";

import { useEffect, useState } from "react";
import { Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { downloadLabelSheet, locationQrDataUrl, type LabelData } from "@/lib/labels-pdf";

// Shows the QR code of one location, with a one-label PDF for printing.
export function LocationQrDialog({
  open,
  onClose,
  label,
}: {
  open: boolean;
  onClose: () => void;
  label: LabelData;
}) {
  const [qr, setQr] = useState<string | null>(null);
  const [printing, setPrinting] = useState(false);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    locationQrDataUrl(label.id).then((url) => {
      if (!cancelled) setQr(url);
    });
    return () => {
      cancelled = true;
    };
  }, [open, label.id]);

  async function print() {
    setPrinting(true);
    try {
      await downloadLabelSheet([label]);
    } finally {
      setPrinting(false);
    }
  }

  return (
    <Dialog open={open} title="QR code" onClose={onClose}>
      <div className="flex flex-col items-center gap-4 text-center">
        <div className="rounded-card bg-white p-3">
          {qr ? (
            // Data URL generated locally: next/image brings nothing here.
            // eslint-disable-next-line @next/next/no-img-element
            <img src={qr} alt={`QR code de ${label.name}`} width={224} height={224} />
          ) : (
            <div className="size-56" />
          )}
        </div>
        <div>
          <p className="text-lg font-semibold">{label.name}</p>
          {label.parentPath && <p className="text-sm text-muted">{label.parentPath}</p>}
        </div>
        <Button
          variant="secondary"
          icon={<Printer aria-hidden size={20} />}
          onClick={print}
          disabled={printing}
          className="w-full"
        >
          {printing ? "Préparation…" : "Télécharger l'étiquette (PDF)"}
        </Button>
      </div>
    </Dialog>
  );
}
