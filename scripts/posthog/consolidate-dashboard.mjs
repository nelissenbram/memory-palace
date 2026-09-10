// Consolideer de 3 PostHog-dashboards tot één rapport (2026-09-10, owner-verzoek).
// - Verhuist de beste tegels van "My App Dashboard" (652065) en
//   "Memory Palace - Gebruik & Funnel" (937096) naar "Growth & Product" (935263).
// - Maakt 4 nieuwe inzichten voor data die nog nergens zichtbaar was:
//   /go-attributie (kanaal + clip-code), onboarding-funnel, paywall viewed/skipped.
// - Prefixt alle tegelnamen met een sectie (Acquisitie/Activatie/Gebruik/Monetisatie/Wie)
//   zodat het één leesbaar rapport wordt, en hernoemt het dashboard.
// - Soft-delete van de twee oude dashboards (insights blijven bestaan).
// Usage: node consolidate-dashboard.mjs <path-to-env-met-POSTHOG_PERSONAL_API_KEY>
import { readFileSync } from "node:fs";

const envFile = process.argv[2] || ".env.local";
const env = {};
for (const line of readFileSync(envFile, "utf8").split(/\r?\n/)) {
  const m = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
  if (m) env[m[1]] = m[2].replace(/^"|"$/g, "");
}
const KEY = env.POSTHOG_PERSONAL_API_KEY || process.env.POSTHOG_PERSONAL_API_KEY;
if (!KEY) throw new Error("POSTHOG_PERSONAL_API_KEY ontbreekt");
const HOST = "https://eu.posthog.com";

async function api(method, path, body) {
  const res = await fetch(`${HOST}${path}`, {
    method,
    headers: { Authorization: `Bearer ${KEY}`, "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`${method} ${path} → ${res.status}: ${text.slice(0, 300)}`);
  return text ? JSON.parse(text) : null;
}

const me = await api("GET", "/api/projects/@current/");
const P = me.id;
const MAIN = 935263; // Growth & Product → wordt "Memory Palace — Rapport"
const OLD = [652065, 937096];

// ── 1. Tegels verhuizen: insight aan het hoofddashboard hangen + sectieprefix ──
// [insightId, nieuwe naam]
const moves = [
  // uit My App Dashboard (652065)
  [4020530, "Gebruik · Daily active users (DAU)"],
  [4020531, "Gebruik · Weekly active users (WAU)"],
  [4020532, "Gebruik · Retentie"],
  [4020533, "Gebruik · Growth accounting (nieuw/terug/weg)"],
  [4020534, "Acquisitie · Referring domains (14d)"],
  // uit Gebruik & Funnel (937096)
  [5818701, "Acquisitie · Paginaweergaves per pagina (30d)"],
  [5818703, "Gebruik · Gemiddelde sessieduur (30d)"],
  [5818704, "Activatie · Registraties per platform (30d)"],
  [5818706, "Gebruik · Functiegebruik (feature_used, 30d)"],
  [5818707, "Monetisatie · Pricing-funnel: bekeken → checkout → betaald (30d)"],
  [5861318, "Activatie · Eerste foto-proxy: eerste memory per persoon (platform)"],
];
// Bestaande Growth & Product-tegels: alleen sectieprefix
const renames = [
  [5803565, "Activatie · Nieuwe gebruikers per week"],
  [5803566, "Activatie · Nieuwe gebruikers per dag (30d)"],
  [5803567, "Activatie · Signups naar methode (email/oauth)"],
  [5803568, "Activatie · Cumulatieve gebruikersgroei"],
  [5803569, "Gebruik · Makers per week (unieke users met memory_created)"],
  [5803570, "Gebruik · Memories per bron (manual/kep/import)"],
  [5803571, "Monetisatie · Trials & checkouts per week"],
  [5803572, "Monetisatie · Churn-signalen"],
  [5803573, "Activatie · Funnel: signup → eerste memory (14d venster)"],
  [5803864, "Wie · Recente aanmeldingen (30d)"],
  [5803865, "Wie · Actieve makers (30d)"],
];

for (const [id, name] of moves) {
  const ins = await api("GET", `/api/projects/${P}/insights/${id}/`);
  const dashboards = Array.from(new Set([...(ins.dashboards || []), MAIN]));
  await api("PATCH", `/api/projects/${P}/insights/${id}/`, { name, dashboards });
  console.log(`verhuisd + hernoemd: ${name}`);
}
for (const [id, name] of renames) {
  await api("PATCH", `/api/projects/${P}/insights/${id}/`, { name });
  console.log(`hernoemd: ${name}`);
}

// ── 2. Nieuwe inzichten (data die nog nergens een tegel had) ──
const newInsights = [
  {
    name: "Acquisitie · /go-kliks per kanaal (30d)",
    description: "go_link_hit met breakdown op channel — de marketing-redirect-rail (/go/<slug>).",
    dashboards: [MAIN],
    query: { kind: "InsightVizNode", source: {
      kind: "TrendsQuery", interval: "day", dateRange: { date_from: "-30d" },
      series: [{ kind: "EventsNode", event: "go_link_hit", math: "total" }],
      breakdownFilter: { breakdown: "channel", breakdown_type: "event" },
    } },
  },
  {
    name: "Acquisitie · /go-kliks per clip-code (30d)",
    description: "go_link_hit totalen met breakdown op code (utm_content per clip/post) — welke content trekt.",
    dashboards: [MAIN],
    query: { kind: "InsightVizNode", source: {
      kind: "TrendsQuery", interval: "day", dateRange: { date_from: "-30d" },
      series: [{ kind: "EventsNode", event: "go_link_hit", math: "total" }],
      breakdownFilter: { breakdown: "code", breakdown_type: "event" },
      trendsFilter: { display: "ActionsBarValue" },
    } },
  },
  {
    name: "Activatie · Onboarding-funnel (30d)",
    description: "onboarding_phase_entered → onboarding_completed. Afhakers zichtbaar per stap.",
    dashboards: [MAIN],
    query: { kind: "InsightVizNode", source: {
      kind: "FunnelsQuery", dateRange: { date_from: "-30d" },
      series: [
        { kind: "EventsNode", event: "onboarding_phase_entered" },
        { kind: "EventsNode", event: "onboarding_completed" },
      ],
      funnelsFilter: { funnelWindowInterval: 1, funnelWindowIntervalUnit: "day" },
    } },
  },
  {
    name: "Gebruik · Restores (photo_restore_used, 30d)",
    description: "Geslaagde foto-restores per dag (server-side, alleen prod). colorized-breakdown: zwart-wit ingekleurd vs alleen hersteld. Kost ~$0,04/run (Kontext) — dit is dus ook de kostenteller.",
    dashboards: [MAIN],
    query: { kind: "InsightVizNode", source: {
      kind: "TrendsQuery", interval: "day", dateRange: { date_from: "-30d" },
      series: [{ kind: "EventsNode", event: "photo_restore_used", math: "total" }],
      breakdownFilter: { breakdown: "colorized", breakdown_type: "event" },
    } },
  },
  {
    name: "Monetisatie · Paywall: bekeken vs overgeslagen (30d)",
    description: "paywall_viewed en paywall_skipped per dag — hoeveel mensen zien de paywall en lopen door.",
    dashboards: [MAIN],
    query: { kind: "InsightVizNode", source: {
      kind: "TrendsQuery", interval: "day", dateRange: { date_from: "-30d" },
      series: [
        { kind: "EventsNode", event: "paywall_viewed", math: "total" },
        { kind: "EventsNode", event: "paywall_skipped", math: "total" },
      ],
    } },
  },
];
for (const ins of newInsights) {
  const r = await api("POST", `/api/projects/${P}/insights/`, ins);
  console.log(`nieuw inzicht: ${ins.name} (id ${r.id})`);
}

// ── 3. Hoofddashboard hernoemen tot hét rapport ──
await api("PATCH", `/api/projects/${P}/dashboards/${MAIN}/`, {
  name: "Memory Palace — Rapport",
  description:
    "Alles-in-één (geconsolideerd 2026-09-10). Secties: Acquisitie (verkeer & /go-attributie) · " +
    "Activatie (signups, onboarding, eerste memory) · Gebruik (DAU/WAU, retentie, features) · " +
    "Monetisatie (paywall, trials, churn) · Wie (namen). Bron van waarheid signups: user_signed_up.",
  pinned: true,
});
console.log(`dashboard hernoemd → Memory Palace — Rapport`);

// ── 4. Oude dashboards soft-deleten (insights blijven bestaan) ──
for (const id of OLD) {
  await api("PATCH", `/api/projects/${P}/dashboards/${id}/`, { deleted: true });
  console.log(`dashboard ${id} verwijderd (soft delete — terug te zetten in PostHog)`);
}

console.log(`\nKLAAR → ${HOST}/project/${P}/dashboard/${MAIN}`);
