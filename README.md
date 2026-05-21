# SnapStudy

Snap a photo of notes, get a study kit — flashcards, summary, quiz, AI tutor — and review with FSRS spaced repetition.

This repo contains:

- **Mobile app** — Expo + React Native + TypeScript (`app/`, `src/`)
- **Backend** — Supabase Postgres schema + edge functions (`supabase/`)
- **Project plan** — `PROJECT_PLAN.md`
- **Improvement roadmap** — `SUGGESTIONS.md`

## Quick start

### 1. Install

```bash
npm install
cp .env.example .env
# Fill in EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY
```

### 2. Supabase setup

```bash
supabase login
supabase link --project-ref YOUR_PROJECT_REF
supabase db push        # applies all migrations in supabase/migrations/

# Set edge-function secrets (these never reach the client)
supabase secrets set \
  GEMINI_API_KEY=... \
  ANTHROPIC_API_KEY=...

# Deploy all edge functions
supabase functions deploy generate-kit
supabase functions deploy ask
supabase functions deploy embed
supabase functions deploy semantic-search
```

### 3. Optional integrations

| Service | Env vars | When to add |
| --- | --- | --- |
| RevenueCat (real IAP) | `EXPO_PUBLIC_REVENUECAT_API_KEY_IOS/_ANDROID` | Before App Store submission |
| PostHog (analytics) | `EXPO_PUBLIC_POSTHOG_KEY` | Day 1 — track funnel |
| Sentry (errors) | `EXPO_PUBLIC_SENTRY_DSN` | Day 1 — catch crashes |

All three gracefully no-op when their keys are missing.

### 4. Run the app

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
                              ├─ Storage (raw photo uploads, per-user folders)
                              ├─ Realtime (progressive kit reveal)
                              ├─ pgvector (semantic search)
                              └─ Edge Functions
                                  ├─ generate-kit → Gemini + Claude + embed
                                  ├─ ask          → Claude (tutor)
                                  ├─ embed        → Gemini text-embedding-004
                                  └─ semantic-search → match_embeddings RPC
```

- AI keys live only in edge functions
- Client uses anon key + user JWT; RLS enforces per-user isolation
- Local SQLite mirrors cards for offline review; reviews queue + sync delta back
- Image upload streams via `FileSystem.uploadAsync` (no base64 memory blowup)

## Feature surface

| Area | Status |
| --- | --- |
| Sign in (email + Apple + Google + email confirmation) | ✅ |
| Onboarding flow (3 screens) | ✅ |
| Camera capture, library import, **multi-page**, **paste text** | ✅ |
| Edit OCR text before regenerating | ✅ |
| Summary (bullets ↔ paragraph toggle) | ✅ |
| Flashcards (AI-generated, FSRS-scheduled, edit/star/suspend/reset/delete) | ✅ |
| Practice quiz (MCQ + short answer, scoring) | ✅ |
| Ask anything (conversational tutor) | ✅ |
| Tags (cards + captures) | ✅ |
| Full-text search + semantic search | ✅ |
| Decks (CRUD via Supabase) | ✅ |
| Today view, streak counter, freeze | ✅ |
| Daily review notification (scheduled, configurable) | ✅ |
| Paywall + Free/Pro/Student tiers (RevenueCat-ready) | ✅ |
| Free-tier capture limit enforced at the edge function | ✅ |
| Account: change password, delete account (RPC cascade) | ✅ |
| Analytics (PostHog) + crash reporting (Sentry) | ✅ |
| Offline-first SQLite mirror + bidirectional sync | ✅ |
| Idempotent review push (no duplicates on retry) | ✅ |

## Key code

- **`src/lib/fsrs/`** — FSRS v5 scheduler + Jest tests
- **`src/lib/capture.ts`** — image upload + edge-function invocation + realtime
- **`src/lib/image-prep.ts`** — client-side downscale before upload
- **`src/lib/db/client.ts`** — local SQLite store
- **`src/lib/db/sync.ts`** — full bidirectional sync (idempotent review push)
- **`src/lib/db/scoped-sync.ts`** — deck-scoped pull respecting dirty rows
- **`src/lib/billing.ts`** — billing abstraction (uses real RevenueCat when keys exist)
- **`src/lib/analytics.ts`** — PostHog + Sentry wrappers (no-op when keys missing)
- **`src/lib/tags.ts`**, **`src/lib/cards.ts`** — domain operations
- **`supabase/functions/`** — `generate-kit`, `ask`, `embed`, `semantic-search`
- **`supabase/functions/_shared/prompts.ts`** — prompt templates (the IP)
- **`supabase/migrations/`** — schema, storage policies, quota/streak SQL, tags, pgvector RPC, account deletion

## Tests

```bash
npm run test          # all tests
npm run test:fsrs     # just FSRS
```

FSRS produces the canonical expanding-interval curve at 0.9 target retention (verified: 3d → 11d → 36d → 105d → 277d → 669d → 1503d → 3167d) and correctly slashes stability on lapses.

## Project plan & next steps

- [`PROJECT_PLAN.md`](./PROJECT_PLAN.md) — 12-week roadmap, tech stack, pricing, GTM
- [`SUGGESTIONS.md`](./SUGGESTIONS.md) — prioritized list of post-MVP improvements

## What's still external-account-blocked

The code is in; these require accounts to activate:

- **RevenueCat dashboard** — create entitlements `pro` / `student` and products `snapstudy_pro_monthly` / `snapstudy_pro_annual` / `snapstudy_student_annual`
- **Apple App Store Connect / Google Play Console** — IAP product setup
- **PostHog / Sentry projects** — to collect events
- **iOS share extension** — needs a native Xcode target (Expo prebuild)

## License

Proprietary — all rights reserved.
