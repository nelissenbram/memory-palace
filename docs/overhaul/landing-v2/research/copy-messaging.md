# Landing v2 — Copy & Messaging Decisions

Owner: copy-messaging lead · 2026-07-16 · Status: DECIDED (not options). All copy ships in 5 locales; every string below is the EN master.

## 1. Headline system

- **H1 (ship):** `Turn a lifetime of photos into a place your family can visit.` — outcome-first (lab O1, Clarity 9/Cleverness 5). No hard `<br/>`; use `text-wrap: balance`.
- **Sub (web):** `A beautiful 3D palace for your photos, voice recordings, and life stories — explore it together with your family. Free to start, no credit card needed.`
- **Sub (iOS):** same, ending `…together with your family. Ready in minutes — no tech skills needed.`
- **Eyebrow:** `A 3D HOME FOR YOUR FAMILY'S MEMORIES` (replaces "MORE THAN MEMORIES"; fix short-string fallback).
- **Validation:** 4-arm PostHog test — O1 (default) vs E2 `The cloud stores your photos. It doesn't tell your story.` vs I1 `Become the keeper of your family's story.` vs fixed control. Metric: signup start. O1 ships regardless until data says otherwise.
- **Category noun (repeat everywhere):** "a memory home / the family memory palace." Features kicker: `Your memories, given a home.` Repeatable couplet: `Feeds scroll past. Folders bury. A palace keeps.`

## 2. USP hierarchy — the three promises that lead

1. **Walkable** — `The only place your family history is somewhere you can walk.` (3D palace + tree + voices under one roof.)
2. **Effortless** — `If you can send a WhatsApp message, you can build a palace.` (Kep capture, voice-first interviews, AI sorting.)
3. **Passed on** — `A palace has heirs.` (Time capsules, legacy contacts, export-anytime Forever Promise.)

Everything else is tier-2 (compact strip). **Cut "Explore & Connect" from the landing.**

## 3. Trust chips & claims (truth sweep, all locales)

**Delete:** "End-to-End Encrypted", "256-bit Bank-Grade", "SSL Encrypted", "Free Forever Plan", "no catch", "Join thousands", all four testimonials (+ /pricing quotes) until real & consented, "30-day money-back" (until ToS clause exists).

**Hero chip trio** (each links to /security): `GDPR Compliant` · `Encrypted at Rest & in Transit` · `Stored in the EU`* — *ship only after Supabase Frankfurt is verified; fallback chip: `Export Anytime`.

**Stats bar:** `€0 — Free plan, no time limit, no card` (iOS: `Unlimited — Wings & Rooms`) · `5 — Languages` · `AES-256 — Encrypted at rest` · `100% — Yours, export anytime`.

**FAQ a2:** `Yes. Your memories are encrypted in transit (TLS) and at rest (AES-256), stored on EU servers — and you can export everything at any time.`

**Mid-CTA honesty (web):** `Your palace starts free — 1 GB of memories, unlimited rooms, no credit card. Upgrade only if you outgrow it.` iOS: `Your palace is ready in minutes. No tech skills needed.`

## 4. Feature naming for a 60+ first reading

**Banned in first reading layer:** Kep (unexplained), GEDCOM, pedigree, streaks/badges/"Duolingo", "transcribes/tags/opt-in", unexplained "wings", encryption acronyms, "cinematic", coined persona titles, "Store" as a verb.

- **Send it on WhatsApp** (was WhatsApp Capture): `Send a photo or voice message on WhatsApp — it appears in your palace, sorted and ready. No new app for mom; she already knows WhatsApp.` (Second mention: "our WhatsApp assistant, Kep." Ship only after Meta go-live verified.)
- **The questions your grandchildren would ask** (AI Interviews): `A gentle interviewer asks, then follows up on what you actually said. Speak your stories aloud — they're captured, titled, and kept in the right part of your palace.` Footnote on every AI card: `AI is optional and never trains on your memories.`
- **A home you can walk through** (3D Palace): `Your photos, voices and stories live in rooms — walk past them, together.`
- **Family Tree:** `Map your lineage with fan charts — and bring the tree you already built on Ancestry or MyHeritage, no retyping.` (No palace-integration or pedigree claims.)
- **Your life story, one gentle question at a time** (Journeys): `Start with your childhood street; end with the wisdom you want to pass on.`
- **Time Capsules:** `Seal a letter or a memory to open on a date you choose — a wedding day, a birthday in 2040.`
- **Choose who gets the keys** (Legacy): `Write the letters you keep meaning to write, and decide exactly when they arrive.` (No video claim.)
- **You bring the photos. AI does the sorting.** (Cloud Import): `Connect Google Photos, Dropbox or OneDrive — what would take you months happens while you have coffee. Your originals stay untouched.`
- **Sharing:** `Share one room or a whole chapter of your palace — like Childhood, or Travels.`

## 5. CTA system

- **One primary label, one message key (`landing.cta.primary`), every render site:** `Create Your Palace` — hero, mid, final, sticky. Price-free by construction → retire `iosCta()` dash-stripping; add CI grep failing on `/free|gratis|kostenlos|gratuit|credit card/i` in iOS-path keys.
- **Microcopy under button** — web: `Free forever · No credit card · No tech skills needed`; iOS: `Ready in minutes · No tech skills needed`.
- **Nav + footer:** `Get Started`. **Secondary (hero only):** `Watch the 90-Second Tour` → opens walkthrough lightbox (no scroll jump).
- **Kill the exit-intent modal.** Rename step 1 to `Add Your Memories` (never "Store").
- Locales: NL `Maak je Paleis` / DE `Erstellen Sie Ihren Palast` (Sie register, decided) / ES `Crea tu palacio` / FR `Créez votre palais`.

## 6. Emotional throughline — voice charter: The Loving Archivist

One personality. Rules: second person; concrete family nouns (kitchen table, wedding day, your mother's voice); unhurried verbs (keep, place, seal, walk, hand down); no all-caps shouting, no deadlines or mortality pressure on Keeper surfaces (urgency lives only on /gift + ads), no competitor names on-page, no invented numbers. Test: cover the logo — if it could be Dropbox or a bank, rewrite.

Arc: **promise → show → reassure → invite.** Section lines (exact copy):

- Not-an-album moment: eyebrow `This is not a photo album.` / H2 `This is a palace.` / `Step inside. This is what a memory looks like when it has a home.`
- Why-a-palace band: `Why a palace? Because your brain thinks in places.` Body: `For 2,500 years, people remembered what mattered by placing it in imagined rooms. We recall places far better than files.` (Never "improves memory".)
- Voice moment: `Photos show what happened. Your voice tells why it mattered.`
- Comparison header: `Keep Google Photos. It's the drive. This is the home.` Sub: `A folder stores your photos. A palace remembers your life.`
- Adult-child card (one, not hero): `One day you'll want to hear her voice again. Make sure you can.`
- Forever Promise (near final CTA, linked to ToS): `Export everything as a ZIP anytime, on every plan — and if we ever shut down, you get 90 days and your complete archive.`
- Final CTA: H2 `Begin with one memory. The rest will follow.` Button: `Create Your Palace`.
- How-it-works steps: `Three steps. Five minutes.` — 1 `Add Your Memories` · 2 `Watch your palace grow` · 3 `Walk through it together`.
- Walkthrough attribution: `Guillaume's palace — a real member's home for three generations of memories.` (consent required; narrated cut + captions per media plan).
- FAQ adds (also JSON-LD): q0 `What is a memory palace?` → technique-first answer linking the loci blog post; `How is this different from StoryWorth or Remento?` → `A book ends. A palace grows.` Update Help Center faq2a to match plans.ts (unlimited rooms, 1 GB).
