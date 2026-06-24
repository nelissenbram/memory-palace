/**
 * Minimal proactive content filter for public user-generated text (comments, display
 * names, bios). Apple Guidelines 1.1/1.2 expect a filter for objectionable content in
 * addition to the reactive report/block flow. The deny-list is deliberately conservative
 * — only clearly objectionable hate slurs and child-safety terms — to avoid false
 * positives on legitimate, sometimes heavy, family-memory text.
 */
const BLOCKLIST: RegExp[] = [
  // Hate slurs (leet-spelling tolerant, word-boundaried)
  /\bn[i1!]gg(?:er|a|ah)\b/i,
  /\bf[a4]gg?[o0]t?s?\b/i,
  /\bk[i1]kes?\b/i,
  /\bch[i1]nks?\b/i,
  /\bsp[i1]cs?\b/i,
  /\btr[a4]nn(?:y|ies)\b/i,
  /\bret[a4]rds?\b/i,
  // Child-safety: never allow content soliciting/depicting minors
  /\bchild\s*por|\bcp\b|\bunderage\s*(?:sex|porn|nude)/i,
];

export function moderateText(text: string | null | undefined): { ok: boolean; reason?: string } {
  if (!text) return { ok: true };
  for (const re of BLOCKLIST) {
    if (re.test(text)) return { ok: false, reason: "objectionable_content" };
  }
  return { ok: true };
}
