import { readFileSync } from "node:fs";
import { loadEnvConfig } from "@next/env";
import { defineConfig } from "prisma/config";

// Load .env.local / .env the same way Next.js does, so the CLI and the app
// share one set of env files.
loadEnvConfig(process.cwd());

// Prisma owns the database schema and migrations only. The app itself reads
// and writes through supabase-js, protected by Row Level Security.
export default defineConfig({
  schema: "prisma/schema.prisma",
  // Required by `migrations.initShadowDb`; no table is declared external.
  experimental: {
    externalTables: true,
  },
  migrations: {
    path: "prisma/migrations",
    // Stubs of the Supabase auth/storage objects our migrations reference,
    // applied to the shadow database only.
    initShadowDb: readFileSync("prisma/shadow-init.sql", "utf8"),
  },
  datasource: {
    // Supabase session pooler (port 5432): supports the DDL and advisory locks
    // that migrations need. Server-side only, never exposed to the client.
    // Read leniently so `prisma validate` works without it; migrate commands
    // still fail with a clear error when it is missing.
    url: process.env.DATABASE_URL,
  },
});
