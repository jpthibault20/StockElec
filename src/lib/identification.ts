"use client";

import type { ParamDef } from "@/lib/categories";
import { env } from "@/lib/env";
import { getSupabase } from "@/lib/supabase/client";

// Photo identification (spec 4.4, mode 1). Prepared but disabled in V1:
// with NEXT_PUBLIC_AI_ENABLED=false the disabled service is used and no call
// is made. Enabling it needs only the ANTHROPIC_API_KEY secret on the
// `identify-component` Edge Function and the flag set to true.

// What the model may choose from: the user's categories and their parameters.
export type IdentificationContext = {
  categories: Array<{ path: string; params: Array<Pick<ParamDef, "key" | "label" | "unit" | "kind">> }>;
};

// Pre-fill proposal. The user always reviews it in the form: the AI never
// creates an item by itself.
export type IdentificationSuggestion = {
  categoryPath: string | null;
  name: string | null;
  mpn: string | null;
  manufacturer: string | null;
  package: string | null;
  // Values as text, parsed by the form like a typed value ("10k", "3.3").
  params: Array<{ key: string; value: string }>;
};

export interface IdentificationService {
  readonly enabled: boolean;
  identify(photo: Blob, context: IdentificationContext): Promise<IdentificationSuggestion | null>;
}

const disabledService: IdentificationService = {
  enabled: false,
  identify: async () => null,
};

function toBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result).split(",")[1] ?? "");
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
}

// Calls the Edge Function, which holds the API key server-side.
const edgeFunctionService: IdentificationService = {
  enabled: true,
  async identify(photo, context) {
    const { data, error } = await getSupabase().functions.invoke<{ suggestion: IdentificationSuggestion | null }>(
      "identify-component",
      { body: { image: await toBase64(photo), mediaType: photo.type || "image/jpeg", categories: context.categories } },
    );
    if (error) throw error;
    return data?.suggestion ?? null;
  },
};

export function getIdentificationService(): IdentificationService {
  return env.aiEnabled ? edgeFunctionService : disabledService;
}
