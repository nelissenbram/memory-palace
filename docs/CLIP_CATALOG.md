# Clip Catalog & Validated-Learning Playbook

Nothing here gets posted at random: every clip in this catalog is a pre-registered hypothesis about what makes our audience stop, feel, and click.
The 12 angle-families each test one psychological mechanism (wonder, pain, warmth, utility) against one ICP — a clip that "flops" still buys knowledge if we measured it.
Every concept below is producible today from the existing asset engine: flythrough viewer, 42 demo palaces, 1586 demo photos, GFPGAN restore pairs, clip-kit overlays, and [FOUNDER-CAM] where marked.
Concepts are pre-scored by a jury (shown per concept) so you can choose from a ranking, not a pile; the score is a prior, not a verdict — the platform data overrules it.
Pick IDs, we produce them, we measure per-ID, and pre-committed kill / double-down / graduate rules decide what happens next. No vibes, no sunk costs.

## The testing system

**Clip-ID convention:** `<FAM>-<nn><hook-letter>` (e.g. `RESTORE-01b`): concept number = distinct script; letter = same body, different first-1.5s hook. The ID is burned into the ember end-card corner (clip-kit) and into the filename.

**Measurement wiring:** every CTA link mentioned in captions/comments is `/go/<platform>?utm_content=<clip-id>` (the 302 rail preserves first-touch). The bio link stays static `/go/tiktok|ig|yt`; per-clip attribution rides the pinned-comment link where the platform allows links, else bio-click timestamps are correlated to post windows. Logged weekly per clip-ID: platform-native (3s-hold %, completion %, profile taps, saves, comments — manual sheet) + ours (PostHog insight "Signups by utm_content, weekly": go-clicks, signups; tie-breaker: ≥3-memories-by-D7 per clip cohort = activation quality).

**Cadence & test cells:** 2 posts/wk month 1, then 3/wk; same file cross-posted TikTok+IG+YT same day. Round 1 (screening, ~wks 1-6): minimum 3 concepts per family before judging a family; never the same family twice in a row; RESTORE, PARENT, WONDER, GRAVE go first (they map to committed Playbook tactics), the other eight fill remaining slots. Round 2 (hook isolation): for any concept beating its family median, hold the body and vary only the hook (3-5 a/b/c variants). Never change hook and body in the same cell.

**Decision rules (pre-committed):**
- *Kill:* after 3 concepts, family median 3s-hold AND go-clicks both below the all-clip running median → retire the family (park, revisit next quarter). Global stop-loss: 12 clips with median <200 views → stop short-form, keep accounts for the Kep clip test.
- *Double-down:* any clip >2× median on 3s-hold or any attributed signup → 5 hook variants of that winner within 2 weeks.
- *Graduate:* a family with 2 winners and ≥3 attributed signups becomes a pillar format — weekly recurring slot, template built into clip-kit, winner's raw considered for landing hero / App Store preview.
- Views buy nothing by themselves: a high-view zero-click family loses to a low-view clicking family (the restore-tourist failure mode).

**Monday note ritual line:**
> "Short-form: posted `<ids>`; per family — hold%/completion/taps + go-clicks/signups (PostHog utm_content); leader: `<id>`; action: kill `<fam>` / hook-vary `<id>` / graduate `<fam>`; next 3 slots: `<ids>`."

## How to choose

Reply with the IDs you want produced (any number; 12 covers the first 4-6 weeks at the committed cadence).
Suggested starter set — top-2 from each of 6 families, balanced across ICPs: **GRAVE-08, GRAVE-05** (parent+memoirist pain), **PARENT-05, PARENT-04** (ICP-1 capture), **RESTORE-01, RESTORE-07** (proven borrowed-demand format), **WONDER-07, WONDER-10** (broad spectacle), **LEGACY-02, LEGACY-04** (ICP-2 legacy), **NATIVE-03, NATIVE-04** (cheap native reach).
That set covers wonder/pain/warmth registers, both ICPs, and all four committed-tactic families — swap any pair for a same-family sibling if you prefer its hook.

## Family: WONDER (PW) — Product-wonder walkthrough

**WONDER-07 · PW-07 A Life, Assembling (8.15)**
HOOK: "Watch a life assemble itself."
BEATS: 1) 0-2s: near-empty scene, hook text. 2) 2-10s: the assemble-before-reveal onboarding sequence — architecture and furnishings drawing together into the finished scene, sped ~1.5x. 3) 10-15s: the reveal moment lands in real time; caption 'Yours starts with one memory.' 4) 15-18s: ember end card.
FOOTAGE: NEW screen-rec: /flythrough?scene=onboarding capturing the assemble-before-reveal sequence; light speed-ramp in edit; no other sources.
CAPTION: It builds itself around what you remember. #memorypalace #oddlysatisfying #3danimation #processvideo
ICP: broad · HYPOTHESIS: Tests satisfying-process footage (assembly) against finished-space footage. Borrows the timelapse/build grammar natively — does process beat product for reach without losing go-clicks?

**WONDER-10 · PW-10 Walking on Water (8.12)**
HOOK: "There's water inside this house. You walk on it."
BEATS: 1) 0-2s: top-down-ish shot of the entrance-hall water floor, oculus light rippling, hook text. 2) 2-8s: first-person walk straight across the water — ripples, reflections, dome above. 3) 8-13s: tilt up mid-crossing to the oculus, caption 'Every detail exists because a memory does.' 4) 13-16s: ember end card.
FOOTAGE: NEW screen-rec: /flythrough?scene=hall, first-person path crossing the walkable water feature under the oculus, one alternate high-angle opener shot; footstep/water SFX subtle.
CAPTION: The entrance hall has a floor of water. Yes, you can cross it. #memorypalace #3dworlds #surreal #architecture
ICP: broad · HYPOTHESIS: Tests a single surreal micro-detail as the entire clip vs whole-palace tours. If one strange, specific image out-hooks the grand walkthrough, future PW clips should be detail-shots, not tours.

**WONDER-02 · PW-02 Look Up (7.97)**
HOOK: "Look up."
BEATS: 1) 0-2s: black-ish marble floor, hook text alone, footstep sound. 2) 2-9s: single slow camera tilt from floor to the coffered dome — 96 cassettes rotating gently, ending centered on the sunlit oculus. 3) 9-13s: hold on oculus, one caption fades in: 'Built to hold one family's memories.' 4) 13-16s: ember end card.
FOOTAGE: NEW screen-rec: /flythrough?scene=hall, custom camera path (floor-to-oculus tilt, slow), captured vertical. No other sources — deliberately one shot.
CAPTION: One room. One skylight. One family's whole story underneath it. #memorypalace #architecture #3ddesign #quietluxury
ICP: broad · HYPOTHESIS: Tests the minimal end of the family: a two-word command hook + a single money-shot with zero product explanation. If wonder alone drives profile taps, this is the purest measurement of it.

**WONDER-04 · PW-04 Zero Folders (7.88)**
HOOK: "4,000 photos. Zero folders."
BEATS: 1) 0-2s: hook text over a fast 1s flash of a cluttered phone gallery grid (UI screen-rec). 2) 2-4s: hard cut to silence — corridor wide shot, one painting lit. 3) 4-12s: slow dolly down the corridor, captions in rhythm: 'Just walls.' / 'Just rooms.' / 'Just light.' 4) 12-17s: arrive at the double doors with cartouche, they stand open onto the T-room. 5) 17-20s: ember end card.
FOOTAGE: 1s app-UI screen-rec of a demo palace's Library grid for the 'before' flash + walkthrough-tour.mp4 corridor segment (~16-24s) + NEW screen-rec /flythrough?scene=corridor&cam=portal for the doors arrival.
CAPTION: Photos were never meant to live in a grid. #memorypalace #photodump #digitaldeclutter #memorykeeping #camerarolI
ICP: parent · HYPOTHESIS: Tests a stat hook + 1s pain-flash inside a wonder clip: can PW borrow CR's opening tension without becoming a problem-agitation clip, and does the contrast cut lift completion vs pure-beauty siblings?

**WONDER-09 · PW-09 No Tricks (7.85)**
HOOK: "No cuts. No CGI renders. This is running in a browser tab."
BEATS: 1) 0-2s: exterior approach begins, hook text. 2) 2-20s: one continuous uncut take — approach, through the doors, hall, corridor, into the T-room — no captions at all until: 3) 20-23s: caption 'A real family's palace. You can walk it too — no signup.' 4) 23-25s: ember end card.
FOOTAGE: NEW screen-rec: single continuous /flythrough path exterior→hall→corridor→room in one take (or the full walkthrough-tour.mp4 31s trimmed to 20s if the seam-free version reads better), pinned comment link /go per platform.
CAPTION: Live 3D, in the browser, no download. Walk one yourself. #memorypalace #webgl #3dart #techtok
ICP: broad · HYPOTHESIS: Tests the tech-flex frame + 'no signup, walk it now' CTA. Skews younger/techier: does credibility-flexing convert curiosity into actual /go clicks better than emotive framings?

**WONDER-01 · PW-01 The Question House (7.73)**
HOOK: "What do 40 years of photos look like as a house?"
BEATS: 1) 0-2s: freeze on golden-hour Tuscan facade (hero-bg first frame), hook text in Fraunces italic. 2) 2-8s: hero-bg approach plays — cypress, dome, warm light. 3) 8-14s: hard cut inside — corridor dolly past hung paintings with picture-lights. 4) 14-19s: T-room mantel with real family photos, caption 'Every wall is a year.' 5) 19-22s: ember end card, PW-01 in corner.
FOOTAGE: hero-bg-original.mp4 (0-8s approach) + walkthrough-tour.mp4 corridor segment (~16-24s) + T-room mantel segment (~24-31s), clip-kit Fraunces overlays.
CAPTION: A lifetime of photos, hung in a place you can walk. #memorypalace #familyarchive #3dart #memorykeeping
ICP: broad · HYPOTHESIS: Baseline for the family: a direct question hook + classic exterior-to-interior arc. Sibling clips vary against this — does a plain question outperform commands, stats, and confessions on 3s-hold?

**WONDER-03 · PW-03 The Named Doors (7.67)**
HOOK: "Behind each of these doors: a different decade of one life."
BEATS: 1) 0-2s: static frame of the entrance hall's ring of doors, hook text. 2) 2-10s: slow orbit past the doors, quick caption tags under three of them as they pass ('Childhood' / 'The House on Vine St' / 'The Grandkids'). 3) 10-16s: camera pushes through one door into the corridor of paintings. 4) 16-20s: caption 'Rooms grow as the story does.' 5) 20-23s: ember end card.
FOOTAGE: walkthrough-tour.mp4 entrance-hall segment (~8-16s, named doors visible) + NEW screen-rec /flythrough?scene=hall orbit for the door pass, then tour corridor segment for the push-through cut.
CAPTION: A door for every chapter. #memorypalace #familyhistory #storytelling #3dworld
ICP: memoirist · HYPOTHESIS: Tests architecture-as-metaphor: doors=decades curiosity-gap hook. vs PW-02: does narrative labeling of the space beat pure spectacle for the memoirist/gifter viewer?

**WONDER-08 · PW-08 The Quietest Place (7.42)**
HOOK: "The quietest place on the internet."
BEATS: 1) 0-2s: dim T-room, fireplace and sconce glow, hook text. 2) 2-8s: slow push toward the sculpted fireplace, gramophone corner passing in shadow, only room-tone and faint footsteps. 3) 8-14s: settle on the library corner — reading lamp, open book, photos warm on the wall; caption 'Some rooms are just for remembering.' 4) 14-18s: ember end card, no music sting.
FOOTAGE: NEW screen-rec: /flythrough?scene=room, slow evening-mood camera path through the T-room (fireplace, gramophone stump, library-L with reading lamp); minimal SFX from clip-kit, no soundtrack.
CAPTION: No feed. No noise. Just the rooms of a life. #memorypalace #calm #quietluxury #slowliving #ambience
ICP: memoirist · HYPOTHESIS: Tests emotional register within wonder: hushed sanctuary vs spectacle. If low-stimulation atmosphere holds attention, PW can own a calm-content lane the loud siblings can't.

**WONDER-05 · PW-05 The Room That Grew (7.20)**
HOOK: "This room was half this size last month."
BEATS: 1) 0-2s: small sparse room (min fill), hook text. 2) 2-6s: three quick match-cut jumps from the same camera position — room widens, bays appear, walls fill with photos (tier 1→2→3→4). 3) 6-12s: final large tier slow pan: library corner, fireplace, gramophone, full walls. 4) 12-16s: caption 'It grows every time you add a memory.' 5) 16-19s: ember end card.
FOOTAGE: NEW screen-recs: /flythrough?scene=room&fill=min and &fill=max (plus intermediate tiers), identical camera position per take for clean match-cuts; clip-kit for jump-cut captions.
CAPTION: Add a memory, the walls make room. #memorypalace #satisfying #3danimation #familyphotos
ICP: parent · HYPOTHESIS: Tests the growth mechanic as the wonder (transformation loop, before/after grammar) instead of a tour. If this wins, the product's living-ness — not its beauty — is the actual hook.

**WONDER-06 · PW-06 It Hangs Somewhere (6.40)**
HOOK: "I stopped scrolling my camera roll after I saw this."
BEATS: 1) 0-2s: extreme close-up of one warm family photo filling the frame, hook text. 2) 2-6s: camera pulls back — walnut frame, bronze plaquette, picture-light: it hangs on a wall. 3) 6-12s: pull-back continues through the room, out the doors, down the corridor — the photo shrinking into a lit dot among many. 4) 12-16s: caption 'Every photo gets a place.' 5) 16-19s: ember end card.
FOOTAGE: NEW screen-rec: /flythrough?scene=room, custom reverse-dolly path starting flush against one hung demo painting (pick a warm elder-palace photo from the 1586 set) pulling back through room and corridor; single continuous take.
CAPTION: One photo, given a wall of its own. #memorypalace #familyphotos #nostalgia #3dart
ICP: broad · HYPOTHESIS: Tests a confession hook + reverse-reveal structure (photo-first, palace-second). vs PW-01's building-first arc: does starting on human content instead of architecture hold the first 3 seconds better?

## Family: GRAVE (CR) — Problem-agitation camera-roll

**GRAVE-08 · Nobody Inherits a Camera Roll (aphorism hook) (8.68)**
HOOK: "No one has ever inherited a camera roll."
BEATS: 1) 0-3s: hook alone on ink background, Fraunces italic, long two-beat hold — confidence, no imagery. 2) 3-9s: quiet grid of thumbnails slowly losing saturation to grey, one by one. Line: 'a folder is not a bequest.' 3) 9-18s: slow corridor glide: paintings, bronze plaques, a statue at the wing's end — footage breathes. Line: 'rooms, though. rooms get walked through.' 4) 18-22s: final frame: a plaque close-up, then the door name in the lintel. 5) 22-25s: ember end card.
FOOTAGE: Desaturating grid = motion-graphic treatment of demo thumbnails (clip-kit); corridor glide = fresh screen-rec /flythrough?scene=corridor&cam=terminus for the statue end-wall, or walkthrough-tour.mp4 corridor segment; plaque close-up from a demo-palace visit.
CAPTION: What we keep should be somewhere worth visiting. #digitallegacy #familyhistory #memoir #legacy
ICP: memoirist · HYPOTHESIS: Tests the legacy/inheritance edge of the pain (LG-adjacent) delivered as a cool aphorism with zero grief imagery — the deliberate below-the-clickbait-line boundary case. If it converts without tipping into grief-bait, it unlocks the tenderest third of the family; if the wordless 3s open collapses hold, text-only cold opens die with it.

**GRAVE-05 · Storage Almost Full (wry-observation hook) (7.97)**
HOOK: ""Storage almost full" is the saddest sentence your phone knows how to say."
BEATS: 1) 0-2.5s: the iOS 'Storage Almost Full' alert recreated as a clean mock, hook line beneath in Fraunces. 2) 2.5-8s: screen-rec: settings-style storage bar filling, then the roll doom-scrolling; deadpan line: 'your solution will be to delete the blurry ones. again.' 3) 8-15s: smash-cut to the golden-hour villa approach — wide, calm, spacious. Line: 'or give the good ones a bigger house.' 4) 15-20s: interior beat: entrance hall with named doors, one door opening toward a lit room. 5) 20-24s: ember end card.
FOOTAGE: Storage alert + bar = simple motion-graphic mock (clip-kit typography, no app footage needed) + demo-grid doom-scroll screen-rec; villa approach = hero-bg-original.mp4 (12s golden-hour clip trimmed to ~7s); entrance hall = walkthrough-tour.mp4 entrance-hall-with-named-doors segment.
CAPTION: Deleting memories to make room for memories. There's another way. #storagefull #camerarollcleanup #memorykeeping #familyphotos
ICP: parent · HYPOTHESIS: Tests a wry/deadpan register against the earnest siblings — can quiet humor carry problem-agitation without breaking the quiet-luxury tone? Only sibling using the golden-hour hero footage as the relief beat: spaciousness (not tidiness) as the visual antidote.

**GRAVE-10 · Stop Saving Everything (contrarian-command, relief-heavy) (7.97)**
HOOK: "Stop saving everything."
BEATS: 1) 0-2s: hook, stark, over a single frozen camera-roll frame — the only agitation beat in the clip. 2) 2-6s: screen-rec: a hand picks exactly three photos in the Ledger, drags them to a lane; everything unpicked greys out politely. Line: 'keep three. this week.' 3) 6-14s: the three appear on the room wall one by one — hang rhythm cut to music; plaques fade in. 4) 14-20s: pull-back orbit of the room, lived-in and calm. Line: 'a smaller pile. a better place.' 5) 20-23s: ember end card.
FOOTAGE: Ledger flow = app UI screen-rec of the Steward's Ledger drag&drop (station lanes, Shown/Archive); wall reveal + orbit = screen-rec /flythrough?scene=room&fill=min matched to the same three demo photos; overlays via clip-kit.
CAPTION: Three photos a week, with the story attached. That's the whole method. #memorykeeping #declutter #familyphotos #photoorganization
ICP: parent · HYPOTHESIS: Inverts the family's pain:relief ratio (2s pain / 18s relief vs GRAVE-01's 50/50) with a contrarian imperative hook. If it wins signups-per-view while losing raw hold, the family should evolve toward agitation-as-cold-open-only; body doubles as the HT bridge since it demonstrates the actual method.

**GRAVE-03 · The Confession [FOUNDER-CAM] (7.92)**
HOOK: "I have 23,000 photos of my kids. They've seen maybe 40."
BEATS: 1) 0-3s: [FOUNDER-CAM] Bram, plain selfie framing, evening light, says the hook to camera — subtitles only, no title card. 2) 3-9s: cut-in: his phone screen scrolling the roll while VO continues: 'I'm the guy who photographs everything and shows no one. So I built the opposite.' 3) 9-17s: screen-rec: three photos dragged into a room via the Ledger, then the 3D room with them hanging; VO: 'three a week. On a wall. Somewhere they'll actually walk through.' 4) 17-22s: back to face, half-smile: 'the other 22,997 can stay in the graveyard.' 5) 22-25s: ember end card.
FOOTAGE: [FOUNDER-CAM] selfie clip + real or demo camera-roll scroll; Ledger drag&drop = app UI screen-rec of the Steward's Ledger flow; room reveal = screen-rec /flythrough?scene=room&fill=max; subtitles + end card via clip-kit.
CAPTION: Built by the worst offender I know. #buildinpublic #memorykeeping #familyphotos #dadlife
ICP: founder-audience · HYPOTHESIS: The FB-crossover control cell: does a face + first-person confession outperform the faceless siblings on comment-rate and profile taps for the same pain message? Directly tests the person axis (I vs you) inside GRAVE.

**GRAVE-06 · Two Hundred Photographs (generational-contrast hook) (7.82)**
HOOK: "Your grandmother owned 200 photographs. She could name every single one."
BEATS: 1) 0-3s: hook over a slow ken-burns of an aged, faded elder portrait. 2) 3-8s: GFPGAN wipe-reveal restores the portrait to clarity while the line lands: 'you own 20,000. name ten.' 3) 8-15s: dissolve to a memoirist demo-palace corridor: her photographs hanging in sequence, plaques legible, the walk unhurried. Line: 'she kept fewer. she kept them better.' 4) 15-21s: settle on one frame + plaque, hold two beats. 5) 21-25s: ember end card.
FOOTAGE: Aged elder photo from the demo library (one that reads mid-century) + real GFPGAN before/after pair for the wipe; corridor sequence = screen-rec of a memoirist-style demo palace via /u/<username> visit or /flythrough?scene=corridor; ken-burns + wipe + type via clip-kit.
CAPTION: Fewer photographs, better kept. The old way had a point. #familyhistory #vintagephotos #photorestoration #memoir #genealogy
ICP: memoirist · HYPOTHESIS: The ICP-2 cell of the family: does generational contrast (nostalgia-flavored agitation + a restore beat) reach the 50-70/memoirist audience where parent-coded doom-scroll siblings won't? Also tests whether borrowing the RS wipe inside a GRAVE body lifts hold without creating restore-tourists — watch go-click quality, not views.

**GRAVE-01 · The Prediction (blunt-stat hook) (7.80)**
HOOK: "You'll take 6 photos today. You'll look at 0 of them again."
BEATS: 1) 0-2s: black screen, hook line in Fraunces italic, cream on ink. 2) 2-7s: fast doom-scroll screen-rec of an endless camera-roll grid — hundreds of thumbnails blurring past, no music, just a soft tick. 3) 7-10s: hard freeze mid-scroll; one thumbnail stays sharp, rest desaturate. Line: 'unless they live somewhere.' 4) 10-18s: cut to slow orbit of a furnished T-room — that same photo framed above the mantel with a small plaque. Line: 'three a week, with the story attached.' 5) 18-22s: ember end card, clip-id corner.
FOOTAGE: Camera-roll doom-scroll = screen-rec of a photo-grid page assembled from the 1586 demo photos (scripts/populate/media laid out in a camera-roll-style grid, captured scrolling); room orbit = screen-rec /flythrough?scene=room&fill=max slow orbit toward mantel; overlays + end card via clip-kit.
CAPTION: Most photos are taken once and never seen again. We built a place where the good ones hang. #memorykeeping #familyphotos #camerarroll #digitallegacy
ICP: broad · HYPOTHESIS: Baseline for the family: does a cold second-person stat-prediction hook (no question, no face) hold 3s better than the interactive and confessional siblings? Also tests the canonical 50/50 pain→relief structure; reserve a/b/c letters for round-2 hook isolation on this body.

**GRAVE-04 · Photo #3,847 (curiosity-gap hook) (7.78)**
HOOK: "What's behind photo number 3,847?"
BEATS: 1) 0-2s: hook over a camera-roll grid; one thumbnail circled in ember. 2) 2-7s: slow ken-burns push into that single photo — an ordinary kitchen scene from a demo palace. Line: 'nothing. no date you remember, no story, no why.' 3) 7-14s: match-cut: the same photo, now framed in a room, camera settles on its bronze plaque; the plaque text fades in as readable words. Line: 'same photo. now it says who, where, and what happened after.' 4) 14-19s: pull back to reveal the whole wall of storied frames. 5) 19-23s: ember end card.
FOOTAGE: One demo memory-photo from scripts/populate/media (warm domestic scene) for the ken-burns; framed version = screen-rec /flythrough?scene=room orbiting to a close-up of a hung painting + plaque, or a /u/<username> demo-palace visit for a real plaque with real caption text.
CAPTION: A photo without its story is just pixels. The plaque is the point. #memorykeeping #familyhistory #storytelling #digitallegacy
ICP: broad · HYPOTHESIS: Tests the curiosity-gap hook + single-photo intimacy against the mass-scale framing of GRAVE-01/02: is ONE storied photo more persuasive than 4,000 storyless ones? Also probes whether the plaque (story artifact) rather than the 3D spectacle is the true differentiator.

**GRAVE-02 · Last Tuesday (command / participation hook) (7.67)**
HOOK: "Find one photo from last Tuesday. Go."
BEATS: 1) 0-2s: hook as typed-out command over a paused camera-roll grid, cursor blinking. 2) 2-8s: screen-rec of frantic scrolling, pinch-zooming, jumping months — visibly failing; small timer counts up in the corner. 3) 8-11s: timer stops at 0:47. Line: 'forty-seven seconds. For last week.' 4) 11-18s: cut to corridor walk-through: paintings in walnut frames, each with a bronze plaque and date — the camera glides past like it's effortless. Line: 'or: it's just… on the wall.' 5) 18-21s: ember end card.
FOOTAGE: Frantic-scroll = screen-rec of the same demo-photo grid page, scrolled erratically with a burned-in timer overlay (clip-kit); corridor glide = walkthrough-tour.mp4 corridor segment (~12-19s) or fresh screen-rec /flythrough?scene=corridor&cam=door for a longer take.
CAPTION: Timed myself. Forty-seven seconds to find last Tuesday. That's the whole problem. #photoorganization #memorykeeping #familyphotos #camerarollcleanup
ICP: parent · HYPOTHESIS: Tests whether a direct command that makes the viewer mentally perform the failure (participation) beats passively watching the failure (GRAVE-01). Comment-bait side-effect: people reply with their own search times.

**GRAVE-09 · The Math (text-poetry equation hook) (7.33)**
HOOK: "4,000 photos ÷ 0 stories = a graveyard"
BEATS: 1) 0-2.5s: the equation types itself out character by character over a defocused, slow-motion scroll blur. 2) 2.5-6s: hold; the '= a graveyard' term flickers grey. 3) 6-13s: terms rewrite themselves: '12 photos + 12 stories = a room' — as it resolves, the blur racks into focus: a furnished room orbit, twelve frames, warm light. 4) 13-19s: camera settles on the mantel; small line: 'the math was never about more.' 5) 19-22s: ember end card.
FOOTAGE: Equation = pure clip-kit kinetic typography (Fraunces) composited over a defocused demo-grid scroll screen-rec; room orbit = screen-rec /flythrough?scene=room&fill=min (deliberately sparse 12-frame fill to make the '12' literal).
CAPTION: Subtraction is the feature. #minimalism #memorykeeping #familyphotos #intentionalliving
ICP: broad · HYPOTHESIS: Tests whether the family's core claim survives maximum compression — typography-first, near-zero product footage until the reveal. If it matches GRAVE-01's numbers, hooks (not footage richness) are doing the work and production cost per clip can drop; also A/Bs fill=min sparse art direction vs fill=max abundance.

**GRAVE-07 · POV: The Beach Photo (format-native POV hook) (6.88)**
HOOK: "POV: you just need that one photo from the beach"
BEATS: 1) 0-2s: POV hook as native-style caption over a thumb already scrolling. 2) 2-9s: screen-rec scroll with inner-monologue text popping in rhythm: 'june… no. july? … why are there 61 screenshots… ok whose birthday is this'. 3) 9-12s: scroll gives up; screen dims. Beat of silence. 4) 12-19s: cut: a room door with 'Summer' in the nameplate swings open, camera walks in — the beach photo is on the wall, big, lit. Text: 'imagine just… walking to it.' 5) 19-23s: ember end card.
FOOTAGE: Doom-scroll with kinetic inner-monologue text = demo-grid screen-rec + clip-kit type; door-with-nameplate + entry = screen-rec /flythrough?scene=room (door name in the top lintel) or walkthrough-tour.mp4 T-room entry segment; beach photo = warm seaside demo photo pre-placed in the demo room.
CAPTION: The filing system is a hallway. #pov #camerarroll #memorykeeping #familyphotos
ICP: parent · HYPOTHESIS: Tests platform-native POV grammar (FN crossover) for the pain message: does trend-native dressing buy cheaper reach, and does that reach still convert to go-clicks — or is this the family's designated views-without-clicks trap?

## Family: RESTORE (RS) — Restore before/after

**RESTORE-01 · RS-02 The Slow Wipe (silence test) (8.42)**
HOOK: "Watch her come back."
BEATS: 1) 0–2s: freeze on one badly damaged 1940s woman's portrait, hook line in Fraunces italic, no music yet. 2) 2–5s: hold on the damage — creases, foxing, a tear across the cheek — single soft piano note starts. 3) 5–9s: one slow left-to-right wipe reveals the GFPGAN restore; no captions, let the face land. 4) 9–13s: gentle push-in on the eyes, caption fades in: 'BEFORE 1943 / TODAY'. 5) 13–15s: cut to ember end card, RS-02 in corner.
FOOTAGE: One GFPGAN before/after pair generated from a Flickr Commons / Nationaal Archief 'no known copyright' 1940s portrait (per REACH_OUT_PLAN §2c action 2); ffmpeg wipe template from clip-kit; Fraunces title overlay + ember end card via scripts/week1/clip-kit.mjs.
CAPTION: Some faces only need thirty seconds to return. 10 free restores, link in bio. #photorestoration #familyhistory #oldphotos #beforeandafter
ICP: broad · HYPOTHESIS: Command-hook + minimal, near-silent single-reveal vs RS-01's caption-heavy version: does restraint (quiet-luxury pacing, one photo, no text during the wipe) hold 3s attention and completion better than the standard busy Remini grammar?

**RESTORE-07 · RS-08 Watch It Fade (reverse reveal) (7.85)**
HOOK: "This is what 70 years does to a face."
BEATS: 1) 0–2s: open on the pristine RESTORED portrait, hook line — audience assumes it's the before. 2) 2–8s: reverse wipe: the photo degrades in front of them — fading, creasing, silvering — a countdown caption ticks 1954…1980…2010…today. 3) 8–12s: hold one beat on the ruined version, caption: 'Unless someone stops it.' 4) 12–15s: snap wipe forward to restored again. 5) 15–17s: ember end card.
FOOTAGE: One GFPGAN pair played in REVERSE (restored→damaged) then snapped forward — same ffmpeg wipe template reversed; archive portrait from the batch; clip-kit overlays and year-ticker text.
CAPTION: Paper doesn't wait. 10 free restores — link in bio. #photorestoration #oldphotos #familyhistory #timelapse
ICP: broad · HYPOTHESIS: Loss-framing (watch it decay) vs gain-framing siblings (watch it return): does inverting the reveal direction — mild urgency without grief-bait — beat the standard wipe on 3s-hold, and does urgency framing lift go-clicks specifically?

**RESTORE-05 · RS-06 The Detail You Missed (curiosity gap) (7.78)**
HOOK: "There's something on her collar you can't see yet."
BEATS: 1) 0–2s: hook over the damaged photo, a subtle circle pulsing on the blurred/foxed collar area. 2) 2–6s: slow push toward the unreadable detail, damage in full view. 3) 6–10s: wipe reveal, then immediate zoom INTO the restored detail — a brooch, a medal, embroidery — caption names it: 'A nurse's pin. 1946.' 4) 10–15s: pull back to the whole restored face, caption: 'Restoration isn't cosmetic. It's evidence.' 5) 15–18s: ember end card.
FOOTAGE: One GFPGAN pair chosen specifically from the archive batch for a legible recovered detail (pin/badge/jewelry); ffmpeg wipe + digital zoom moves; clip-kit overlays.
CAPTION: Every restore gives a detail back to the record. 10 free — link in bio. #photorestoration #genealogy #familyhistory #historydetective
ICP: memoirist · HYPOTHESIS: Curiosity-gap hook with a promised, delayed payoff vs immediate-reveal siblings: does withholding the reveal target drive completion % higher, and does the 'evidence' framing pull the genealogy/memoirist ICP specifically (comment topics as signal)?

**RESTORE-04 · RS-05 My Grandmother's Shoebox [FOUNDER-CAM] (7.73)**
HOOK: "I finally opened the box I'd been avoiding."
BEATS: 1) 0–2s: [FOUNDER-CAM] Bram at his desk, worn shoebox in frame, confession hook as caption. 2) 2–7s: hands-only b-roll: lifting out a creased old family photo, turning it over to the handwriting on the back. 3) 7–13s: screen: the photo drops into the restore flow, wipe reveal of the repaired face. 4) 13–19s: back to founder, one quiet line to camera: 'She wrote the story on the back. Now both survive.' 5) 19–22s: ember end card.
FOOTAGE: [FOUNDER-CAM] selfie + hands b-roll of a real family shoebox photo (owner's own, per §2c 'own family shoebox'); app UI screen-rec of the Library restore upload flow; GFPGAN pair of that photo; clip-kit overlays.
CAPTION: I built this because of one box. I restore one stranger's photo free every day — drop yours below. #photorestoration #familyhistory #buildinpublic #oldphotos
ICP: founder-audience · HYPOTHESIS: Confession hook + a real face vs the faceless siblings: does founder presence lift comment-rate and trust (photo drops in comments) enough to justify founder time, per the FB-family crossover question applied inside RS?

**RESTORE-03 · RS-04 Restored, Then Hung (the palace bridge) (7.67)**
HOOK: "Restoring it was the easy part."
BEATS: 1) 0–2s: hook over damaged elder portrait. 2) 2–6s: wipe reveal of the restore — the familiar payoff, delivered fast. 3) 6–16s: hard cut: screen-rec glides down the corridor and into a T-room where that same restored portrait hangs framed on the wall above the mantel, picture-light on, caption: 'Then it got a wall.' 4) 16–21s: slow orbit settles on the framed photo, caption: 'A photo in a folder is filed. A photo on a wall is visited.' 5) 21–24s: ember end card.
FOOTAGE: GFPGAN pair from a demo-palace elder photo (scripts/populate/media) so the SAME image exists inside a demo palace; screen-rec /flythrough?scene=corridor into scene=room camera path framing that painting; clip-kit overlays.
CAPTION: The restore is step one. The place is the point. Walk a real palace free — link in bio. #photorestoration #memorykeeping #familyhistory #3dart
ICP: memoirist · HYPOTHESIS: THE core family hypothesis clip: does welding the wipe payoff to the palace destination convert restore-tourists into palace signups (go-clicks per view) even if raw 3s-hold dips vs pure-reveal siblings RS-02/03?

**RESTORE-02 · RS-03 Five Faces in Twelve Seconds (volume montage) (7.23)**
HOOK: "5 photos. All of them were almost gone."
BEATS: 1) 0–1.5s: hook over a 5-up grid of damaged portraits. 2) 1.5–10s: rapid rhythm: each photo gets 0.8s damage-hold then a 0.9s wipe reveal, cut on beat, eras jump 1920s→50s→70s. 3) 10–13s: all five restored faces reassemble into the grid, caption: 'Every family has a shoebox like this.' 4) 13–15s: ember end card.
FOOTAGE: Five GFPGAN before/after pairs batched from the 30–60 archive-portrait restore batch (LoC/Flickr Commons); ffmpeg wipe template looped 5× with beat-cut timing; clip-kit overlays.
CAPTION: A shoebox is not an archive. 10 free restores — link in bio. #photorestoration #beforeandafter #vintagephotos #genealogy
ICP: broad · HYPOTHESIS: Stat/count hook + rapid multi-reveal dopamine vs single-photo siblings (RS-02): does reveal FREQUENCY beat reveal DEPTH on 3s-hold and rewatch, and does the volume format still produce go-clicks or just views (RS-tourist risk probe)?

**RESTORE-10 · RS-11 The Last One Taken (tender legacy, below the line) (7.13)**
HOOK: "Someone kept this photo for 60 years. Look how carefully."
BEATS: 1) 0–2s: hook over the damaged photo shown IN CONTEXT: worn edges, tape marks, a handwritten date — evidence of decades of keeping. 2) 2–7s: ken-burns drift across the wear itself, caption: 'Folded to fit a wallet. Taped twice.' 3) 7–11s: wipe reveal of the restore. 4) 11–18s: cross-fade to the photo hanging lit in a demo-palace room, caption: 'Kept that carefully, it deserves better than a drawer.' 5) 18–21s: ember end card.
FOOTAGE: GFPGAN pair from a demo-palace elder photo styled with visible wear; ken-burns over the before; screen-rec /flythrough?scene=room slow dolly to the matching hung painting; clip-kit overlays.
CAPTION: The wear on a photo is its own record of love. Give it a wall — link in bio. #familyhistory #photorestoration #memorykeeping #legacy
ICP: memoirist · HYPOTHESIS: Warmth/reverence framing (the KEEPING is the story) vs damage-shock siblings: can maximum tenderness with zero grief-bait reach the 50-70/gifter ICP — judged on saves + shares rather than raw 3s-hold — while still bridging to palace go-clicks like RS-04?

**RESTORE-08 · RS-09 Would You Recognize Her? (comment-bait crossover) (6.98)**
HOOK: "Could you pick your great-grandmother out of this photo?"
BEATS: 1) 0–2s: question hook over a damaged 1930s GROUP photo, faces barely legible. 2) 2–7s: slow pan across the ruined group, caption: 'Most people can't name anyone past their grandparents.' 3) 7–12s: wipe reveal restores the whole group; individual faces get quick highlight frames. 4) 12–17s: caption: 'Restore the face. Then write down the name — before nobody can.' 5) 17–19s: ember end card.
FOOTAGE: GFPGAN pair of an archive GROUP photo (Flickr Commons family/wedding group, chosen for multiple faces); pan + highlight-frame moves in ffmpeg; clip-kit overlays.
CAPTION: Faces without names are strangers in your own album. Which relative would you save first? #genealogy #familyhistory #photorestoration #oldphotos
ICP: memoirist · HYPOTHESIS: Direct-question hook + group photo vs single-portrait siblings: does self-projection ('could YOU…') drive comment-rate (CI-mechanism inside RS), and do multi-face reveals hold attention differently than one-face intimacy?

**RESTORE-09 · RS-10 It Cost Less Than a Stamp (stat/price hook) (6.87)**
HOOK: "This restoration cost €0.002."
BEATS: 1) 0–2s: hook in huge Fraunces numerals over the damaged portrait. 2) 2–6s: hold on damage, caption: 'A studio quotes €80 and three weeks for this.' 3) 6–10s: wipe reveal, timer overlay showing '31 seconds'. 4) 10–15s: restored face full-frame, caption: 'Which is why the first 10 are free.' 5) 15–17s: ember end card.
FOOTAGE: One GFPGAN pair from the archive batch; timer + price overlays via clip-kit; optional 2s app-UI screen-rec insert of the restore button being tapped.
CAPTION: Restoration used to be a luxury. Now it's a default. 10 free — link in bio. #photorestoration #ai #beforeandafter #oldphotos
ICP: broad · HYPOTHESIS: Concrete-number/absurd-stat hook vs emotional siblings: does a rational value-anchor (price + speed) stop scroll as well as sentiment does, and does it attract higher-intent clickers (go-click→signup rate) or bargain-hunters who never activate (D7 ≥3-memories check)?

**RESTORE-06 · RS-07 You Sent This One (community fulfillment) (6.33)**
HOOK: "@____ dropped this in the comments yesterday. Here's what came back."
BEATS: 1) 0–2s: screenshot-style frame of the (permissioned) comment with the damaged photo attached, hook overlaid, username handle slot templated. 2) 2–6s: the damaged photo fills the frame, hold on the worst damage. 3) 6–10s: wipe reveal of the restore. 4) 10–14s: side-by-side before/after, caption: 'Tomorrow I pick another one.' 5) 14–16s: ember end card.
FOOTAGE: Fulfilled restore from the pinned-comment loop (§2c action 3: 'drop your damaged family photo') — commenter's submitted photo with permission, GFPGAN pair, comment-screenshot mock via clip-kit frame; fully templatable for the every-10th-restore cadence.
CAPTION: Every day, one photo from the comments, restored free. Yours next? #photorestoration #beforeandafter #familyphotos #oldphotos
ICP: broad · HYPOTHESIS: Social-proof/reciprocity hook (a named real person, not an archive stranger) vs archive-photo siblings: does visible fulfillment compound the comment-submission flywheel — measured in photo-drops per 1k views — turning the format self-feeding?

## Family: PARENT (BB) — New-parent baby-book / Kep money-shot

**PARENT-05 · BB-05 Grandma Hung a Photo (8.43)**
HOOK: "My mother lives 400 km away. Last night she hung a photo in our house."
BEATS: 1) 0-2s: hook alone over a dim corridor still. 2) 2-8s: WhatsApp screen-rec styled as "Mama ❤️" sending a photo + "kijk wat ik vond van toen jij klein was"; Kep confirms. 3) 8-15s: corridor walk-through, camera stops at a newly hung frame among the others; plaque: "added by Oma". 4) 15-19s: overlay "everyone who loves them can add to it." 5) 19-22s: ember end card.
FOOTAGE: Kep WhatsApp chat mock screen-rec dressed as a grandparent contact; walkthrough-tour.mp4 corridor-with-paintings segment (~12-19s) plus a matching screen-rec /flythrough?scene=corridor stop-and-zoom on one frame in a demo palace; clip-kit overlays.
CAPTION: It's not just your baby book — grandparents, aunts, godparents all text memories in. One family, one house. #grandparents #familymemories #babyphotos #newparents
ICP: parent · HYPOTHESIS: Tests the multi-contributor angle (family-network value) vs solo-parent capture: does "your whole family builds it" drive shares/tags ("@mom look at this") and convert better than BB-01's solo magic?

**PARENT-04 · BB-04 The Unfinished Baby Book [FOUNDER-CAM] (7.95)**
HOOK: "I never finished the baby book. Statistically, neither will you."
BEATS: 1) 0-3s: [FOUNDER-CAM] Bram deadpan to camera holding a mostly-blank paper baby book, hook as spoken line + subtitle. 2) 3-8s: flips through empty pages — "page 4: first word. Blank. She's three." 3) 8-15s: cut to phone: sends one WhatsApp photo + voice memo; cut to the 3D room where it hangs, plaque readable. 4) 15-20s: back to founder, quiet: "So I built one that fills itself." 5) 20-23s: ember end card.
FOOTAGE: [FOUNDER-CAM] selfie clips (desk, natural light, real or prop scrapbook); Kep WhatsApp mock screen-rec; screen-rec /flythrough?scene=room wall zoom on a demo palace; clip-kit subtitles.
CAPTION: Every parent buys the baby book. Almost nobody finishes it. This one fills itself while you live your life. #babybook #dadsoftiktok #newparents #parenthood
ICP: parent · HYPOTHESIS: Tests a face + self-deprecating confession hook inside BB (FB-family crossover): does founder-cam relatability beat faceless polish for hold% and comment-rate within the parent angle?

**PARENT-01 · BB-01 The Kep Money Shot (seed V4, refined) (7.82)**
HOOK: "I built a WhatsApp bot for baby photos."
BEATS: 1) 0-2s: phone screen-rec, WhatsApp chat open, hook text overlaid top in Fraunces italic. 2) 2-7s: type "Emma's first steps 🎉" + attach photo, hit send; Kep replies with its confirmation bubble. 3) 7-14s: hard cut into the 3D T-room, walk toward the wall, slow zoom until the exact same photo fills frame in its walnut frame with brass plaque. 4) 14-18s: overlay "you just text it…" then "…and it hangs it in your family's villa." 5) 18-20s: ember end card, clip-id corner.
FOOTAGE: Kep WhatsApp chat mock screen-rec (inventory f) using one baby-ish demo photo from scripts/populate/media; then screen-rec /flythrough?scene=room on a demo palace with that same photo pre-seeded on the wall (camera path: door → wall dolly → zoom); clip-kit overlays.
CAPTION: You text a photo. It hangs in your family's 3D villa the same evening. The baby book that writes itself. #babybook #newparents #memorykeeping #firstyear
ICP: parent · HYPOTHESIS: The family baseline: does the magic-moment WhatsApp→wall cut (effortlessness, confession-builder hook) drive go-clicks better than any other framing of the same product? All other BB concepts are judged against this one.

**PARENT-07 · BB-07 Ten Seconds of Babble (7.82)**
HOOK: "Record 10 seconds of your baby's babble. Today. You'll forget the sound by spring."
BEATS: 1) 0-3s: black screen, hook typed line by line, faint audio waveform animating. 2) 3-8s: WhatsApp screen-rec: hold-to-record a voice memo, send to Kep. 3) 8-15s: cut to the room; camera settles on a frame + plaque; waveform overlay plays across it ("voice note — 9 months, 0:11"). 4) 15-19s: text: "photos keep the face. this keeps the voice." 5) 19-22s: ember end card.
FOOTAGE: Kep WhatsApp mock screen-rec (voice-memo UI); screen-rec /flythrough?scene=room dolly-in on one framed photo in a demo palace; clip-kit waveform + typewriter overlays; babble audio bed supplied by founder or licensed-clear source.
CAPTION: The photos survive. The sound of them at nine months doesn't — unless you catch it. #babymilestones #voicememo #newborn #memorykeeping
ICP: parent · HYPOTHESIS: Tests a direct command hook + the audio/ephemerality trigger (voice, not photos): is "you're losing the sound" a sharper loss-aversion lever for parents than photo overload?

**PARENT-03 · BB-03 The Room That Grew With Her (7.68)**
HOOK: "This room is 11 months old. So is she."
BEATS: 1) 0-2s: static shot of a nearly empty room, hook overlaid. 2) 2-10s: match-cut series — same camera angle, wall progressively fuller (month captions: "month 2… month 5… month 9…"), photos aging the baby as the room fills. 3) 10-16s: final state, slow orbit of the full room; text: "rooms here grow when your family does." 4) 16-19s: doorway pull-back revealing the named door plate, then ember end card.
FOOTAGE: Screen-rec /flythrough?scene=room at fill=min, then re-recorded same camera path at increasing fill states up to fill=max on a demo palace seeded with age-progressing baby photos from scripts/populate/media; final orbit + door-name shot from the same viewer; clip-kit month captions.
CAPTION: The room literally grows as your child does. Month by month, wall by wall. #firstyear #babysfirstyear #memorykeeping #newparents
ICP: parent · HYPOTHESIS: Tests whether the product's growth mechanic (rooms grow = child grows) is itself the emotional hook — time-lapse curiosity-gap vs BB-01's instant-magic and BB-02's habit-math.

**PARENT-06 · BB-06 POV: Year 2044 (7.65)**
HOOK: "POV: it's 2044 and your kid asks what they were like at two."
BEATS: 1) 0-2s: hook over the golden-hour villa approach. 2) 2-8s: slow first-person walk: entrance hall, through the named door ("Emma — The First Years"). 3) 8-16s: inside, drift past frames with year plaques; pause on one; overlay: "you don't tell them. you walk them through it." 4) 16-20s: linger at the mantel as light falls; ember end card.
FOOTAGE: hero-bg-original.mp4 (12s golden-hour Tuscan approach) for the open; walkthrough-tour.mp4 entrance-hall-named-doors and T-room-mantel segments; or a fresh continuous screen-rec via /flythrough?scene=onboarding for one unbroken path; clip-kit plaque captions.
CAPTION: One day they'll ask. You'll open a door instead of a folder. #pov #timecapsule #parenthood #memorykeeping #babysfirstyear
ICP: parent · HYPOTHESIS: Tests platform-native POV grammar + future-projection emotion (FN crossover): does a format-native, product-second clip buy cheaper reach that still yields go-clicks, vs BB's explicit product demos?

**PARENT-10 · BB-10 What the Folder Can't Do (7.55)**
HOOK: "A folder named 'Baby 2026' is where memories go to be safe and never seen."
BEATS: 1) 0-3s: screen-rec of a sterile file-explorer folder grid scrolling, hook overlaid. 2) 3-6s: cursor hovers, nothing invites a click; freeze frame. 3) 6-14s: match-cut from one thumbnail to the same photo framed in warm light; camera pulls back through the room and out to the corridor of paintings. 4) 14-18s: overlay: "same photos. now it's a place you visit." 5) 18-21s: ember end card.
FOOTAGE: Screen-rec of a mock OS folder filled with demo baby photos (desktop capture); match-cut into screen-rec /flythrough?scene=room pull-back plus walkthrough-tour.mp4 corridor segment; clip-kit overlays.
CAPTION: Safe isn't the same as seen. Same photos — a place instead of a folder. #photostorage #babyphotos #newparents #digitalmemories
ICP: parent · HYPOTHESIS: Tests a quiet-aphorism hook + the folder-vs-place category reframe: does articulating WHY a 3D place beats cloud storage convert better than showing the magic (BB-01) or the pain (BB-08)?

**PARENT-09 · BB-09 Pick Tonight's Three (7.43)**
HOOK: "Pick tonight's three: the bath chaos, the first spoon, or the nap face?"
BEATS: 1) 0-2s: hook over a triptych of three baby stills, labeled A/B/C. 2) 2-9s: each candidate gets ~2s of ken-burns with a one-line plaque draft ("the spoon went everywhere but in"). 3) 9-15s: the "winner" slides onto the room wall in-frame; camera steps back to show it among the week's others. 4) 15-19s: text: "comment A, B or C — that's the whole weekly ritual." 5) 19-21s: ember end card.
FOOTAGE: Three curated baby/toddler stills from scripts/populate/media with ken-burns; screen-rec /flythrough?scene=room wall shot on a demo palace for the placement beat; clip-kit A/B/C labels and plaque overlays.
CAPTION: The three-a-week ritual, played out loud. Which one makes the wall — A, B or C? #babyphotos #parentsoftiktok #weeklyritual #memorykeeping
ICP: parent · HYPOTHESIS: Tests comment-bait mechanics inside BB (CI crossover): do manufactured A/B/C comments compound reach for the parent angle, and does that engagement-bought reach still convert to go-clicks vs the demo-led siblings?

**PARENT-08 · BB-08 1,500 : 0 (7.35)**
HOOK: "New parents take ~1,500 photos in year one. Average number printed: about zero."
BEATS: 1) 0-2s: hook as a stark two-line stat card. 2) 2-6s: hyper-fast grid montage of demo baby photos strobing past (the invisible 1,500). 3) 6-13s: hard stop — silence — single frame on a villa wall, slow push-in until the plaque is legible. 4) 13-18s: overlay: "framed beats filed. three a week is enough." 5) 18-21s: ember end card.
FOOTAGE: Rapid grid/strobe montage assembled from ~60 stills of the 1586 demo photos (ken-burns pipeline); screen-rec /flythrough?scene=room single-frame push-in on a demo palace; clip-kit stat card + overlays.
CAPTION: They're all somewhere in the cloud. None of them are anywhere in your life. Fixable. #babyphotos #photodump #newparents #digitalclutter
ICP: parent · HYPOTHESIS: Tests a cold-stat shock hook with a pain→relief arc inside BB (CR-adjacent but resolved by the habit, not a product tour): does statistical shock lift 3s-hold without collapsing go-click intent vs the warm hooks?

**PARENT-02 · BB-02 Three a Week (7.08)**
HOOK: "3 photos a week. That's the entire system."
BEATS: 1) 0-2s: black frame, hook line alone in Fraunces. 2) 2-6s: counter animates 3 × 52 = 156 over a slow ken-burns of one framed baby photo. 3) 6-13s: rapid rhythm cut — 9 demo photos appear one by one on the room wall (jump-cut wall filling), each with a one-line plaque ("wk 6 — first real laugh"). 4) 13-18s: pull back to the full room, text: "156 moments. With the story. In a place you'll walk through together." 5) 18-21s: ember end card.
FOOTAGE: Ken-burns over 9-12 baby/toddler-appropriate stills from the 1586 demo photos; screen-rec /flythrough?scene=room with fill=min → fill=max states cut in sequence to fake the wall filling; clip-kit counter + title overlays.
CAPTION: Not 4,000 photos. Three a week, with the story attached. That's a childhood you can actually revisit. #babyphotos #photoorganization #newmom #intentionalparenting
ICP: parent · HYPOTHESIS: Tests a stat/system hook (habit framing, utility register) vs BB-01's magic framing — is ICP-1 bought by "a tiny sustainable habit" more than by "zero effort"?

## Family: LEGACY (LG) — Memoirist / legacy-gift

**LEGACY-02 · LG-02 The question you never asked (8.57)**
HOOK: "What's the one question you never asked your father?"
BEATS: 1) 0-2s: hook as stark text on ink, no footage yet — one beat of silence. 2) 2-8s: cut to slow corridor drift past paintings (tour 12-19s segment), captions fade in: 'How did you meet mum?' / 'What were you afraid of at 30?' / 'What do you want us to keep?' 3) 8-16s: cut into the T-room, camera settles on one framed photo above the mantel — caption 'He answered. It hangs here now.' 4) 16-20s: 'Ask it this week.' 5) ember end card.
FOOTAGE: walkthrough-tour.mp4 corridor segment (12-19s) slowed 0.8x, then the tour's T-room-with-mantel segment (final ~8s) OR fresh screen-rec /flythrough?scene=room with a slow orbit onto a single artwork. Text via clip-kit.
CAPTION: Every family has one question no one asked yet. Ask yours this week. #askyourparents #familystories #memoir #legacy
ICP: memoirist · HYPOTHESIS: Direct-question hook aimed at the viewer (second person) vs LG-01's third-person biography. Tests whether prompting an unasked question drives comments ('mine would be…') and profile taps better than spectacle — and whether a near-actionless clip still earns completion.

**LEGACY-04 · LG-04 The three-generation stat (8.43)**
HOOK: "A family story survives about three generations. Then it's gone."
BEATS: 1) 0-2.5s: hook text over a freeze-frame of the painting-lined corridor. 2) 2.5-8s: camera starts moving down the corridor; captions: 'You know your grandparents' names.' / 'Can you tell one story about their parents?' 3) 8-15s: cut to a single room, slow orbit across hung photos — caption 'Unless someone builds it a place to live.' 4) 15-20s: entrance hall with named doors — 'Yours could outlast you.' 5) ember end card.
FOOTAGE: Screen-rec /flythrough?scene=corridor (freeze first frame for the hook, then play) + /flythrough?scene=room&fill=max slow orbit + walkthrough-tour.mp4 entrance-hall named-doors segment (~5-11s) for the closing beat.
CAPTION: Three generations — that's the shelf life of an untold story. #familyhistory #genealogy #legacy #oralhistory
ICP: memoirist · HYPOTHESIS: Stat/claim hook (loss-framing kept dry and factual, not tearful) vs question (LG-02) and biography (LG-01). Tests whether an intellectual 'huh, true' hook holds 3s better than an emotional one, and whether it pulls the genealogy crowd (visible in comment quality).

**LEGACY-08 · LG-08 Twelve questions this year (7.85)**
HOOK: "12 questions I'm asking my mother this year. Screenshot this."
BEATS: 1) 0-2s: hook on cream card. 2) 2-14s: questions appear 3 at a time over one continuous slow room drift (no cuts): 'What did your bedroom look like at 10?' / 'What's a smell that takes you back?' / 'What did you almost do instead?' … 12 total, save-optimized pacing. 3) 14-19s: final card 'Her answers are becoming rooms.' over the hall of named doors. 4) ember end card.
FOOTAGE: Single continuous screen-rec /flythrough?scene=room&fill=max at slowest drift as the background bed; closing beat = walkthrough-tour.mp4 entrance-hall named-doors segment. All text via clip-kit — the clip is 90% typography.
CAPTION: Save this for Sunday's call. One question a week is a memoir by December. #askyourparents #familyhistory #memoir #oralhistory #questions
ICP: memoirist · HYPOTHESIS: HT-crossover: utility/list hook engineered for saves ('screenshot this') vs emotional hooks. Tests the family's slow-burn path — whether saves and downstream activation quality (≥3 memories by D7 per cohort) beat the faster emotional clips even if 3s-hold is lower.

**LEGACY-03 · LG-03 Founder confession [FOUNDER-CAM] (7.75)**
HOOK: "I never asked my grandmother a single real question. So I built this."
BEATS: 1) 0-3s: [FOUNDER-CAM] selfie, natural light, hook spoken + burned as text. 2) 3-8s: founder VO continues over b-roll: 'By the time I thought of it, there was no one left to ask.' — cut to slow ken-burns over 3 elder-era demo photos. 3) 8-16s: VO 'So I made a place where the questions get asked while there's still time' — screen-rec entering an elder demo palace, one room. 4) 16-21s: back to [FOUNDER-CAM]: 'One question a week. That's all it takes.' 5) ember end card.
FOOTAGE: [FOUNDER-CAM] selfie-clip (2 short takes) + ken-burns over 3 stills from an elder demo palace (scripts/populate/media) + screen-rec /u/<elder-username> room entry. Founder VO throughout.
CAPTION: I built The Memory Palace because I waited too long. You don't have to. #buildinpublic #familyhistory #memoir #solofounder
ICP: founder-audience · HYPOTHESIS: The only face-on-camera cell in the family: confession hook + parasocial trust (FB mechanism) applied to the legacy register. Tests whether a founder face lifts comment-rate and signup intent for LG specifically, vs the faceless siblings.

**LEGACY-05 · LG-05 Call your mother about 1974 (7.68)**
HOOK: "Call your mother tonight. Ask her about 1974."
BEATS: 1) 0-2s: hook as a command, typewriter-reveal on cream card. 2) 2-9s: ken-burns across 4 era-specific demo photos (70s tones: kitchen, car, wedding, holiday), each captioned only with a year. 3) 9-15s: cut to one of those photos hanging in a 3D room, camera drifts past — caption 'Then give the answer somewhere to live.' 4) 15-19s: 'One call. One room.' 5) ember end card.
FOOTAGE: Ken-burns over 4 curated 1970s-looking stills from the 1586 demo photos (scripts/populate/media), then screen-rec /flythrough?scene=room or a /u/<elder-username> room where similar-era photos hang. Clip-kit captions.
CAPTION: Pick a year. Make the call. You'll be surprised what one question opens. #callyourmom #familystories #nostalgia #memorykeeping
ICP: broad · HYPOTHESIS: Imperative/command hook + a hyper-specific year vs LG-02's open question. Tests whether handing the viewer a concrete micro-action (call + year) converts to go-clicks better than reflection — and whether photo-first ken-burns footage beats 3D-first footage inside this family.

**LEGACY-09 · LG-09 POV: fifty years from now (7.60)**
HOOK: "POV: it's 2076 and you're walking through your grandmother's memories."
BEATS: 1) 0-2s: hook over black, then doors swing open. 2) 2-10s: first-person walk — named doors, into the corridor, marble-footstep audio up (restrained, not full ASMR); captions: 'Her handwriting.' / 'Her voice on this one.' / 'The kitchen, exactly as she told it.' 3) 10-17s: settle in the T-room at the mantel, hold. 4) 17-21s: caption 'She built it in 2026.' 5) ember end card.
FOOTAGE: walkthrough-tour.mp4 nearly whole (trimmed/retimed to ~19s) OR fresh screen-rec of the /flythrough?scene=onboarding camera path for a cleaner first-person feel; existing in-app marble footstep SFX layered under. Clip-kit captions.
CAPTION: The people who'll treasure it most aren't born yet. #pov #familyhistory #legacy #grandparents
ICP: broad · HYPOTHESIS: FN-crossover: platform-native POV grammar + future-tense framing (descendants, not death) as the mortality-salience vehicle. Tests whether flipping the timeline forward reaches the younger scroller who then gifts upward — a reach-heavy cell judged on profile taps, not just hold.

**LEGACY-10 · LG-10 You don't need to write a memoir (7.60)**
HOOK: "You've been 'going to write it all down' for ten years."
BEATS: 1) 0-2.5s: hook text over a still of an empty, waiting room (fill=min — pointedly sparse). 2) 2.5-6s: caption 'The book never happens. That's fine.' — room stays empty, camera drifts. 3) 6-13s: match-cut to the same room at fill=max, walls full — caption 'A memoir isn't a manuscript. It's rooms.' 4) 13-18s: quick 3-shot montage: photo on wall / upload moment / a second room — 'One memory at a time. No blank page.' 5) ember end card.
FOOTAGE: Two screen-recs of /flythrough?scene=room — one with fill=min (empty) and one with fill=max (full) — recorded on the same camera path so the cut lands as a match-cut. Montage stills from demo palaces + one 1.5s app-UI screen-rec beat (upload flow).
CAPTION: The blank page is the enemy. A room you fill one photo at a time isn't. #memoir #writing #lifestory #familyhistory
ICP: memoirist · HYPOTHESIS: Confession-by-proxy hook (naming the viewer's stalled-memoir guilt, gently) + the fill=min→fill=max match-cut as the entire product argument. Tests the 'failed memoirist' entry point vs the proud-archivist entry point (LG-01/LG-06), and whether an empty-to-full visual beat is itself a scroll-stopper.

**LEGACY-01 · LG-01 A life in nine rooms (seed, V3 lineage) (7.58)**
HOOK: "She was born in 1938. This is her whole life, in nine rooms."
BEATS: 1) 0-2s: hook text (Fraunces italic, cream on ink) over golden-hour exterior approach. 2) 2-6s: doors open, cut into first room — caption '1943. The kitchen with the radio.' 3) 6-18s: one room per ~3s, each with year + one line ('1962. He asked her at the tram stop.' / '1971. The first house.' / '1989. Grandchildren.'). 4) 18-23s: slow pull-back down the corridor, all doors visible at once — caption 'Nine rooms. One life.' 5) 23-25s: ember end card, LG-01 in corner.
FOOTAGE: Screen-rec of the era-styled elder demo palace via /u/<elder-username> visit: exterior approach reused from hero-bg-original.mp4 (0-4s segment), then room-by-room screen-recs inside the demo palace, corridor pull-back via /flythrough?scene=corridor&cam=terminus. Clip-kit overlays for year captions.
CAPTION: Nine rooms. One life. Every palace starts with a single photo. #familyhistory #memoir #lifestory #memorykeeping
ICP: memoirist · HYPOTHESIS: Baseline for the family: third-person biographical specificity ('she', a real year) as the hook. Tests whether a stranger's concrete life outperforms second-person pitches (vs LG-02/LG-05) and whether pure faceless footage carries the legacy register.

**LEGACY-06 · LG-06 The 70th-birthday gift (7.37)**
HOOK: "Her daughter gave her this for her 70th. It took her a year to fill."
BEATS: 1) 0-2s: hook over the exterior at golden hour, villa small in frame. 2) 2-7s: approach + doors opening (tour 0-8s), caption 'Not a photo book. A house.' 3) 7-16s: three quick room visits in the elder demo palace — captions 'Month 2: her childhood.' / 'Month 6: the wedding.' / 'Month 12: the grandchildren's wing.' 4) 16-21s: corridor wide shot — 'A year of Sunday phone calls, hanging on walls.' 5) ember end card.
FOOTAGE: walkthrough-tour.mp4 approach segment (0-8s) + screen-recs of 3 rooms in an elder demo palace via /u/<elder-username> + /flythrough?scene=corridor&cam=portal wide shot. Clip-kit month captions.
CAPTION: The gift wasn't the palace. It was the year of conversations it started. #giftideas #memoir #familyhistory #meaningfulgifts
ICP: memoirist · HYPOTHESIS: The gifted-by-adult-child narrative told as a curiosity-gap mini-story (gift → what happened next) vs direct pitches. Tests whether the adult-child gifter — the actual buyer — responds to seeing the receiving parent's experience, and whether the 'month 2… month 12' time-lapse structure holds completion.

**LEGACY-07 · LG-07 The only photo that survived (7.37)**
HOOK: "This is the only photo of their wedding that survived. 1968."
BEATS: 1) 0-2.5s: hook over the damaged/faded original, full frame, held still. 2) 2.5-6s: slow wipe-reveal to the restored version (GFPGAN pair) — no music sting, just a quiet swell. 3) 6-13s: cut to the restored photo hanging in a room; camera pulls back to reveal the whole wall of that decade. 4) 13-18s: caption 'Restored. Then given a room.' 5) ember end card.
FOOTAGE: GFPGAN before/after pair generated from an old-looking 1960s wedding-style still in the demo photo library; wipe-reveal built in edit. Then screen-rec /flythrough?scene=room (or /u/<elder-username>) framing the same image on the wall, pull-back orbit.
CAPTION: Some photos deserve more than a shoebox. #photorestoration #beforeandafter #familyhistory #1960s
ICP: memoirist · HYPOTHESIS: RS-crossover inside the legacy frame: artifact hook (one precious object) + transformation payoff, but the CTA lands on the palace, not the restore. Tests whether borrowed restore-demand converts to legacy intent — the named RS-tourist risk, measured as go-clicks-per-view vs pure RS clips.

## Family: FOUNDER (FB) — Founder build-in-public

**FOUNDER-04 · FB-04 Eighteen Months of Evenings (8.23)**
HOOK: "I spent 18 months of evenings building a house that doesn't exist."
BEATS: 1) 0-2s: hook over raw Blender viewport orbit of the villa exterior, wireframe/clay look. 2) 2-8s: 3-4 fast process cuts: code editor scrolling the room-geometry file, Blender dome GLB, untextured corridor. 3) 8-16s: match-cut — same camera angle, now the finished /flythrough exterior orbit in full golden light. Fraunces title at the cut. 4) 16-20s: text: 'Evenings. After bedtime. Alone.' 5) Ember end card.
FOOTAGE: Screen-rec Blender viewport (dome/exterior GLBs already in repo) + screen-rec of editor scrolling a real scene file + screen-rec /flythrough?scene=exterior orbit matched to the Blender camera angle + clip-kit.
CAPTION: The house only exists at 60fps. Built solo, evenings only. #blender3d #buildinpublic #solodev #gamedev #threejs
ICP: founder-audience · HYPOTHESIS: Tests craft-spectacle (process→payoff match-cut) as the hook mechanism: does the BUILD itself stop the scroll better than the builder's story? Also the family's best shot at younger dev/3D-art reach.

**FOUNDER-01 · FB-01 Eight Rejections (8.22)**
HOOK: "Apple rejected this app 8 times."
BEATS: 1) 0-2s: [FOUNDER-CAM] deadpan to camera, hook line burned on screen, no music yet. 2) 2-8s: rapid stack of 8 blurred App Store Connect rejection screenshots dropping onto screen, each stamped with its date (Jun 2026 → Jul 2026), soft paper-thud SFX. 3) 8-16s: hard cut to walkthrough-tour.mp4 0-7s golden approach + entrance hall — on-screen: 'This is what they finally approved.' Fraunces title 'The Memory Palace' lands at 12s. 4) 16-20s: [FOUNDER-CAM] one line: 'Worth every one.' 5) Ember end card, clip-ID corner.
FOOTAGE: [FOUNDER-CAM] selfie (2 short takes) + 8 real ASC rejection-email screenshots (blurred body text, visible dates) + walkthrough-tour.mp4 segment 0-7s (approach) and 7-12s (entrance hall with named doors) + clip-kit overlays.
CAPTION: Five months, eight rejections, one villa. Solo from Antwerp. #buildinpublic #solodev #indiehacker #appstore
ICP: founder-audience · HYPOTHESIS: Baseline for the family: the rejection-saga confession hook with the founder's face in frame 1. Tests whether underdog-adversity is FB's strongest opener vs stat (FB-02) and origin-story (FB-03) siblings.

**FOUNDER-06 · FB-06 Why a House (7.88)**
HOOK: "Why is it a villa — and not another photo app?"
BEATS: 1) 0-2s: question hook over slow corridor dolly, paintings drifting past. 2) 2-10s: VO: 'Greeks memorized speeches by walking rooms in their head. Places remember better than folders do.' Footage keeps moving corridor → doorway. 3) 10-17s: cut to entrance hall named doors — VO: 'So every family gets a house. Rooms grow as life does.' Fraunces title lands. 4) 17-22s: text: 'Method of loci, 2,000 years old. Now it holds your photos.' 5) Ember end card.
FOOTAGE: Screen-rec /flythrough?scene=corridor slow dolly + walkthrough-tour.mp4 7-14s entrance-hall named-doors segment + [FOUNDER-CAM] voice-over + clip-kit.
CAPTION: The oldest memory technique in the world, rebuilt as a place you can actually walk into. #methodofloci #memorypalace #buildinpublic #design
ICP: broad · HYPOTHESIS: Tests an intellectual curiosity-gap hook (the design rationale) vs emotional and adversity hooks — whether 'teach me why' holds and converts better than 'feel my story', and whether it earns saves (HT-adjacent behavior inside FB).

**FOUNDER-03 · FB-03 Forty Photos (7.73)**
HOOK: "My grandmother died with 40 photos. I know the story behind every one."
BEATS: 1) 0-3s: hook text over slow ken-burns on one GFPGAN-restored old portrait, silence then soft piano. 2) 3-9s: two more restored elder photos, VO: 'Someone wrote the stories on the back.' 3) 9-14s: cut to a phone-gallery scroll blur — VO: 'My phone has 6,000 photos of my daughter. I could tell you the story of ten.' 4) 14-21s: hero-bg-original.mp4 golden approach — VO: 'So I built somewhere for the stories to live.' Fraunces title lands. 5) Ember end card.
FOOTAGE: [FOUNDER-CAM] voice-over only (no face) + 3 GFPGAN before/after restored elder photos from demo media + screen-rec of a demo palace photo grid fast-scrolled to read as a camera roll + hero-bg-original.mp4 0-8s.
CAPTION: The 40-photo generation kept every story. The 6,000-photo generation is losing them. #memorykeeping #familyhistory #buildinpublic #legacy
ICP: broad · HYPOTHESIS: Tests whether the founder ORIGIN story (warmth/loss register, VO not face) can carry FB beyond the indie-hacker audience into ICP-2 territory — founder family as emotional bridge rather than build-log.

**FOUNDER-02 · FB-02 Real Numbers, Week One (7.37)**
HOOK: "Week 1 of marketing: 0 followers, 0 ads, everything public."
BEATS: 1) 0-2s: hook text over a screen-rec of the actual PostHog dashboard scrolling, no face. 2) 2-9s: clean number cards animate in (Fraunces): signups this week / visitors / € spent on ads: 0 / months of evenings: 18. 3) 9-16s: cut to walkthrough-tour.mp4 corridor 12-19s — 'What the numbers are for.' 4) 16-21s: text: 'New numbers every Monday. Ugly ones included.' 5) Ember end card.
FOOTAGE: Screen-rec of live PostHog insight 'Signups by utm_content' + clip-kit number-card overlays + walkthrough-tour.mp4 12-19s corridor segment. No [FOUNDER-CAM].
CAPTION: Zero marketing ever done until this week. Posting the real numbers every Monday from here. #buildinpublic #openstartup #indiehacker #solofounder
ICP: founder-audience · HYPOTHESIS: Tests the metrics-transparency stat hook and whether FB works faceless — if it holds attention without the face, the family's parasocial mechanism is the story, not the person (direct counter-test to FB-01).

**FOUNDER-05 · FB-05 The Part I Was Avoiding (7.37)**
HOOK: "Building it was the easy part. This is the part I've been avoiding."
BEATS: 1) 0-3s: [FOUNDER-CAM] walking outside in Antwerp, hook as caption, slightly imperfect handheld. 2) 3-10s: to camera: 'Two years of building, zero days of telling anyone it exists. Today that changes.' 3) 10-17s: cut to walkthrough-tour.mp4 T-room mantel segment — 'This is what I made. A place for a lifetime of memories.' 4) 17-23s: [FOUNDER-CAM]: 'If you've ever shipped something and gone quiet — what finally made you talk about it?' 5) Ember end card.
FOOTAGE: [FOUNDER-CAM] two handheld selfie takes (street + desk) + walkthrough-tour.mp4 tail segment (T-room with mantel, ~24-31s) + clip-kit.
CAPTION: Day one of telling people it exists. Terrifying, honestly. #buildinpublic #solofounder #shipit #indiehacker
ICP: founder-audience · HYPOTHESIS: Tests vulnerability-confession + a direct question-to-camera as a comment engine: does admitted fear outperform competence (FB-01/FB-04) on comment-rate and follows, the parasocial KPI.

**FOUNDER-07 · FB-07 My Wife Has Opinions (7.17)**
HOOK: "My wife has opinions about the last 18 months."
BEATS: 1) 0-2s: [FOUNDER-CAM] slight smile, hook on screen. 2) 2-8s: 'What she saw:' — b-roll of desk lamp at night, cold coffee, laptop glow, 23:47 on a clock. 3) 8-15s: 'What I saw:' — hard cut to hero-bg-original.mp4 golden-hour Tuscan approach, swelling music. 4) 15-21s: [FOUNDER-CAM]: 'She gets it now. Mostly.' Fraunces title. 5) Ember end card.
FOOTAGE: [FOUNDER-CAM] selfie + 3 shots of real home-office b-roll (lamp, desk, clock — phone-shot, no crew) + hero-bg-original.mp4 0-8s + clip-kit.
CAPTION: 18 months of evenings, one very patient woman. #buildinpublic #solodev #indiehacker #devlife
ICP: founder-audience · HYPOTHESIS: Tests dry humor inside the quiet-luxury register: does gentle self-deprecation beat earnestness on shares/completion without cheapening the brand? Kill fast if the tone reads as cringe in comments.

**FOUNDER-09 · FB-09 Rejection Number Five (6.92)**
HOOK: "Rejection #5 was about one button."
BEATS: 1) 0-2s: hook over a freeze-frame of the app's upgrade button, red annotation circle. 2) 2-10s: [FOUNDER-CAM] VO tells the micro-story in 3 lines: 'Apple tapped it. It errored. Months of work, one dead button.' Blurred rejection screenshot flashes. 3) 10-16s: 'The fix was four lines.' — quick code-diff screen-rec, then the button working on device. 4) 16-22s: cut to walkthrough-tour.mp4 entrance hall: 'Ship #6 got us here. Two more to go, but that's another clip.' Fraunces title. 5) Ember end card.
FOOTAGE: App UI screen-rec (upgrade flow + working tap) + one blurred ASC screenshot + tiny code-diff screen-rec + walkthrough-tour.mp4 7-12s + [FOUNDER-CAM] voice-over.
CAPTION: One dead button, one month of review queue. The full saga is eight of these. #buildinpublic #appstore #iosdev #indiehacker
ICP: founder-audience · HYPOTHESIS: Tests specificity vs summary: one concrete micro-anecdote (with an explicit open loop to the next episode) against FB-01's whole-saga version. If it wins, the saga becomes an 8-part serialized pillar format.

**FOUNDER-08 · FB-08 Zero Euro (6.83)**
HOOK: "€0 on ads. 42 palaces already standing. One dad in Antwerp."
BEATS: 1) 0-2s: triple-stat hook, black-on-cream Fraunces cards, quick rhythm. 2) 2-12s: whip-cut montage: 5 different demo palaces via /u/<username> visits — different wall art, different rooms, one second each. 3) 12-17s: text over T-room mantel: 'Every one holds a lifetime.' 4) 17-21s: 'No ads. Just this.' Fraunces title. 5) Ember end card.
FOOTAGE: Screen-recs of 5 visually distinct public demo palaces (login-free /u/<username> visits, one interior shot each) + walkthrough-tour.mp4 mantel tail + clip-kit stat cards.
CAPTION: Bootstrapped, no ad budget, no team. The palaces have to speak for themselves. #buildinpublic #bootstrapped #indiehacker #solodev
ICP: founder-audience · HYPOTHESIS: Tests a pure numbers/contrarian hook plus fast-cut variety footage: does bootstrap-pride WITHOUT the rejection saga or the face still trigger underdog identification? Isolates 'stats + montage pace' as the variable.

**FOUNDER-10 · FB-10 Ask the Architect (6.83)**
HOOK: "Ask me anything about building a 3D villa alone."
BEATS: 1) 0-2s: command hook over a slow /flythrough room orbit. 2) 2-9s: [FOUNDER-CAM] picture-in-picture corner: 'Solo dev, 18 months, every wall placed by hand — well, by code I argued with.' 3) 9-16s: orbit continues past library corner + gramophone; three example questions float by as text: 'Why Tuscany?' 'What did it cost?' 'Why not Unity?' 4) 16-21s: 'Best question becomes next week's clip.' Fraunces title. 5) Ember end card; pinned comment repeats the invite.
FOOTAGE: Screen-rec /flythrough?scene=room slow orbit (library-L corner, fireplace, gramophone visible) + [FOUNDER-CAM] small PiP selfie take + clip-kit floating-question overlays.
CAPTION: Every wall in this villa has a story about why it exists. Ask about any of them — best question gets its own clip. #buildinpublic #askmeanything #3dart #solodev
ICP: founder-audience · HYPOTHESIS: Tests the FB×CI hybrid: does an explicit question-harvest command hook manufacture a self-sustaining content loop (comments → next clips) and compound reach beyond what any one-shot FB story achieves?

## Family: NOSTALGIA (NO) — Nostalgia / on-this-day

**NOSTALGIA-06 · NO-06 Nobody Remembers the Kitchen Radio (8.45)**
HOOK: "Things that existed and left no photograph:"
BEATS: 1) 0-2s: hook line alone on cream background, Fraunces italic. 2) 2-11s: text-poetry list, one item per second over slow golden-hour hero-bg approach: 'the kitchen radio', 'the Sunday tablecloth', 'the tram stop that's a parking lot now', 'her humming'. 3) 11-17s: cut inside — tour T-room segment, warm mantel and lamplight; text: 'Write them down before they leave twice.' 4) 17-21s: brand title. 5) 21-24s: ember end card, NO-06a.
FOOTAGE: hero-bg-original.mp4 (golden-hour Tuscan approach, slowed 80%) as the full text-poetry backdrop; walkthrough-tour.mp4 final T-room/mantel segment (~24-31s); clip-kit Fraunces overlays. No photos at all — deliberately.
CAPTION: The ordinary things go first. #nostalgia #memorykeeping #textpoetry #familyhistory
ICP: broad · HYPOTHESIS: Tests OBJECT-nostalgia (vanished ordinary things) vs people-nostalgia, and whether a zero-photo, pure text-over-flythrough clip (FN-native grammar) holds attention as well as ken-burns photo clips.

**NOSTALGIA-04 · NO-04 Younger Than You Are Now (8.18)**
HOOK: "Your parents are younger in this photo than you are today."
BEATS: 1) 0-2s: hook over a faded young-couple demo photo, static. 2) 2-8s: GFPGAN wipe-reveal restores the couple's faces — hold the reveal a full beat. 3) 8-14s: text: 'They had no idea what was coming. That's the beautiful part.' as ken-burns lingers on their eyes. 4) 14-20s: cut — the restored photo hangs in the 3D salon, picture-light on; slow orbit via /flythrough?scene=room. 5) 20-23s: ember end card, NO-04a.
FOOTAGE: One GFPGAN before/after pair generated from an old-looking young-couple demo photo; ken-burns on the restored still; screen-rec /flythrough?scene=room short orbit on a painting wall; clip-kit overlays.
CAPTION: Time only runs one direction. Photos don't have to. #photorestoration #nostalgia #familyphotos #parents
ICP: broad · HYPOTHESIS: RS-crossover cell: does the age-inversion REALIZATION hook convert restore-format dopamine into palace intent (go-clicks), or does it attract restore-tourists like pure RS clips — the named failure mode?

**NOSTALGIA-08 · NO-08 Someone's Old Photo (8.05)**
HOOK: "In 40 years, this is somebody's most precious old photograph."
BEATS: 1) 0-2s: hook over a bright, ordinary new-parent demo still (baby on a kitchen floor). 2) 2-9s: the SAME still slowly degrades — progressive grain/fade filter — while a counter runs 2026 → 2066. 3) 9-15s: reverse: it re-sharpens and lands framed on a wall in the 3D room, picture-light on. 4) 15-20s: text: 'Your Tuesday is their treasure. Keep the story with it.' brand title. 5) 20-23s: ember end card, NO-08a.
FOOTAGE: One ordinary new-parent still from a young-family demo palace; grain/fade + year-counter done in edit (clip-kit); screen-rec /flythrough?scene=room framing shot of the same image placed in a demo room.
CAPTION: Old photos were once just Tuesdays. #newparents #babyphotos #nostalgia #memorykeeping
ICP: parent · HYPOTHESIS: The family's ICP-1 cell: tests FUTURE-nostalgia (today's mundane photo as tomorrow's heirloom) on parents, vs every sibling's backwards-looking nostalgia — does the inversion recruit the parent ICP the family otherwise misses?

**NOSTALGIA-03 · NO-03 What Did Your Street Sound Like (7.75)**
HOOK: "What did your street sound like in 1962?"
BEATS: 1) 0-2s: hook question over a still of an old street/facade demo photo, faint vinyl-crackle audio bed. 2) 2-10s: three sensory prompts appear one per shot over ken-burns stills: 'the tram bell', 'the baker's shutter', 'a radio through an open window'. 3) 10-16s: text 'The people who remember are still here. Ask them.' over golden-hour hero-bg-original.mp4 approach footage. 4) 16-20s: brand title lands ('The Memory Palace — where the answers live'), quick corridor glimpse. 5) 20-23s: ember end card, NO-03a.
FOOTAGE: Ken-burns over 3-4 street/exterior-era demo stills; hero-bg-original.mp4 (12s golden-hour approach, use 4-6s); walkthrough-tour.mp4 corridor 1-2s insert; clip-kit overlays; royalty-free ambient crackle bed.
CAPTION: Sound is the memory nobody photographs. #nostalgia #1960s #familyhistory #memorykeeping #oralhistory
ICP: memoirist · HYPOTHESIS: Tests a direct second-person sensory QUESTION hook (comment-bait adjacent) inside the nostalgia register — does asking about sound/smell outperform showing dated images (NO-01) on comments and 3s-hold?

**NOSTALGIA-01 · NO-01 On This Day, 1974 (7.68)**
HOOK: "August 26, 1974. Somebody's entire world."
BEATS: 1) 0-2s: black frame, Fraunces-italic date-stamp 'August 26, 1974' fades in, then hook line. 2) 2-8s: slow ken-burns across 3 elder-era demo stills (kitchen table, seaside, wedding suit) — each gets a one-word era caption ('the kitchen', 'the coast', 'the suit'). 3) 8-15s: hard cut to the same photos hanging framed in the 3D salon — screen-rec /flythrough?scene=room slow push toward the mantel. 4) 15-19s: text: 'Some days deserve a room.' 5) 19-22s: ember end card, clip-id NO-01a in corner.
FOOTAGE: Ken-burns over 3 era-appropriate stills pulled from an elder demo palace (scripts/populate/media, 42 demo palaces); screen-rec /flythrough?scene=room slow dolly-in on mantel wall; clip-kit Fraunces overlays + ember end card.
CAPTION: Every family has a date like this one. #memorykeeping #onthisday #familyhistory #nostalgia
ICP: memoirist · HYPOTHESIS: Baseline for the family: does a bare date-stamp + third-person specificity ('somebody's world', not 'your family') stop the scroll on pure nostalgia, with zero product pitch until beat 3?

**NOSTALGIA-02 · NO-02 The Back of the Photo (7.53)**
HOOK: "My grandmother owned 40 photos. I know the story behind every single one."
BEATS: 1) 0-2s: hook as white Fraunces text over a grainy still, no motion. 2) 2-9s: ken-burns close-crops of 4 old-looking demo photos; captions read like handwriting on the back: 'Marie, before the war', 'first tram to the coast'. 3) 9-14s: text: 'I have 6,000 photos of my daughter. I can't tell you the story behind ten.' over a fast blurred camera-roll-style grid of modern demo stills. 4) 14-21s: corridor tour segment — paintings with bronze plaques drifting past; text: 'So I built somewhere to write them down.' 5) 21-24s: ember end card, NO-02a.
FOOTAGE: Ken-burns over 4 aged demo stills + a grid montage of modern demo photos (1586-photo pool); walkthrough-tour.mp4 corridor segment (~12-19s, paintings + plaques); clip-kit overlays.
CAPTION: Forty photos with stories beat six thousand without them. #memorykeeping #familyphotos #nostalgia #legacy
ICP: broad · HYPOTHESIS: Tests the founder-confession register WITHOUT founder-cam: does the 40-vs-6,000 written-on-the-back story (the strongest line in our outreach copy) carry as text-only nostalgia, vs NO-09's on-camera version?

**NOSTALGIA-07 · NO-07 Open the Door to 1954 (7.48)**
HOOK: "Open the door marked 1954."
BEATS: 1) 0-2s: hook command over the entrance hall doors — tour segment where the named doors are visible. 2) 2-8s: screen-rec pushes through a door into the corridor; each passing painting gets a small year caption: 1954, 1961, 1978. 3) 8-15s: arrive in the room; camera settles on one framed photo; caption: 'the year they met'. 4) 15-19s: text: 'A house where the rooms are years.' brand title lands. 5) 19-22s: ember end card, NO-07a.
FOOTAGE: walkthrough-tour.mp4 entrance-hall named-doors segment (~6-12s) + corridor segment; screen-rec /flythrough?scene=corridor with a custom camera path through the portal into a demo room; year captions via clip-kit.
CAPTION: Every door is a year. Which one would you open first? #nostalgia #3dart #familyhistory #memorypalace
ICP: broad · HYPOTHESIS: Tests an imperative COMMAND hook + the doors-as-decades spatial metaphor: does making the architecture itself the time machine (PW-crossover wonder) beat photo-led nostalgia on profile taps?

**NOSTALGIA-05 · NO-05 Three Photos Survive (7.22)**
HOOK: "Only three photos survive from her wedding day."
BEATS: 1) 0-2s: hook over black; a single small photo fades in centered. 2) 2-9s: the three wedding stills shown one by one, ken-burns, numbered '1/3, 2/3, 3/3' in the corner. 3) 9-16s: screen-rec orbit of a demo-palace room where all three hang together over the sculpted mantel; text: 'This family gave them a wall.' 4) 16-20s: text: 'Scarce things deserve a place.' brand title lands. 5) 20-23s: ember end card, NO-05a.
FOOTAGE: 3 wedding/formal-era stills from one elder demo palace; screen-rec /flythrough?scene=room mantel orbit (or /u/<username> visit to the matching demo palace so the SAME photos appear in-world); clip-kit overlays.
CAPTION: When only three remain, each one is a monument. #familyhistory #wedding #nostalgia #memorykeeping
ICP: memoirist · HYPOTHESIS: Tests SCARCITY as the emotional lever (few precious photos) vs abundance-guilt (NO-02's 6,000) — and whether stranger's-palace third-person framing ('this family') lifts completion, borrowing from the SP family.

**NOSTALGIA-09 · NO-09 I Called My Mother About a Photograph (7.22)**
HOOK: "I called my mother about a photo from 1983. We talked for an hour."
BEATS: 1) 0-2s: [FOUNDER-CAM] selfie, natural light, hook as caption — Bram mid-thought, no performance. 2) 2-10s: founder talks (subtitled): the photo, the detail he'd never noticed, what she remembered. B-roll insert: ken-burns on one 80s-era demo still standing in for the photo. 3) 10-17s: 'I typed it all under the photo the same evening.' — screen-rec of the memory note/plaque beside the image in the 3D room. 4) 17-21s: 'One call. One photo. Try it tonight.' brand title. 5) 21-24s: ember end card, NO-09a.
FOOTAGE: [FOUNDER-CAM] selfie clip (10-12s usable); ken-burns over one 1980s-era demo still; screen-rec /flythrough?scene=room close-up of a photo + its written story; clip-kit overlays.
CAPTION: The photo was the excuse. The hour was the point. #nostalgia #callyourmom #memorykeeping #buildinpublic
ICP: founder-audience · HYPOTHESIS: The family's face-vs-faceless cell (FB-crossover): does an on-camera personal anecdote lift comment-rate and trust over the identically-registered text-only confession NO-02?

**NOSTALGIA-10 · NO-10 This Photo Turns 100 Today (7.22)**
HOOK: "This photograph turns 100 years old today."
BEATS: 1) 0-2s: hook over a heavily aged formal-portrait demo still, centered like a museum piece. 2) 2-8s: GFPGAN wipe-reveal restores it — slow, reverent, no whoosh sound. 3) 8-15s: it hangs in the corridor with a bronze plaque; camera drifts past (tour corridor segment), plaque text: '1926-2026'. 4) 15-20s: text: 'Photos deserve anniversaries too.' brand title lands. 5) 20-23s: ember end card, NO-10a.
FOOTAGE: GFPGAN before/after pair from the oldest-looking demo portrait available; walkthrough-tour.mp4 corridor drift segment (~12-19s, plaques visible); clip-kit overlays with a rendered '1926-2026' plaque caption.
CAPTION: A century, and she still looks back at you. #photorestoration #100years #nostalgia #familyhistory
ICP: memoirist · HYPOTHESIS: Tests the OBJECT-anniversary hook (birthday of the photo itself) against NO-01's event-anniversary and NO-04's realization hook: which anniversary framing drives restore-adjacent saves AND palace go-clicks rather than views alone?

## Family: CURIOUS (CI) — Curiosity-interactive / comment-bait

**CURIOUS-10 · CI-10 The Room Nobody Builds First (8.35)**
HOOK: "There's one room nobody builds first."
BEATS: 1) 0-2s: hook over a slow corridor dolly toward closed double doors — no reveal yet. 2) 2-8s: the dolly continues, cartouche coming into focus; tension held. 3) 8-13s: doors open on a quiet, sparsely-hung room; caption: 'The room of people you miss.' 4) 13-17s: text: 'Everyone builds it eventually. Would you start there?' 5) 17-19s: ember end card.
FOOTAGE: Screen-rec /flythrough?scene=corridor&cam=portal dolly toward the double doors + cartouche; reveal room = /flythrough?scene=room with fill=min in a muted demo palace; clip-kit.
CAPTION: Some rooms wait until we're ready. #memorypalace #grief #nostalgia #familymemories
ICP: memoirist · HYPOTHESIS: Curiosity-gap withholding vs direct question: does delaying the reveal to ~8s lift completion% — and do those completions convert into comments/go-clicks, or does the gap trade intent for watch-time? Also probes how close CI can go to tender loss-territory while staying below the grief-bait line.

**CURIOUS-03 · CI-03 Hang One Memory (7.98)**
HOOK: "Comment one memory. I'll hang it on this wall."
BEATS: 1) 0-2s: hook over a slow dolly toward a stretch of corridor wall with one conspicuously empty gap between paintings. 2) 2-10s: drift along the corridor's framed paintings and bronze plaquettes (the promise made visible: this is where comments end up). 3) 10-15s: text: 'Best comment gets its own frame. Walk-past posted Friday.' 4) 15-17s: ember end card.
FOOTAGE: walkthrough-tour.mp4 corridor segment (~12-19s) for the painting drift; screen-rec /flythrough?scene=corridor&cam=door for the empty-wall dolly (frame gap composited in edit or chosen from a sparser demo palace); clip-kit.
CAPTION: One sentence is enough. I'll do the rest. #memorykeeping #familymemories #memorypalace #community
ICP: broad · HYPOTHESIS: Command + reciprocity hook: does a promised physical artifact (your comment becomes a framed object) outperform pure hypothetical questions on comment quality and return viewership?

**CURIOUS-04 · CI-04 The Room of ______ (7.95)**
HOOK: "Every palace has a room of ______."
BEATS: 1) 0-2s: hook as large Fraunces text-poetry over a very slow orbit of the T-room, blank underlined. 2) 2-11s: three suggested completions fade in and out over the continuing orbit: 'of summers' / 'of her voice' / 'of the house we sold'. 3) 11-15s: text: 'Finish the sentence.' 4) 15-17s: ember end card.
FOOTAGE: Single continuous screen-rec: /flythrough?scene=room, slow orbital camera path, fill=min (near-empty room reads as the blank); all text via clip-kit Fraunces overlays. Zero editing beyond text — cheapest cell in the family.
CAPTION: Finish it however you need to. #memorypalace #textpoetry #nostalgia #memorykeeping
ICP: memoirist · HYPOTHESIS: Fill-in-the-blank text-poetry (FN-native grammar inside CI): does minimal-production text-over-beauty bait comments as well as edited multi-shot clips? If yes, CI gets a near-zero-cost weekly template.

**CURIOUS-01 · CI-01 Four Rooms (seed, refined) (7.87)**
HOOK: "If your memories were a house, which room would you build first?"
BEATS: 1) 0-2s: hook line in Fraunces italic over the golden-hour approach (hero-bg-original.mp4, first 2s). 2) 2-14s: four quick room reveals, ~3s each, lower-third captions: 'Your grandmother's kitchen' / 'The holidays room' / 'Your kid's first year' / 'The room of people you miss' — each a different demo palace so no two rooms look alike. 3) 14-18s: text: 'Tell me below. The best answer becomes a real room next week.' 4) 18-20s: ember end card, CI-01 burned in corner.
FOOTAGE: hero-bg-original.mp4 0-2s; four screen-recs of /flythrough?scene=room (fill=min and fill=max variants) captured inside four different /u/<username> demo palaces; clip-kit Fraunces captions + end card.
CAPTION: Every palace starts with one room. Which is yours? #memorykeeping #familymemories #memorypalace #nostalgia
ICP: broad · HYPOTHESIS: Family baseline: the direct open question with a four-option menu. All other CI cells are judged against this clip's comment-rate and 3s-hold.

**CURIOUS-02 · CI-02 One Door Stays Locked (7.68)**
HOOK: "You can keep one door. The other stays locked forever."
BEATS: 1) 0-2s: hook over the entrance-hall push-in, two named doors framed symmetrically. 2) 2-8s: slow pan left door, caption 'Your childhood'. 3) 8-14s: pan right door, caption 'The people you miss'. 4) 14-17s: text: 'Left or right? No third option.' 5) 17-19s: ember end card.
FOOTAGE: walkthrough-tour.mp4 entrance-hall segment (named doors, ~5-12s) for the establishing shot; two close door passes screen-recorded via /flythrough?scene=hall with the login-free viewer; clip-kit overlays.
CAPTION: An unfair question, on purpose. #memorypalace #familyhistory #choices #memorykeeping
ICP: broad · HYPOTHESIS: Forced binary vs open question (vs CI-01): does removing options raise comment volume and speed? Also tests whether mild loss-framing ('locked forever') lifts hold without tipping into grief-bait.

**CURIOUS-09 · CI-09 Which Room For Her [FOUNDER-CAM] (7.62)**
HOOK: "I've built forty palaces for strangers. I still don't know which room to give my own mother."
BEATS: 1) 0-3s: [FOUNDER-CAM] selfie hook, plain daylight, no production. 2) 3-9s: b-roll: quiet walk through a demo room, founder VO: 'Her kitchen? The garden? The tram stop where she waited in 1962?' 3) 9-14s: back to founder: 'What would you build for yours? Genuinely asking.' 4) 14-16s: ember end card.
FOOTAGE: [FOUNDER-CAM] selfie clip + voice-over; b-roll screen-rec /flythrough?scene=room slow walk in one elder-styled demo palace; clip-kit end card only (no heavy overlays — the plainness is the register).
CAPTION: Not a rhetorical question. I built this and I'm still stuck. #buildinpublic #familyhistory #memorypalace #solofounder
ICP: founder-audience · HYPOTHESIS: Person-axis test inside CI (FB crossover): does a face + confession on the same underlying ask beat the faceless versions on comment rate and trust-signals (profile taps), at the cost of reach?

**CURIOUS-08 · CI-08 Nine Rooms (7.60)**
HOOK: "Your phone: 6,000 photos. A life: about nine rooms."
BEATS: 1) 0-3s: hook over split-screen: top half a fast doom-scrolling camera-roll screen-rec, bottom half one still, lit room. 2) 3-10s: full-frame corridor glide past named rooms — the nine-rooms idea made spatial. 3) 10-15s: text: 'Name one of your nine. Just one.' 4) 15-17s: ember end card.
FOOTAGE: Camera-roll doom-scroll = app-UI screen-rec of a demo library grid scrolling fast; corridor glide = walkthrough-tour.mp4 corridor segment (~12-19s); clip-kit split-screen template + overlays.
CAPTION: Six thousand photos, nine rooms. The math is the point. #memorykeeping #newparents #digitaldeclutter #memorypalace
ICP: parent · HYPOTHESIS: Stat-contrast hook feeding an interactive ask (CR crossover): does pain-recognition + a tiny ask ('just one') beat wonder + ask on go-clicks, not just comments? Tests whether CI can carry intent, not only reach.

**CURIOUS-05 · CI-05 Name Your Seven Doors (7.53)**
HOOK: "You get seven doors. Name them."
BEATS: 1) 0-2s: hook over the dome look-up in the entrance hall. 2) 2-12s: slow pan across the named doors, lintel names legible (Roots, Nest, Craft, Travel, Passions...), caption: 'Ours are named after a real family's life.' 3) 12-16s: text: 'What would yours say? All seven.' 4) 16-18s: ember end card.
FOOTAGE: walkthrough-tour.mp4 entrance-hall segment for the dome + doors wide; close lintel passes screen-recorded via /flythrough?scene=hall (door-name boards are in-engine, readable). Clip-kit overlays.
CAPTION: Seven doors, one life. Harder than it sounds. #memorypalace #familyhistory #memorykeeping #lifeinrooms
ICP: broad · HYPOTHESIS: List-prompt vs single-choice (vs CI-01/CI-02): do multi-slot answers produce longer comments, which the algorithm weights more heavily than short ones? Also tests door-name lore as a hook asset.

**CURIOUS-06 · CI-06 What Happened That Day (7.18)**
HOOK: "This photo has hung here for a reason nobody wrote down."
BEATS: 1) 0-2s: hook over a slow ken-burns push-in on one evocative demo elder photo (era-strong: 1950s-60s). 2) 2-8s: cut wide: the same photo in situ on a room wall, picture-light on, plaquette below. 3) 8-14s: two more beats of the push-in, closer on faces. 4) 14-18s: text: 'What do you think happened that day? Wrong answers welcome.' 5) 18-20s: ember end card.
FOOTAGE: Ken-burns over 1 selected elder still from the 1586 demo photos (scripts/populate/media); matching in-situ wall shot screen-recorded inside that photo's /u/ demo palace room; clip-kit.
CAPTION: Every wall here holds a story someone almost forgot. Guesses below. #familyhistory #vintagephotos #nostalgia #memorypalace
ICP: memoirist · HYPOTHESIS: Guess-the-story voyeurism (SP crossover run as comment-bait): does third-person mystery about a stranger's photo out-comment second-person questions about your own life?

**CURIOUS-07 · CI-07 I Built Your Comment (6.88)**
HOOK: "Last week you asked for your grandmother's kitchen. I built it."
BEATS: 1) 0-2s: hook over 1s of ember-black, then the double doors. 2) 2-6s: doors open, walk-in reveal of a room dressed with kitchen-era demo photos. 3) 6-14s: slow pass along the frames, caption: 'Top comment, built as promised.' 4) 14-17s: text: 'Which room next? Comments decide.' 5) 17-19s: ember end card.
FOOTAGE: Screen-rec /flythrough?scene=room in a demo palace pre-dressed via the Manage-media flow with kitchen/domestic-themed photos from the 1586-photo pool; portal-door open from /flythrough corridor cam=portal; clip-kit.
CAPTION: You asked, the palace grew a room. Next one's yours. #memorypalace #communitybuilt #familymemories #memorykeeping
ICP: broad · HYPOTHESIS: The payoff/receipt clip: does visibly closing the loop compound the family (higher return-viewer rate, more comments on the NEXT ask-clip) — the mechanism CI's 'manufactured content' thesis depends on?

## Family: NATIVE (FN) — Format-native trends

**NATIVE-03 · FN-03 Text-poetry over golden hour (8.57)**
HOOK: "your grandmother's kitchen still exists. just not where you left it."
BEATS: 1) 0-2s: hook line in Fraunces italic over the golden-hour approach, slow zoom. 2) 2-8s: approach continues; lines fade in/out one at a time: 'the tram stop where he asked her' / 'the hallway that smelled like Sunday'. 3) 8-15s: cut inside — corridor paintings drift past; line: 'some places we can't go back to. so we built one you can.' 4) 15-19s: room reveal with hung photos; final line: 'a place made of memories.' 5) 19-22s: brand title + ember end card (FN-03a).
FOOTAGE: hero-bg-original.mp4 (12s golden-hour approach) for beats 1-2 + walkthrough-tour.mp4 corridor and T-room segments; all text via clip-kit Fraunces overlays
CAPTION: For the places you can't visit anymore. #textpoetry #nostalgia #memorypalace #placesthatfeellikememories
ICP: memoirist · HYPOTHESIS: Tests literary text-poetry as the native grammar: does a confession-adjacent poetic hook drive saves and shares (the poetry-page audience) at higher activation quality than FN-01's POV, despite slower reach?

**NATIVE-04 · FN-04 Liminal but warm (8.30)**
HOOK: "liminal spaces, except someone still loves this one"
BEATS: 1) 0-2s: hook over a static, symmetrical, empty-corridor frame — deliberately shot like a liminal-space post. 2) 2-7s: three slow symmetrical empty-space shots: hall with oculus light shaft, corridor vanishing point, closed double doors. Low ambient hum. 3) 7-12s: the turn: doors open, warm light spills, text: 'every photo here is someone's real memory'. 4) 12-17s: pan across the hung photos, warmth up, hum resolves into soft piano. 5) 17-20s: brand title + ember end card (FN-04a).
FOOTAGE: Fresh screen-recs /flythrough?scene=corridor and ?scene=hall composed as static symmetrical frames (camera parked, tiny push-in), then walkthrough-tour.mp4 T-room segment for the warm turn; clip-kit overlays
CAPTION: The opposite of an abandoned place. #liminalspaces #dreamcore #memorypalace #placesthatfeellikememories
ICP: broad · HYPOTHESIS: Tests aesthetic-trend borrowing: riding the liminal-space/dreamcore tag with a warm subversion — does hijacking an existing visual genre's search/FYP demand outperform inventing our own mood (FN-03)?

**NATIVE-09 · FN-09 If your childhood was a place (8.20)**
HOOK: "if your childhood was a place, what would the front door look like?"
BEATS: 1) 0-2s: hook over the golden-hour approach, gate coming into view. 2) 2-8s: enter the hall; camera pans across the named doors; captions appear over each: 'the summers' / 'the kitchen' / 'the people you miss'. 3) 8-14s: one door opens into a finished room; text: 'someone built theirs. every photo is real.' 4) 14-18s: slow drift, then text: 'yours is one door away.' 5) 18-20s: brand title + ember end card (FN-09a). Pinned comment carries the /go link + 'tell me your first door'.
FOOTAGE: hero-bg-original.mp4 approach + walkthrough-tour.mp4 entrance-hall named-doors segment + fresh screen-rec /flythrough?scene=room; clip-kit overlays
CAPTION: Everyone answers this differently. What's behind your first door? #memorypalace #nostalgia #childhoodmemories #povwalk
ICP: broad · HYPOTHESIS: Tests whether a self-projection question works INSIDE native trend grammar (vs the CI family's explicit comment-bait): does the question hook lift comments and profile taps without the 'I'll build the winner' promise?

**NATIVE-06 · FN-06 Romanticize your family's history (7.77)**
HOOK: "romanticize your life? romanticize your mother's."
BEATS: 1) 0-2s: hook over a fast, pretty montage-open: golden-hour facade, oculus light, one painting close-up — three cuts in two seconds. 2) 2-9s: 'main character' treatment of an ordinary life: demo photos of a woman across decades ken-burns'd like a film trailer, captions: 'the commute' / 'the tiny apartment' / 'the ordinary Tuesday that wasn't'. 3) 9-15s: cut to walking her palace — her ordinary life now hung like a museum retrospective. 4) 15-18s: text: 'ordinary lives deserve architecture.' 5) 18-20s: brand title + ember end card (FN-06a).
FOOTAGE: hero-bg-original.mp4 quick cuts + ken-burns over 5-6 stills of one woman's arc from a single demo palace + fresh screen-rec /u/<that-demo-username> visit walk; clip-kit overlays
CAPTION: Ordinary lives deserve architecture. #romanticizeyourlife #familyhistory #memorypalace #maincharacter
ICP: broad · HYPOTHESIS: Tests a command hook + the romanticize-your-life trend lexicon: does redirecting a self-focused trend onto a parent generate the share-to-mom/tag-a-sibling behavior none of the other FN siblings ask for?

**NATIVE-10 · FN-10 The quiet minute (anti-content) (7.75)**
HOOK: "the internet is loud. here's 20 seconds of somewhere quiet."
BEATS: 1) 0-2s: hook in small text, bottom third, over an already-moving slow orbit of the room at dusk lighting. No music start — just room tone. 2) 2-14s: one uninterrupted slow orbit past the mantel and hung photos; soft rain against windows; a single caption at 8s: 'a house made of one family's memories.' 3) 14-18s: orbit settles facing the fireplace; text: 'stay as long as you like. it's free to walk.' 4) 18-20s: ember end card, no music sting (FN-10a).
FOOTAGE: Fresh screen-rec /flythrough?scene=room slow 360 orbit (one take, no cuts) with warm evening fill; rain + fireplace ambience bed; clip-kit end card
CAPTION: No hook, no hurry. Just a place. #calm #ambience #memorypalace #slowliving
ICP: memoirist · HYPOTHESIS: Tests the anti-content/stillness register (confession-style meta-hook, zero cuts): does explicitly refusing platform urgency earn outsized completion % and rewatch, and does that calm audience click at higher rates than FN-02's wordless ASMR?

**NATIVE-02 · FN-02 ASMR marble tour (7.73)**
HOOK: "no talking. just footsteps in a memory palace. 🎧"
BEATS: 1) 0-2s: hook as a small lower-third caption over black-to-golden fade into the entrance hall; headphone emoji is the only 'ask'. 2) 2-10s: slow walk through the hall under the oculus — only footsteps on marble, fabric rustle, distant birdsong. Zero text. 3) 10-18s: corridor pass, one picture-light hum; a single caption at 14s: 'built from one family's photos'. 4) 18-23s: stop at the mantel, ambient room tone, hold 3 full seconds. 5) 23-25s: ember end card, silent (FN-02a).
FOOTAGE: Fresh screen-rec /flythrough?scene=hall then ?scene=corridor at half walking speed for clean long takes; foley pass (marble footsteps, room tone) in edit; clip-kit end card only — no title mid-clip
CAPTION: Twenty-five seconds of quiet. Sound on. #asmr #silentwalk #memorypalace #ambience
ICP: broad · HYPOTHESIS: Tests sound-led vs text-led hooks: can a near-zero-text ASMR clip win on completion % and saves, and does that soft intent still produce any go-clicks — or is it pure reach with no funnel?

**NATIVE-05 · FN-05 You can hear this photo (7.55)**
HOOK: "you can hear this photo, can't you?"
BEATS: 1) 0-2s: hook over a slow ken-burns push on one restored 1950s kitchen photo; faint kitchen-radio audio fades in. 2) 2-8s: three more era stills, each with its own sound bed: tram bell + street murmur, seaside wind + gulls, a record crackle. One-word year captions: 1954 / 1961 / 1973. 3) 8-13s: hard match-cut: the same photos now hanging in the 3D room, camera drifting past; all sound beds merge into room tone. 4) 13-16s: text: 'they live somewhere now.' 5) 16-18s: brand title + ember end card (FN-05a).
FOOTAGE: Ken-burns over 4 era-appropriate stills from the elder demo palaces (scripts/populate/media, 1586-photo pool) + fresh screen-rec /flythrough?scene=room pan across those same photos placed on the wall; layered era SFX; clip-kit overlays
CAPTION: Some photos come with sound. #youcanhearthisimage #nostalgia #vintagephotos #memorypalace
ICP: memoirist · HYPOTHESIS: Tests the sensory-nostalgia audio-meme format ('you can hear this image') applied to stills-first footage: do photo-led native clips hold as well as 3D-led ones, and does era-audio beat era-text (FN-03) for the 50-70 viewer?

**NATIVE-01 · FN-01 POV corridor walk (7.52)**
HOOK: "POV: you're walking to the room where your grandmother's whole life hangs"
BEATS: 1) 0-2s: hook text over first step into the corridor, camera already moving — never static. 2) 2-8s: slow POV glide down the corridor (paintings, picture-lights), no other text; footstep audio up. 3) 8-14s: door swings, cross the threshold into the T-room; text: 'she texted these to a WhatsApp number. that's all.' 4) 14-18s: slow look-up at the mantel wall of photos, hold. 5) 18-20s: Fraunces brand title fades over the room, cut to ember end card (FN-01a burned in corner).
FOOTAGE: walkthrough-tour.mp4 corridor segment (~14-22s) + fresh screen-rec /flythrough?scene=room dolly-in for the threshold-to-mantel move; footstep SFX layered; clip-kit overlays
CAPTION: Some walks you don't want to end. Walk a real one, free, no account. #povwalk #memorypalace #familyhistory #quietluxury
ICP: broad · HYPOTHESIS: Baseline for the family: does pure POV grammar (second-person embodiment, minimal text) buy native reach that still converts to profile taps — vs the sound-led and text-led siblings?

**NATIVE-08 · FN-08 Wait for the doors (beat-synced) (7.10)**
HOOK: "you've scrolled past 400 videos today. wait for the doors."
BEATS: 1) 0-2s: hook over the closed double doors, dead still. 2) 2-4s: doors open ON the first beat drop — hard cut inside. 3) 4-12s: beat-synced whip-cuts: 6 different rooms from 6 different demo palaces, one per beat — nursery wall, wedding wall, workshop, seaside room, kitchen, mantel. Each gets a two-word caption ('first steps' / 'her garden' / '1962'). 4) 12-16s: cut to slow: one room, drift, silence under text: 'every one is a real family.' 5) 16-18s: brand title + ember end card (FN-08a).
FOOTAGE: walkthrough-tour.mp4 door moment + 6 short fresh screen-recs of /u/<username> visits across 6 visually distinct demo palaces (2s each, matched camera height for clean cuts); trending-audio beat sync; clip-kit overlays
CAPTION: Six families. Six palaces. All real. #memorypalace #interiordesign #satisfying #fyp
ICP: broad · HYPOTHESIS: Tests high edit-velocity + stat/challenge hook against the family's slow-cinema default: is fast beat-synced cutting the reach engine for this asset, or does it attract pure trend-tourists (views without go-clicks)?

**NATIVE-07 · FN-07 Core memory, exterior view (6.83)**
HOOK: "this is what a core memory looks like from the outside"
BEATS: 1) 0-2s: hook over a single framed photo on the wall, extreme close-up, slight glow. 2) 2-7s: camera pulls back slowly — the photo becomes one of twelve on the mantel wall, then the whole room. 3) 7-13s: keeps pulling: through the doorway, down the corridor, into the hall — one continuous reverse journey. Text at 10s: 'and this is where they keep them.' 4) 13-17s: final pull-back through the entrance to the golden-hour exterior wide. 5) 17-19s: brand title lands on the facade, ember end card (FN-07a).
FOOTAGE: Fresh screen-rec /flythrough?scene=room → corridor → hall → exterior as one reversed camera path (record forward walk, reverse + speed-ramp in edit); close-up start on a real demo photo; clip-kit overlays
CAPTION: Every photo in here is somebody's core memory. Walk one free, no account. #corememory #memorypalace #povwalk #nostalgia
ICP: parent · HYPOTHESIS: Tests curiosity-gap hook + the one-continuous-shot pull-back edit (a native 'wait for it' grammar): does a single unbroken camera move hold 3s-and-completion better than the multi-cut siblings (FN-06, FN-08)?

## Family: STRANGER (SP) — Stranger's-palace tours

**STRANGER-10 · SP-10 The One That Got Me [FOUNDER-CAM] (8.18)**
HOOK: "I wrote 42 example lives to test my app. One of them stopped me."
BEATS: 1) 0-2s: [FOUNDER-CAM] Bram at his desk, hook as spoken line + on-screen text, screen glow on his face. 2) 2-6s: cut to screen: /u/henry-the-headmaster, 'Thirty Years a Headmaster' wing; VO: 'Henry isn't real. But my grandfather was a teacher, and this room is his.' 3) 6-14s: screen-rec walk: 'Where I Began' → schoolhouse rooms, VO quietly reading two memory titles. 4) 14-20s: back to [FOUNDER-CAM]: 'That's the test, really. If a made-up life can do this, imagine a real one.' 5) 20-25s: Fraunces title 'Built in Antwerp, one room at a time.' → ember end card.
FOOTAGE: [FOUNDER-CAM] selfie clips at desk (2 setups, ~8s total); screen-rec /u/henry-the-headmaster walkthrough as b-roll; founder VO throughout; clip-kit title + end card.
CAPTION: Solo-building this in Antwerp. The example palaces were supposed to be test data — then one of them turned into my grandfather. #buildinpublic #solofounder #memorypalace #familyhistory
ICP: founder-audience · HYPOTHESIS: The FB-crossover cell: does putting a face and a confession in front of identical SP footage lift trust signals (comments, follows, saves) over the faceless siblings — and does honesty about the demos being examples strengthen rather than break the spell?

**STRANGER-04 · SP-04 The Room for Miguel (8.13)**
HOOK: "There's one room in this palace she almost didn't build."
BEATS: 1) 0-2s: hook over a slow, still corridor shot — no music swell, just room tone. 2) 2-8s: door with nameplate 'Losing Miguel' comes into view; camera pauses at the threshold a full beat. 3) 8-16s: inside, three photos, unhurried: 'His Last Good Day' → 'The Quiet Apartment' → 'His Chair'. One caption only: 'She kept his chair.' 4) 16-21s: cut to the adjacent room's doorway light — 'Grandchildren: Empanada Sundays' — caption: 'And then she kept going.' 5) 21-25s: Fraunces title 'Room for all of it.' → ember end card.
FOOTAGE: Screen-rec /u/rosa-baila, single-room dwell in 'Losing Miguel' with slow flythrough camera path; door-nameplate closeup from corridor segment; ken-burns on the three room stills; minimal clip-kit text.
CAPTION: Grief gets a room too — and the door to the next one stays open. From Rosa's example palace. #griefandhealing #memorypalace #lifestory #legacy
ICP: memoirist · HYPOTHESIS: The slow-cell test: one room, near-silent, versus the family's fast 9-room montages. Tests whether tender single-subject dwell time drives completion + saves without tipping into grief-bait (register stays quiet-luxury; loss is one beat of five, not the frame).

**STRANGER-07 · SP-07 The Stationery Shop (7.88)**
HOOK: "He ground ink on a Hong Kong rooftop in 1948. The room still smells like it."
BEATS: 1) 0-2s: hook over extreme ken-burns closeup of 'Grinding the Ink' photo. 2) 2-8s: 3D: enter Arthur's 'The Shop & The Brush' wing — 'Chen's Stationery, the day I opened' photo on the wall, caption: 'San Francisco, 1971.' 3) 8-14s: 'Writing Letters for Elders' + 'A Name for a Newborn' — caption: 'He named the neighbourhood's babies in brushstrokes.' 4) 14-19s: 'My Granddaughter's First Stroke' photo; caption: 'The brush found her too.' 5) 19-23s: Fraunces title 'The small rooms hold the most.' → ember end card.
FOOTAGE: Ken-burns over 5 arthur-ink stills (scripts/populate/media); screen-rec /u/arthur-ink shop-wing walk; clip-kit captions.
CAPTION: Not the wedding, not the milestones — the shop counter and the ink stone. Arthur's example palace keeps the rooms nobody photographs on purpose. #calligraphy #immigrantstories #quietmoments #memorypalace #familyheritage
ICP: memoirist · HYPOTHESIS: Tests object-level sensory specificity as hook (one odd, vivid detail) vs life-summary and stat hooks — the 'unexpected room' thesis: mundane-sacred detail out-stops milestones. Sibling contrast to SP-02's date-fact opener.

**STRANGER-02 · SP-02 The Ocean Twice (Giovanni) (7.63)**
HOOK: "1954. He left Sicily with one suitcase."
BEATS: 1) 0-2s: hook as dated-caption over ken-burns of 'The Ship From Palermo' photo. 2) 2-7s: quick ken-burns pair: 'First Sight of New York' → 'Washing-up-to-construction-gang' America years, captions carry the dates. 3) 7-14s: cut to 3D: walk into the 'Coming Home' room; caption: '1978. He bought back his father's boat.' 4) 14-20s: settle on 'Teaching the Knots' grandchildren photo on the wall; caption: 'The sea gave me everything.' (his bio line). 5) 20-24s: Fraunces title 'Every life deserves a place.' → ember end card.
FOOTAGE: Ken-burns over 5 giovanni-del-mare memory stills (scripts/populate/media) for beats 1-2; screen-rec /u/giovanni-del-mare room walk for beats 3-4; clip-kit overlays throughout.
CAPTION: A fisherman's son who crossed an ocean and came home — one of our example palaces, told in dates and rooms. #immigrantstories #familyhistory #nostalgia #memorypalace #genealogy
ICP: memoirist · HYPOTHESIS: Tests a dated-fact opening (year + concrete object) against SP-01's biographical-claim hook — does era-anchored specificity out-hold a life-summary line? Also tests photo-first (2D ken-burns before 3D reveal) vs 3D-first structure.

**STRANGER-03 · SP-03 Rosa Still Dances (7.63)**
HOOK: "Meet Rosa. 84. Still dancing tango."
BEATS: 1) 0-2s: hook over her red-dress photo ('My Red Dress', Confitería Ideal era) filling the frame. 2) 2-8s: 3D glide through 'Una Vida de Tango' wing: milonga corner, borrowed shoes, the old maestro — captions in present tense: 'She opened a studio.' 'She still teaches in the plaza.' 3) 8-14s: 'Tango in Paris' + 'Iguazú Falls' retirement photos, quick warm cuts. 4) 14-18s: end on 'New Faces, Same Music' — caption: 'Buenos Aires is in her feet.' 5) 18-22s: Fraunces title 'Some lives refuse to be an album.' → ember end card.
FOOTAGE: Screen-rec /u/rosa-baila tango-wing walkthrough; ken-burns over 4 rosa stills from scripts/populate/media; clip-kit captions.
CAPTION: Rosa's example palace: seventy years of tango, kept as rooms instead of shoeboxes. #tango #stilldancing #lifestory #memorykeeping
ICP: broad · HYPOTHESIS: Tests joy/vitality register inside SP — present-tense aliveness ('still dancing') vs the retrospective/legacy register of SP-01/02. If it wins, SP doesn't need mortality salience to work.

**STRANGER-01 · SP-01 A Life in 9 Rooms (Eleanor) (7.62)**
HOOK: "She taught for forty years. This is what's left."
BEATS: 1) 0-2s: hook text over slow push through Eleanor's corridor, paintings drifting past. 2) 2-8s: room-per-beat cuts with one-line captions: 'Wartime Childhood — blackout curtains, 1941' → 'First Day, 1968 — her first classroom'. 3) 8-15s: 'Letters From Grown Pupils' room, camera settles on one framed photo; caption: 'Her pupils still write.' 4) 15-21s: 'Golden Anniversary' room, mantel shot; caption: 'Fifty years married. All of it kept.' 5) 21-25s: pull back through the entrance hall doors; Fraunces title 'A life in nine rooms.' → ember end card, ID burned in corner.
FOOTAGE: Screen-rec visitor walk of /u/eleanor-remembers (corridor + 4 rooms, slow dolly via flythrough camera paths); intercut 3 ken-burns closeups on her generated memory photos from scripts/populate/media (Blackout Curtains, First Day 1968, Fifty Years Married); clip-kit Fraunces captions + end card.
CAPTION: Eleanor is one of the example palaces we built to show what a whole life looks like as a place — a Welsh valley girl, forty years at the blackboard, kept room by room. #memorykeeping #familyhistory #lifestory #memorypalace
ICP: memoirist · HYPOTHESIS: Baseline SP concept (V3 lineage): does third-person biographical specificity ('she taught for forty years') hold better than second-person pitch? Sets the family median the other nine are judged against.

**STRANGER-08 · SP-08 You Weren't Invited (7.58)**
HOOK: "You're standing at a stranger's wedding. 1958."
BEATS: 1) 0-2s: hook over a slow first-person push toward Beatrice's 'Our Wedding, 1958' framed photo — POV, no cuts. 2) 2-9s: camera drifts along the 'Soixante Ans de Mariage' wall: Henri the boy from the next farm, four children around the table, barefoot in the vines. Captions whisper the years. 3) 9-16s: turn into 'Ma Cuisine': copper pots, the recipe notebook, the thirteen desserts — caption: 'A table always set for one more.' 4) 16-21s: POV backs out through the door; caption: 'Sixty years, and you just walked through them.' 5) 21-25s: Fraunces title 'Someone will walk yours.' → ember end card.
FOOTAGE: Single continuous screen-rec take, /u/beatrice-provence, custom flythrough camera path (marriage wing → kitchen wing, no cuts, footstep audio from tour mix); ken-burns inserts avoided deliberately; clip-kit captions.
CAPTION: One unbroken walk through sixty years of a Provence marriage — an example palace, open to anyone. #pov #provence #lovestory #memorypalace #familyhistory
ICP: broad · HYPOTHESIS: Second-person voyeur immersion ('you're standing in') vs the family's third-person narration — plus a one-take format test: does an uncut POV walk hold completion better than caption-cut montages? Ends with the only pivot-to-viewer line in the family, testing whether that lifts go-clicks.

**STRANGER-09 · SP-09 She's 24 (Sofia & Bruno) (7.35)**
HOOK: "She's 24. She already built her memory palace."
BEATS: 1) 0-2s: hook over the 'shelter visit' photo of Bruno the very large dog. 2) 2-8s: 3D walk: 'Me & Bruno' rooms — first night home, IKEA meltdown, herb garden on the sill; captions keep her deadpan titles verbatim. 3) 8-14s: 'Interrail Summer' + 'Lake Bled at dawn' rooms — caption: 'The month-long ticket. Kept.' 4) 14-19s: 'First paycheck' photo on the wall; caption: 'Ordinary now. Priceless at 80.' 5) 19-23s: Fraunces title 'Start the palace before the story's done.' → ember end card.
FOOTAGE: Screen-rec /u/sofia-and-bruno across 3 rooms; ken-burns on 4 of her stills (Bruno shelter, Lake Bled, IKEA meltdown, graduation) from scripts/populate/media; clip-kit captions.
CAPTION: An example palace for a life that's just getting started — big dog, tiny flat, month-long train ticket. #20s #dogsofinstagram #interrail #memorykeeping #memorypalace
ICP: broad · HYPOTHESIS: The demographic-stretch cell: SP has skewed elder in every sibling — does a young, funny, in-progress life ('ordinary now, priceless at 80') recruit the platform-native younger audience while still producing go-clicks, or does SP only work with a finished-feeling life?

**STRANGER-05 · SP-05 Pick a Door (7.25)**
HOOK: "Three strangers. Three front doors. You can only open one."
BEATS: 1) 0-2s: hook over the villa exterior at golden hour. 2) 2-6s: Door 1: Arthur — one-line tease over his entrance hall: 'A calligrapher who crossed to Gold Mountain.' 3) 6-10s: Door 2: Beatrice — 'Sixty years married, born among the vines.' 4) 10-14s: Door 3: Rosa — 'A tango dancer who never stopped.' 5) 14-19s: Fraunces title 'Which life do you walk first? Tell me below.' → ember end card; pinned comment carries the three /u/ links.
FOOTAGE: hero-bg-original.mp4 exterior approach (0-2s); three 3-4s screen-rec entrance-hall/named-door snippets from /u/arthur-ink, /u/beatrice-provence, /u/rosa-baila; clip-kit door-label captions.
CAPTION: Three of our example palaces are open to visit — every door is a whole life. Which one first? #choosewisely #lifestories #memorypalace #familyhistory
ICP: broad · HYPOTHESIS: The engagement-loop cell within SP: does a comment-bait sampler (3 lives, forced choice) beat single-life depth on comments + profile taps? Winning replies dictate which palace gets its own SP concept next — comments manufacture the content calendar.

**STRANGER-06 · SP-06 Forty-Two Villas (7.13)**
HOOK: "There are 42 of these. Each one is an entire life."
BEATS: 1) 0-2s: hook over the Tuscan approach, villa on the hill. 2) 2-9s: rapid-but-smooth chain of 6 one-second interior snippets, each with a name-and-place caption: 'Margit, Budapest — seamstress' / 'Samuel, Houston — one truck' / 'Chidi — a little dancer' / 'Anders — northbound' / 'Fatima — threads' / 'Mercedes — la fonda'. 3) 9-15s: slow down into ONE: Margit's 'Needle & Thread' workroom, dress form and pin cushion photos. 4) 15-20s: caption: 'Recipes nobody wrote down. Now on a wall.' 5) 20-24s: Fraunces title '42 lives, open to walk.' → ember end card.
FOOTAGE: hero-bg-original.mp4 (0-2s); six 1s screen-rec room snippets from /u/margit-garden, /u/samuel-houston, /u/chidi-okafor, /u/anders-northbound, /u/fatima-weaves, /u/mercedes-cocina; longer dwell screen-rec in margit-garden workroom; clip-kit name captions.
CAPTION: We built 42 example palaces — a seamstress in Budapest, a trucker in Houston, a cook in México — to show that any life fills a villa. #lifestories #memorykeeping #everylifematters #memorypalace
ICP: broad · HYPOTHESIS: Tests a stat/scale hook and breadth-montage vs single-biography depth: does 'the sheer catalog of lives' generate more profile taps (people going to browse) than one well-told life generates go-clicks?

## Family: HOWTO (HT) — How-to memory-keeping

**HOWTO-08 · HT-08 Sort by Room, Not by Date (8.15)**
HOOK: "Archivists have a secret: nobody remembers in chronological order."
BEATS: 1) 0-2s: curiosity-gap hook over the entrance-hall dome shot. 2) 2-9s: 'You remember in places. The kitchen. The first flat. The summers.' — text as camera pans the named doors in the entrance hall. 3) 9-17s: the method: 'So sort into rooms, not years' — Ledger drag&drop screen-rec, photos moving into room lanes. 4) 17-24s: payoff walk: corridor→room segment of the tour, walls populated by theme. 5) ember end card: 'It's called a memory palace for a reason.' HT-08 corner.
FOOTAGE: walkthrough-tour.mp4 entrance-hall named-doors segment (~8-15s) and corridor→room segment (~15-26s); screen-rec of Ledger room-lane drag&drop; clip-kit overlays.
CAPTION: The Greeks organized memory by rooms 2,000 years before folders existed. Still the best system. #memorypalace #photoorganizing #familyhistory #method
ICP: broad · HYPOTHESIS: The most product-native HT concept: tests whether teaching the actual palace method (authority/curiosity hook, product IS the tip) drives the family's best go-click rate — or reads as an ad and loses the neutral-tip hold%.

**HOWTO-03 · HT-03 The Wrong Question (8.13)**
HOOK: "I asked my grandfather to tell me about his life. That was the wrong question."
BEATS: 1) 0-2s: hook as confession text over a single static sepia demo photo, no motion. 2) 2-8s: text continues over slow zoom: ''My life' is too big. He said: not much to tell.' 3) 8-16s: the fix, over a 3-photo ken-burns sequence: 'Ask about one object. The bicycle. The radio. The coat.' — each word timed to a matching-feel demo photo. 4) 16-22s: cut to memory-detail screen-rec: an old photo with its paper-note story tile filling in beneath it. 5) ember end card, HT-03 corner.
FOOTAGE: Ken-burns over 4 old-looking demo photos (object-forward stills: bike, radio-era interior, portrait in coat); screen-rec of Library memory-detail view with paper-note text tile; clip-kit overlays.
CAPTION: Big questions get small answers. Small questions get everything. #familyhistory #oralhistory #grandparents #storytelling
ICP: memoirist · HYPOTHESIS: Tests confession/first-person-failure hook vs HT-02's list hook on the SAME interviewing topic — does vulnerability + one contrarian tip beat a 12-item resource on hold% and comments ('what object would you ask about?').

**HOWTO-07 · HT-07 Voices First (8.10)**
HOOK: "Photos keep faces. They don't keep voices."
BEATS: 1) 0-2s: hook over a slow ken-burns portrait still, warm grade. 2) 2-9s: the tip: 'Before you sort a single photo, record 3 voice notes: how they met, the house rule, the family joke.' — text over two more stills. 3) 9-17s: Kep mock screen-rec: a WhatsApp voice note arriving in the chat, then the cut to it landing as a memory in a room. 4) 17-22s: room wall slow push-in, one lamp-lit painting. 5) ember end card: 'Some memories you have to hear.' HT-07 corner.
FOOTAGE: Ken-burns over 3 warm elder-palace portraits; Kep WhatsApp chat mock screen-rec (voice-note bubble → memory-on-wall cut, reusing BB money-shot assets); screen-rec /flythrough?scene=room push-in on a picture-light painting.
CAPTION: The advice nobody gives about family archives: audio first, photos second. Three voice notes this week. #oralhistory #familystories #voicenotes #memorykeeping
ICP: memoirist · HYPOTHESIS: Tests tender near-the-line emotional register inside a utility frame (HT×LG blend) and reuses the Kep money-shot in an educational context — does warmth+utility beat pure utility on shares without tipping into grief-bait.

**HOWTO-06 · HT-06 The Caption Formula (7.88)**
HOOK: "What do you write under a 60-year-old photo?"
BEATS: 1) 0-2s: question hook over one beautiful uncaptioned demo still, held silent. 2) 2-9s: the formula appears line by line: 'Who. Where. And one detail only you know.' 3) 9-17s: live demo: memory-detail screen-rec, the paper-note tile being typed — 'Mum, Ostend, 1963. She hated that hat. Wore it every year anyway.' 4) 17-23s: pull back: the photo on the corridor wall with its bronze plaquette, camera drifts past. 5) ember end card: 'The detail is the memory.' HT-06 corner.
FOOTAGE: Single elder-era demo still; screen-rec of Library paper-note text-tile typing in memory detail; screen-rec /flythrough?scene=corridor drifting past a plaquetted painting; clip-kit overlays.
CAPTION: Names and dates are records. The hat she hated is a memory. #familyhistory #memorykeeping #storytelling #oldphotos
ICP: memoirist · HYPOTHESIS: Tests whether micro-writing craft (a tiny formula + one worked example) creates the family's best comment-rate ('my dad's version of the hat is…') — question hook + single-example depth vs list breadth.

**HOWTO-02 · HT-02 Twelve Questions for Oma (7.87)**
HOOK: "12 questions to ask your grandmother. Number 7 is the one she'll answer for an hour."
BEATS: 1) 0-2s: hook as white Fraunces text over a slow, dim corridor glide past paintings. 2) 2-12s: questions 1-6 appear as elegant list cards, two at a time, over ken-burns elder-palace stills (kitchen, wedding, doorstep photos). 3) 12-17s: beat pause — screen settles on a single still — then Q7 alone: 'What did your mother's kitchen smell like?' 4) 17-23s: Qs 8-12 fast-scroll (save-bait: too fast to read, must save), over the T-room reveal. 5) ember end card: 'Give her answers a wall.' HT-02 corner.
FOOTAGE: Screen-rec /flythrough?scene=corridor slow dolly for the open; ken-burns over 6-8 elder-skewing demo-palace stills (1950s-70s era photos from scripts/populate/media); walkthrough-tour.mp4 T-room segment; question cards via clip-kit Fraunces overlay.
CAPTION: Don't ask about her life. Ask about her mother's kitchen. Save this for the next Sunday visit. #oralhistory #grandmother #familystories #memorykeeping #genealogy
ICP: memoirist · HYPOTHESIS: Tests the curiosity-gap hook (numbered list + withheld item) and deliberate save-bait pacing vs HT-01's command hook — does 'save for later' engagement out-reach a complete system, and does it still click through?

**HOWTO-01 · HT-01 The Three Buckets (7.83)**
HOOK: "Sort 4,000 photos into 3 buckets. That's the whole system."
BEATS: 1) 0-2s: hook text in Fraunces italic over a chaotic ken-burns grid of mixed demo photos. 2) 2-8s: three labeled cards slide in over calm footage: WALLS (the 50 that tell the story), DRAWERS (context, keep but don't display), LET GO (duplicates, blur, screenshots). 3) 8-16s: cut to Ledger drag&drop screen-rec: photos being dragged into Shown vs Archive lanes — the system made physical. 4) 16-22s: slow tour push into the tidy T-room mantel: 'The walls bucket becomes a room.' 5) ember end card, HT-01 in corner.
FOOTAGE: Ken-burns montage over ~8 mixed demo photos (scripts/populate/media) for the 'chaos' open; screen-rec of Ledger drag&drop (Shown/Archive lanes); walkthrough-tour.mp4 final T-room/mantel segment (~24-31s); clip-kit overlays for the three bucket cards.
CAPTION: You don't need software to start — you need three buckets. The walls bucket is the one most people never make. #memorykeeping #photoorganizing #familyhistory #declutter
ICP: broad · HYPOTHESIS: Baseline for the family: does a complete, save-worthy SYSTEM (command hook + numbered framework) drive saves and slower-but-higher-quality clicks vs single-tip siblings? Tests utility-depth as the mechanism.

**HOWTO-04 · HT-04 Ten Minutes a Week (7.40)**
HOOK: "Sorting a lifetime of photos takes 34 hours. Or 10 minutes a week."
BEATS: 1) 0-2s: stat hook over a fast, overwhelming photo-grid flicker (20 demo photos, 100ms each). 2) 2-9s: hard cut to calm: the ritual as three text steps over upload-flow screen-rec — 'Sunday. One coffee. Five photos. Write one line each.' 3) 9-17s: time-lapse feel: room orbit where walls fill from sparse to hung (cut /flythrough?scene=room&fill=min to fill=max). 4) 17-23s: 'A year from now: 260 memories on the wall.' over the mantel close. 5) ember end card, HT-04 corner.
FOOTAGE: Rapid-flicker montage from 20 demo photos; app UI screen-rec of upload flow; two screen-recs of /flythrough?scene=room with fill=min and fill=max cut back-to-back as before/after; walkthrough-tour.mp4 mantel close-up.
CAPTION: The archive nobody starts is the one that needed 34 hours. Ten minutes on Sundays is a different thing entirely. #photoorganizing #habits #memorykeeping #familyphotos
ICP: parent · HYPOTHESIS: Tests a stat/number hook + habit-formation framing vs system/interview siblings — is 'small habit, visible compounding' (the fill=min→max payoff shot) the strongest activation-quality driver for overwhelmed ICP-1?

**HOWTO-05 · HT-05 Stop Buying Scanners (7.28)**
HOOK: "Stop buying scanners. Your phone does this better."
BEATS: 1) 0-2s: command hook, bold, over a faded/damaged old demo photo. 2) 2-10s: three quick how-to cards over stills: 'Window light, never flash. Shoot straight down. Fill the frame.' 3) 10-17s: the payoff: GFPGAN wipe-reveal before/after on that same faded photo — restored faces emerge. 4) 17-22s: second faster before/after pair, then the restored photo hanging framed on a room wall (room screen-rec close). 5) ember end card, HT-05 corner.
FOOTAGE: Two real GFPGAN before/after pairs generated from old-looking demo photos (restore engine, SUCCESS_PLAYBOOK Pillar 4 §6); clip-kit wipe transition; screen-rec /flythrough?scene=room close orbit on a hung painting for the final shot.
CAPTION: Three rules and a window is all the digitizing setup you need. The restore does the rest. #photorestoration #oldphotos #familyphotos #diy #genealogy
ICP: broad · HYPOTHESIS: The HT×RS crossover cell: does wrapping the proven restore-reveal inside a utility how-to convert restore-tourists into palace clicks better than pure RS clips — and does a blunt command hook out-hold question hooks?

**HOWTO-09 · HT-09 The Dinner-Table Question (7.12)**
HOOK: "Whole family at the table this weekend? Ask this one question."
BEATS: 1) 0-2s: question hook over golden-hour villa approach footage. 2) 2-8s: the question, alone on screen, unhurried: ''What's a smell that takes you straight back?'' 3) 8-16s: 'Then pass the phone and record every answer.' — text over ken-burns of multi-generation demo stills (table scenes, gardens, kitchens). 4) 16-22s: Kep mock: the answers arriving as WhatsApp messages, walls filling in a quick room cut. 5) ember end card, HT-09 corner.
FOOTAGE: hero-bg-original.mp4 golden-hour approach (first 6s); ken-burns over 5 gathering/kitchen/garden demo stills; Kep WhatsApp chat mock screen-rec with multiple incoming messages → room wall cut.
CAPTION: One question, passed around the table, is a better archive than a scanner in the attic. #familydinner #familystories #oralhistory #traditions
ICP: broad · HYPOTHESIS: Tests occasion-triggered utility (weekend/gathering timing, HT×SG adjacency) and group-capture framing — does a socially-performable tip (something you can DO Sunday) beat solo-archivist tips on shares and Kep-relevant signups?

**HOWTO-10 · HT-10 What 42 Families Taught Me (6.62)**
HOOK: "I've watched 42 families archive their photos. Almost everyone makes the same mistake."
BEATS: 1) 0-2s: [FOUNDER-CAM] selfie hook, natural light, direct to lens. 2) 2-9s: founder: 'They start at photo one and try to go in order. They quit by 1974.' — cut to b-roll of an endless photo-grid scroll. 3) 9-18s: the fix, founder VO over b-roll: 'Start with the 10 photos you'd grab in a fire. Hang those first. Momentum beats order.' — Ledger screen-rec, then a wall filling. 4) 18-25s: founder closes: 'The archive that exists beats the perfect one that doesn't.' Cut to mantel shot. 5) ember end card, HT-10 corner.
FOOTAGE: [FOUNDER-CAM] selfie clip (2 short takes + VO); b-roll: fast scroll screen-rec through a large demo-palace library grid; Ledger drag&drop screen-rec; /flythrough?scene=room&fill=max wall shot; walkthrough-tour.mp4 mantel close.
CAPTION: Start with the fire-list ten, not with January 1962. From watching a lot of families begin. #memorykeeping #photoorganizing #familyphotos #buildinpublic
ICP: founder-audience · HYPOTHESIS: The HT×FB cell: same anti-chronology insight as HT-08 but delivered by a face with observed-pattern authority ('42 families') — isolates whether founder-cam beats faceless polish for trust, comments, and profile taps within the how-to family.

## Family: SEASON (SG) — Seasonal / gift

**SEASON-05 · SG-05 Allerzielen — A Place to Visit (8.22)**
HOOK: "Where do you go to visit a memory?"
BEATS: 1) 0-2s: question fades in over a dark corridor still. 2) 2-10s: very slow corridor glide — picture-lights on paintings, footstep audio low. 3) 10-16s: single ken-burns on one restored elder portrait, warm light. 4) 16-21s: overlay: 'Memories become a place your loved ones can visit.' 5) 21-25s: ember end card, no CTA push — just the wordmark.
FOOTAGE: Screen-rec /flythrough?scene=corridor at half walking speed (custom slow camera path, cam=portal→terminus) + one GFPGAN before-kept-subtle restored elder portrait ken-burns; ASMR-level footsteps from tour audio.
CAPTION: For the ones we still set a place for. #allerzielen #remembrance #familyhistory #legacy
ICP: memoirist · HYPOTHESIS: The tender end of the SG register (All Souls, Nov 2 window): tests whether quiet remembrance framing — question hook, no urgency, no price — drives higher-quality clicks than gift-urgency siblings, without tipping into grief-bait.

**SEASON-01 · SG-01 Not Another Candle (8.20)**
HOOK: "Don't buy your mother another candle."
BEATS: 1) 0-2s: hook line in Fraunces italic over black, hard cut on beat. 2) 2-8s: golden-hour Tuscan approach (hero-bg) — the villa appears as the 'gift'. 3) 8-15s: corridor glide past framed family paintings, brass plaquettes catching light. 4) 15-20s: T-room mantel with her photos on it; overlay: 'A place made of her memories.' 5) 20-24s: ember end card: 'The gift that isn't stuff.'
FOOTAGE: hero-bg-original.mp4 0-6s approach + walkthrough-tour.mp4 12-19s corridor segment + tour mantel close (final seconds), clip-kit Fraunces overlays + ember end card.
CAPTION: Some gifts get returned. This one gets visited. #giftideas #meaningfulgifts #familymemories #memorykeeping
ICP: memoirist · HYPOTHESIS: Baseline SG concept: does a negation-command hook ('don't buy X') aimed at the gifting adult child stop the scroll better than question/stat siblings, with pure product-wonder footage carrying the body?

**SEASON-10 · SG-10 The Man Who Needs Nothing (8.08)**
HOOK: "What do you give the man who says he needs nothing?"
BEATS: 1) 0-2s: question over a still of a stranger's palace exterior at dusk. 2) 2-10s: visit screen-rec: walking a real (demo) grandfather's palace — workshop room, travel room, one wall of black-and-white restorations. 3) 10-16s: slow push on a single restored portrait; overlay: 'His 40 years. Nine rooms.' 4) 16-21s: overlay: 'He said he needed nothing. He talked for an hour.' 5) 21-24s: ember end card: 'Ask him the first question.'
FOOTAGE: Screen-rec /u/<elder-demo-username> visitor walk (pick the richest craft/travel demo palace) + one GFPGAN restored B&W portrait push-in; clip-kit overlays.
CAPTION: Not stuff. Stories. #giftsforgrandpa #familyhistory #giftideas #legacy
ICP: memoirist · HYPOTHESIS: SP×SG crossover: third-person specificity ('this man's 40 years') applied to the classic gift-guide question hook — does a stranger's finished palace sell the gift harder than second-person pitches, per the SP family thesis?

**SEASON-09 · SG-09 A Memoir by Next Christmas (7.75)**
HOOK: "52 questions. By next Christmas, she'll have written her memoir without noticing."
BEATS: 1) 0-2.5s: curiosity-gap hook over black, '52' oversized. 2) 2.5-9s: rapid WhatsApp mock: five questions flash by ('Your first job?' 'The kitchen radio?' 'How you met?') each answered with a photo/voice bubble. 3) 9-16s: ken-burns chain: 5 era photos (50s→90s) in quick succession, one per answered question. 4) 16-21s: pull-back: room orbit showing all of them hung together. 5) 21-25s: ember end card: 'One question a week. A lifetime on the walls.'
FOOTAGE: Kep WhatsApp chat mock screen-rec (5 rapid Q&A bubbles) + ken-burns over 5 era-spanning demo photos from one elder demo palace + screen-rec /flythrough?scene=room orbit fill=max.
CAPTION: She thinks she's just answering texts. #familyhistory #memoir #giftsforparents #52weeks
ICP: memoirist · HYPOTHESIS: Tests the accumulation promise ('a memoir by next Christmas') as a curiosity-gap number hook — whether the year-long outcome converts the gifter better than the single magic-moment (SG-03) or the walk-in reveal (SG-08).

**SEASON-07 · SG-07 She Returns Everything [FOUNDER-CAM] (7.47)**
HOOK: "My mother returns every gift I've ever bought her."
BEATS: 1) 0-3s: [FOUNDER-CAM] selfie, deadpan confession to camera. 2) 3-8s: 'So this year I built her something she can't return.' — cut to villa approach. 3) 8-15s: b-roll: entrance hall doors, corridor paintings, mantel with 'her' photos (demo palace). 4) 15-20s: back to founder: 'One question a week, over WhatsApp. She answers. The walls fill.' 5) 20-24s: ember end card.
FOOTAGE: [FOUNDER-CAM] selfie clips (2 short takes) + hero-bg approach + walkthrough-tour.mp4 hall/corridor/mantel segments as b-roll; clip-kit end card.
CAPTION: Unreturnable. Built in Antwerp, one Apple rejection at a time. #buildinpublic #giftsformom #familystories #memorykeeping
ICP: founder-audience · HYPOTHESIS: The FB×SG crossover cell: does a founder-face confession hook lift trust/comment-rate on a gift pitch versus the faceless polished siblings — i.e., does 'a face' matter more when money (€59 gift) is explicitly in play?

**SEASON-03 · SG-03 The First Question (7.38)**
HOOK: "This gift comes with one question — and you write it."
BEATS: 1) 0-2s: hook text over a paused WhatsApp chat mock. 2) 2-8s: screen-rec: buyer types 'Papa, how did you REALLY meet mama?' — send. 3) 8-14s: typing dots… voice-note bubble arrives from 'Papa'. 4) 14-20s: match-cut: a restored 1970s photo materialises on the T-room wall beside the mantel. 5) 20-24s: ember end card: 'Give someone their story back.'
FOOTAGE: Kep WhatsApp chat mock screen-rec (app UI) + tour T-room mantel segment for the wall-cut + one GFPGAN-restored demo photo as the arriving memory.
CAPTION: You ask the first question. They answer for a year. #giftsforparents #familystories #whatsapp #memorykeeping
ICP: memoirist · HYPOTHESIS: Tests the Kep gift mechanic itself as the hook (curiosity-gap on 'you write it') — whether the interactive ritual outperforms showing the villa; feeds the Kep North Star from the SG family.

**SEASON-08 · SG-08 POV: The Recipient (7.22)**
HOOK: "POV: your daughter gave you a villa for Christmas."
BEATS: 1) 0-2s: POV hook over a hand-held-feel first frame of the gates. 2) 2-9s: first-person walk-in: approach → doors open → entrance hall, her name visible on a door lintel. 3) 9-16s: she 'enters' the first room: her own wedding photo already hanging (the buyer pre-loaded it). 4) 16-21s: overlay: 'It starts with one photo and one question.' 5) 21-24s: ember end card: 'Give the walk-in moment.'
FOOTAGE: Screen-rec /flythrough?scene=onboarding (assemble-before-reveal walk-in path) + scene=room entry with a single hero photo placed (fill=min), door-name overlay from a demo palace.
CAPTION: The unwrapping takes about nine rooms. #pov #christmasgift #giftsforgrandparents #memorypalace
ICP: memoirist · HYPOTHESIS: Flips the camera to the recipient's first-visit moment with a native POV hook: tests recipient-experience footage (the walk-in reveal) vs. buyer-benefit framing — is the 'unwrapping moment' the real money-shot of the gift rail?

**SEASON-02 · SG-02 Year in Your Palace (Wrapped) (7.00)**
HOOK: "247 memories. 9 rooms. 1 year."
BEATS: 1) 0-2s: stats punch on screen one by one, Wrapped-cadence, over dark frame. 2) 2-9s: fast ken-burns montage: 8-10 demo-palace photos, each stamped with a month label (Jan… Dec). 3) 9-16s: screen-rec orbit of a filled room — walls dense with the year's photos. 4) 16-21s: overlay: 'Your year, hung on walls.' 5) 21-24s: ember end card: 'See your Year in the Palace.'
FOOTAGE: Ken-burns over 10 demo photos (scripts/populate/media, one palace for coherence) + screen-rec /flythrough?scene=room slow orbit with fill=max, clip-kit month-label overlays.
CAPTION: Spotify wraps your songs. We wrap your year. #yearinreview #wrapped #memorykeeping #familyphotos
ICP: broad · HYPOTHESIS: Tests whether the borrowed 'Wrapped' recap grammar (stat-stack hook + month-stamped montage) buys December reach that still converts — format-native seasonal vs. sincere gift framing (SG-01/04).

**SEASON-04 · SG-04 Sinterklaas Bestaat Wél [NL] (6.75)**
HOOK: "Sinterklaas bestaat niet. Het perfecte cadeau voor je ouders wél."
BEATS: 1) 0-2.5s: hook in Fraunces over slow villa approach. 2) 2.5-9s: entrance hall pan past the named doors — overlay: 'Een paleis voor hún herinneringen'. 3) 9-15s: WhatsApp mock: 'Elke week één vraag.' — one bubble, one photo lands on a wall. 4) 15-20s: mantel shot; overlay: 'En jij schrijft de allereerste vraag.' 5) 20-23s: ember end card, Dutch: 'Geef hun verhaal terug.'
FOOTAGE: walkthrough-tour.mp4 entrance-hall segment (named doors) + hero-bg approach 0-3s + Kep WhatsApp mock (Dutch copy) + one demo photo insert; clip-kit overlays in Dutch.
CAPTION: Geen chocolade. Geen sokken. Een jaar vol verhalen. #sinterklaas #pakjesavond #cadeautip #herinneringen
ICP: memoirist · HYPOTHESIS: The local-language cell: does Dutch/Flemish seasonal copy (Sinterklaas window, Nov 18 wave) reach the BE/NL gifting adult child better than English siblings — informs whether the Q4 push splits by language.

**SEASON-06 · SG-06 Forgotten by February (6.72)**
HOOK: "The average Christmas gift is forgotten by February."
BEATS: 1) 0-2s: stat line stark on cream background. 2) 2-5s: beat of silence, then: 'This one is still growing in July.' 3) 5-12s: time-lapse illusion: same room orbit twice — fill=min cut to fill=max, walls visibly filling with photos. 4) 12-18s: corridor glide; overlay: '52 weeks. 52 answers.' 5) 18-22s: ember end card: 'The gift that keeps being added to.'
FOOTAGE: Two screen-recs of /flythrough?scene=room with identical camera path, fill=min then fill=max, hard-cut for the 'growing' effect + tour corridor 12-19s; clip-kit overlays.
CAPTION: Most gifts peak on the 25th. This one doesn't. #christmasgifts #giftideas #familymemories #thoughtfulgifts
ICP: broad · HYPOTHESIS: Tests a claim-stat hook + the fill=min→max 'growing room' visual as proof-of-durability — durability framing vs. emotion framing (SG-01) and mechanic framing (SG-03) for the Dec 9 Christmas wave.
