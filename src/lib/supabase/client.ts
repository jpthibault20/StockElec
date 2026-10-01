import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { env } from "@/lib/env";
import type { Database } from "@/lib/supabase/database.types";

let client: SupabaseClient<Database> | undefined;

// Browser-only Supabase client. The session is persisted in localStorage and
// refreshed automatically, so the installed PWA stays signed in across launches.
export function getSupabase(): SupabaseClient<Database> {
  if (!client) {
    client = createClient<Database>(env.supabaseUrl, env.supabasePublishableKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: false,
        storageKey: "stockelec-auth",
      },
    });
  }
  return client;
}
