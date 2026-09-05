// Minimal markdown -> styled HTML for Word import (headings, bold/italic/code,
// tables, lists, hr, links, blockquotes). Usage: node md2html.mjs <in.md> <out.html>
import fs from "fs";

const [, , inPath, outPath] = process.argv;
const md = fs.readFileSync(inPath, "utf8");

const esc = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const inline = (s) =>
  esc(s)
    .replace(/\*\*([^*]+)\*\*/g, "<b>$1</b>")
    .replace(/(^|[^*])\*([^*\n]+)\*/g, "$1<i>$2</i>")
    .replace(/`([^`]+)`/g, '<code style="font-family:Consolas,monospace;background:#F4EFE6;padding:0 3px;">$1</code>')
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>');

const lines = md.split(/\r?\n/);
const out = [];
let i = 0, inCode = false, listStack = null;
const closeList = () => { if (listStack) { out.push(`</${listStack}>`); listStack = null; } };
while (i < lines.length) {
  const l = lines[i];
  if (l.trim().startsWith("```")) { inCode = !inCode; out.push(inCode ? '<pre style="font-family:Consolas,monospace;font-size:9pt;background:#F4EFE6;padding:8px;">' : "</pre>"); i++; continue; }
  if (inCode) { out.push(esc(l)); i++; continue; }
  // table
  if (l.trim().startsWith("|") && lines[i + 1] && /^\s*\|[\s:|-]+\|?\s*$/.test(lines[i + 1])) {
    closeList();
    const rows = [];
    let j = i;
    while (j < lines.length && lines[j].trim().startsWith("|")) { rows.push(lines[j]); j++; }
    const cells = (r) => r.trim().replace(/^\||\|$/g, "").split("|").map((c) => inline(c.trim()));
    out.push('<table style="border-collapse:collapse;width:100%;font-size:10pt;margin:8px 0;">');
    out.push("<tr>" + cells(rows[0]).map((c) => `<th style="border:1px solid #C9BBA4;background:#F4EFE6;padding:5px 8px;text-align:left;">${c}</th>`).join("") + "</tr>");
    for (let r = 2; r < rows.length; r++) out.push("<tr>" + cells(rows[r]).map((c) => `<td style="border:1px solid #C9BBA4;padding:5px 8px;vertical-align:top;">${c}</td>`).join("") + "</tr>");
    out.push("</table>");
    i = j; continue;
  }
  const h = l.match(/^(#{1,4})\s+(.*)/);
  if (h) { closeList(); const n = h[1].length; const sizes = { 1: "20pt", 2: "15pt", 3: "12.5pt", 4: "11pt" }; out.push(`<h${n} style="font-family:Georgia,serif;font-size:${sizes[n]};color:#2E2A26;margin:${n === 1 ? "22pt" : "14pt"} 0 6pt;">${inline(h[2])}</h${n}>`); i++; continue; }
  if (/^\s*---+\s*$/.test(l)) { closeList(); out.push('<hr style="border:none;border-top:1px solid #C9BBA4;margin:12pt 0;">'); i++; continue; }
  const ul = l.match(/^\s*[-*]\s+(.*)/);
  const ol = l.match(/^\s*\d+\.\s+(.*)/);
  if (ul || ol) {
    const want = ul ? "ul" : "ol";
    if (listStack !== want) { closeList(); out.push(`<${want} style="margin:4pt 0 8pt 18pt;">`); listStack = want; }
    out.push(`<li style="margin:2pt 0;font-size:10.5pt;">${inline((ul || ol)[1])}</li>`); i++; continue;
  }
  const bq = l.match(/^\s*>\s?(.*)/);
  if (bq) { closeList(); out.push(`<p style="margin:4pt 0 4pt 14pt;padding-left:8pt;border-left:3px solid #C9BBA4;color:#5C544A;font-size:10.5pt;">${inline(bq[1])}</p>`); i++; continue; }
  if (l.trim() === "") { closeList(); i++; continue; }
  closeList();
  out.push(`<p style="margin:5pt 0;font-size:10.5pt;line-height:1.45;">${inline(l)}</p>`);
  i++;
}
closeList();
fs.writeFileSync(outPath, `<!DOCTYPE html><html><head><meta charset="utf-8"><style>body{font-family:'Segoe UI',Calibri,sans-serif;color:#403B36;max-width:19cm;margin:1cm auto;}</style></head><body>${out.join("\n")}</body></html>`);
console.log("wrote", outPath);
