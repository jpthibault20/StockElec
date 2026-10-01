"use client";

import { useAuth } from "@/components/auth-provider";
import { getSupabase } from "@/lib/supabase/client";

// Temporary home screen for step 1; the real dashboard comes in step 9.
export default function HomePage() {
  const auth = useAuth();

  return (
    <main className="mx-auto flex min-h-dvh max-w-sm flex-col justify-center gap-4 px-6">
      <h1 className="text-3xl font-bold">stockElec</h1>
      <p>Connecté : {auth.session?.user.email}</p>
      <button
        type="button"
        onClick={() => getSupabase().auth.signOut()}
        className="min-h-11 rounded-md border font-semibold"
      >
        Se déconnecter
      </button>
    </main>
  );
}
