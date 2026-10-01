-- Supabase-specific setup that Prisma does not model: grants, RLS policies,
-- check constraints, updated_at triggers and the photo Storage bucket.

-- ---------------------------------------------------------------------------
-- Grants: only signed-in users reach the tables through the Data API.
-- ---------------------------------------------------------------------------
REVOKE ALL ON TABLE
  locations, categories, items, item_photos, item_links,
  filaments, spool_tares, stock_movements, shopping_list
FROM anon;

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE
  locations, categories, items, item_photos, item_links,
  filaments, spool_tares, stock_movements, shopping_list
TO authenticated;

-- ---------------------------------------------------------------------------
-- Row Level Security: every row belongs to its user_id.
-- (select auth.uid()) is evaluated once per statement instead of per row.
-- ---------------------------------------------------------------------------
DO $$
DECLARE
  t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'locations', 'categories', 'items', 'item_photos', 'item_links',
    'filaments', 'spool_tares', 'stock_movements', 'shopping_list'
  ] LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format(
      'CREATE POLICY %I ON %I FOR ALL TO authenticated '
      'USING (user_id = (select auth.uid())) '
      'WITH CHECK (user_id = (select auth.uid()))',
      t || '_owner', t
    );
  END LOOP;
END $$;

-- ---------------------------------------------------------------------------
-- Data integrity
-- ---------------------------------------------------------------------------
ALTER TABLE items
  ADD CONSTRAINT items_quantity_non_negative CHECK (quantity >= 0),
  ADD CONSTRAINT items_min_threshold_non_negative CHECK (min_threshold IS NULL OR min_threshold >= 0);

ALTER TABLE locations
  ADD CONSTRAINT locations_not_own_parent CHECK (parent_id IS NULL OR parent_id <> id);

ALTER TABLE categories
  ADD CONSTRAINT categories_not_own_parent CHECK (parent_id IS NULL OR parent_id <> id);

ALTER TABLE filaments
  ADD CONSTRAINT filaments_color_hex_format CHECK (color_hex IS NULL OR color_hex ~ '^#[0-9A-Fa-f]{6}$');

ALTER TABLE shopping_list
  ADD CONSTRAINT shopping_list_item_or_label CHECK (item_id IS NOT NULL OR label IS NOT NULL);

-- ---------------------------------------------------------------------------
-- updated_at maintained by the database (no Prisma client to do it).
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.set_updated_at() RETURNS trigger
  LANGUAGE plpgsql
  SET search_path = ''
  AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER locations_set_updated_at BEFORE UPDATE ON locations
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER categories_set_updated_at BEFORE UPDATE ON categories
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER items_set_updated_at BEFORE UPDATE ON items
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Storage: private bucket for item photos.
-- Object path: <user_id>/<item_id>/<file>; the first folder must be the user.
-- Photos are compressed client-side (< 500 KB); 2 MB is a safety cap.
-- ---------------------------------------------------------------------------
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('item-photos', 'item-photos', false, 2097152, ARRAY['image/jpeg', 'image/png', 'image/webp'])
ON CONFLICT (id) DO NOTHING;

CREATE POLICY item_photos_owner_select ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'item-photos' AND (storage.foldername(name))[1] = (select auth.uid())::text);

CREATE POLICY item_photos_owner_insert ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'item-photos' AND (storage.foldername(name))[1] = (select auth.uid())::text);

CREATE POLICY item_photos_owner_update ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'item-photos' AND (storage.foldername(name))[1] = (select auth.uid())::text)
  WITH CHECK (bucket_id = 'item-photos' AND (storage.foldername(name))[1] = (select auth.uid())::text);

CREATE POLICY item_photos_owner_delete ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'item-photos' AND (storage.foldername(name))[1] = (select auth.uid())::text);
