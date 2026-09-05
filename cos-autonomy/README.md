# cos-autonomy — Chief of Staff (Julia)

> **Planning (sinds 2026-09-05):** Julia draait dagelijks mee in de Task
> Scheduler-taak **"MP Social Autonomy"** (05:47): eerst Aurelia/Livia/Ottavia
> parallel, daarna Julia (`chief-prompt.md`) die bundelt; de driver
> (`../socials-kit/autonomy/run-daily.ps1`) rendert en verstuurt de dagmail.
> Alleen Julia mailt; valt zij uit, dan gaat Aurelia's summary als fallback.

Vierde autonome executive, **boven** de domein-chiefs. Julia ontlast de owner: ze bundelt
Aurelia (social), Livia (ops) en Ottavia (legal) tot **één dagmail**, groepeert de acties
(**persoonlijk vs. per chief**), en plant de persoonlijke acties **in de agenda** (9-17u,
weekdagen, met respect voor reizen).

## Structuur
- `charters/00-chief-of-staff.md` — Julia's charter + kalender-regels.
- `config.json` — werkuren, tijdzone, kalender-instellingen, bronnen (de runs van de andere chiefs).
- `fetch-product-metrics.mjs` — draait in de driver vóór Julia: haalt de productcijfers
  (signups/activatie/trials/churn) uit PostHog en schrijft `runs/<datum>/product-metrics.json`
  + `PRODUCT-METRICS.md`. Julia verwerkt die tot het "Productcijfers (PostHog)"-blok met max.
  3 learnings in de dagmail (`productMetrics` in `daily.json`); de renderer heeft een vangnet
  dat de kale cijfers toont als Julia het veld weglaat. Key: `POSTHOG_PERSONAL_API_KEY` in
  `../.env.local`; dashboard: https://eu.posthog.com/project/169319/dashboard/935263.
- `runs/<datum>/DAGMAIL.md` — de samengestelde dagmail (gerenderd + gemaild via de gedeelde
  pipeline in `../socials-kit/autonomy`, chiefId `cos`).

## Dagmail genereren + versturen
```
node ../socials-kit/autonomy/render-report.mjs cos runs/<datum>/DAGMAIL.md runs/<datum>/DAGMAIL.html "<datum>"
powershell -File ../socials-kit/autonomy/md2docx.ps1 -Md runs/<datum>/DAGMAIL.md -Docx runs/<datum>/DAGMAIL.docx
powershell -File ../socials-kit/autonomy/send-mail.ps1 -Body ... -Html ... -InlineImage ../socials-kit/autonomy/assets/julia-avatar.png -Subject "..."
```
De **teamfoto** (`../socials-kit/autonomy/assets/team-photo.png`) wordt automatisch onderaan elke
mail gezet door `send-mail.ps1` (cid `team-photo`) — geldt voor álle chiefs.

## ⚠️ Kalender-status
De Google-agenda (claude.ai-koppeling) vraagt **her-autorisatie** en werkt **interactief**. De
onbemande dagjob kan de agenda daarom meestal niet zelf beschrijven. Tot dat is opgelost levert
Julia een **voorgesteld dagschema** in de mail; het definitief in de agenda zetten gebeurt in een
sessie met geldige autorisatie (of door de owner). Zie `HUMAN-SETUP.md`.
