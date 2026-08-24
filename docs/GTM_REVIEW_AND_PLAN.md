# The Memory Palace — Business-Plan Review + Practical GTM, Validated-Learning & Content-Machine Plan

_Review of `The_Memory_Palace_Business_Plan_REVISED.docx` (the critical, self-user-primary revision) with what is true **today**, and a concrete plan that wires it to the RevenueCat + PostHog diagnostics now live. Written 2026-08-24._

---

## 0. One-paragraph verdict

The revised plan's diagnosis is **correct and I endorse its spine**: this is a low-frequency emotional archive priced like weekly-access SaaS; the fix is **annual-first pricing + a push-driven capture→resurface loop + a yearly artifact**, with the **3D villa demoted to acquisition-and-reward**, the **social sprawl frozen**, **iOS kept free**, **one ICP + one verb**, and everything **gated on evidence**. The single biggest thing that has changed since the plan was written: its #1 blocker — _"you are flying blind; there is no `memory_added` event; PostHog is dead on iOS; every belief about the villa is a vibe"_ — **is now largely solved.** This session shipped server-side product milestones (including `memory_created` — the exact North-Star capture event the plan said didn't exist), plus RevenueCat→PostHog revenue events. **The validated-learning engine the plan demanded is now buildable immediately, not in a future phase.** That reorders the roadmap: _instrument_ is mostly done; we can start measuring **capture-14d** this week.

---

## 1. Review — where the plan is right, wrong, and now out of date

### 1a. What it gets right (keep, don't relitigate)
- **Annual-first, kill monthly-as-headline.** Correct. Day One went annual-only; Storyworth/Remento/Calm/Headspace are annual-first. Charging €13–25/mo for a lower-frequency loop than journaling is the core error. **Ship annual-default unconditionally** — the RevenueCat setup we just built (keeper/guardian × monthly+annual, both stores) makes this a positioning/paywall change, not billing work.
- **Capture → Resurface → (Explore = reward), not Explore-as-hook.** Correct and load-bearing. The villa is the best _ad_ and the worst _habit_.
- **Kill the social layer to a single private share link.** Correct — it's "a second startup bolted on." (Note: we just seeded 42 public demo palaces for Explore _acquisition/marketing_ credibility — that's fine; it's storefront dressing, not the retention thesis. Don't confuse the two.)
- **One ICP + one verb, sequential.** Correct. New-parent documenter first (proven recurring self-pay + intrinsic forcing function), reflective 50–70 memoirist second.
- **Instrument before spending a euro on acquisition.** Correct — and now unblocked (see §2).
- **Digital artifact first, print later.** Correct — the Critic's strongest catch. Print fulfilment is a logistics business, not a Stripe config.
- **iOS = free capture/view client; route ASP (books) through Stripe on web.** Correct and compliance-aware.

### 1b. Where I'd push back / sharpen
- **Internal price inconsistency (€49 vs €59 vs €79 vs €99).** The doc never lands one number. Decide by _test_, not debate — and we can, cleanly, via **RevenueCat Experiments** (A/B the paywall price with revenue significance). Anchor the core near Day One (~€49) and isolate AI in the top tier (~€79). Don't ship four numbers; ship two and let the experiment pick.
- **The villa is under-cut, not just demoted.** The Critic is right that the plan is "too timid." The honest question — _what is a bespoke 16.5k-line Three.js engine earning one solo founder vs. its maintenance + battery cost?_ — should be **answered with data within 60 days** (see the villa test in §2). Pre-commit: if `room_visited → return_to_walk` doesn't beat a 2D "gallery" control, ship the gallery view and freeze the engine. Don't carry it on faith.
- **"5 products in a trench-coat" is still the root risk.** The plan says freeze; the Critic correctly notes the founder has a ~100% historical failure rate on self-imposed freezes (40 session logs of relentless shipping — and, candidly, this very session added RevenueCat, 42 palaces, a digest redesign, and this doc in parallel). The freeze must be **structural** (git commit-msg hook rejecting anything not tagged `[instr]/[resurf]/[price]/[onbd]`; delete stale feature branches), not motivational.
- **Content/SEO is mislabeled as a 90-day lever.** It's a 6–12 month payoff. In the first 90 days it's a _seeding_ activity, not a growth channel. The realistic 90-day acquisition is **build-in-public short-form + Reddit reputation + ASO**, not organic search traffic.
- **5-locale burden.** Agree with the Critic: run **EN + NL only** for tests; localise winners. (Caveat for the digest: the email templates are already 5-locale — fine to keep, it's cheap there; the _marketing_ surface is where to cut to 2.)

### 1c. What is newly TRUE since the plan was written (this changes the roadmap)
1. **Telemetry is no longer zero.** Shipped this session, server-side (covers iOS/Android where the client tracker is off): `memory_created` (= the plan's missing North-Star capture event), `interview_completed`, `wing_published`, `photo_restore_used`; plus web funnel `paywall_viewed`, `checkout_started`. → **We can compute capture-14d and the activation gate now.**
2. **Revenue truth is wired.** RevenueCat is configured (keeper/guardian entitlements, App Store + Stripe products, PostHog integration) → MRR/trial-conversion/churn/LTV in RC Charts, and revenue events flow into the same PostHog project. → **The "90-day retained revenue per cohort" the plan insists on is measurable.**
3. **The resurfacing engine is being built right now.** The weekly/monthly digest redesign (in `docs/DIGEST_REDESIGN_SPEC.md`, implementation in progress, gated) IS the plan's "resurface every week + hand back a chapter" retention loop, with a win-back that respects the "one calm knock" rule. → **The retention spine the plan calls for is in flight, not hypothetical.**
4. **Content backlog exists.** 42 fictional public palaces (with AI imagery), the flythrough video, and the in-app blog are ready-to-repurpose creative → the content machine can start with near-zero production cost.

**Net:** the plan's Phase-0 ("instrument, then resurface") is ~60% done. The bottleneck moves from _"we can't measure"_ to _"wire the remaining resurface events + turn the loop on for a paid cohort and read the one number."_

---

## 2. The validated-learning engine, wired to RevenueCat + PostHog

The plan's whole method is _pre-committed thresholds → read cohort data → cut or continue._ Here is the concrete instrumentation, using what's live.

### 2a. North Star + the events that compute it
- **North Star: `capture-14d`** = % of _paying_ users who add ≥1 **incremental** (non-bulk-import) memory in a rolling 14 days → read as **paying WAU/MAU**, never DAU/MAU.
- Already emitting: `memory_created` (add a `source` prop: `manual | kep | import` so bulk-import is excludable — this is the one required tweak).
- **Gap to close (highest priority instrumentation):**
  - `memory_resurfaced` (impression: the "on this day" surfaced) and `resurface_opened` / `resurface_captured` — the resurfacing loop is the thesis; it must be measured end-to-end. The digest already emits sends; add the in-app resurface events.
  - Villa telemetry: `room_visited`, `walk_session_seconds`, `return_to_walk` — server-mirrored or via a compliant in-app hook — so the villa's value stops being a vibe (§1b villa test).
  - `trial_started` / `trial_converted` — these arrive via the **RC→PostHog** integration (already configured); no app work needed.

### 2b. The three governance gates (from the plan) → concrete dashboards
| Gate | When | Metric (source) | Pass bar | Fail action |
|---|---|---|---|---|
| **1 — Activation** | ~Wk 4 | ≥3 memories by day 7 (PostHog funnel on `signup_completed`→`memory_created`) | ≥40% | cut a loop, don't polish onboarding |
| **2 — Resurface→Capture** | ~Wk 8 | `resurface_opened`→`memory_created` within 48h + paying WAU/MAU (PostHog) | ≥6% and ≥40% | move monthly to permanent decoy; annual+artifact only |
| **3 — Retained revenue** | Wk 12 | 90-day retained revenue/cohort, annual vs monthly (**RC Charts** cohorts) | annual > monthly | make monthly a decoy permanently |

### 2c. The experiments (causal, not vibes)
- **Pricing:** RevenueCat **Experiments** — annual-default vs monthly-default, and €49 vs €79 core. Read revenue-per-experiment with significance. (This is the clean way to settle §1b's price debate.)
- **Paywall trigger/placement:** PostHog feature flags + `paywall_viewed`→`checkout_started`→`trial_started` funnel. Hard paywall @D-N vs contextual.
- **Villa value:** cohort A (villa reveal in onboarding) vs cohort B (2D gallery) → compare `capture-14d` + D30 retention. Pre-committed kill.
- **Trial length:** 7 vs 14 vs 30 days → trial→paid _and_ 60-day retained revenue (guard against the correlation-not-causation trap the plan flags).
- **Resurface channel:** email (the digest) vs push vs both → `resurface_opened` + reopen rate.

### 2d. The one honest scoreboard (weekly)
`activation% · resurface_opened→capture% · paying WAU/MAU · trial→paid% · 90-day retained revenue/cohort · blended net-CAC`. RC feeds the money columns; PostHog feeds behaviour. Never report signups/DAU as success.

---

## 3. Practical sales & marketing plan (organic-first, bootstrapped, EN+NL)

**Sequencing law (non-negotiable, from the plan):** _instrument → resurface → reprice → reposition → acquire._ **No paid UA until net LTV proven > €120 and organic net-CAC < €25.**

### 3a. Positioning (ship now)
- **Verb:** _capture_ (not _explore_). Tense: _growing_, not _monument_.
- **Wedge line:** _"Capture your life a minute a week — it compounds into a palace you can walk through, and a book you keep."_
- **Reposition the landing:** kill the 4 legacy/bereavement personas + testimonials that sell the buyer the plan rejects. Lead self-user, present-tense.
- **ICP #1:** new-parent documenter (annual €69 + first-year hardcover _later_). **ICP #2:** reflective 50–70 memoirist (annual €89–99 + "Life Chapters").

### 3b. Channels, first 90 days (seed vs grow)
- **Build-in-public short-form (primary 90-day bet):** one warmed founder account, ~1 post/day, 90-day box, 3 pillars. Hero format to find: _"ask your parent one question → watch the AI turn it into a story."_ CTAs → **web signup (Stripe)**, never App Store. The solo-dev + 8-rejection-Apple saga is premium narrative fuel.
- **Reddit reputation (primary):** real-name founder participation in r/journaling, r/Memoir, r/bulletjournal, memoir FB groups. Reddit is the #1 AI-citation surface (~40%). 3–6 month reputation play; no drive-by promo.
- **ASO (parallel, cheap):** iOS 100-char keyword field; Play keywords in title/description. 58–65% of store discovery is search.
- **Content/SEO (seed only, payoff later):** 2 clusters — A-HABIT (reflection/journaling prompts) + B-LEGACY-SELF ("what happens to my photos when I die"). KPI = **AI citation**, not traffic. EN+NL. Get onto "Storyworth alternatives" listicles _after_ repricing.
- **Owned newsletter (compounding):** weekly, Kit/Buttondown. This is the community, not a Circle/Skool you build (defer that past €900/mo + 300 asking subs).
- **Product Hunt** ~day 75 once the loop + repricing are in.
- **Gifting:** bounded seasonal SKU (€59 + €25 print), zero-code demand test (Stripe Payment Link), Nov 15–Dec 31 + Mother's/Father's Day only. Never blended into the North Star.

### 3c. Referral (a CAC offset, not the engine)
Expected K ≈ 0.1–0.2. Priority: resurfacing loop → home-screen widget → **contributor loop** ("invite family to add to _your_ palace") → classic referral (product rewards, gated on activation) → public/OG/QR. Shelve any that doesn't beat paid by month 3.

### 3d. 90-day outcome to expect (honest)
Core loop instrumented, resurfacing live, pricing A/B running (not concluded), **3–20 paying self-users**, one identified dominant channel. Stable revenue trajectory = 6–9 months. Accept the side-income verdict as a real branch if organic net-CAC won't clear €25.

---

## 4. Content machine + multi-social strategy (integrated)

The plan under-develops distribution mechanics; here is the machine, wired to the assets we have and the analytics we built. (See also the separate socials-capability answer: I can own strategy/copy/creative/analytics + a semi-autonomous pipeline; you create accounts + connect one scheduler or provide API tokens.)

### 4a. Asset engine (near-zero production cost)
- **42 AI palaces + flythrough footage + 3D renders** → faceless short-form (reels/TikTok/Shorts): "walk through a stranger's memory palace," "a life in 9 rooms," era-styled elder palaces. Strong scroll-stoppers with no person on camera.
- **In-app blog** → repurpose into threads, carousels, newsletter issues, listicle bait.
- **"Year in your Palace" recap** (the annual artifact) → Spotify-Wrapped-shaped viral loop: it is simultaneously the renewal justification, the share mechanic, and the gift hook. Build the _digital_ recap first.
- **AI image/video on demand** (Replicate, already wired) → unlimited on-brand creative per theme.

### 4b. The lifecycle-email engine IS content
The digest redesign (in progress) is owned, first-party distribution: weekly resurface (active cohort), monthly chapter recap, one 30-day win-back. It doubles as the retention loop AND the newsletter spine. Instrument opens/clicks → PostHog.

### 4c. Cadence & platform priority
- **Highest automation (do first):** Bluesky / Threads / X (open/decent APIs) — a cron can generate + post on-brand.
- **Scheduler-fronted:** Instagram/TikTok/YouTube via Buffer/Metricool/Publer (their APIs are gated) with a one-tap approval queue.
- **Weekly rhythm:** 1 build-in-public post/day (founder), 3–5 asset-engine shorts/week, 1 newsletter/week, Reddit participation 3×/week. All UTM'd → PostHog so content → signup → capture → revenue is one funnel.

### 4d. Semi-autonomous pipeline (the realistic "content machine")
I generate the batch (calendar + copy + creative from the asset engine) → queue → you approve (or standing-approval + kill-switch on Bluesky/X where you trust it) → post via API/scheduler → analytics back into PostHog. ~90% hands-off with a light weekly approval. Fully-autonomous public posting is neither allowed for me nor advisable for the brand.

---

## 5. The next two weeks (concrete, in priority order)

1. **Reprice to annual-default** on web + iOS IAP paywall (RC already set up). Start the RC pricing **Experiment**. _[reposition/reprice — the plan's #1 unconditional move]_
2. **Add `source` to `memory_created`** + ship `memory_resurfaced`/`resurface_opened`/`resurface_captured` events. _[close the instrumentation gap]_
3. **Turn on the redesigned digest for a small paid cohort** (flip `LIFECYCLE_EMAILS_ENABLED` after review) → begin measuring resurface→capture. _[resurface]_
4. **Reposition the landing** to self-user/present-tense; retire the legacy personas/testimonials. _[reposition]_
5. **Structural feature freeze:** commit-msg hook + delete stale branches. _[the discipline the Critic says is load-bearing]_
6. **Stand up the honest weekly scoreboard** (PostHog dashboard + RC Charts) and the 3 gates. _[validated learning]_
7. **Start the content machine:** approve the first 2-week calendar + first 15 asset-engine posts; connect one scheduler or Bluesky/X tokens.

Everything past this is parked for 90 days.

---

### Appendix — lines from the plan worth pinning
- _"You will not win frequency. You can win accumulation."_
- _"The 3D villa is your best ad and your worst habit."_
- _"Price it once a year, resurface it every week, hand back a book every year — or admit it's a gift and reprice."_
- _"The most dangerous sentence in the next 90 days is 'but it would be easy to also add…'."_
