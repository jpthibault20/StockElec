# stockElec

PWA de gestion de stock pour maker (électronique + impression 3D). Spécification : `Cahier des charges — stockElec.md`. Choix techniques : `DECISIONS.md`.

## Stack

Next.js 16 (App Router) · React 19 · TypeScript strict · Tailwind CSS 4 · Supabase (Postgres, Auth, Storage, Edge Functions) · Prisma (schéma et migrations) · Vercel.

## Installation locale

Prérequis : Node.js 20+ et npm.

```bash
npm install
cp .env.example .env.local   # puis renseigner les valeurs (voir ci-dessous)
npm run dev                  # http://localhost:3000
```

Le service worker n'est actif qu'en build de production :

```bash
npm run build && npm run start
```

`npm install` copie aussi le lecteur de codes-barres (`zxing_reader.wasm`) dans `public/zxing/` (script `postinstall`).

Pour tester l'installation PWA sur téléphone, il faut du HTTPS : utiliser le déploiement Vercel, ou `npx next dev --experimental-https` sur le réseau local.

## Variables d'environnement

| Variable | Où la trouver | Côté |
| --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase → Project Settings → Data API → Project URL | client |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Supabase → Project Settings → API Keys → Publishable key (`sb_publishable_…`) | client (protégée par RLS) |
| `NEXT_PUBLIC_AI_ENABLED` | `false` en V1 | client |
| `NEXT_PUBLIC_APP_URL` | URL publique de l'app (ex. `https://stockelec.vercel.app`), encodée dans les QR des étiquettes. Facultative : sinon l'URL courante | client |
| `DATABASE_URL` | Supabase → Connect → Session pooler (port 5432), avec le mot de passe de la base | local uniquement (CLI Prisma), à ne pas mettre sur Vercel |

Aucune clé secrète n'est exposée côté client. Les clés serveur (IA) seront stockées dans les secrets des Edge Functions Supabase.

## Base de données

Le schéma est décrit par Prisma dans `prisma/schema.prisma`, les migrations sont dans `prisma/migrations` (configuration : `prisma.config.ts`). Les politiques RLS sont écrites en SQL dans ces migrations. L'application n'utilise pas le client Prisma : elle passe par supabase-js, protégé par la RLS.

```bash
npm run db:migrate -- --name <nom>                 # crée et applique une migration
npm run db:migrate -- --name <nom> --create-only   # crée sans appliquer (pour ajouter du SQL RLS)
npm run db:deploy                                  # applique les migrations en attente
```

`DATABASE_URL` doit être renseignée dans `.env.local` ou `.env`.

Migrations : `init` (tables), `rls_storage` (RLS, grants, contraintes, triggers, bucket Storage `item-photos`), `item_quantity_history` (historique automatique des mouvements, fonction `adjust_item_quantity`), `lock_prisma_migrations` (table interne de Prisma fermée à l'API), `item_barcode` (code-barres EAN des articles). `prisma/shadow-init.sql` recrée sur la base fantôme de Prisma les objets Supabase (`auth.uid()`, `storage`) utilisés par les migrations.

Types TypeScript de la base : `src/lib/supabase/database.types.ts`. Pour les régénérer depuis Supabase (après `npx supabase login`) : `npm run db:types`.

## Fonction Edge et IA

`supabase/functions/identify-component` : identification d'une pièce sur photo. En V1 elle n'est pas appelée (`NEXT_PUBLIC_AI_ENABLED=false`) et répond une proposition vide tant que la clé n'est pas configurée.

```bash
npm run functions:deploy                                  # déploie la fonction (sans Docker)
npx supabase secrets set ANTHROPIC_API_KEY=sk-ant-...     # pour activer l'IA, puis :
# NEXT_PUBLIC_AI_ENABLED=true dans .env et dans Vercel
```

## Scripts

| Script | Rôle |
| --- | --- |
| `npm run dev` | serveur de développement |
| `npm run build` | build de production |
| `npm run start` | lance le build de production |
| `npm run lint` | ESLint |
| `npm run typecheck` | vérification TypeScript |
| `npm run db:migrate` | crée et applique une migration Prisma (développement) |
| `npm run db:deploy` | applique les migrations en attente |
| `npm run db:status` | état des migrations |
| `npm run db:types` | régénère les types TypeScript de la base (CLI Supabase connectée) |
| `npm run functions:deploy` | déploie la fonction Edge `identify-component` |

## Fonctionnalités annexes

- **Historique** : menu Plus › Historique des mouvements (et 10 derniers mouvements sur chaque fiche).
- **Export CSV** : menu Plus › Exporter le stock (UTF-8, séparateur `;`, s'ouvre dans Excel).
- **Import CSV** : menu Plus › Importer un CSV — mêmes colonnes que l'export (`nom` obligatoire), aperçu avant import, emplacements manquants créés.
- **Hors ligne** : les données consultées sont gardées 7 jours dans le navigateur (IndexedDB) ; recherche et consultation fonctionnent sans réseau, les modifications non.

## Recette (critères d'acceptation, section 8 du cahier des charges)

| Critère | Statut |
| --- | --- |
| Ajout / mise à jour par saisie manuelle en moins de 20 s | Formulaire conçu pour (champs essentiels d'abord, ±1 en liste) — **à chronométrer sur téléphone** |
| Ajout par scan d'une étiquette LCSC ou Mouser, MPN et quantité pré-remplis | Décodage testé sur contenus d'étiquettes réels (LCSC, DigiKey, Mouser) — **scan caméra à vérifier en HTTPS sur téléphone** |
| Photo enregistrée sur l'article ; IA activable avec une clé + le flag | Mode Photo V1 en place ; fonction Edge prête (`deno check` OK) — **à déployer** (`npm run functions:deploy`) |
| Un doublon déclenche la proposition de fusion | Vérification MPN / code-barres / paramètres à l'ouverture (scan) et à l'enregistrement — à vérifier dans l'app |
| Scanner un QR d'emplacement affiche son contenu | QR généré → relu par le même lecteur → emplacement reconnu (testé) — **caméra à vérifier** |
| « résistance 10k 0805 » retrouve les articles | Testé sur le moteur de recherche (et « LDO 3.3V SOT-23 ») |
| Un consommable sous son seuil apparaît dans « À racheter » et la liste de courses | Règle testée ; même règle pour l'accueil et la liste — à vérifier dans l'app |
| Stock consultable sans réseau | Cache IndexedDB + service worker — **à vérifier en mode avion (build de production)** |
| Installation iOS / Android depuis le navigateur | Manifest, icônes, service worker en place — **à vérifier sur appareils (HTTPS)** |

Tests automatiques réalisés pendant le développement : base de données (triggers, RPC, contraintes, RLS) dans des transactions annulées, décodage d'étiquettes, notation des valeurs (`10k`, `4k7`, `3V3`…), moteur de recherche et équivalences, CSV aller-retour, règles de stock et de pesée.

## Coût estimé des services externes (usage personnel)

| Service | Offre | Coût mensuel estimé | Clé |
| --- | --- | --- | --- |
| Supabase | Free (500 Mo DB, 1 Go Storage) | 0 € | `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `DATABASE_URL` |
| Vercel | Hobby | 0 € | — |
| Scan code-barres / QR (`barcode-detector`, zxing-cpp en WASM) | Bibliothèque open source, exécutée dans le navigateur | 0 € | — |
| Identification photo par IA (Claude Opus 5.5, via la fonction Edge `identify-component`) | **Désactivée en V1.** À l'usage : environ 0,02 € par photo identifiée (≈ 2 500 jetons en entrée à 4 $/M, ≈ 500 en sortie à 20 $/M) | 0 € en V1 ; ~1 € pour 50 identifications | `ANTHROPIC_API_KEY` (secret de la fonction Edge, jamais côté client) |

Ce tableau est complété au fil des étapes (scan, IA, catalogue composants).
