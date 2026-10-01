# stockElec

PWA de gestion de stock pour maker (électronique + impression 3D). Spécification : `Cahier des charges — stockElec.md`. Choix techniques : `DECISIONS.md`.

## Stack

Next.js 16 (App Router) · React 19 · TypeScript strict · Tailwind CSS 4 · Supabase (Postgres, Auth, Storage, Edge Functions) · Vercel.

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

Pour tester l'installation PWA sur téléphone, il faut du HTTPS : utiliser le déploiement Vercel, ou `npx next dev --experimental-https` sur le réseau local.

## Variables d'environnement

| Variable | Où la trouver | Côté |
| --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase → Project Settings → API → Project URL | client |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase → Project Settings → API → anon public | client (protégée par RLS) |
| `NEXT_PUBLIC_AI_ENABLED` | `false` en V1 | client |

Aucune clé secrète n'est exposée côté client. Les clés serveur (IA) seront stockées dans les secrets des Edge Functions Supabase.

## Base de données

Les migrations SQL sont dans `supabase/migrations`. Pour les appliquer au projet Supabase existant :

```bash
npx supabase login
npx supabase link --project-ref <project-ref>
npm run db:push
```

## Scripts

| Script | Rôle |
| --- | --- |
| `npm run dev` | serveur de développement |
| `npm run build` | build de production |
| `npm run start` | lance le build de production |
| `npm run lint` | ESLint |
| `npm run typecheck` | vérification TypeScript |
| `npm run db:push` | applique les migrations au projet Supabase lié |

## Coût estimé des services externes (usage personnel)

| Service | Offre | Coût mensuel estimé | Clé |
| --- | --- | --- | --- |
| Supabase | Free (500 Mo DB, 1 Go Storage) | 0 € | `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` |
| Vercel | Hobby | 0 € | — |

Ce tableau est complété au fil des étapes (scan, IA, catalogue composants).
