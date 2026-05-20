# SnapStudy

Snap a photo of notes, get a study kit — flashcards, summary, quiz, AI tutor — and review with FSRS spaced repetition.

This repo contains:

- **Mobile app** — Expo + React Native + TypeScript (`app/`, `src/`)
- **Backend** — Supabase Postgres schema + edge functions (`supabase/`)
- **Project plan** — `PROJECT_PLAN.md`

## Quick start

### 1. Install

```bash
npm install
cp .env.example .env
# Fill in EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY
```

### 2. Supabase setup

```bash
# Install CLI: https://supabase.com/docs/guides/local-development
supabase login
supabase link --project-ref YOUR_PROJECT_REF
supabase db push  # applies supabase/migrations/0001_initial.sql

# Create the captures storage bucket
supabase storage create captures

# Set edge-function secrets (these never reach the client)
supabase secrets set \
  GEMINI_API_KEY=... \
  ANTHROPIC_API_KEY=...

# Deploy edge functions
supabase functions deploy generate-kit
supabase functions deploy ask
```

### 3. Run the app

```bash
npm run start          # Expo dev server
npm run ios            # iOS simulator
npm run android        # Android emulator
```

## Architecture

```
Mobile (Expo) ─── HTTPS ───▶ Supabase
                              ├─ Postgres (schema in supabase/migrations)
                              ├─ Auth (email + OAuth)
                              ├─ Storage (raw photo uploads)
                              ├─ Realtime (progressive kit reveal)
                              └─ Edge Functions
                                  ├─ generate-kit → Gemini + Claude
                                  └─ ask        → Claude (tutor)
```

- AI keys live only in edge functions
- Client uses anon key + user JWT; RLS enforces per-user isolation
- Local SQLite mirrors cards for offline review; reviews queue + sync delta back

## Key code

- **`src/lib/fsrs/`** — FSRS v5 scheduler implementation + Jest tests
- **`src/lib/capture.ts`** — Image upload + edge-function invocation + realtime subscription
- **`src/lib/db/client.ts`** — Local SQLite store
- **`src/lib/db/sync.ts`** — Bidirectional sync with Postgres
- **`supabase/functions/generate-kit/index.ts`** — OCR + fan-out to summary/cards/quiz generation
- **`supabase/functions/_shared/prompts.ts`** — Prompt templates (the IP)

## Tests

```bash
npm run test          # all tests
npm run test:fsrs     # just FSRS
```

## Project plan

See [`PROJECT_PLAN.md`](./PROJECT_PLAN.md) for the full 12-week roadmap, tech stack rationale, pricing, GTM, and metrics.

## License

Proprietary — all rights reserved.
