-- Prisma's bookkeeping table lives in the public schema, which the Supabase
-- Data API exposes. Only the Prisma CLI (postgres role) may touch it.
ALTER TABLE public._prisma_migrations ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public._prisma_migrations FROM anon, authenticated;
