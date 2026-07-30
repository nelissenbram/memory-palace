import { getSharedTree } from "@/lib/auth/family-tree-actions";
import { getServerLocale } from "@/lib/i18n/server";
import { T } from "@/lib/theme";
import { CREAM, INK, MUTED, EMBER_GLYPH } from "@/lib/libraryTokens";
import { TreeBranchIcon } from "../../PersonCard";
import { SharedTreeView } from "./SharedTreeView";
import enMessages from "@/messages/en.json";
import type { Locale } from "@/i18n/config";

type Messages = typeof enMessages;

/** Server-side locale slice: only the active locale's copy is loaded, matching
 *  the shared i18n message files so the expired-link page stays translatable. */
async function loadMessages(locale: Locale): Promise<Messages> {
  switch (locale) {
    case "nl": return (await import("@/messages/nl.json")).default as Messages;
    case "de": return (await import("@/messages/de.json")).default as Messages;
    case "es": return (await import("@/messages/es.json")).default as Messages;
    case "fr": return (await import("@/messages/fr.json")).default as Messages;
    default: return enMessages;
  }
}

export default async function SharedFamilyTreePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const result = await getSharedTree(token);

  if (result.error || !result.persons) {
    // Resolve strings from the shared familyTree message files (flat dotted
    // keys under the section), matching the client's useTranslation lookup.
    const locale = await getServerLocale();
    const messages = await loadMessages(locale);
    const ft = messages.familyTree as Record<string, string>;
    const enFt = enMessages.familyTree as Record<string, string>;
    const notFoundTitle =
      ft["sharedTreeNotFoundTitle"] ??
      enFt["sharedTreeNotFoundTitle"] ??
      "Family Tree Not Found";
    const notFoundDesc =
      ft["sharedTreeNotFoundDesc"] ??
      enFt["sharedTreeNotFoundDesc"] ??
      "This share link may have expired or been deactivated.";

    return (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          minHeight: "100dvh",
          background: CREAM,
          fontFamily: T.font.display,
          color: INK,
          gap: "1rem",
          padding: "2rem",
          textAlign: "center",
        }}
      >
        <TreeBranchIcon size={48} color={EMBER_GLYPH} />
        <h1 style={{ fontSize: "1.5rem", margin: 0, fontWeight: 600, color: INK }}>
          {notFoundTitle}
        </h1>
        <p style={{ color: MUTED, fontSize: "0.9375rem", fontFamily: T.font.body, margin: 0, maxWidth: "22rem" }}>
          {notFoundDesc}
        </p>
      </div>
    );
  }

  return (
    <SharedTreeView
      token={token}
      ownerName={result.ownerName || "Someone"}
      persons={result.persons}
      relationships={result.relationships || []}
    />
  );
}
