"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/auth-provider";
import { Button } from "@/components/ui/button";
import { TextField } from "@/components/ui/text-field";
import { getSupabase } from "@/lib/supabase/client";

export default function LoginPage() {
  const router = useRouter();
  const auth = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  useEffect(() => {
    if (auth.status === "signed-in") router.replace("/");
  }, [auth.status, router]);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError(null);
    const { error: signInError } = await getSupabase().auth.signInWithPassword({ email, password });
    setPending(false);
    if (signInError) setError("Email ou mot de passe incorrect.");
  }

  return (
    <main className="flex min-h-dvh flex-col">
      {/* Brand band in Brun nuit, like the app bars. */}
      <div className="bg-chrome px-6 pt-[calc(3rem+env(safe-area-inset-top))] pb-16 text-chrome-fg">
        <div className="mx-auto flex max-w-sm animate-enter flex-col gap-4">
          <span
            aria-hidden
            className="flex size-16 items-center justify-center rounded-2xl border-2 border-chrome-fg/80 bg-primary-solid text-2xl font-bold"
          >
            sE
          </span>
          <div>
            <h1 className="text-4xl font-bold tracking-tight">
              stock<span className="text-chrome-active">Elec</span>
            </h1>
            <p className="mt-1 text-chrome-muted">Ton stock d&apos;électronique et d&apos;impression 3D, toujours sous la main.</p>
          </div>
        </div>
      </div>
      <div className="mx-auto -mt-8 w-full max-w-sm px-4 pb-8">
        <div className="animate-enter rounded-card border border-border bg-surface p-5 shadow-card">
          <form onSubmit={onSubmit} className="flex flex-col gap-4">
            <TextField
              label="Email"
              type="email"
              autoComplete="email"
              inputMode="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            <TextField
              label="Mot de passe"
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              error={error}
            />
            <Button type="submit" size="lg" disabled={pending} className="mt-2">
              {pending ? "Connexion…" : "Se connecter"}
            </Button>
          </form>
        </div>
      </div>
    </main>
  );
}
