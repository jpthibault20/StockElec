// identify-component — proposes item fields from a photo of a component.
//
// V1: the app does not call this function (NEXT_PUBLIC_AI_ENABLED=false), and
// without the ANTHROPIC_API_KEY secret it answers { suggestion: null }.
// To enable AI identification:
//   1. npx supabase secrets set ANTHROPIC_API_KEY=sk-ant-...
//   2. set NEXT_PUBLIC_AI_ENABLED=true (local env and Vercel)
// The caller must be signed in (Supabase verifies the JWT before this runs).

import Anthropic from "npm:@anthropic-ai/sdk@^0.129.0";

type ParamHint = { key: string; label: string; unit?: string; kind: string };
type RequestBody = {
  image?: string;
  mediaType?: string;
  categories?: Array<{ path: string; params: ParamHint[] }>;
};

type Suggestion = {
  categoryPath: string | null;
  name: string | null;
  mpn: string | null;
  manufacturer: string | null;
  package: string | null;
  params: Array<{ key: string; value: string }>;
};

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;
type ImageType = (typeof IMAGE_TYPES)[number];

const nullableString = { type: ["string", "null"] };

const SUGGESTION_SCHEMA = {
  type: "object",
  properties: {
    categoryPath: nullableString,
    name: nullableString,
    mpn: nullableString,
    manufacturer: nullableString,
    package: nullableString,
    params: {
      type: "array",
      items: {
        type: "object",
        properties: { key: { type: "string" }, value: { type: "string" } },
        required: ["key", "value"],
        additionalProperties: false,
      },
    },
  },
  required: ["categoryPath", "name", "mpn", "manufacturer", "package", "params"],
  additionalProperties: false,
};

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
  });
}

function buildPrompt(categories: RequestBody["categories"] = []): string {
  const catalog = categories
    .map((category) => {
      const params = category.params.map((p) => `${p.key} (${p.label}${p.unit ? `, ${p.unit}` : ""})`).join(", ");
      return `- ${category.path}${params ? ` — paramètres : ${params}` : ""}`;
    })
    .join("\n");

  return [
    "Tu identifies un composant électronique, un consommable, un outil ou une pièce d'impression 3D à partir d'une photo (la pièce ou son sachet / étiquette), pour un inventaire d'atelier.",
    "Propose les champs suivants. Mets null pour tout champ que tu ne peux pas lire ou déduire avec une bonne confiance : une proposition fausse coûte plus cher qu'un champ vide.",
    "- categoryPath : exactement un des chemins de la liste ci-dessous, ou null.",
    "- name : nom court en français, ex. « Résistance 10 kΩ 0805 », « Régulateur LM317 TO-220 ».",
    "- mpn : référence fabricant exacte telle qu'imprimée.",
    "- manufacturer, package (boîtier, ex. 0805, SOT-23, DIP-8, TO-220).",
    "- params : uniquement les clés listées pour la catégorie choisie ; value en texte avec préfixe SI sans unité, ex. « 10k », « 100n », « 3.3 ».",
    "",
    "Catégories disponibles :",
    catalog || "(aucune)",
  ].join("\n");
}

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return new Response("ok", { headers: CORS_HEADERS });
  if (request.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const apiKey = Deno.env.get("ANTHROPIC_API_KEY");
  // Prepared but not connected: no key, no suggestion.
  if (!apiKey) return json({ suggestion: null });

  let body: RequestBody;
  try {
    body = await request.json();
  } catch {
    return json({ error: "Invalid JSON body" }, 400);
  }
  if (!body.image) return json({ error: "Missing image" }, 400);
  const mediaType: ImageType = IMAGE_TYPES.includes(body.mediaType as ImageType)
    ? (body.mediaType as ImageType)
    : "image/jpeg";

  const client = new Anthropic({ apiKey });

  try {
    const response = await client.beta.messages.create({
      model: "claude-opus-5-5",
      max_tokens: 16000,
      // Re-run a declined request on Anthropic's recommended fallback model.
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
      // Simple extraction: low effort keeps cost and latency down.
      output_config: {
        effort: "low",
        format: { type: "json_schema", schema: SUGGESTION_SCHEMA },
      },
      messages: [
        {
          role: "user",
          content: [
            { type: "image", source: { type: "base64", media_type: mediaType, data: body.image } },
            { type: "text", text: buildPrompt(body.categories) },
          ],
        },
      ],
    });

    if (response.stop_reason === "refusal") return json({ suggestion: null });
    const text = response.content.find((block) => block.type === "text");
    if (!text || text.type !== "text") return json({ suggestion: null });
    const suggestion = JSON.parse(text.text) as Suggestion;
    return json({ suggestion });
  } catch (error) {
    if (error instanceof Anthropic.RateLimitError) return json({ error: "Rate limited" }, 429);
    if (error instanceof Anthropic.APIError) return json({ error: `AI provider error ${error.status}` }, 502);
    return json({ error: "Identification failed" }, 500);
  }
});
