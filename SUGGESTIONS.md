# Suggestions to make SnapStudy better and more valuable

A pragmatic list, ordered by **value-to-effort ratio**. These are choices I'd make to take this from "MVP scaffold" to "students will pay $4.99/mo and tell their friends".

## 1. Differentiation moves (do these first)

### 1a. Handwriting is the moat — fine-tune for it

Every competitor handles printed text. Few handle messy student handwriting well. Capture failures from handwriting are the #1 churn cause for this category.

- Collect "this OCR was wrong" feedback inline (one-tap reject button on the raw-text editor)
- Store failed images + corrected text as a private training set
- Quarterly fine-tune of a cheap OCR model (PaliGemma or similar) on the corrections
- A 5% accuracy bump here is worth more than 10 new features

### 1b. "Why did I get this wrong" intelligence

When a card lapses 3+ times, don't just re-show it. Surface:
> "You've missed this card 4 times. The misses cluster around X. Want a worked example?"

This is one prompt, big perceived value, no other study app does it.

### 1c. Cross-deck knowledge graph

Embed every card; cluster across decks. When the user is in Bio 200 viewing "ATP synthesis," show:
> "This connects to 3 cards in your Chem 110 deck."

Compounds the value of every new capture. Other apps treat decks as silos.

### 1d. Voice tutor mode (V2 priority — bring forward)

Hands-free review while driving / walking / on the bus. Speak the prompt, listen for the answer, rate via voice ("again", "good"). This unlocks daily-use time that web apps can't touch.

## 2. Retention & habit (where the money lives)

### 2a. "Smart streaks" — not toxic, not pointless

- One free freeze per week, auto-applied
- Streak "deposit" — review 20+ cards in a day to bank a freeze for later
- Never use shame; always frame as protection. The plan already says this; the implementation matters.

### 2b. Smart push notifications

Don't send "you have 12 cards due" daily — that's spam. Instead:

- Send when due-count hits a sweet spot (10–20 cards: not too many, not too few)
- Send right before the user's empirical study time (track this in PostHog)
- Stop sending after 3 ignored notifications, ask in-app "want a different time?"

### 2c. Weekly recap email

> "This week you learned 47 new concepts, reviewed 312 times, and your retention on Chem 110 is up to 87%."

Free, low-cost, drives lapsed users back. Use Resend.

### 2d. Daily mix algorithm

Don't just surface due cards. Surface a *mix*: 70% due, 20% upcoming (recall ahead of curve), 10% random review of mastered cards. Variety beats grind for retention.

## 3. Conversion (free → paid)

### 3a. Limit captures, never review

Free tier: 10 captures/month is fine. But **never** gate review behind a paywall. Taking learning away is hostile — users leave. The plan gets this right; enforce it strictly.

### 3b. Show the locked features inline

When a free user sees the "Export to Anki" or "Audio capture" button, don't hide it. Show it with a soft lock icon and a one-tap upgrade. Discoverability is 30% of paid conversion.

### 3c. Pricing experiments via PostHog

Stand up flags for $3.99 / $4.99 / $5.99 monthly. Run them per cohort. The $5 sweet spot is the conventional wisdom — confirm it for your audience.

### 3d. Annual = "Save 42%" — calculated wrong

The plan says $4.99/mo or $34.99/yr (annual = 42% discount). That's the annual saving versus paying month-by-month for a year ($59.88 → $34.99 = 41.6%). Good. Just make sure the paywall shows both numbers — "$34.99/yr ($2.92/mo)".

## 4. Growth

### 4a. The "snap → demo video" tiktok trick

After a successful capture, offer: "Share a 10-second video of this capture turning into flashcards." Auto-generate it with the user's card content. Watermark with SnapStudy. This is the lowest-friction TikTok content engine you can build.

### 4b. Referral that doesn't suck

Friend signs up with your code → both get 1 month Pro free. Don't use Branch or other referral SaaS until you're past 10k MAU; just store referrer_id on the user row and grant the credit via a SQL trigger.

### 4c. Campus packs

Pre-load 50 popular courses ("CS 101 — Stanford", "Bio 200 — UCLA") with verified educator decks. New students at those campuses get instant value without a single capture. Sticky.

### 4d. India market — under-priced, under-served

- ₹199/month tier (≈$2.39) for India
- JEE/NEET/UPSC pre-loaded past-paper banks (huge demand, low competition)
- Hindi UI (translation is cheap; sentiment is loyal)

## 5. Engineering moves that pay back

### 5a. Per-user FSRS parameters

After ~100 reviews, run FSRS optimizer on the user's review history to learn their personal forgetting curve. Implement once, every user gets it free. Anki does this and it's measurably better than defaults.

### 5b. Streaming AI responses (SSE)

The "Ask anything" feature feels slow if the answer arrives as a 2-second blob. Stream tokens from Claude → edge function → SSE → client. ChatGPT-feel for low effort.

### 5c. Background sync on app foreground

Right now sync runs on Today refresh. Make it run automatically when the app comes to the foreground. Use `expo-background-fetch` for true background sync (paid users only — battery).

### 5d. On-device fallback (iOS 18+ Apple Foundation Models)

For ask-anything and simple summarization, route to the on-device model when available. Free for us, faster for the user, works offline. The plan calls this V3 — fold it into V2.

### 5e. Image preprocessing on-device

Currently we ship the photo to Gemini for OCR. Burning vision tokens on poorly-cropped/skewed photos is expensive. Do perspective correction + binarization with vision-camera-document-scanner *before* upload. Cuts OCR token cost ~30%, improves OCR accuracy.

### 5f. Eval set — measure what gets shipped

Build an internal eval set: 200 capture images + ground-truth flashcards. Run every model change against it. Hold a quality bar before promoting to all users.

### 5g. Idempotent edge functions

generate-kit currently re-generates cards on every invocation. Add a `content_hash` on captures; if a capture with the same hash already has a kit, return the cached one. Saves API spend on re-uploads.

## 6. Product features that delight

### 6a. "Test me on yesterday's notes"

One-tap quiz mode that grabs the last 24h of captures and quizzes the user. Friction-free recall practice.

### 6b. Card image embeds

Diagrams matter (Bio, Chem, Physics). Detect diagrams in the OCR pass and attach the cropped image to the flashcard. Show it on the back.

### 6c. Mock exam mode

For exam-prep users: timed, no help, results show weakest topics. Critical for SAT/JEE/MCAT segment — pay-to-pass users.

### 6d. Speak the answer

Tap-and-hold on the card to speak the answer aloud. Use device speech recognition. Tests recall production, not just recognition (much harder, much more valuable for retention).

### 6e. Group rooms

Real-time multiplayer quiz from a shared deck. 4 friends, 60 seconds, points for speed and accuracy. Insanely shareable, drives signups.

## 7. Risks worth pricing in

### 7a. App Store rejection — "homework helper" framing

The line between "study app" and "homework cheater" is narrow. Apple has rejected apps for this. Be defensively explicit in the App Store description, on the App Store screenshot copy, and in onboarding ("SnapStudy is a learning tool, not an answer service"). Avoid the word "solve" anywhere in the UI.

### 7b. Schools blocking

A few districts have blocked Photomath/Snapchat from school WiFi. SnapStudy could hit the same wall if it gets popular. Mitigations:
- "Study mode" that hides the camera/AI behind a passcode (parent-friendly)
- Partner with one or two schools early; get a recommend-list endorsement

### 7c. API price hikes

Anthropic raised Haiku prices once in 2025. Multi-provider abstraction is in the edge functions (good). Stay disciplined about not coupling to one provider.

### 7d. Bus-factor

Solo founder + study app is a known burnout pattern. Hire/contract a designer first; product polish and brand are the bottleneck, not features.

## 8. Metrics that matter (and the trap ones)

**Watch:**
- DAU/MAU (target: >25% — daily study habit)
- Cards reviewed per active user per day (target: 20+)
- D7 retention (target: 40%+)
- Free-to-paid conversion (target: 4%+)
- Net Revenue Retention after month 3 (paying users continuing)

**Ignore:**
- Total signups (vanity)
- Total cards generated (proxy for capture, not learning)
- App Store star average (manipulable)

## 9. What I'd ship in the next two weeks

1. Wire the agent-generated UI (this PR — done)
2. Fix the audit bugs (this PR — mostly done)
3. Real RevenueCat (replace the mock client)
4. Streaming responses on ask endpoint
5. The OCR feedback loop ("this was wrong" button)
6. Smart push notifications (sweet-spot triggering)
7. Tighten free tier enforcement (call increment_captures RPC before generate-kit)
8. Eval set of 50 capture images + automated AI quality check
9. iOS-only beta with TestFlight (use the rest of the time on India/Android polish)
10. One TikTok demo per day (founder posts; not delegated)

## 10. The honest one-liner

Most "AI flashcard" apps get the AI part right and the *spaced repetition* part wrong (Anki gets the inverse). You win by doing both — and by being the only mobile-native one that handles handwriting reliably. Everything else is sales.
