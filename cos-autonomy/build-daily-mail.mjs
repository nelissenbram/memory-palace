// Styled daily-mail renderer for the Chief of Staff (Julia). Reads a daily.json
// and produces email-safe HTML with: per-chief colour-coded blocks + each chief's
// own photo, a collapsible extended briefing per chief, a status colour-indicator
// (green = no further steps / orange = further steps), the grouped owner-action
// list + schedule, and the group photo at the bottom. No emojis (owner 2026-09-01).
// Usage: node build-daily-mail.mjs <daily.json> <out.html>
import fs from "fs";
const [, , inPath, outPath, briefPath] = process.argv;
const d = JSON.parse(fs.readFileSync(inPath, "utf8"));

const CREAM = "#FBF7F0", CARD = "#FFFFFF", INK = "#221A12", SOFT = "#463C31", LINE = "#E4D8C6";
const COS = "#2F5D4E", COS_SOFT = "#CFE0D6";
const GREEN = "#4E8D5B", ORANGE = "#D98A2B";
const SERIF = "Georgia,'Times New Roman',serif";
const esc = (s) => String(s == null ? "" : s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const inl = (s) => esc(s).replace(/\*\*([^*]+)\*\*/g, `<strong style="color:${INK};">$1</strong>`)
  .replace(/`([^`]+)`/g, `<code style="font-family:Consolas,monospace;background:${CREAM};border:1px solid ${LINE};border-radius:3px;padding:0 4px;font-size:12px;">$1</code>`);

// --- owner personal actions table ---
const actionsRows = (d.personalActions || []).map((a, i) => `
  <tr style="background:${i % 2 ? "#FCFAF6" : CARD};">
    <td style="padding:8px 10px;border-bottom:1px solid ${LINE};color:${INK};font-family:${SERIF};font-weight:bold;text-align:center;width:26px;">${i + 1}</td>
    <td style="padding:8px 10px;border-bottom:1px solid ${LINE};color:${SOFT};">${inl(a.action)}</td>
    <td style="padding:8px 10px;border-bottom:1px solid ${LINE};color:${SOFT};white-space:nowrap;">${esc(a.from)}</td>
    <td style="padding:8px 10px;border-bottom:1px solid ${LINE};color:${SOFT};white-space:nowrap;">${esc(a.time || "")}</td>
    <td style="padding:8px 10px;border-bottom:1px solid ${LINE};color:${SOFT};white-space:nowrap;">${esc(a.urgency || "")}</td>
  </tr>`).join("");

// --- per-chief colour-coded blocks ---
const chiefBlock = (c) => {
  const isClear = c.status === "clear";
  const dot = isClear ? GREEN : ORANGE;
  const label = isClear ? "Geen verdere stappen" : "Verdere stappen nodig";
  const briefing = (c.briefing || []).map((p) => `<p style="margin:6px 0;font-size:13px;line-height:1.55;color:${SOFT};">${inl(p)}</p>`).join("");
  return `
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:14px 0;background:${CARD};border:1px solid ${LINE};border-left:5px solid ${c.accent};border-radius:12px;overflow:hidden;">
    <tr><td style="padding:14px 16px 12px;background:${c.accentSoft};">
      <table role="presentation" width="100%"><tr>
        <td width="52" style="vertical-align:middle;padding-right:12px;">
          <img src="cid:${c.id}-avatar" width="46" height="46" alt="${esc(c.name)}" style="display:block;border-radius:50%;border:2px solid ${c.accent};">
        </td>
        <td style="vertical-align:middle;">
          <span style="font-family:${SERIF};font-size:18px;color:${INK};">${esc(c.name)}</span>
          <span style="font-family:${SERIF};font-style:italic;font-size:13px;color:${c.accent};">&nbsp;&middot; ${esc(c.role)}</span>
        </td>
        <td align="right" style="vertical-align:middle;white-space:nowrap;">
          <span style="display:inline-block;width:10px;height:10px;border-radius:50%;background:${dot};vertical-align:middle;"></span>
          <span style="font-family:${SERIF};font-size:12px;color:${dot};vertical-align:middle;">&nbsp;${label}</span>
        </td>
      </tr></table>
    </td></tr>
    <tr><td style="padding:12px 16px 14px;">
      <p style="margin:0 0 6px;font-size:14px;line-height:1.55;color:${INK};">${inl(c.summary)}</p>
      ${c.actionLine ? `<p style="margin:6px 0 0;font-size:13px;color:${c.accent};"><strong>Op jouw go:</strong> ${inl(c.actionLine)}</p>` : ""}
      ${(c.briefing && c.briefing.length) ? `<p style="margin:8px 0 0;font-size:12px;color:${SOFT};font-style:italic;">Volledige briefing: bijlage <strong>BRIEFING-${esc(c.name)}</strong>.</p>` : ""}
    </td></tr>
  </table>`;
};

const deadlines = (d.deadlines || []).map((x) => `<li style="margin:4px 0;font-size:14px;line-height:1.5;color:${SOFT};"><strong style="color:${INK};">${esc(x.date)}</strong> &mdash; ${inl(x.what)}</li>`).join("");
const schedule = (d.schedule || []).map((s) => `<li style="margin:5px 0;font-size:14px;line-height:1.5;color:${SOFT};"><strong style="color:${INK};">${esc(s.time)}</strong> &nbsp;<span style="display:inline-block;background:${ORANGE};color:#fff;font-size:11px;border-radius:3px;padding:0 5px;">[MP]</span> ${inl(s.title)}${s.note ? ` <span style="color:${SOFT};font-style:italic;">&mdash; ${inl(s.note)}</span>` : ""}</li>`).join("");

const H2 = (t) => `<h2 style="font-family:${SERIF};font-weight:normal;font-size:17px;color:${INK};margin:26px 0 8px;padding-left:12px;border-left:3px solid ${COS};">${esc(t)}</h2>`;

// --- productcijfers (PostHog) — optioneel blok; Julia vult d.productMetrics,
// met als vangnet het door de driver gefetchte runs/<datum>/product-metrics.json ---
let pm = d.productMetrics;
if (!pm) {
  try {
    const raw = JSON.parse(fs.readFileSync(inPath.replace(/daily\.json$/, "product-metrics.json"), "utf8"));
    if (raw.available) {
      const m = raw.metrics;
      pm = { items: [
        { label: "Nieuwe gebruikers gisteren", value: String(m.signups_yesterday) },
        { label: "Nieuwe gebruikers 7d", value: `${m.signups_7d} (vorige 7d: ${m.signups_prev_7d})` },
        { label: "Totaal gebruikers", value: String(m.signups_total) },
        { label: "Actieve makers 7d", value: String(m.activation_users_7d) },
        { label: "Trials / conversies 7d", value: `${m.trials_started_7d} / ${m.trials_converted_7d}` },
        { label: "Opzeggingen 7d", value: String(m.cancels_or_expired_7d) },
      ], learnings: [] };
    }
  } catch { /* geen cijfers beschikbaar — blok blijft weg */ }
}
const productMetricsBlock = !pm ? "" : `
    ${H2("Productcijfers (PostHog)")}
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;font-size:13px;">
      ${(pm.items || []).map((it, i) => `<tr style="background:${i % 2 ? "#FCFAF6" : CARD};">
        <td style="padding:7px 10px;border-bottom:1px solid ${LINE};color:${SOFT};">${inl(it.label)}</td>
        <td style="padding:7px 10px;border-bottom:1px solid ${LINE};color:${INK};font-family:${SERIF};text-align:right;white-space:nowrap;">${esc(it.value)}</td>
      </tr>`).join("")}
    </table>
    ${(pm.learnings || []).length ? `<ul style="margin:8px 0 0 22px;padding:0;">${pm.learnings.map((l) => `<li style="margin:4px 0;font-size:13px;line-height:1.5;color:${SOFT};">${inl(l)}</li>`).join("")}</ul>` : ""}`;

const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:${CREAM};">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${CREAM};padding:24px 12px;"><tr><td align="center">
<div style="padding:2px 0 16px;"><img src="cid:mp-logo" height="34" alt="The Memory Palace" style="height:34px;width:auto;"></div>
<table role="presentation" width="660" cellpadding="0" cellspacing="0" style="max-width:660px;width:100%;background:${CARD};border-radius:14px;overflow:hidden;box-shadow:0 2px 18px rgba(36,28,21,.10);">
  <tr><td style="background:${COS};padding:20px 28px;">
    <table role="presentation" width="100%"><tr>
      <td width="86" style="vertical-align:middle;padding-right:16px;"><img src="cid:chief-avatar" width="78" height="78" alt="Julia" style="display:block;border-radius:50%;border:2px solid rgba(255,255,255,.6);"></td>
      <td style="vertical-align:middle;">
        <span style="font-family:${SERIF};font-size:21px;color:${CARD};">Julia</span>
        <div style="font-family:${SERIF};font-style:italic;font-size:13px;color:${COS_SOFT};margin-top:2px;">Cancelliera del Palazzo &middot; Chief of Staff</div>
      </td>
      <td align="right" style="vertical-align:middle;font-family:${SERIF};font-size:12px;color:${COS_SOFT};">${esc(d.date)}<br><span style="letter-spacing:.14em;text-transform:uppercase;font-size:10px;">The Memory Palace</span></td>
    </tr></table>
  </td></tr>
  <tr><td style="padding:10px 28px 4px;">
    <p style="font-family:${SERIF};font-style:italic;font-size:15px;color:${COS};margin:14px 0 2px;">${inl(d.greeting || "")}</p>
  </td></tr>
  <tr><td style="padding:4px 28px 22px;">
    ${H2("Jouw persoonlijke acties")}
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;font-size:13px;">
      <tr>${["#", "Actie", "Van", "Tijd", "Urgentie"].map((h) => `<th style="text-align:left;border-bottom:2px solid ${COS};background:${CREAM};padding:8px 10px;color:${INK};font-family:${SERIF};font-weight:normal;">${h}</th>`).join("")}</tr>
      ${actionsRows}
    </table>

    ${productMetricsBlock}

    ${H2("Per chief")}
    ${(d.chiefs || []).map(chiefBlock).join("")}

    ${H2("Deadlines")}
    <ul style="margin:6px 0 12px 22px;padding:0;">${deadlines}</ul>

    ${H2("Voorgesteld dagschema (9-17u, weekdag)")}
    <ul style="margin:6px 0 4px 22px;padding:0;list-style:none;">${schedule}</ul>
    <p style="font-size:12px;color:${SOFT};font-style:italic;margin:6px 0 0;">${inl(d.scheduleNote || "")}</p>
  </td></tr>
  <tr><td style="padding:14px 28px 26px;border-top:1px solid ${LINE};">
    <div style="text-align:center;margin:6px 0 12px;">
      <img src="cid:group-photo" width="360" alt="Het team" style="width:360px;max-width:88%;height:auto;border-radius:12px;">
      <div style="font-family:${SERIF};font-style:italic;font-size:11px;color:#A99B87;margin-top:4px;">Aurelia &middot; Livia &middot; Ottavia &middot; Julia</div>
    </div>
    <p style="font-family:${SERIF};font-style:italic;font-size:13px;color:${SOFT};margin:8px 0 2px;">Tot je dienst,</p>
    <p style="font-family:${SERIF};font-size:15px;color:${INK};margin:0;">&mdash; Julia<span style="color:${SOFT};font-size:12px;font-style:italic;">, Chief of Staff</span></p>
    <p style="font-size:11px;color:#A99B87;margin:12px 0 0;">Automatisch dagoverzicht van je Chief of Staff &middot; The Memory Palace</p>
  </td></tr>
</table>
</td></tr></table>
</body></html>`;

fs.writeFileSync(outPath, html);
console.log("wrote", outPath);

// Deep-dive attachments: ONE briefing document PER chief (owner 2026-09-01).
// briefPath is a DIRECTORY; writes BRIEFING-<Name>.md per chief.
if (briefPath) {
  fs.mkdirSync(briefPath, { recursive: true });
  for (const c of (d.chiefs || [])) {
    const isClear = c.status === "clear";
    const bm = [`# Briefing — ${c.name}`, `## ${c.role}`, "",
      `_${d.date} · Status: ${isClear ? "geen verdere stappen" : "verdere stappen nodig"}._`, "", `**In het kort:** ${c.summary}`, ""];
    for (const p of (c.briefing || [])) bm.push(p, "");
    if (c.actionLine) bm.push(`**Op jouw go:** ${c.actionLine}`, "");
    const fp = `${briefPath}/BRIEFING-${c.name}.md`;
    fs.writeFileSync(fp, bm.join("\n"));
    console.log("wrote", fp);
  }
}
