-- CreateEnum
CREATE TYPE "item_type" AS ENUM ('component', 'consumable', 'tool', 'printing_3d');

-- CreateEnum
CREATE TYPE "quantity_unit" AS ENUM ('piece', 'meter', 'gram', 'spool');

-- CreateEnum
CREATE TYPE "quantity_mode" AS ENUM ('exact', 'approximate');

-- CreateEnum
CREATE TYPE "approx_level" AS ENUM ('plenty', 'some', 'almost_empty');

-- CreateEnum
CREATE TYPE "movement_type" AS ENUM ('add', 'remove', 'move');

-- CreateTable
CREATE TABLE "locations" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL DEFAULT auth.uid(),
    "parent_id" UUID,
    "name" TEXT NOT NULL,
    "kind" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "locations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "categories" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL DEFAULT auth.uid(),
    "parent_id" UUID,
    "name" TEXT NOT NULL,
    "params_schema" JSONB NOT NULL DEFAULT '[]',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "items" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL DEFAULT auth.uid(),
    "type" "item_type" NOT NULL,
    "name" TEXT NOT NULL,
    "category_id" UUID,
    "location_id" UUID,
    "mpn" TEXT,
    "manufacturer" TEXT,
    "package" TEXT,
    "params" JSONB NOT NULL DEFAULT '{}',
    "quantity" DECIMAL(12,3) NOT NULL DEFAULT 0,
    "unit" "quantity_unit" NOT NULL DEFAULT 'piece',
    "quantity_mode" "quantity_mode" NOT NULL DEFAULT 'exact',
    "approx_level" "approx_level",
    "min_threshold" DECIMAL(12,3),
    "datasheet_url" TEXT,
    "notes" TEXT,
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "item_photos" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL DEFAULT auth.uid(),
    "item_id" UUID NOT NULL,
    "storage_path" TEXT NOT NULL,
    "position" INTEGER NOT NULL DEFAULT 0,
    "ai_result" JSONB,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "item_photos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "item_links" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL DEFAULT auth.uid(),
    "item_id" UUID NOT NULL,
    "supplier" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "unit_price" DECIMAL(10,4),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "item_links_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "filaments" (
    "item_id" UUID NOT NULL,
    "user_id" UUID NOT NULL DEFAULT auth.uid(),
    "material" TEXT NOT NULL,
    "color_hex" TEXT,
    "diameter_mm" DECIMAL(4,2) NOT NULL DEFAULT 1.75,
    "remaining_g" DECIMAL(8,1),
    "tare_g" DECIMAL(8,1),
    "nozzle_temp_c" INTEGER,
    "bed_temp_c" INTEGER,
    "opened_on" DATE,
    "dried_on" DATE,

    CONSTRAINT "filaments_pkey" PRIMARY KEY ("item_id")
);

-- CreateTable
CREATE TABLE "spool_tares" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL DEFAULT auth.uid(),
    "brand" TEXT NOT NULL,
    "tare_g" DECIMAL(8,1) NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "spool_tares_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "stock_movements" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL DEFAULT auth.uid(),
    "item_id" UUID NOT NULL,
    "type" "movement_type" NOT NULL,
    "delta" DECIMAL(12,3) NOT NULL DEFAULT 0,
    "from_location_id" UUID,
    "to_location_id" UUID,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "stock_movements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "shopping_list" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL DEFAULT auth.uid(),
    "item_id" UUID,
    "label" TEXT,
    "quantity" DECIMAL(12,3) NOT NULL DEFAULT 1,
    "purchased" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "shopping_list_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "locations_user_id_idx" ON "locations"("user_id");

-- CreateIndex
CREATE INDEX "locations_parent_id_idx" ON "locations"("parent_id");

-- CreateIndex
CREATE INDEX "categories_user_id_idx" ON "categories"("user_id");

-- CreateIndex
CREATE INDEX "categories_parent_id_idx" ON "categories"("parent_id");

-- CreateIndex
CREATE INDEX "items_user_id_idx" ON "items"("user_id");

-- CreateIndex
CREATE INDEX "items_category_id_idx" ON "items"("category_id");

-- CreateIndex
CREATE INDEX "items_location_id_idx" ON "items"("location_id");

-- CreateIndex
CREATE INDEX "items_mpn_idx" ON "items"("mpn");

-- CreateIndex
CREATE INDEX "items_params_idx" ON "items" USING GIN ("params");

-- CreateIndex
CREATE INDEX "items_tags_idx" ON "items" USING GIN ("tags");

-- CreateIndex
CREATE INDEX "item_photos_item_id_idx" ON "item_photos"("item_id");

-- CreateIndex
CREATE INDEX "item_links_item_id_idx" ON "item_links"("item_id");

-- CreateIndex
CREATE INDEX "filaments_user_id_idx" ON "filaments"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "spool_tares_user_id_brand_key" ON "spool_tares"("user_id", "brand");

-- CreateIndex
CREATE INDEX "stock_movements_item_id_idx" ON "stock_movements"("item_id");

-- CreateIndex
CREATE INDEX "stock_movements_user_id_created_at_idx" ON "stock_movements"("user_id", "created_at" DESC);

-- CreateIndex
CREATE INDEX "shopping_list_user_id_idx" ON "shopping_list"("user_id");

-- CreateIndex
CREATE INDEX "shopping_list_item_id_idx" ON "shopping_list"("item_id");

-- AddForeignKey
ALTER TABLE "locations" ADD CONSTRAINT "locations_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "locations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "categories" ADD CONSTRAINT "categories_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "items" ADD CONSTRAINT "items_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "items" ADD CONSTRAINT "items_location_id_fkey" FOREIGN KEY ("location_id") REFERENCES "locations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "item_photos" ADD CONSTRAINT "item_photos_item_id_fkey" FOREIGN KEY ("item_id") REFERENCES "items"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "item_links" ADD CONSTRAINT "item_links_item_id_fkey" FOREIGN KEY ("item_id") REFERENCES "items"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "filaments" ADD CONSTRAINT "filaments_item_id_fkey" FOREIGN KEY ("item_id") REFERENCES "items"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_movements" ADD CONSTRAINT "stock_movements_item_id_fkey" FOREIGN KEY ("item_id") REFERENCES "items"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_movements" ADD CONSTRAINT "stock_movements_from_location_id_fkey" FOREIGN KEY ("from_location_id") REFERENCES "locations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_movements" ADD CONSTRAINT "stock_movements_to_location_id_fkey" FOREIGN KEY ("to_location_id") REFERENCES "locations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shopping_list" ADD CONSTRAINT "shopping_list_item_id_fkey" FOREIGN KEY ("item_id") REFERENCES "items"("id") ON DELETE CASCADE ON UPDATE CASCADE;
