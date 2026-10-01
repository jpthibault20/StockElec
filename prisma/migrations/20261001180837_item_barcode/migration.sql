-- AlterTable
ALTER TABLE "items" ADD COLUMN     "barcode" TEXT;

-- CreateIndex
CREATE INDEX "items_barcode_idx" ON "items"("barcode");
