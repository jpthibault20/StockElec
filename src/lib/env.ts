// Public runtime configuration. Only NEXT_PUBLIC_* values may be read here:
// this module is bundled into the client. Each variable is referenced literally
// so Next.js can inline it at build time.

function required(name: string, value: string | undefined): string {
  if (!value) {
    throw new Error(`Missing environment variable ${name}. See .env.example.`);
  }
  return value;
}

// Getters are lazy so a missing variable fails at first use, not at build time.
export const env = {
  get supabaseUrl(): string {
    return required("NEXT_PUBLIC_SUPABASE_URL", process.env.NEXT_PUBLIC_SUPABASE_URL);
  },
  get supabaseAnonKey(): string {
    return required("NEXT_PUBLIC_SUPABASE_ANON_KEY", process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
  },
  // AI features are prepared but disabled in V1.
  get aiEnabled(): boolean {
    return process.env.NEXT_PUBLIC_AI_ENABLED === "true";
  },
};
