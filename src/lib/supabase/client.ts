import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { env } from "@/lib/env";

let client: SupabaseClient | undefined;

// Browser-only Supabase client. The session is persisted in localStorage and
// refreshed automatically, so the installed PWA stays signed in across launches.
export function getSupabase(): SupabaseClient {
  if (!client) {
    client = createClient(env.supabaseUrl, env.supabaseAnonKey, {
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
