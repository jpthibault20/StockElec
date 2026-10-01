-- Runs only on Prisma's temporary shadow database (`prisma migrate dev`),
-- before the migrations are replayed. A fresh database has none of the
-- Supabase schemas, so this recreates the minimal objects our migrations
-- reference. Never applied to the real Supabase database.

CREATE SCHEMA IF NOT EXISTS auth;

CREATE OR REPLACE FUNCTION auth.uid() RETURNS uuid
  LANGUAGE sql STABLE
  AS $$ SELECT NULL::uuid $$;

CREATE SCHEMA IF NOT EXISTS storage;

CREATE TABLE IF NOT EXISTS storage.buckets (
  id text PRIMARY KEY,
  name text NOT NULL,
  public boolean DEFAULT false,
  file_size_limit bigint,
  allowed_mime_types text[]
);

CREATE TABLE IF NOT EXISTS storage.objects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  bucket_id text REFERENCES storage.buckets (id),
  name text,
  owner uuid
);

CREATE OR REPLACE FUNCTION storage.foldername(name text) RETURNS text[]
  LANGUAGE sql IMMUTABLE
  AS $$ SELECT string_to_array(name, '/') $$;

DO $$
BEGIN
  -- Supabase API roles; they already exist when the shadow database lives on
  -- the Supabase cluster.
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'anon') THEN
    CREATE ROLE anon NOLOGIN;
  END IF;
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'authenticated') THEN
    CREATE ROLE authenticated NOLOGIN;
  END IF;
END $$;

-- Prisma does not keep its bookkeeping table on the shadow database, but the
-- lock_prisma_migrations migration alters it.
CREATE TABLE IF NOT EXISTS public._prisma_migrations (id varchar(36) PRIMARY KEY);
