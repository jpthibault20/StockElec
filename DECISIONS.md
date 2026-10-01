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
