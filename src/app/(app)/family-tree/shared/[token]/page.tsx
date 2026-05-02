import { cookies } from "next/headers";
import { getSharedTree } from "@/lib/auth/family-tree-actions";
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
          minHeight: "60vh",
          fontFamily: "'Cormorant Garamond', Georgia, serif",
          color: "#2C2C2A",
          gap: "1rem",
          padding: "2rem",
        }}
      >
        <h1 style={{ fontSize: "1.5rem", margin: 0 }}>{notFoundTitle[locale] || notFoundTitle.en}</h1>
        <p style={{ color: "#746B60", fontSize: "0.9375rem", fontFamily: "'Manrope', -apple-system, BlinkMacSystemFont, sans-serif" }}>
          {notFoundDesc[locale] || notFoundDesc.en}
        </p>
      </div>
    );
  }

  return (
    <SharedTreeView
      ownerName={result.ownerName || "Someone"}
      persons={result.persons}
      relationships={result.relationships || []}
    />
  );
}
