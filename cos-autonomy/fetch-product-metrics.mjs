// Haalt elke ochtend de productcijfers uit PostHog (EU) en schrijft ze naar
// runs/<datum>/product-metrics.json + .md, zodat Julia (chief of staff) ze in de
// dagmail kan verwerken. Leest POSTHOG_PERSONAL_API_KEY uit ../.env.local.
// Faalt stil naar een "unavailable"-bestand: de dagmail mag hier nooit op breken.
// Usage: node fetch-product-metrics.mjs [YYYY-MM-DD]
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const today = process.argv[2] || new Date().toISOString().slice(0, 10);
const outDir = join(HERE, "runs", today);
mkdirSync(outDir, { recursive: true });

function fail(reason) {
  const msg = `Productcijfers (PostHog) niet beschikbaar: ${reason}`;
  writeFileSync(join(outDir, "product-metrics.json"), JSON.stringify({ date: today, available: false, reason }, null, 2));
  writeFileSync(join(outDir, "PRODUCT-METRICS.md"), `# Productcijfers — ${today}\n\n${msg}\n`);
  console.error(msg);
  process.exit(0); // bewust 0: pipeline mag doorlopen
}

let KEY;
try {
  for (const line of readFileSync(join(HERE, "..", ".env.local"), "utf8").split(/\r?\n/)) {
    const m = line.match(/^POSTHOG_PERSONAL_API_KEY=(.*)$/);
    if (m) KEY = m[1].replace(/^"|"$/g, "");
  }
} catch { /* valt hieronder in fail() */ }
if (!KEY) fail("POSTHOG_PERSONAL_API_KEY ontbreekt in .env.local");

const HOST = "https://eu.posthog.com";
const PROJECT = 169319;

async function hogql(query) {
  const res = await fetch(`${HOST}/api/projects/${PROJECT}/query/`, {
    method: "POST",
    headers: { Authorization: `Bearer ${KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({ query: { kind: "HogQLQuery", query } }),
  });
  if (!res.ok) throw new Error(`PostHog ${res.status}: ${(await res.text()).slice(0, 200)}`);
  return (await res.json()).results;
}

// Vensters: "gisteren" = laatste volledige dag; weekvergelijking = afgelopen 7d vs de 7d ervoor.
const q = (event, from, to, uniq = true) =>
  `select ${uniq ? "count(distinct person_id)" : "count()"} from events where event = '${event}'` +
  ` and timestamp >= now() - interval ${from} day and timestamp < now() - interval ${to} day`;

try {
  const [
    [[signupsYesterday]], [[signups7d]], [[signupsPrev7d]], [[signupsTotal]],
    [[activation7d]], [[trials7d]], [[converted7d]], [[checkouts7d]], [[cancels7d]],
  ] = await Promise.all([
    hogql(q("user_signed_up", 1, 0)),
    hogql(q("user_signed_up", 7, 0)),
    hogql(q("user_signed_up", 14, 7)),
    hogql(`select count(distinct person_id) from events where event = 'user_signed_up'`),
    hogql(q("memory_created", 7, 0)),
    hogql(q("trial_started", 7, 0, false)),
    hogql(q("trial_converted", 7, 0, false)),
    hogql(q("checkout_completed", 7, 0, false)),
    hogql(`select count() from events where event in ('subscription_cancelled','subscription_expired') and timestamp >= now() - interval 7 day`),
  ]);

  // Namen van recente aanmeldingen en actieve makers (person-property `name`,
  // gezet bij signup; backfill 2026-09-05). LET OP: join op de persons-tabel,
  // niet event-level person.properties — die zijn bevroren op ingestion-moment
  // en missen dus namen die ná het (backfill-)event gezet zijn.
  const nameQ = (event) =>
    `select any(coalesce(p.properties.name, '(zonder naam)')) as naam, max(e.timestamp) as laatst` +
    ` from events e left join persons p on p.id = e.person_id` +
    ` where e.event = '${event}' and e.timestamp >= now() - interval 7 day` +
    ` group by e.person_id order by laatst desc limit 25`;
  const [recentRows, activeRows] = await Promise.all([nameQ("user_signed_up"), nameQ("memory_created")].map(hogql));
  const recentNames = recentRows.map(([n]) => n);
  const activeNames = activeRows.map(([n]) => n);

  const delta = signups7d - signupsPrev7d;
  const deltaTxt = `${delta >= 0 ? "+" : ""}${delta} t.o.v. de 7 dagen ervoor (${signupsPrev7d})`;

  const data = {
    date: today,
    available: true,
    source: `${HOST}/project/${PROJECT}/dashboard/935263`,
    metrics: {
      signups_yesterday: signupsYesterday,
      signups_7d: signups7d,
      signups_prev_7d: signupsPrev7d,
      signups_total: signupsTotal,
      activation_users_7d: activation7d,
      trials_started_7d: trials7d,
      trials_converted_7d: converted7d,
      checkouts_7d: checkouts7d,
      cancels_or_expired_7d: cancels7d,
    },
    people: { recent_signups_7d: recentNames, active_makers_7d: activeNames },
  };
  writeFileSync(join(outDir, "product-metrics.json"), JSON.stringify(data, null, 2));

  const md = `# Productcijfers (PostHog) — ${today}

| Cijfer | Waarde |
|---|---|
| Nieuwe gebruikers gisteren | ${signupsYesterday} |
| Nieuwe gebruikers afgelopen 7 dagen | ${signups7d} (${deltaTxt}) |
| Totaal geregistreerde gebruikers | ${signupsTotal} |
| Actieve makers (memory aangemaakt, 7d) | ${activation7d} |
| Trials gestart / geconverteerd (7d) | ${trials7d} / ${converted7d} |
| Checkouts (7d) | ${checkouts7d} |
| Opzeggingen + expiraties (7d) | ${cancels7d} |

**Recente aanmeldingen (7d):** ${recentNames.join(", ") || "geen"}
**Actieve makers (7d):** ${activeNames.join(", ") || "geen"}

Dashboard: ${data.source}
`;
  writeFileSync(join(outDir, "PRODUCT-METRICS.md"), md);
  console.log(`product-metrics geschreven naar runs/${today}/`);
} catch (e) {
  fail(e.message);
}
