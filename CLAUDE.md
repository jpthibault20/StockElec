# CLAUDE.md — stockElec

## Rules
- All code comments are written in English.
- Never run `git commit`.
- Never run `git push`.
- Never create branches or tags. Only modify files; the owner reviews and commits.

## Project
- Specification: `Cahier des charges — stockElec.md` (single source of truth for the MVP scope).
- Build only what the spec describes. When the spec is silent, pick the simplest option and log it in `DECISIONS.md`.
- Follow the step order of spec section 8. After each step the app must compile, run and be testable.
- TypeScript strict. No secret key on the client. Keep `.env.example` up to date.
- V1 has no active AI: `NEXT_PUBLIC_AI_ENABLED=false` hides AI entry points.
- If a step needs a manual action (Supabase / Vercel dashboard), stop and list exactly what is needed.
- UI language: French. Code, comments and identifiers: English.

## Next.js
@AGENTS.md
