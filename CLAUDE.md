# CLAUDE.md — stockElec

## Rules
- All code comments are written in English.
- Never run `git commit`.
- Never run `git push`.
- Never create branches or tags. Only modify files; the owner reviews and commits.

## Project
- stockElec: single-user stock management PWA for a maker (electronics + 3D printing). Goal: know in < 5 s, from a phone, whether a part is in stock, how many, and where.
- Specification: `Cahier des charges — stockElec.md` is the single source of truth for the MVP scope. Read the relevant section before each step.
- Build only what the spec describes, no extra features. Out of scope: multi-user, roles, sharing, invoicing/sales, automatic supplier ordering.
- When the spec is silent, pick the simplest option that respects it and log it in `DECISIONS.md` (decision + why, grouped by step).
- The Git repo, Supabase project and Vercel project already exist: never recreate them. Deployment happens when the owner pushes.
- If a step needs a manual action (Supabase / Vercel dashboard), stop and list exactly what to do or provide.

## Stack (imposed)
- Next.js (App Router) + React + TypeScript strict + Tailwind CSS, deployed on Vercel.
- Supabase: PostgreSQL, Auth, Storage (photos), Edge Functions.
- Prisma: database schema and migrations only (`prisma/schema.prisma`, `prisma.config.ts`, `npm run db:migrate`). No Prisma client in the app: all reads/writes go through supabase-js + RLS. RLS policies, grants and Supabase-specific SQL go inside Prisma migrations (`--create-only`, then edit).
- `DATABASE_URL` (Supabase session pooler) is server/CLI only, never `NEXT_PUBLIC_`.
- Row Level Security on every table, every table has a `user_id`.
- PWA: manifest, service worker, installable on iOS and Android, camera access.
- No secret key on the client. AI / catalog API keys live only in Edge Functions.
- Keep `.env.example` documented and up to date. Real env files (`.env`, `.env.local`) are never committed.
- README must list, for each external service, its estimated monthly cost and its env variable.

## Architecture choices already made (see `DECISIONS.md`)
- Client-rendered screens talking to Supabase directly (supabase-js + RLS); no server-side data fetching.
- Data hooks with TanStack Query in `src/lib/*.ts` (`locations.ts`, `items.ts`…); invalidate the matching query keys after each mutation.
- Detail screens use a query parameter on a static page (`/locations?id=…`), not dynamic segments, so they work offline. Wrap `useSearchParams` in `<Suspense>`.
- Scanning: `src/components/scan/barcode-scanner.tsx` (`barcode-detector`, WASM self-hosted in `public/zxing/` via postinstall); label decoding in `src/lib/scan/parse-label.ts`.
- Offline: TanStack Query cache persisted in IndexedDB (`src/components/query-provider.tsx`). Query data must be JSON-serializable to be persisted (Map results are skipped); bump `CACHE_VERSION` when a cached shape changes. Writes are online only.
- Restock rule: `needsRestock` in `src/lib/stock.ts` (home, shopping list). Filament stock = grams in `items.quantity`.
- CSV format and parsing: `src/lib/csv.ts` (pure); network side in `src/lib/import-export.ts`.
- Search: in-memory engine in `src/lib/search/` (`query.ts` parsing, `engine.ts` scoring/filters, `equivalents.ts` rules), fed by `useSearchIndex`. Stock status rules in `src/lib/stock.ts` (reuse them for alerts).
- AI: `src/lib/identification.ts` (client interface) + `supabase/functions/identify-component` (Deno, excluded from tsconfig; check with `npx deno check --no-config`). Key only as a Supabase secret.
- Email + password auth only, sign-up disabled in the UI, session persisted in `localStorage`.
- Hand-written service worker `public/sw.js` (no PWA plugin), registered in production only.
- Env variables read lazily through `src/lib/env.ts`.

## V1 without AI
- No active AI feature. `NEXT_PUBLIC_AI_ENABLED=false` hides every AI entry point.
- Everything is prepared so enabling AI only needs an API key + flag set to `true`, no refactor:
  client interface `IdentificationService`, Edge Function `identify-component` as a stub returning an empty result, DB fields ready.
- Photo add mode in V1: save the photo on the item, then open manual entry. AI never creates an item on its own.
- Equivalences in V1 are rule-based on structured params (no AI).

## Step order (spec section 8)
Follow this order. After each step the app must compile (`npm run build`), run and be testable.
1. Foundation: Next.js + TS, PWA, Supabase connection, auth, Vercel-compatible config.
2. Design system and navigation: palette tokens, base components, mobile layout (bottom bar, floating add button) and desktop layout.
3. Data: Prisma schema + migrations (spec section 5 tables), RLS policies as SQL in migrations, Storage buckets.
4. Locations: tree CRUD, QR per location, printable PDF label sheet, QR scan.
5. Items: CRUD, params by category, +1 / −1 quantity, photos, supplier links, anti-duplicate.
6. Quick add: barcode / QR / DataMatrix scan, manual entry with autocomplete, photo saved on item, AI Edge Function stub disabled.
7. Search: typo-tolerant full text, parametric ("résistance 10k 0805"), filters, rule-based equivalences.
8. 3D printing: filament fields, weight from weighing minus spool tare (tare per brand).
9. Alerts and shopping: thresholds, "À racheter" list, shopping list grouped by supplier, home dashboard.
10. History and data: stock movements log, CSV export / import, offline consultation.
11. Acceptance: check every acceptance criterion in spec section 8 and fix.

## Data model
- Tables: `locations`, `categories`, `items`, `item_photos`, `item_links`, `filaments` (1-1 with items), `spool_tares`, `stock_movements`, `shopping_list`. Refinements over spec section 5 are listed in `DECISIONS.md` (step 3).
- Technical params stored as JSONB and indexed for parametric search. Numeric params are plain numbers (10 kΩ = 10000); parsing/formatting in `src/lib/units.ts`, schemas in `src/lib/categories.ts`.
- Stock history is written by the `items_log_movement` trigger: never insert `stock_movements` from the app. Quantity ±N goes through the `adjust_item_quantity` RPC (`useAdjustQuantity`).
- Schema in `prisma/schema.prisma`, migrations in `prisma/migrations/`. Defaults are DB-generated (`dbgenerated(...)`), never Prisma-side.
- Migration workflow: edit the schema, then `npm run db:migrate -- --name <name> --create-only`, review/add SQL (RLS policy + grant for every new table), then `npm run db:deploy`. Never run `migrate dev` while a migration is pending: it applies it immediately. Never edit an applied migration.
- `prisma/shadow-init.sql` stubs Supabase objects for the shadow database; extend it when a migration references a new `auth`/`storage` object.
- After each schema change, update `src/lib/supabase/database.types.ts` (or `npm run db:types`). App code uses `Row<"items">` etc. from `src/lib/supabase/types.ts`.

## UI / UX
- UI language: French. Code, comments and identifiers: English.
- Mobile first, one-handed: main actions in the thumb zone (bottom nav, floating add button).
- Max 3 taps to find a part, add a part, change a quantity. Manual add/update in < 20 s.
- Touch targets ≥ 44 px. Desktop: dense tables, keyboard shortcuts, bulk edit.
- Light theme only (owner's choice). Imposed palette, WCAG AA contrast required:
  - Sable `#AF9164`: accent, secondary buttons, selection
  - Crème `#F7F3E3`: main background (light theme)
  - Gris acier `#B3B6B7`: borders, secondary text, disabled
  - Rouille `#6F1A07`: primary action, low-stock alerts
  - Brun nuit `#2B2118`: main text, dark theme background
- Animations: short (150–300 ms), never slow an action, respect `prefers-reduced-motion`.
- Design system: semantic tokens in `src/app/globals.css` (`bg-surface`, `text-muted`, `bg-primary-solid` for fills, `text-primary` for text, `accent-soft`, `chrome-*` for the Brun nuit bars, `shadow-card`), never raw hex in components. No class-merging helper: never pass a utility that conflicts with a component's own (use props like `IconButton` `tone`/`round`, `Button` `variant`). Section headings use `SectionTitle`. Reuse base components from `src/components/ui` and layout pieces from `src/components/layout`. Icons: `lucide-react`.
- Add new main destinations to `src/components/layout/nav-items.ts` and to `PRECACHE_URLS` in `public/sw.js` (bump `VERSION`).

## Non-functional targets
- App open < 2 s on mobile 4G, search results < 300 ms.
- Stock consultation and search work offline (local cache).
- Safari iOS, Chrome Android, Chrome / Firefox / Edge desktop.
- Client-side photo compression before upload (< 500 KB per photo).
- Stay within Supabase / Vercel free or entry-level tiers.

## Next.js
@AGENTS.md
