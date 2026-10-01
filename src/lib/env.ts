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
  get supabasePublishableKey(): string {
    return required(
      "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    );
  },
  // Public URL encoded in printed QR labels. Optional: falls back to the
  // current origin, but labels printed from localhost would not open on a phone.
  get appUrl(): string | undefined {
    return process.env.NEXT_PUBLIC_APP_URL || undefined;
  },
  // AI features are prepared but disabled in V1.
  get aiEnabled(): boolean {
    return process.env.NEXT_PUBLIC_AI_ENABLED === "true";
  },
};
