# DECISIONS — stockElec

Choices made where the specification was silent. Each entry: decision, then why.

## Step 1 — Foundation

- **Next.js 16 (App Router) + React 19 + Tailwind CSS 4 + TypeScript strict**, scaffolded with `create-next-app`.
  Why: imposed stack; official defaults minimise configuration.

- **Client-rendered app talking to Supabase directly from the browser (supabase-js + RLS).** No server-side data fetching, no `proxy.ts`.
  Why: single user, data protected by RLS, and offline consultation (spec §7) is far simpler when all screens are client components backed by a local cache. Pages are static shells that the service worker can cache.

- **Authentication by email + password only** (no magic link).
  Why: the spec allows either. On iOS a magic link opens in Safari, not in the installed PWA, so the session would not land in the app. Password login works inside the PWA.

- **Session persisted in `localStorage`** (supabase-js default, `autoRefreshToken`).
  Why: the PWA stays signed in across launches and the session is readable offline.

- **Sign-up disabled in the UI**: the single account is created once in the Supabase dashboard.
  Why: mono-user app; no public sign-up surface.

- **Hand-written service worker (`public/sw.js`)** instead of a PWA plugin (Serwist, next-pwa).
  Why: Next 16 builds with Turbopack; plugins depend on webpack hooks. The needs are small: cache-first for `/_next/static`, network-first with cache fallback for pages. Registered in production builds only.

- **PWA icons generated at build time** with `next/og` `ImageResponse` (`/pwa-icon/192`, `/pwa-icon/512`, `apple-icon`).
  Why: no binary assets to maintain; colours come from the imposed palette.

- **Environment variables read lazily** (`src/lib/env.ts`): a missing variable fails at first use, not at build.
  Why: `npm run build` stays green on a fresh clone; Vercel provides the values at build time.

## Prisma (added by the owner during step 1)

- **Prisma 7 owns the schema and migrations only**; the app keeps using supabase-js + RLS for every read/write. No client generator.
  Why: keeps the client-rendered, offline-friendly architecture above; Prisma bypasses RLS, so using it for data access would require a server layer filtering by `user_id`.

- **RLS policies, grants and Supabase-specific SQL written inside Prisma migrations** (`prisma migrate dev --create-only`, then edit the SQL).
  Why: one migration history; Prisma has no RLS syntax.

- **Single `DATABASE_URL` pointing to the Supabase session pooler (port 5432).**
  Why: the direct connection is IPv6-only on the free tier, and the transaction pooler (6543) does not support migrations. Only the Prisma CLI uses it.

- **`prisma.config.ts` loads env files with `@next/env`.**
  Why: Prisma 7 no longer loads `.env` itself; `@next/env` reads `.env.local` and `.env` exactly like Next.js, without adding dotenv.

- **Migrations applied from the owner's machine (`npm run db:deploy`), not during the Vercel build.**
  Why: no database password on Vercel, no schema change triggered by a push.

- **Supabase CLI kept** for Edge Functions (step 6); the `db:push` script is replaced by Prisma scripts.

- **Client key named `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`** (Supabase publishable key `sb_publishable_…`) instead of the legacy anon key.
  Why: it is the name and key type the Supabase dashboard now provides; same role (public, protected by RLS) and works unchanged with supabase-js.

- **npm `overrides` for `deepmerge-ts` (^8.0.2) and `mysql2` (^3.24.5)**, transitive deps of the Prisma CLI flagged by `npm audit` (high).
  Why: `npm audit fix --force` would downgrade to Prisma 6. The CLI is dev-only and never shipped; `prisma validate` / `migrate status` verified with the overrides. Remove them once Prisma ships patched versions.

- **`turbopack.root` pinned to the project folder** in `next.config.ts`.
  Why: a lockfile in a parent folder (outside the repo) made Next.js warn about the workspace root.

## Step 2 — Design system and navigation

- **Semantic colour tokens** in `src/app/globals.css` (Tailwind 4 `@theme inline`): `bg`, `surface`, `fg`, `muted`, `border`, `primary`, `accent`, `alert`… Components never use raw hex.
  Why: one place to tune the palette; light and dark themes switch by redefining CSS variables.

- **Derived shades only where WCAG AA requires them**: muted text `#5E6263` (steel darkened, 5.5:1 on Crème), sand as text `#7A6340` (5.1:1), input outlines `#808384` (3.4:1). Steel `#B3B6B7` (1.8:1 on Crème) is kept for decorative dividers. Dark theme primary/alert `#E8907A` (rust lightened) because Rouille on Brun nuit is 1.4:1.
  Why: the imposed palette fails AA for several text pairings; the spec allows shades as long as AA is met.

- **Theme follows the system setting** (`prefers-color-scheme`), no manual switch.
  Why: simplest; no setting to store.

- **System font stack**, Tailwind default type and spacing scales, `touch` spacing token = 44 px.
  Why: no web font to download (performance, offline); 44 px is the spec's minimum target.

- **Icons: `lucide-react`.**
  Why: tree-shaken, consistent stroke icons, no asset to maintain.

- **Base components hand-written** in `src/components/ui` (Button/ButtonLink/IconButton, TextField, Card, Badge, EmptyState, ConfirmDialog) instead of a UI kit.
  Why: few components needed; the native `<dialog>` element gives focus trap, Escape and backdrop for free.

- **Navigation**: mobile bottom bar with 5 destinations (Accueil, Articles, Emplacements, Courses, Plus) + floating add button bottom-right; desktop (`lg`) sidebar with the same entries and an "Ajouter" button. Global search entry in the sticky header of every screen, opening `/search`.
  Why: thumb zone on mobile, one shared list of destinations for both layouts.

- **Routes in English** (`/items`, `/locations`, `/shopping`, `/more`, `/search`, `/add`), labels in French.
  Why: identifiers in English (CLAUDE.md); labels are what the user sees.

- **Desktop keyboard shortcuts**: `/` opens search, `N` opens quick add (ignored while typing).
  Why: spec asks for keyboard shortcuts on desktop; these two cover the main flows.

- **Motion**: 150–250 ms transitions, page enter animation, press feedback (`active:scale`); everything disabled under `prefers-reduced-motion`.

- **Placeholder screens** for destinations built in later steps, each with an empty state.
  Why: navigation is testable end to end now; screens are replaced step by step.

- **Service worker cache bumped to `v2`** and new routes precached.
  Why: the app shell of every main screen opens offline.

## Step 3 — Data

- **Schema in `prisma/schema.prisma`, two migrations**: `init` (tables, enums, indexes, generated by Prisma) and `rls_storage` (hand-written SQL: grants, RLS, check constraints, `updated_at` triggers, Storage bucket and policies).
  Why: Prisma models tables only; everything Supabase-specific lives in SQL in the same history.

- **Shadow database stubs** (`prisma/shadow-init.sql`, wired through `migrations.initShadowDb`, which requires `experimental.externalTables`): minimal `auth.uid()`, `storage.buckets`, `storage.objects`, `storage.foldername()`.
  Why: `prisma migrate dev` replays migrations on an empty temporary database that has no Supabase schemas.

- **All defaults generated by the database** (`gen_random_uuid()`, `now()`, `auth.uid()` for `user_id`); `updated_at` maintained by a trigger.
  Why: there is no Prisma client at runtime; inserts come from supabase-js.

- **No foreign key from `user_id` to `auth.users`.**
  Why: Prisma only manages the `public` schema and would try to drop a constraint pointing outside it; RLS already guarantees ownership.

- **One RLS policy per table**: `FOR ALL TO authenticated USING/WITH CHECK (user_id = (select auth.uid()))`. `anon` has no grant at all.
  Why: single user, single stock; the `(select …)` form is evaluated once per query.

- **Model refinements over spec section 5**:
  - enums in English (`item_type`, `quantity_unit`, `quantity_mode`, `approx_level`, `movement_type`), translated in the UI;
  - `items.quantity` and thresholds are `numeric(12,3)` (metres, grams); `min_threshold = null` means alert disabled (default, spec 4.6);
  - approximate stock stored in `approx_level` (Beaucoup / Un peu / Presque vide);
  - location `kind` is free text (spec lists open-ended examples); no `qr_code` column: the QR encodes the location id;
  - new table `spool_tares` (empty spool weight per brand, spec 4.8); filament brand = item manufacturer;
  - `stock_movements` keeps `from_location_id` / `to_location_id` for moves;
  - `shopping_list.item_id` is nullable with a `label` for free-text entries (spec 4.7 manual add); items under threshold are computed by the app, not stored;
  - `item_photos.ai_result` (jsonb) prepared for the AI identification, unused in V1;
  - prices are indicative and in euros (no currency column).
  Why: the spec model is indicative; these are the smallest additions the features need.

- **Deleting**: a location or category with children is refused (`RESTRICT`); deleting a location/category leaves its items without one (`SET NULL`); deleting an item deletes its photos, links, filament, movements and shopping entries (`CASCADE`).
  Why: never lose stock data by deleting a container; history follows its item.

- **Indexes**: GIN on `items.params` (parametric search) and `items.tags`; btree on `mpn` and foreign keys. Text search indexes (trigram) come with step 7.

- **Storage**: private bucket `item-photos`, 2 MB cap (photos compressed client-side to < 500 KB), JPEG/PNG/WebP; path `<user_id>/<item_id>/<file>`, policies check the first folder.

- **Database types hand-written** in `src/lib/supabase/database.types.ts`, same shape as `supabase gen types`; app code uses the helpers in `src/lib/supabase/types.ts` (`Row<"items">`…). `npm run db:types` regenerates the file once the owner has run `npx supabase login`.
  Why: generating needs an interactive CLI login; the hand-written file is a drop-in replacement.

## Step 4 — Locations

- **Data fetching with TanStack Query** (`@tanstack/react-query`); data hooks live in `src/lib/*.ts` (`useLocations`, `useItemsInLocations`, `useMoveItem`…). Cache cleared on sign-out.
  Why: caching, invalidation after mutations and loading/error states without hand-written effects; its persister is the natural path to the offline cache of step 10.

- **The whole location tree is loaded at once** and paths/subtrees are computed client-side.
  Why: a personal stock has at most a few hundred locations; pickers, breadcrumbs and labels all need the full tree.

- **Location screen is `/locations?id=<uuid>`** (query parameter), not a dynamic segment.
  Why: `/locations` stays one static page that the service worker caches once, so any location opens offline and from a QR code.

- **QR content = absolute URL** `<NEXT_PUBLIC_APP_URL or current origin>/locations?id=<uuid>`. The in-app scanner accepts any host with that path.
  Why: the phone's own camera app also opens the right screen; labels survive a domain change when scanned in the app. `NEXT_PUBLIC_APP_URL` (optional) avoids printing localhost URLs.

- **Label sheet: jsPDF + `qrcode`, A4 Avery L7160 layout** (3 × 7 labels of 63.5 × 38.1 mm): QR, name, parent path. Libraries loaded on demand. Built-in Helvetica (WinAnsi) covers French accents; the PDF is downloaded with `doc.save`.
  Why: L7160 is the most common A4 label sheet; plain paper works too.

- **Barcode / QR library: `barcode-detector` (zxing-cpp WASM ponyfill of the Web BarcodeDetector API).** Reads QR, DataMatrix, EAN, Code 128… (reused in step 6). The WASM file is copied to `public/zxing/` by a `postinstall` script (git-ignored) and served from our origin.
  Why: iOS Safari has no native BarcodeDetector; zxing-cpp is maintained and handles DataMatrix (LCSC/DigiKey labels). Self-hosting avoids a third-party CDN and lets the scanner work offline.

- **Scanner**: rear camera, one detection every 200 ms, same code ignored for 2 s, short vibration on success. Step 4 scans location QR codes only (`/scan`).

- **"Ranger un article ici"**: picks an existing item (name / MPN lookup) and moves it, or links to `/add?location=<id>` to create one (used by step 6).

- **Moving an item** updates `items.location_id` then inserts a `move` row in `stock_movements` (two requests, no transaction).
  Why: simplest; a failed second request only loses a history line.

- **Deleting a location**: refused while it has sub-locations (the dialog says so; the database also refuses); items inside stay in stock without a location.

- **Location content search** filters the location and its whole subtree by name, MPN or package; without a filter only items stored directly there are listed.

## Step 5 — Items

- **Stock history recorded by a database trigger** (`items_log_movement`): every insert with a quantity, quantity change and location change of an item writes a `stock_movements` row (`add` / `remove` / `move`). The app never inserts movements itself.
  Why: one rule whatever the screen (form, +1/−1, move, future CSV import); atomic with the change.

- **+1 / −1 through the RPC `adjust_item_quantity(item, delta)`** (security invoker, so RLS applies), never below 0. The UI updates instantly (optimistic cache patch) and refreshes after the last pending tap.
  Why: PostgREST cannot express `quantity = quantity + 1`; a read-then-write from the client would lose fast repeated taps.

- **`_prisma_migrations` locked** (RLS on, no grant to `anon` / `authenticated`) by migration `lock_prisma_migrations`.
  Why: Prisma creates it in `public`, which the Data API exposes.

- **Default category tree seeded on first use** from `src/lib/categories.ts` (Résistances, Condensateurs, Diodes, Transistors, Circuits intégrés, Connecteurs, Modules, Électromécanique, Consommables, Outillage, Impression 3D, with sub-categories). A sub-category inherits its parent's parameters. New categories can be created from the item form (name + parent, inherited parameters).
  Why: rows need the user's `user_id`; seeding from the client is the simplest way to own them. No category management screen: the spec does not ask for one.

- **Parameter schema** (`categories.params_schema`): list of `{ key, label, kind, unit?, options? }`, kinds `engineering` (number with SI prefixes), `decimal`, `select`, `text`. **Numbers are stored as plain numbers** in `items.params` (10 kΩ → `10000`); input accepts `10k`, `4k7`, `2R2`, `4,7µ`, `3V3`; display re-adds prefix and unit.
  Why: numbers can be compared for anti-duplicate, parametric search and equivalences (steps 7).

- **Item type**: chosen with chips; picking a category of the default tree suggests it (Consommables → consumable, Outillage → tool, Impression 3D → printing_3d, else component) until the user picks a type.

- **Anti-duplicate** before creating an item: same MPN (case/space-insensitive), or same category + same package + equal values for every shared parameter (numbers within 1 %). The dialog offers "Ajouter N à cet article" (or "Ouvrir" for approximate stock) or "Créer quand même". Photos taken in the form are attached to the existing item on merge. A failed check never blocks saving.

- **Form for speed**: type, name, category, quantity (−/+ and unit, or approximate level), location and photos first; reference/parameters, suppliers, and alert/notes/tags in collapsible sections (open when editing). Sticky save button above the bottom bar; the FAB is hidden on form screens.

- **Routes**: `/items` (list), `/items?id=` (item), `/items/edit?id=` (edit), `/add` (new; `?location=` pre-selects a location, `?duplicate=` pre-fills from an item).

- **Duplicate** copies every field and supplier link, not the photos.

- **Photos**: compressed on the device (max 1600 px, JPEG, quality lowered until < 500 KB, EXIF orientation applied), uploaded to `item-photos/<user_id>/<item_id>/<uuid>.jpg`, displayed through 1-hour signed URLs (private bucket). Deleting an item removes its files.

- **Supplier links** are replaced as a whole on save (few rows); the supplier is guessed from the URL host (LCSC, Mouser, DigiKey…). Prices in euros.

- **Low-stock threshold**: optional field on every item (empty = no alert, default for all types); the hint recommends it for consumables. Alerts themselves come in step 9.

- **Parameters not defined by the chosen category are dropped on save.**
  Why: the form only shows the category's parameters; keeping invisible values would surprise in search.

## Step 6 — Quick add

- **`/add` has three modes** (Photo, Scanner, Manuel) that all end in the same pre-filled item form the user validates. The global `/scan` screen opens a location for a location QR, and `/add?scan=<raw>&format=<f>` for any other code.

- **Supplier labels decoded client-side** (`src/lib/scan/parse-label.ts`):
  - LCSC bag QR (`{pc:C…,pm:<MPN>,qty:…}`) → MPN, quantity, LCSC link;
  - ISO/IEC 15434 DataMatrix (`[)>␞06␝…`, data identifiers `1P` = MPN, `P` = supplier part number, `Q` = quantity, `1V` = manufacturer for Mouser) → DigiKey recognised by its `11Z/12Z/13Z` fields, Mouser by `14K/1V`, other distributors using the standard still get MPN and quantity;
  - EAN-8 / UPC-A / EAN-13 (check digit verified) → `barcode`;
  - anything else short and without spaces is proposed as the MPN.
  The supplier part number becomes a supplier link (LCSC product page, DigiKey / Mouser search). Farnell has no documented label format and is covered only if its labels follow ISO 15434.
  Why: no network call, works offline, and these formats are documented standards or stable public formats.

- **No external EAN database.** A new column `items.barcode` (migration `item_barcode`) stores the EAN; scanning a known EAN finds the item through the anti-duplicate check. A first scan pre-fills only the barcode and asks for a name.
  Why: free EAN lookup APIs have poor coverage for tools and components, rate limits and no CORS; the spec does not name one.

- **Anti-duplicate runs as soon as a scanned form opens** (MPN or barcode match → "Ajouter N à cet article"), and again on save. Barcode is now part of the match.

- **Scanning a location QR in add mode** selects that location for the new part ("scan the bin, then the part").

- **Manual mode autocomplete** under the name field: existing items (opening one avoids a duplicate) and categories (one tap to pick it).

- **Photo mode, V1**: the photo is compressed and attached to the new item, then the manual form opens. No AI call, no AI wording in the UI while `NEXT_PUBLIC_AI_ENABLED=false`.

- **AI prepared, not connected**:
  - client `IdentificationService` (`src/lib/identification.ts`) with a disabled implementation (V1) and an Edge Function implementation, chosen by the flag;
  - Edge Function `supabase/functions/identify-component` answers `{ suggestion: null }` while the `ANTHROPIC_API_KEY` secret is absent;
  - with the key it calls **Claude Opus 5.5 (`claude-opus-5-5`)** through the official Anthropic SDK (`npm:@anthropic-ai/sdk`), image + the user's category list, JSON schema output (category path, name, MPN, manufacturer, package, params as text), effort `low`, server-side refusal fallback (`fallbacks: "default"`);
  - the suggestion only pre-fills the form; the user always saves.
  Why Claude: vision and structured output in one call from an Edge Function, key kept server-side. Enabling = set the secret + flag to `true`, no code change (acceptance criterion).

- **`supabase/functions` excluded from the Next.js `tsconfig`** (Deno runtime); type-checked with `deno check`.

- **Shadow database**: `prisma/shadow-init.sql` also creates a stub `_prisma_migrations`, which the `lock_prisma_migrations` migration alters.

## Step 7 — Search

- **Search runs in memory on the device** (`src/lib/search/`): the searchable fields of every item are loaded once (TanStack Query key `["items", "search-index"]`, refreshed by any item mutation) and indexed client-side. No Postgres full-text / trigram index.
  Why: a personal stock is at most a few thousand items; measured ~45 ms for a typo-tolerant query on 5 000 items (target < 300 ms); the same code will search offline on cached data (step 10); typo tolerance and parameter parsing are easier to control in TypeScript.

- **Query parsing** (`query.ts`): each word becomes a typed token —
  - value with unit or SI prefix (`10k`, `3.3V`, `100nF`, `3V3`, `4,7k`) → compared to the item's numeric parameters (±1 %), restricted to parameters of that unit when one is given; bare integers and part numbers (`2N2222`) stay text;
  - package (`0805`, `SOT-23`, any package present in the stock, common footprint families) → exact match on the item package;
  - category word, plural- and accent-insensitive, with a few synonyms (`ldo`, `condo`, `res`, `ci`, `mcu`…) → item in that category or below;
  - anything else → free text.
  Every token must match (AND), and every structured token can also be satisfied by free text, so items without parameters are still found by name.

- **Free text matching**: name, MPN, manufacturer, package, notes, tags and category names, normalized (case, accents, µ); MPN / barcode compared without punctuation; typos allowed: 1 for words of 4–7 letters, 2 from 8. Ranking: reference > substring > word prefix > typo; in-stock items first.

- **Barcode**: a query of 8 or 12–13 digits also matches `items.barcode` exactly.

- **Filters**: item type, category (with sub-categories), location (with sub-locations), "Stock faible", "En rupture". Stock rules in `src/lib/stock.ts`: exact stock is out at 0 and low at or under its threshold; bulk stock is low when "Presque vide" and never out.

- **The query is kept in the URL** (`/search?q=`) with `history.replaceState`, so back navigation restores it without re-rendering the page.

- **The parsed query is shown as chips** ("Catégorie Résistances", "10 kΩ", "Boîtier 0805").
  Why: makes parametric search predictable.

- **Equivalences by rules, no external source** (`equivalents.ts`). Shown in search when no match is in stock, and on the screen of an out-of-stock item. Candidates: in stock, same root category, then per parameter:
  - key values (resistance, capacitance, inductance, output voltage, pitch, pins, diameter, width) must be equal (±1 %);
  - ratings (voltage, current, power) equal or higher, lower excludes;
  - tolerance tighter OK, looser listed as a warning;
  - other parameters and the package: differences listed as warnings.
  A query reference takes its category from the category word, or from the unit when it points to a single root category.
  Why: spec asks for rules on structured params in V1; catalog APIs (Nexar/Octopart, LCSC) need keys and quotas and would only help for parts not in stock, which is out of the V1 scope.

- **Photo search** button on the search screen exists only when the AI flag is on (prepared, uses the same `IdentificationService`).

## Step 8 — 3D printing

- **For a filament, `items.quantity` is the remaining weight in grams** (`unit = gram`, exact mode). Alerts, search, shopping list and history use it like any item; `filaments.remaining_g` / `tare_g` mirror the last saved values.
  Why: one stock figure for every item type, no duplicated logic.

- **The filament section appears** for items of type "Impression 3D" in a category named "Filament" (default tree) or that already have filament details. Brand = item manufacturer.

- **Weighing**: remaining = measured weight − empty spool tare (never below 0). The tare comes from the filament, else from `spool_tares` for the brand; "Mémoriser cette tare" upserts it (unique per user and brand). "Peser la bobine" on the item screen applies the difference through `adjust_item_quantity`, so the history logs it.

- **Materials** offered as suggestions (PLA, PLA+, PETG, ABS, ASA, TPU, Nylon, PC, PVA, HIPS), free text allowed; diameters 1.75 / 2.85 mm; colour picked with the native colour input.

## Step 9 — Alerts, shopping list, home

- **"À racheter" rule** (`needsRestock` in `src/lib/stock.ts`): exact stock at or under its threshold, or at 0 with a threshold set; bulk stock at "Presque vide". Items without a threshold are never listed (alerts are opt-in, default off).
  Why: spec 4.6; bulk stock has no number to compare, its lowest level is the natural alert.

- **Shopping list** = items needing restock (computed live, never stored) + manual rows of `shopping_list` (free text or an existing item). Checking a computed line creates its row with `purchased = true`. "Vider les achetés" deletes purchased rows. Suggested quantity = what brings the stock back over the threshold (at least 1).

- **Grouped by supplier** using the item's cheapest supplier link (no price last); lines without link under "Sans fournisseur". "Commander" opens that link.

- **Home**: restock card with a count badge and the first 5 items, last 8 modified items, root categories opening the search filtered on them (`/search?category=<id>`).

- **Notification**: optional, local only. Turned on in "Plus" (asks permission, preference in `localStorage`); when a −1 makes an item cross its threshold, the app shows a notification through the service worker. No server push (would need VAPID keys, a push service and a scheduled job).
  Why: the spec marks it optional; local notifications cover the "I just took the last ones" case at no cost.

## Step 10 — History, CSV, offline

- **History** (`/history`, and the last 10 movements on each item): rows of `stock_movements` (written by the trigger) with item name and from/to locations, 50 per page, filter by movement type.

- **CSV export**: UTF-8 with BOM, `;` separator, RFC 4180 quoting (opens directly in Excel FR). One row per item, French labels for enums, category and location as paths (`A › B`), parameters as JSON, tags joined by `|`, first supplier link. Photos and history are not exported.

- **CSV import** (`/import`): `papaparse` (separator detected), same headers as the export (accent/case-insensitive), English codes accepted for enums. Preview with per-line errors (invalid lines skipped). Categories matched by path (unknown → none); locations matched by path and created when missing. Same MPN as an existing item → skipped, or quantity added when the option is checked. Inserts by batches of 100, then supplier links. Not transactional: an interruption keeps the batches already imported.

- **Offline consultation**: the TanStack Query cache is persisted in IndexedDB (`@tanstack/react-query-persist-client` + async persister + `idb-keyval`), kept 7 days, `networkMode: "offlineFirst"`; cleared at sign-out. Queries returning a `Map` (location counters, signed photo URLs) are not persisted. The service worker already serves every screen's shell. A banner shows "Hors ligne — consultation seule".
  Why: items, locations, categories and the search index are already client-side queries; persisting them gives offline reading and search with no extra code path.

- **No offline writes**: mutations fail immediately offline (`networkMode: "always"`) instead of being queued and lost on reload. Photos are not available offline (short-lived signed URLs).

## Design revision (after step 11, owner feedback: "trop fade")

- **Light theme only** (owner's request). The dark theme is removed; `color-scheme: light` keeps native controls light whatever the system setting.

- **Brun nuit structural bars**: header, search bar, bottom bar and desktop sidebar use `chrome` tokens (Brun nuit background, Crème text, Sable for the active item). Browser theme colour = Brun nuit.
  Why: a dark frame separates navigation from content and gives the app a clear identity with the imposed palette.

- **Content separation**: page background is a deeper cream (`#EFE7D3`), cards are near-white (`#FFFCF5`) with a sand border (`#D6C9AC`) and a soft warm shadow (`shadow-card`).
  Why: the previous cream-on-cream surfaces were 1.1:1 apart.

- **More colour, same palette**: sand tint (`accent-soft`, `#E8DCC2`) for category chips, icon tiles of section titles (`SectionTitle`), empty states and location icons; Rouille filled for the selected option of segmented controls, the +1 button, primary buttons and a small bar before page titles; rust left border on the restock card; out-of-stock quantities in the alert colour.

- **Login screen**: brand band in Brun nuit with the app mark, form in a card overlapping it.

- **`IconButton` tones** (`default`, `chrome`, `danger`, `primary`) and `round` option instead of colour classes passed by callers (the project has no class-merging helper, so conflicting utilities must not be combined).

## Categories by item type (owner feedback)

- **`categories.item_type`** (migration `category_item_type`): set on root categories (default tree: Consommables → consumable, Outillage → tool, Impression 3D → printing_3d, others → component; backfilled for existing roots). Sub-categories inherit their root's type. A root created from the item form gets the type being entered.
- **The item form only offers the categories of the selected type** (category select, "Nouvelle catégorie" parents, name autocomplete). Changing the type clears a category of another type.
- **Fix: default categories were seeded once per mounted `useCategories`** (three copies on a fresh account). Seeding is now one shared promise for the whole app and re-checks the table right before inserting. Two tabs opened at the same second on an empty account could still race; not worth a database constraint (Prisma cannot express the partial unique indexes it would need).
- Offline cache version bumped to `2` (category shape changed).

## Create a location from the picker (owner feedback)

- The location picker of the item form and of "Déplacer" (items) offers **"Créer l'emplacement « … »"** when the typed text matches no existing location. A path (`Atelier › Tiroir 3`, `Atelier > Tiroir 3` or `Atelier / Tiroir 3`) creates the missing levels and reuses existing ones (same name, case-insensitive). The new location is selected right away. Moving a location does not offer creation.
  Note: `/`, `>` and `›` are path separators there, so a name containing them cannot be created from the picker (use the Emplacements screen).
