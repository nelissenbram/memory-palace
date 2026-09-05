# The Memory Palace — Business Plan v3 (Operator's Edition)

_Supersedes `The_Memory_Palace_Business_Plan_REVISED.docx`. This version converts the critical revision's analysis into **decisions already made**, folds in the review recommendations, and adds a **detailed socials/media plan**. Written 2026-08-24. Bootstrapped, one EU founder. Markdown; export to .docx on request._

> What changed vs the previous revision: its #1 blocker — _"you are flying blind; no `memory_added` event; PostHog dead on iOS; the villa is a vibe"_ — is now **largely solved** (server-side product milestones incl. `memory_created`, RevenueCat→PostHog revenue events, the resurfacing email engine in build). The debate phase is over; this is an execution edition.

---

## 1. Executive summary — the decisions (not options)

1. **Reprice to annual-default, unconditionally.** Two tiers: **Core ~€49/yr** and **AI ~€79/yr**. Monthly demoted to an expensive decoy (~€9.99) or removed. Settle the exact number with a **RevenueCat Experiment**, not debate. (Billing infra already exists — keeper/guardian × monthly/annual on App Store + Stripe.)
2. **The product is one loop, not five:** **Capture → Resurface → (Explore = reward) → yearly Artifact.** Everything else is parked.
3. **Demote the 3D villa** to acquisition-hero + reward. Prove it beats a 2D gallery within 60 days or freeze the engine.
4. **Freeze & hide the social sprawl** behind flags; keep ONE private share link. (The 42 public demo palaces in Explore are _storefront dressing / social proof_, not the retention thesis.)
5. **iOS = free capture/view client.** Route the high-ASP artifact (book) through Stripe on web — a printed book is a real-world good, exempt from Apple's cut and anti-steering.
6. **Digital artifact first** ("Year in your Palace" recap = video + PDF, zero fulfilment). Print-on-demand book only as a later one-time upsell.
7. **One ICP + one verb, sequential:** new-parent documenter first, reflective 50–70 memoirist second. Verb = **capture**.
8. **Instrument → resurface → reprice → reposition → acquire.** No paid UA until net LTV > €120 and organic net-CAC < €25.
9. **Structural feature freeze** (git commit-msg hook + deleted branches) — not willpower.
10. **Everything gated on evidence:** three pre-committed gates, read from RevenueCat + PostHog.

**Realistic 90-day outcome:** loop instrumented, resurfacing live for a paid cohort, pricing A/B running, **3–20 paying self-users**, one dominant channel identified. Stable trajectory = 6–9 months. Side-income is an accepted branch if organic CAC won't clear €25.

---

## 2. Strategy spine (condensed)

- **Thesis:** a low-frequency emotional archive. You will not win frequency; you can win **accumulation** (voice, faces, life-story transcripts, the Kep/WhatsApp capture channel — data no PKM tool owns).
- **The brutal question, answered:** self-users won't open a memory app weekly to justify €13–25/mo. The honest recurring value is **the app resurfacing your own past uninvited** ("a memory from this day, years ago — add one now") and **handing you a finished artifact once a year**. Resurface = retention; annual recap = renewal justification.
- **Value prop (wedge):** _"Capture your life a minute a week — it compounds into a palace you can walk through, and a book you keep."_
- **Moat:** accumulated multimodal life data + the Kep channel that bypasses Apple's push-opt-in ceiling. NOT the villa; NOT frequency.
- **Positioning line:** _"Storyworth ends with a book on a shelf. Your Palace keeps growing — and hands you a new book every year."_

---

## 3. Consolidated recommendations (the action list)

| # | Recommendation | Status / owner |
|---|---|---|
| R1 | Ship annual-default pricing; start RC pricing Experiment (€49 vs €79; annual vs monthly-decoy) | ready — RC live |
| R2 | Add `source` (`manual\|kep\|import`) to `memory_created`; ship `memory_resurfaced` / `resurface_opened` / `resurface_captured` | instrumentation gap |
| R3 | Turn on the redesigned lifecycle emails (weekly resurface + monthly chapter + one 30-day win-back) for a paid cohort | built gated; flip flag after review |
| R4 | Reposition landing to self-user, present-tense; retire the 4 legacy personas + bereavement testimonials | copy work |
| R5 | 2D "gallery" control vs 3D villa cohort test; pre-committed kill if villa doesn't beat control | 60-day test |
| R6 | Structural feature freeze: commit-msg hook `[instr]/[resurf]/[price]/[onbd]`; delete stale branches | discipline |
| R7 | Stand up the honest weekly scoreboard (PostHog + RC Charts) + the 3 gates | analytics |
| R8 | Cut marketing surface to **EN + NL**; localise winners only | scope |
| R9 | Launch the socials/media machine (§6) | this doc |
| R10 | Gifting = bounded seasonal SKU, zero-code demand test first | Q4 |

---

## 4. Pricing, packaging & artifact

- **Core €49/yr** (unlimited capture, resurfacing, villa, private share link, always-on export). **AI €79/yr** (AI life-interviews, Speech-to-Story, auto-tagging, photo restore — AI isolated in the top SKU because inference is the real marginal cost). **Monthly ~€9.99** as a punitive decoy only.
- **One-time SKUs:** _Forever/Legacy Vault_ €149–199 (churn-catcher / exit offer; 50GB cap + fair-use AI; target 5–15% take-rate); _Founding Patron_ identity tier €29–49 (crest/badge, no functional gating); _AI Life Story_ standalone €99–149.
- **Artifact:** "Year in your Palace" — **digital recap (video + PDF) first**; POD hardcover €39–99 as a later one-time upsell via Stripe on web.
- **Trial:** 14–30 days, gated behind account + first memory (never start the clock on an empty palace).
- **Free tier:** capture free forever as trust anchor + always-on export; hard-gate the _artifact_, not app access.
- **Grandfather** existing monthly subs; never force-migrate; never raise price on existing cohorts.

---

## 5. Validated-learning engine (wired to RevenueCat + PostHog)

**North Star:** `capture-14d` = % of _paying_ users who add ≥1 **incremental** memory in a rolling 14 days (paying WAU/MAU; never DAU/MAU).

**Live events:** `memory_created`, `interview_completed`, `wing_published`, `photo_restore_used` (server-side → covers iOS/Android), `paywall_viewed`, `checkout_started`; revenue via RC→PostHog. **To add (R2):** `source` on capture + the three resurface events + villa telemetry (`room_visited`, `walk_session_seconds`, `return_to_walk`).

**The three gates:**
| Gate | When | Metric | Pass | Fail action |
|---|---|---|---|---|
| 1 Activation | wk4 | ≥3 memories by D7 | ≥40% | cut a loop |
| 2 Resurface→Capture | wk8 | resurface_opened→capture + paying WAU/MAU | ≥6% & ≥40% | monthly → permanent decoy |
| 3 Retained revenue | wk12 | 90-day retained rev/cohort, annual vs monthly (RC) | annual>monthly | monthly decoy forever |

**Experiments:** pricing (RC), paywall trigger (PostHog flags), villa vs gallery, trial length, resurface channel (email/push/both). **Weekly scoreboard:** `activation% · resurface→capture% · paying WAU/MAU · trial→paid% · 90-day retained rev/cohort · net-CAC`. Never report signups/DAU as success.

---

## 6. Detailed socials & media plan

**Role split (honest):** I (the AI) own strategy, content calendar, copy, creative (from the asset engine), and analytics; a **semi-autonomous pipeline** drafts + queues; **you** create the accounts (CAPTCHAs/verification) and connect **one scheduler** or provide platform API tokens, and approve batches. Fully-autonomous public posting is neither permitted for me nor advisable for the brand. Target: **~90% hands-off with a light weekly approval.**

### 6.1 Objectives & guardrails
- **Primary objective (90 days):** find ONE repeatable format + ONE dominant channel that produces **web signups at net-CAC < €25**, measured to `capture-14d`, not vanity reach.
- **Every CTA routes to web signup (Stripe), never the App Store** (protects the iOS free-tier seal + avoids anti-steering).
- **Voice:** warm, literary, present-tense, self-user (never bereavement-coded). The palace metaphor as _living_ and _growing_, not a monument. No streak/guilt/countdown dark patterns.
- **Languages:** EN + NL only; localise a winner before adding DE/ES/FR.

### 6.2 The asset engine (near-zero production cost)
1. **42 AI public palaces + flythrough footage + 3D renders** → faceless short-form: "walk through a stranger's memory palace," "a life in nine rooms," era-styled elder palaces (vintage rooms), "which room would you build first?"
2. **In-app blog** → threads, carousels, newsletter issues, listicle bait.
3. **"Year in your Palace" recap** → the flagship viral loop (Spotify-Wrapped-shaped): renewal justification + share mechanic + gift hook in one. Build digital first.
4. **On-demand AI image/video** (Replicate, wired) → unlimited on-brand creative per theme.
5. **Build-in-public artifacts** → the solo-dev + 8-rejection-Apple saga, shipping logs, before/after.

### 6.3 Content pillars (3, rotate)
- **P1 — The Palace (product wonder):** faceless walk-throughs, room reveals, the recap. _Job: scroll-stopping acquisition + "I want that."_
- **P2 — The Practice (self-user utility):** reflection prompts, "capture one memory a week," how-to, on-this-day nostalgia. _Job: intent + newsletter/SEO seeding._
- **P3 — The Build (founder trust):** build-in-public, decisions, the Apple saga, metrics-in-public. _Job: reputation, Reddit/X credibility, PH launch fuel._

### 6.4 Platform strategy & priority
| Tier | Platform | Role | Automation | Cadence |
|---|---|---|---|---|
| **A (do first)** | **Reddit** | reputation + #1 AI-citation surface (~40%) | manual, real-name | 3×/wk participate, ~1 value post/wk |
| A | **X / Twitter** | build-in-public + product clips | API-postable | 1–2/day |
| A | **Bluesky / Threads** | overflow of X, open APIs | fully scriptable | mirror X |
| A | **Newsletter** (Kit/Buttondown) | owned compounding channel = the community | scriptable | 1/wk |
| **B (scheduler-fronted)** | **Instagram Reels** | faceless palace shorts + carousels | Buffer/Metricool queue | 4–5/wk |
| B | **TikTok** | same shorts, native edits | scheduler / manual | 4–5/wk |
| B | **YouTube Shorts** | same shorts, long-tail SEO | scheduler | 3–5/wk |
| **C (later)** | **Pinterest** | evergreen "memory keeping / journaling" boards | scheduler | when EN/NL winner exists |
| C | **LinkedIn** | founder + B2B2C (legacy partners) | API | 2–3/wk |

**Do first:** Reddit + X/Bluesky + newsletter + one IG/TikTok/Shorts short-form engine. Defer Pinterest/LinkedIn until a format wins.

### 6.5 Formats to test (find the ONE killer)
- "Ask your parent one question → watch the AI turn it into a story" (P2/P1 — the plan's hero hypothesis).
- Faceless "walk through this memory palace" (P1 — pure asset engine).
- "A life in 9 rooms" era-styled elder palace (P1, emotional).
- "I built a 3D house for my memories — here's why" (P3 founder).
- On-this-day nostalgia hook / "your camera roll is a graveyard; here's the fix" (P2).
- The Wrapped-style recap reveal (P1, seasonal viral).

### 6.6 Four-week starter calendar (EN+NL)
- **Week 1 — Warm up + P3:** founder intro + the Apple-saga thread (X/Bluesky/LinkedIn); 3 faceless palace Reels; 3 Reddit value comments; newsletter #1 ("why I'm building this"). Establish accounts, UTMs, PostHog dashboard.
- **Week 2 — P1 push:** 5 palace/room-reveal shorts across IG/TikTok/Shorts; 1 "life in 9 rooms"; X build-in-public daily; newsletter #2 (a prompt + a palace story). Identify top-performing format.
- **Week 3 — P2 + double down on the winner:** lean into the best format from wk2 (produce 5–7 variants); reflection-prompt carousels; first Reddit value _post_ (not just comments); newsletter #3.
- **Week 4 — measure + seed creators:** cut everything below-median; brief 10–15 nano-creators (€150–350 + affiliate) on the winning format (gated on wk1–3 signal); plan Product Hunt (~day 75). Newsletter #4 (recap teaser).

### 6.7 The semi-autonomous pipeline
`Generate (calendar + copy + creative from the asset engine) → Queue (scheduler or draft table) → You approve (batch, or standing-approval + kill-switch on Bluesky/X where trusted) → Post (API/scheduler) → Measure (UTM → PostHog → capture/revenue funnel)`. I refresh the batch weekly; you spend ~20 min/wk approving. Kill-switch always available.

### 6.8 Measurement (into the same PostHog portal)
- Every link UTM-tagged (`utm_source=reddit|x|ig|tiktok|yt|newsletter`, `utm_campaign=pillar/format`).
- Funnel per source: `landing_view → signup_completed → memory_created (source=manual) → paywall_viewed → checkout_started → trial_started → capture-14d`.
- **Judge content on signup→capture and net-CAC, not reach/likes.** Weekly: cost/effort per channel vs paying users produced. Cut anything not on a path to <€25 net-CAC by month 3.
- KPIs: per-platform follower growth is a _diagnostic_, not the goal; the goal metric is **web signups that reach `capture-14d`**.

### 6.9 Budget (bootstrapped)
- Tools: scheduler €0–25/mo (Buffer/Metricool free-to-cheap), newsletter €0 (Buttondown free tier). AI creative: Replicate ≈ cents/image.
- Paid: **€0 until net LTV > €120.** Nano-creator seeding €150–350×10–15 only after organic signal — treat as a test, shelve if the referred cohort doesn't beat organic by month 3.

### 6.10 Compliance & brand safety
- No App Store links in social CTAs; web signup only.
- Human-in-the-loop approval on anything public; no unattended posting of unreviewed content.
- Platform ToS: no aggressive automation/spam; API/scheduler only. Real-name founder on Reddit (no astroturfing).
- No health/grief claims; no fabricated testimonials; the 42 demo palaces are clearly the app's showcase, not real users' private data.

---

## 7. Acquisition beyond social (organic-first)
- **ASO (parallel, cheap):** iOS 100-char keywords; Play keywords in title/description.
- **Content/SEO (seed now, payoff 6–12 mo):** clusters A-HABIT + B-LEGACY-SELF; KPI = **AI citation**, not traffic; EN+NL; "Storyworth alternatives" listicles after repricing.
- **Product Hunt** ~day 75 (loop + repricing in first).
- **Referral = CAC offset, not engine** (K≈0.1–0.2): resurfacing → widget → contributor loop ("invite family to add to _your_ palace") → classic referral (product rewards, gated on activation) → OG/QR. Shelve non-performers by month 3.
- **Gifting:** bounded €59 seasonal SKU (+€25 print), zero-code Stripe-Payment-Link demand test, Nov 15–Dec 31 + Mother's/Father's Day only; never blended into the North Star.

---

## 8. Roadmap (gated, not calendar)

**Next 2 weeks:** R1 reprice + RC experiment · R2 resurface events · R3 digest on for paid cohort · R4 landing reposition · R6 freeze hook · R7 scoreboard · R9 socials machine (wk1 calendar).

**90 days (Appendix-A shape):** loop instrumented; resurfacing live; pricing A/B running; one killer content format + dominant channel identified; 3–20 paying self-users; villa test concluded; PH launch.

**12 months (each gated):** Q1 pass Gate 1 → Q2 pass Gate 2 (resurface→capture) → Q3 pass Gate 3 (annual retained-rev > monthly) + artifact shipped digital → Q4 gifting seasonal test + first-annual renewal cohort read. Advance only on a passed gate.

---

## 9. Risks & the freeze
- **Sprawl / founder freeze-failure** — the #1 risk; enforce structurally (commit-msg hook, deleted branches). "The most dangerous sentence in the next 90 days is 'but it would be easy to also add…'."
- **Villa on the losing side of consumer-3D** — answer with the gallery A/B; don't carry on faith.
- **iOS monetization drag** (30% + anti-steering) — mitigated by free-iOS + web-Stripe artifact + Kep push that Apple can't throttle.
- **Solo-founder burnout** (#1 quit reason) — the ">2 loops of feature work in a month" trigger is a hard stop.
- **Deliverability** — the lifecycle emails ship active-cohort-only, no blast, one-click unsubscribe, ≤1 lifecycle email/6 days (see `docs/DIGEST_REDESIGN_SPEC.md`).

---

### Pin above the desk
_"Reprice to annual now, ship resurfacing powered by cloud-import backfill, instrument (done), cut onboarding to one capture path, make the artifact digital — and let the socials machine run one format to one channel. Everything else is parked for 90 days."_
