-- AlterTable
ALTER TABLE "categories" ADD COLUMN     "item_type" "item_type";

-- Backfill the item type of existing root categories from the default tree.
UPDATE "categories"
SET "item_type" = (CASE "name"
  WHEN 'Consommables' THEN 'consumable'
  WHEN 'Outillage' THEN 'tool'
  WHEN 'Impression 3D' THEN 'printing_3d'
  ELSE 'component'
END)::"item_type"
WHERE "parent_id" IS NULL;
