import { cookies } from "next/headers";
import { getSharedTree } from "@/lib/auth/family-tree-actions";
import { T } from "@/lib/theme";
import { CREAM, INK, MUTED, EMBER_GLYPH } from "@/lib/libraryTokens";
import { TreeBranchIcon } from "../../PersonCard";
import { SharedTreeView } from "./SharedTreeView";

const notFoundTitle: Record<string, string> = {
  en: "Family Tree Not Found",
  nl: "Stamboom niet gevonden",
  de: "Stammbaum nicht gefunden",
  es: "Árbol genealógico no encontrado",
  fr: "Arbre généalogique introuvable",
};

const notFoundDesc: Record<string, string> = {
  en: "This share link may have expired or been deactivated.",
  nl: "Deze deellink is mogelijk verlopen of gedeactiveerd.",
  de: "Dieser Freigabelink ist möglicherweise abgelaufen oder wurde deaktiviert.",
  es: "Este enlace para compartir puede haber expirado o sido desactivado.",
  fr: "Ce lien de partage a peut-être expiré ou été désactivé.",
};

export default async function SharedFamilyTreePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const result = await getSharedTree(token);

  if (result.error || !result.persons) {
    const cookieStore = await cookies();
    const locale = cookieStore.get("mp_locale")?.value?.slice(0, 2) || "en";

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
          {notFoundTitle[locale] || notFoundTitle.en}
        </h1>
        <p style={{ color: MUTED, fontSize: "0.9375rem", fontFamily: T.font.body, margin: 0, maxWidth: "22rem" }}>
          {notFoundDesc[locale] || notFoundDesc.en}
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
