// Voegt twee naam-tegels (SQL-insights) toe aan het Growth & Product-dashboard.
// Eenmalig gedraaid 2026-09-05; bewaard zodat de dashboard-opzet reproduceerbaar is.
// Usage (vanuit de repo-root): node scripts/posthog/add-name-tiles.mjs [pad-naar-env]
import { readFileSync } from "node:fs";
const env = {};
for (const line of readFileSync(process.argv[2] || ".env.local", "utf8").split(/\r?\n/)) {
  const m = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
  if (m) env[m[1]] = m[2].replace(/^"|"$/g, "");
}
const KEY = env.POSTHOG_PERSONAL_API_KEY;
const HOST = "https://eu.posthog.com";
const P = 169319, DASH = 935263;

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

const sqlInsight = (name, description, query) => ({
  name,
  description,
  dashboards: [DASH],
  query: {
    kind: "DataVisualizationNode",
    source: { kind: "HogQLQuery", query },
    display: "ActionsTable",
  },
});

const nameQ = (event, extraCols = "") =>
  `select any(coalesce(p.properties.name, '(zonder naam)')) as naam,
     max(e.timestamp) as laatst${extraCols}
   from events e left join persons p on p.id = e.person_id
   where e.event = '${event}' and e.timestamp >= now() - interval 30 day
   group by e.person_id order by laatst desc limit 50`;

const tiles = [
  sqlInsight(
    "Wie: recente aanmeldingen (30d)",
    "Namen van nieuwe gebruikers, nieuwste eerst (user_signed_up, persons-join).",
    nameQ("user_signed_up")
  ),
  sqlInsight(
    "Wie: actieve makers (30d)",
    "Namen van gebruikers die een memory aanmaakten, met aantal (memory_created).",
    `select any(coalesce(p.properties.name, '(zonder naam)')) as naam,
       count() as memories, max(e.timestamp) as laatst
     from events e left join persons p on p.id = e.person_id
     where e.event = 'memory_created' and e.timestamp >= now() - interval 30 day
     group by e.person_id order by laatst desc limit 50`
  ),
];

for (const t of tiles) {
  const r = await api("POST", `/api/projects/${P}/insights/`, t);
  console.log(`tegel aangemaakt: ${t.name} (id ${r.id})`);
}
console.log(`dashboard: ${HOST}/project/${P}/dashboard/${DASH}`);
