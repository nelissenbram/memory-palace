# Mappengids — wat staat waar?

_Laatst bijgewerkt: 2026-09-05. Eén repo (`C:\Users\nelis\memory-palace`) bevat alles; alle branches zitten hierin._

## Checkouts in je home-directory

| Map | Doel |
|---|---|
| `~\memory-palace` | **Het project.** Alle branches (`master`, `staging`, `feature/*`) zitten in deze ene kloon. |
| `~\memory-palace-staging` | Tweede kloon op de `staging`-branch, in gebruik door een parallelle agent-sessie. **Weghalen zodra die sessie klaar is** — al het gecommitte werk staat op GitHub (`origin/staging`); check eerst `git status` op losse bestanden. |

_(Verwijderd op 2026-09-05: `~\mp-cron-fix` — was volledig gepusht; `~\memory-palace-ios-build` — samengevoegd in `memory-palace-ios-build/` hieronder.)_

## App-broncode (getrackt in git)

| Map | Doel |
|---|---|
| `src/` | Next.js-app (de eigenlijke Memory Palace-webapp) |
| `public/` | Statische assets voor de webapp |
| `worker/` | Worker-code |
| `supabase/` | Database/backend-configuratie |
| `android/` | Capacitor Android-project |
| `assets/` | Projectassets |
| `scripts/` | Hulp- en capture-scripts (seed, screenshots, docx-generatie, `week1/` clip-tooling op de staging-branch) |
| `docs/` | Documentatie, o.a. deze gids, `CHIEF-TECH-REQUIREMENTS.md`, monetization-research |
| `store-assets/` | App Store-/Play Store-materiaal, Apple-review-correspondentie, screenshots |

## Lokale werkmappen (bewust NIET in git — zie .gitignore)

| Map | Doel |
|---|---|
| `cos-autonomy/` | Chief of Staff-agent (Julia): charters, runs, dagmail |
| `legal-autonomy/` | Chief Legal-agent (Ottavia): charters, reviews, dashboard |
| `ops-autonomy/` | Ops-agent: charters, runs, dashboard |
| `socials-kit/` | Social-media-productie: clips (~2,6 GB!), banners, persona's, autonomy-pipeline van de chiefs |
| `*.docx` in root | Businessplan, playbook, reach-out-plan, clip-catalog — **moeten in de root blijven**, de autonomy-charters verwijzen ernaar als "repo-root" |
| `tmp/` | Oude seed-scripts en batches (laatst gebruikt juni 2026) |
| `_aab_download/` | Gedownloade Android release-bundle (andere build dan `android-release-v8/`) |
| `.edge-profile-copy/` | Lokale browserprofiel-kopie voor capture-scripts |

## Legacy / buildrestanten

| Map | Doel |
|---|---|
| `memory-palace-ios-build/` | Oude handmatige iOS-buildinstructies (v1.0.1) + iconen/splash. iOS-builds lopen nu via Codemagic (`codemagic.yaml`). Alleen historisch. |
| `android-release-v8/` | Oudere Android release-bundle (`app-release.aab`), getrackt in git |
| `aphrodite.stl` + `stl2glb.mjs` (root) | 3D-model + eenmalig conversiescript, getrackt in git |
| `out/`, `.next/` | Buildoutput (genegeerd) |
