"use client";

import { locationQrUrl } from "@/lib/location-url";

export type LabelData = {
  id: string;
  name: string;
  // Ancestors of the location, e.g. "Atelier / Meuble A".
  parentPath: string;
};

// QR code as a PNG data URL. Libraries are loaded on demand to keep them out
// of the main bundle.
export async function locationQrDataUrl(id: string, width = 480): Promise<string> {
  const { toDataURL } = await import("qrcode");
  return toDataURL(locationQrUrl(id), { errorCorrectionLevel: "M", margin: 1, width });
}

// Avery L7160-compatible layout: A4, 3 x 7 labels of 63.5 x 38.1 mm.
const SHEET = {
  columns: 3,
  rows: 7,
  labelWidth: 63.5,
  labelHeight: 38.1,
  marginLeft: 7.2,
  marginTop: 15.15,
  gapX: 2.5,
  padding: 3,
  qrSize: 30,
};

// Builds the printable label sheet and downloads it as a PDF.
export async function downloadLabelSheet(labels: LabelData[]): Promise<void> {
  const { jsPDF } = await import("jspdf");
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const perPage = SHEET.columns * SHEET.rows;
  const qrImages = await Promise.all(labels.map((label) => locationQrDataUrl(label.id, 360)));
  const textX = SHEET.padding + SHEET.qrSize + 2;
  const textWidth = SHEET.labelWidth - textX - SHEET.padding;

  labels.forEach((label, index) => {
    if (index > 0 && index % perPage === 0) doc.addPage();
    const slot = index % perPage;
    const x = SHEET.marginLeft + (slot % SHEET.columns) * (SHEET.labelWidth + SHEET.gapX);
    const y = SHEET.marginTop + Math.floor(slot / SHEET.columns) * SHEET.labelHeight;

    const qrY = y + (SHEET.labelHeight - SHEET.qrSize) / 2;
    doc.addImage(qrImages[index], "PNG", x + SHEET.padding, qrY, SHEET.qrSize, SHEET.qrSize);

    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(43, 33, 24);
    const nameLines = (doc.splitTextToSize(label.name, textWidth) as string[]).slice(0, 3);
    doc.text(nameLines, x + textX, qrY + 4);

    if (label.parentPath) {
      doc.setFont("helvetica", "normal");
      doc.setFontSize(7);
      doc.setTextColor(94, 98, 99);
      const pathLines = (doc.splitTextToSize(label.parentPath, textWidth) as string[]).slice(0, 4);
      doc.text(pathLines, x + textX, qrY + 4 + nameLines.length * 4.6 + 1);
    }
  });

  doc.save(labels.length === 1 ? `etiquette-${slugify(labels[0].name)}.pdf` : "etiquettes-stockelec.pdf");
}

function slugify(value: string): string {
  return (
    value
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "") || "emplacement"
  );
}
