// Build the "Growth & Product" dashboard in PostHog (EU) via the private API.
// Usage: node setup-posthog-dashboard.mjs <path-to-env-with-POSTHOG_PERSONAL_API_KEY>
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
  return JSON.parse(text);
}

// Resolve project
const me = await api("GET", "/api/projects/@current/");
const P = me.id;
console.log(`project: ${me.name} (id ${P})`);

// Dashboard
const dash = await api("POST", `/api/projects/${P}/dashboards/`, {
  name: "Growth & Product",
  description:
    "Signups (server-side, incl. backfill), activatie en monetisatie. Bron van waarheid voor signups: event user_signed_up.",
  pinned: true,
});
console.log(`dashboard: ${HOST}/project/${P}/dashboard/${dash.id}`);

const trend = (name, description, series, extra = {}) => ({
  name,
  description,
  dashboards: [dash.id],
  query: {
    kind: "InsightVizNode",
    source: {
      kind: "TrendsQuery",
      series,
      interval: extra.interval || "week",
      dateRange: { date_from: extra.date_from || "-90d" },
      ...(extra.breakdownFilter ? { breakdownFilter: extra.breakdownFilter } : {}),
      ...(extra.trendsFilter ? { trendsFilter: extra.trendsFilter } : {}),
    },
  },
});
const ev = (event, math = "total", opts = {}) => ({ kind: "EventsNode", event, math, ...opts });

const insights = [
  trend("Nieuwe gebruikers per week", "user_signed_up — server-side geteld, incl. backfill van vóór 5 sep 2026.", [
    ev("user_signed_up", "dau" /* unique users */),
  ]),
  trend("Nieuwe gebruikers per dag (30d)", "Dagelijkse signups, laatste 30 dagen.", [ev("user_signed_up", "dau")], {
    interval: "day",
    date_from: "-30d",
  }),
  trend("Signups naar methode", "email vs oauth. Backfill-events (vóór 5 sep) hebben geen methode.", [ev("user_signed_up")], {
    breakdownFilter: { breakdown: "method", breakdown_type: "event" },
  }),
  trend("Cumulatieve gebruikersgroei", "Totaal aantal geregistreerde gebruikers over tijd.", [ev("user_signed_up")], {
    date_from: "-180d",
    trendsFilter: { display: "ActionsLineGraphCumulative" },
  }),
  trend("Activatie: users die een memory aanmaken", "Unieke gebruikers met memory_created per week (alle bronnen).", [
    ev("memory_created", "dau"),
  ]),
  trend("Memories per bron", "memory_created met breakdown op source (manual/kep/import/concierge).", [ev("memory_created")], {
    breakdownFilter: { breakdown: "source", breakdown_type: "event" },
  }),
  trend("Monetisatie: trials & checkouts", "trial_started, trial_converted, checkout_completed per week.", [
    ev("trial_started"),
    ev("trial_converted"),
    ev("checkout_completed"),
  ]),
  trend("Churn-signalen", "subscription_cancelled en subscription_expired per week.", [
    ev("subscription_cancelled"),
    ev("subscription_expired"),
  ]),
];

for (const ins of insights) {
  const r = await api("POST", `/api/projects/${P}/insights/`, ins);
  console.log(`insight aangemaakt: ${ins.name} (id ${r.id})`);
}

// Funnel: signup → eerste memory (14 dagen conversievenster)
const funnel = await api("POST", `/api/projects/${P}/insights/`, {
  name: "Funnel: signup → eerste memory",
  description: "Hoeveel nieuwe gebruikers maken binnen 14 dagen een memory aan? (vanaf 5 sep betrouwbaar; backfill heeft geen volgorde-context)",
  dashboards: [dash.id],
  query: {
    kind: "InsightVizNode",
    source: {
      kind: "FunnelsQuery",
      series: [
        { kind: "EventsNode", event: "user_signed_up" },
        { kind: "EventsNode", event: "memory_created" },
      ],
      dateRange: { date_from: "-90d" },
      funnelsFilter: { funnelWindowInterval: 14, funnelWindowIntervalUnit: "day" },
    },
  },
});
console.log(`funnel aangemaakt (id ${funnel.id})`);
console.log(`\nKLAAR → ${HOST}/project/${P}/dashboard/${dash.id}`);
