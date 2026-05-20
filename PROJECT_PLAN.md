# SnapStudy — Project Plan

*AI study companion that turns photos of notes, textbooks, and slides into flashcards, summaries, and quizzes.*

**Working name:** SnapStudy (alternatives: Skribe, Recall, Klipper, NoteAI)
**Document date:** May 20, 2026
**Status:** Pre-build planning

-----

## 1. Executive summary

SnapStudy is a mobile-first AI study companion. A student snaps a photo of a textbook page, handwritten notes, or a slide — and within seconds gets a complete study kit: structured flashcards, a concise summary, a practice quiz, and an "ask follow-up" AI tutor. Cards are reviewed using **FSRS** (the modern spaced-repetition algorithm), so retention compounds over weeks instead of being forgotten by Friday.

The category is growing fast — generative AI apps are projected to jump from #10 to #4 in mobile downloads in 2026, with consumer spending exceeding $10 billion — but most competitors are either web-first (Quizlet, StudyFetch, Knowt), credit-trapped, or charge $20/month for what should cost $5. Photomath/Socratic dominate math but ignore the rest of school. The wedge is **mobile-first capture + handwriting support + honest pricing**.

**One-line pitch:** Snap. Learn. Remember. Your textbook in your pocket — actually studied.

-----

## 2. Vision & positioning

### What we're building

A pocket study tool that respects two truths students already know:

1. **Active recall and spaced repetition work.** A meta-analysis of 254 studies confirms spaced practice significantly outperforms massed study, and retrieval practice improves retention by up to 50% versus passive re-reading. Most AI study apps generate cards but don't actually schedule them properly.
1. **Students study on phones, in moments.** On the bus, in line, before bed. Web apps don't fit that. Mobile-first capture (camera, voice, share-sheet) is the moat.

### What we're not building

- **Not a cheat tool.** Photomath-style "snap and copy the answer" is a race to the bottom and a strict-school risk. We're explicitly a *learning* tool.
- **Not a math solver.** Wolfram, Photomath, and Symbolab own that.
- **Not another Quizlet clone.** No pre-made deck marketplace at launch.

### Differentiation vs. incumbents

| Competitor            | What they do well                       | Where we beat them                                                                                                                                                       |
| --------------------- | --------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Quizlet Magic Notes   | Largest deck library, brand recognition | Hostile cancellation flow and Learn-mode paywall pushed students away; one Reddit user described spending 45 minutes trying to cancel a $35.99 charge — we won't do that |
| StudyFetch / Turbo AI | Multi-format input, polished UI         | Both charge ~$19.99/month with no meaningful quality edge over $8 competitors — we price fairly                                                                          |
| Knowt                 | Free Quizlet alt with notes integration | Web-first; weaker mobile capture                                                                                                                                         |
| Anki                  | Best-in-class SRS, free on Android      | Steep learning curve, no AI generation, paid on iOS                                                                                                                      |
| StudyGlen             | AI + FSRS in 37 languages               | Web-first; no native mobile experience                                                                                                                                   |
| Knowunity             | 22M+ users, community decks, AI scanner | Very feature-broad, less focused; doesn't lean into handwriting                                                                                                          |

**Our positioning:** the only mobile-native study app that combines (a) reliable handwritten-note capture, (b) FSRS-grade spaced repetition, and (c) a free tier you can actually live on.

-----

## 3. Target users

### Primary persona — "Cramming Chloe"

- College/uni undergraduate, 18–24
- Studies in bursts before exams
- Has photos of slides, hastily written lecture notes, textbook chapters
- Pain: too much material, too little time, retention fades
- Currently uses: ChatGPT (manually), Quizlet, paper notes

### Secondary persona — "Exam-grind Aarav"

- High-school or competitive-exam aspirant (JEE/NEET/UPSC, SAT, A-levels)
- Studies year-round
- Heavy reuse of past-papers and printed notes
- Pain: needs a system to track what's mastered vs. still shaky
- Currently uses: physical flashcards, YouTube, coaching apps

### Tertiary persona — "Adult Learner Lina"

- Professional certs (PMP, AWS, medical boards, language)
- Time-poor, motivation high, pays for tools
- Pain: legacy tools (Anki) are powerful but ugly; modern tools are shallow
- Currently uses: Anki, RemNote, books

Primary persona drives MVP. Secondary unlocks the high-LTV exam-prep segment in V2. Tertiary is the monetization sweet spot (pays without complaint).

-----

## 4. Feature specification

### MVP (ship in 12 weeks)

**Capture**

- Camera capture with auto-crop, perspective correction, multi-page mode
- Photo library import (multi-select)
- Share-sheet target (receive images/PDFs from other apps)
- Paste text directly

**AI generation (per capture)**

1. **Smart summary** — bullet-point or paragraph view, length toggle
1. **Flashcards** — Q/A pairs, definitions, cloze deletions
1. **Practice quiz** — 5–15 multiple-choice + short-answer, with explanations
1. **Ask anything** — chat with the captured content as context

**Study**

- FSRS-scheduled review (open-source algorithm; no licensing)
- Three difficulty buttons (Again / Good / Easy) + Hard variant
- Daily review queue with a streak counter
- Mark card buried, suspended, or starred

**Organization**

- Decks and tags
- Search across all content (full-text + semantic)
- "Today" view: due cards + recently captured

**Account**

- Email/Apple/Google sign-in
- Cloud sync across devices
- Free tier limits: 10 captures/month, unlimited review

### V2 (months 4–6)

- **Handwriting accuracy boost** — fine-tuned OCR pass for cursive and scientific notation
- **Audio capture** — lecture recording → transcript → study kit
- **PDF & long-document support** — chapters, sectioned generation
- **Export** — Anki .apkg, CSV, Markdown
- **Exam mode** — timed mock test, score history, weak-topic surfacing
- **Image-rich cards** — preserve diagrams in flashcards
- **Study groups** — share decks read-only with a friend or class

### V3+ (months 7–12)

- **Predicted-question generator** — train on past-paper patterns (huge in India and East Asia)
- **Voice tutor mode** — conversational review in the car
- **On-device AI fallback** — works offline using Apple Foundation Models / Gemini Nano
- **Web companion** — review and capture-via-paste from desktop
- **Course-pack marketplace** — verified educator decks, revenue share

### Explicitly NOT building (at least year one)

- Math step-by-step solver — losing battle vs. Photomath
- Essay writer / homework completer — academic-integrity risk
- Social feed — outside our learning-focused thesis
- Browser extension — phone is where the user already is

-----

## 5. Tech stack

### Mobile app — **Expo (React Native)**

**Why Expo over Flutter:** for an AI app that primarily calls cloud APIs (OpenAI, Anthropic, Google), React Native has the advantage for cloud-based AI; JavaScript SDKs from OpenAI, Anthropic, and other providers work directly, and Expo modules simplify integration with cloud AI endpoints. Solo/small teams ship faster in JS/TS, and Expo's OTA updates let us push fixes without App Store review. If on-device ML becomes a priority in V3, we revisit Flutter (which excels at on-device ML via Dart's FFI bindings to TensorFlow Lite).

- **Framework:** Expo SDK 54+ (React Native with the New Architecture, Fabric/JSI)
- **Language:** TypeScript
- **Navigation:** Expo Router (file-based)
- **State:** Zustand (small) + TanStack Query (server state)
- **Forms:** react-hook-form + zod
- **Styling:** NativeWind (Tailwind for RN)
- **Camera:** expo-camera + a perspective-correction native module (vision-camera-document-scanner or custom)
- **Local DB:** WatermelonDB or SQLite via op-sqlite (offline-first review queue)
- **Animations:** Reanimated 3 + Moti

### Backend — **Supabase + edge functions**

- **Database:** Postgres (Supabase managed)
- **Auth:** Supabase Auth (email, Apple, Google)
- **Storage:** Supabase Storage for raw captures
- **Realtime:** Supabase Realtime for sync
- **Edge functions:** Deno-based functions for AI orchestration (keeps API keys off-device)
- **Why Supabase over Firebase:** Postgres + open-source escape hatch; row-level security policies map cleanly to per-user data isolation; pgvector built in for semantic search

### AI services

The plan uses tiered models for cost control. Output tokens are typically 5–10x more expensive than input tokens, so for high-volume workloads Gemini 2.5 Flash-Lite is often cheapest, while Claude flagship models justify their premium for complex reasoning.

| Task                                       | Model                                                              | Why                                                                                                                           |
| ------------------------------------------ | ------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------- |
| OCR + layout extraction from photos        | **Gemini 2.5 Flash / 3 Flash**                                     | Free tier (1,500 RPD), and Gemini Flash models retain free tiers even after April 2026 changes; strong multimodal performance |
| Flashcard + quiz generation (high quality) | **Claude Haiku 4.5**                                               | Haiku 4.5 at $1 input / $5 output per million tokens; better pedagogy than cheap-tier models                                  |
| Long-document summary                      | **Gemini 2.5 Flash with context caching**                          | Context Caching can reduce Gemini API costs by up to 90% for applications with large repeated prompts                         |
| Conversational "ask anything"              | **Claude Haiku 4.5**                                               | Quality of explanation matters more here than absolute cost                                                                   |
| Embeddings (semantic search)               | **Gemini text-embedding-004** or **OpenAI text-embedding-3-small** | Cheap, stored in Supabase pgvector                                                                                            |
| Fallback on-device (V3)                    | **Apple Foundation Models / Gemini Nano**                          | Privacy + zero marginal cost                                                                                                  |

**Cost optimization knobs:**

- Resize images before upload (vision token cost scales with megapixels)
- Use Batch API for non-urgent work (50% off on most providers)
- Cache identical-capture results (hash → response)
- Tier free users on Gemini Flash; paid users get Haiku for higher-quality cards

### Supporting services

- **Analytics:** PostHog (open-source, generous free tier, product analytics + session replay)
- **Crash reporting:** Sentry
- **Payments:** RevenueCat (handles App Store/Play Store IAP, subscriptions, paywalls)
- **Push notifications:** Expo Notifications
- **Email:** Resend (transactional) — only when needed
- **Feature flags:** PostHog or Statsig
- **CI/CD:** EAS Build + EAS Submit for store releases

### Dev tooling

- **Version control:** GitHub
- **Project mgmt:** Linear (free for small teams)
- **Design:** Figma
- **Docs:** Notion or markdown in repo

-----

## 6. AI architecture (the interesting part)

### Capture-to-kit pipeline

```
[Camera/Upload]
   → client compress + perspective correct
   → upload to Supabase Storage (signed URL)
   → invoke edge function: /api/generate-kit
       → Gemini 2.5 Flash: extract structured text + layout
       → Branch:
           ↳ Summary (Gemini Flash, ~2k output tokens)
           ↳ Flashcards (Claude Haiku, structured JSON output)
           ↳ Quiz (Claude Haiku, structured JSON output)
       → Persist to Postgres: captures, summary, cards, quiz_questions
       → Compute embeddings (background job, batched)
   → realtime push to client; UI reveals kit progressively
```

**Progressive reveal matters.** Don't make the user wait 20 seconds staring at a spinner. Show summary at second 3, cards at second 8, quiz at second 12. Apps with intensive AI features need to degrade gracefully under load, which is why progressive UI matters more than absolute latency.

### Spaced repetition — FSRS

Use the open-source **FSRS v4/v5** algorithm (free, MIT-licensed, scientifically validated, used by Anki itself for new schedules). Implementation:

- Each card stores: `stability`, `difficulty`, `due_at`, `last_reviewed_at`, `reps`, `lapses`
- After each review, update parameters from the FSRS formula
- Per-user parameter optimization after ~100 reviews

Implementation references: `open-spaced-repetition/fsrs.js` (TS port). Plug into local SQLite for offline review; sync deltas to Postgres.

### Cost control per user

**Free tier (10 captures/mo):** ~$0.04/month in API cost worst-case

- Image processing: 10 × $0.001 (Flash vision) = $0.01
- Summary + cards + quiz: 10 × ~$0.003 (mixed tiers) = $0.03
- Subsidized; covered by ads or upsell

**Paid tier ($4.99/mo target):** ~$0.30–0.80/month in API cost

- 80%+ gross margin even at heavy use
- Hard cap: ~200 captures/mo, throttle past that

-----

## 7. System architecture (high level)

```
┌─────────────────┐
│  Mobile App     │  Expo / RN, offline-first
│  (iOS + Android)│  SQLite mirror of user data
└────────┬────────┘
         │ HTTPS + Realtime websockets
         ▼
┌─────────────────────────────────────────────┐
│  Supabase                                   │
│  ├─ Postgres (users, decks, cards, captures)│
│  ├─ Auth                                    │
│  ├─ Storage (raw captures, signed URLs)     │
│  ├─ pgvector (semantic search)              │
│  └─ Edge Functions (AI orchestration)       │
└────────┬────────────────────────────────────┘
         │
         ├──► Google AI Studio (Gemini Flash)
         ├──► Anthropic API (Claude Haiku)
         ├──► OpenAI (embeddings, fallback)
         └──► RevenueCat (subscription state)
```

### Why this shape

- **Zero servers to manage.** Supabase + edge functions covers everything until ~100k MAU.
- **API keys never on the device.** Edge functions hold them. Important.
- **Offline-first.** Local SQLite means the review experience works on the subway. Sync resolves on reconnect.
- **Easy to add team members.** Standard Postgres + standard React Native.

-----

## 8. Data model (key tables)

```sql
users (id, email, plan, fsrs_params, streak_count, created_at)
decks (id, user_id, title, color, created_at)
captures (id, user_id, deck_id, image_url, raw_text, status, created_at)
summaries (id, capture_id, content, view_mode)
cards (id, deck_id, capture_id, front, back, type,
       stability, difficulty, due_at, reps, lapses, suspended)
reviews (id, card_id, rating, reviewed_at, elapsed_days)
quizzes (id, capture_id, questions_json)
quiz_attempts (id, quiz_id, user_id, score, answers_json, attempted_at)
embeddings (id, owner_table, owner_id, vector, content_hash) -- pgvector
subscriptions (user_id, status, tier, renews_at, revenuecat_id)
```

Row-level security policies on every table: `auth.uid() = user_id`. Belt-and-braces.

-----

## 9. UX & design principles

1. **Camera-first, one tap to capture.** The home screen has a big camera button; everything else is secondary.
1. **Progressive disclosure.** Show summary first (under 5s), then cards, then quiz. Don't block on the slowest piece.
1. **Default to learning, not answer-giving.** Quiz mode encourages effort before reveal; "answer" requires a tap-through with a gentle nudge.
1. **Streaks but not toxic.** Streak counter visible, but no shame screens; "freeze" days for sickness/travel.
1. **Honest free tier.** 10 captures/month with no credit-card upsell on opening. Paywall only appears when limit hit, with clear ladder.
1. **Dark mode by default.** Students study at night.
1. **One-handed reachability.** Bottom-anchored primary actions on phones with 6.7"+ screens.

-----

## 10. Monetization

### Pricing

- **Free:** 10 captures/month, unlimited review on existing cards, ads optional (off by default at launch — don't make first impression hostile)
- **Pro — $4.99/month or $34.99/year** (~42% annual discount)
  - Unlimited captures (fair-use 200/mo)
  - PDF/audio import
  - Export to Anki/CSV
  - Image-rich cards
  - Exam mode
- **Student plan — $24.99/year** with .edu verification (build goodwill, expansion via word-of-mouth)

### Why this pricing

Across the AI flashcard category, the quality gap between $8/month and $20/month tools is negligible — StudyFetch and Turbo AI produce comparable output at very different price points. We undercut at $4.99 because:

- Our API cost per user is genuinely low (~$0.50 typical)
- Volume + retention beats premium positioning for student demographics
- $5 is the "yes without thinking" price point

### Other revenue (later)

- Affiliate links to textbooks/coaching when relevant
- B2B school site licenses (V3+)
- Course-pack marketplace revenue share

-----

## 11. Roadmap & 12-week MVP plan

**Assumptions:** solo founder or 2-person team, full-time. Adjust 1.5x for part-time.

### Weeks 1–2 — Foundation

- Expo project scaffold, Supabase project, auth flow, basic navigation
- Figma wireframes for the 6 core screens
- Stand up edge function template + first Gemini call from device → kit

### Weeks 3–4 — Capture pipeline

- Camera + perspective correction
- Upload → Gemini vision → text extraction
- Persist capture; render extracted text view
- Multi-page mode

### Weeks 5–6 — Generation

- Flashcard generation (Claude Haiku, structured JSON, schema validation)
- Quiz generation
- Summary generation
- Progressive UI reveal

### Weeks 7–8 — Review & FSRS

- Local SQLite schema
- FSRS implementation + scheduler
- Review screen with the four-button rating
- Today queue + streak

### Weeks 9–10 — Polish & monetization

- RevenueCat integration, paywall screens
- Onboarding flow (3-screen, capture one thing in first session)
- Empty states, error states, loading skeletons
- Push notifications for due reviews

### Week 11 — Beta

- TestFlight + Play Console internal track
- Ship to 30–50 friendly users
- Daily bug triage
- Analytics review (PostHog funnels)

### Week 12 — Launch

- App Store + Play Store submission
- Product Hunt + r/GetStudying + r/Anki teaser (lightly — Anki community is a hard sell)
- Twitter/X launch thread
- TikTok demo video showing snap → kit in 10 seconds

-----

## 12. Cost estimates

### Build costs (first 3 months)

| Item                    | Cost                                   |
| ----------------------- | -------------------------------------- |
| Apple Developer Program | $99/yr                                 |
| Google Play Developer   | $25 one-time                           |
| Domain                  | $12                                    |
| Supabase                | $0 (free tier) → $25/mo at small scale |
| Gemini API              | $0 (free tier through Flash)           |
| Anthropic API           | ~$10–50/mo during build for testing    |
| RevenueCat              | $0 (free up to $2.5k MTR)              |
| PostHog                 | $0 (1M events/mo free)                 |
| Sentry                  | $0 (5k errors/mo free)                 |
| Figma                   | $0 (free tier)                         |
| **Total MVP burn**      | **~$200–400** if solo                  |

### Running cost projection at 10k MAU

- Supabase Pro: $25/mo (likely fine until 100k)
- API costs: 10k users × ~5% paid × $0.50 = $250/mo for paid; free tier capped at ~$50/mo total → **~$300/mo**
- Push, email, analytics: still free tier
- **~$325/mo to support 10k users**

At 5% conversion and $4.99 ARPU → ~$2.5k/mo revenue → 8x margin. Healthy.

-----

## 13. Key risks & mitigations

| Risk                                     | Likelihood     | Mitigation                                                             |
| ---------------------------------------- | -------------- | ---------------------------------------------------------------------- |
| OCR fails on bad handwriting             | High           | Show extracted text to user, allow edit before generation; V2 fine-tune |
| Generated cards are wrong                | Medium         | Mark AI-generated, allow edit, "report card" button feeds eval set     |
| API price hikes from Google/Anthropic    | Medium         | Multi-provider abstraction layer; switch at the edge function level    |
| Academic-integrity backlash from schools | Medium         | Lean explicitly into *learning* framing; no "do my homework" UI        |
| Quizlet ships Magic Notes mobile parity  | High           | Already happening; we win on price + handwriting + FSRS                |
| Apple/Google bans AI homework apps       | Low–Medium     | Position as study/review tool; avoid "answer my homework" copy         |
| Single-founder burnout                   | High (if solo) | Strict 12-week MVP scope; defer everything in V2+                      |

-----

## 14. Success metrics

### North-star metric

**Weekly active reviewers** — people actually doing FSRS reviews, not just signing up. This is the leading indicator of retention and LTV.

### Stage gates

- **Week 12 (launch):** 100 sign-ups in first 7 days
- **Month 3:** 1,000 MAU, 30% W2 retention, 2% free-to-paid
- **Month 6:** 10,000 MAU, 40% W2 retention, 4% paid conversion
- **Month 12:** 50,000 MAU, $25k MRR, NPS > 40

### Supporting KPIs

- Time-to-first-kit (target: <90s from app open)
- Average cards reviewed per active user per day (target: 20+)
- Capture success rate (no error, user kept output) (target: >85%)
- Paywall view → purchase rate (target: >5%)
- Churn (paid) (target: <8%/mo)

-----

## 15. Go-to-market

### Launch channels

1. **TikTok/Reels** — short demo videos: "snap → study kit in 10 seconds." This is where students live.
1. **Reddit:** r/GetStudying, r/college, r/JEE, r/PreMed, r/Sat — be a contributor first, mention product when relevant
1. **Product Hunt** — coordinated launch with the right hunters
1. **Campus ambassadors** — pay $50/month + free Pro to one student per target campus in exchange for posts + organic distribution
1. **App Store Optimization** — keywords: "ai flashcards," "study notes," "homework scanner"

### Initial geography

- Launch English-only, target US/UK/India/Australia
- India is the dark-horse market: huge competitive-exam audience, willing to pay $5/mo, less Quizlet-saturated

### Avoid

- Paid Google/Meta ads in month 1 — CAC will dwarf LTV until retention is proven
- Influencer deals before product is solid — reviews are forever

-----

## 16. Open questions / decisions needed

Before kickoff, you'll want to answer:

1. **Solo or co-founder?** Changes timeline by 1.5–2x.
1. **iOS-only first or both stores together?** iOS-only saves 1–2 weeks of platform-specific QA but cuts addressable market in half (especially in India).
1. **What's your existing skill stack?** If you're a JS dev, Expo is the obvious call. If you're a Dart/Flutter person, the Flutter case is reasonable despite my recommendation.
1. **Name confirmation.** "Study Buddy" is heavily taken on App Store. Pick a clean, defensible name early — check trademark + App Store search before falling in love.
1. **Investor vs. bootstrap path?** Bootstrap is fully viable here ($300 to MVP, $325/mo to run 10k users). Investor money would only accelerate marketing.

-----

## 17. Next steps

If you want to move forward, the smallest useful next-step is:

**Week 0 — Validation (one week)**

- Interview 10 students from your target persona (15 min each)
- Show 3–4 wireframes of the capture → kit flow
- Ask: would you use this? What's missing? What would you pay?
- If 7/10 say yes and 4/10 would pay $5 → green-light week 1

**Week 1 — Technical spike**

- Build a throwaway script that takes a photo file → Gemini Flash → flashcards JSON. End-to-end in a day.
- This proves the quality is good enough before you build anything around it.

If you'd like, I can:

- Sketch the **10 capture-to-kit prompts** (the prompts are most of the IP)
- Draft **Figma wireframes** as a Mermaid/HTML mockup
- Write a **detailed FSRS implementation guide** for your codebase
- Pull **competitor App Store reviews** to mine pain points more deeply

Pick one and we'll go deep.

-----

## Sources

Research for this plan drew on:

- 2026 mobile AI trend reports (Visualcapitalist/Sensor Tower, Moonstack, Bryj)
- Competitor analysis: Photomath, Socratic, Quizlet Magic Notes, StudyFetch, Turbo AI, Knowt, StudyGlen, Knowunity, Anki, RemNote
- API pricing comparisons (March–May 2026) for Gemini, OpenAI, Claude, Grok
- Flutter vs React Native 2026 framework analyses (Moveo, TechAhead, Bolder Apps, Luciq, CatDoes)
- Reddit/community signals on Quizlet user frustrations and SRS science (Cepeda et al. 2006; Karpicke & Roediger 2008)
