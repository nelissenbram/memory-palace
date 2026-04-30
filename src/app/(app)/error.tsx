"use client";

import { useEffect } from "react";
import { T } from "@/lib/theme";

function getLocale(): string {
  if (typeof document !== "undefined") {
    const lang = document.documentElement.lang;
    if (lang) return lang.slice(0, 2);
  }
  return "en";
}

function isChunkError(msg?: string): boolean {
  if (!msg) return false;
  return msg.includes("Loading chunk")
    || msg.includes("Failed to fetch dynamically imported module")
    || msg.includes("Failed to load chunk")
    || msg.includes("ChunkLoadError")
    || msg.includes("Loading CSS chunk");
}

const i = {
  title: { en: "Something went wrong", nl: "Er is iets misgegaan", de: "Etwas ist schiefgelaufen", es: "Algo salió mal", fr: "Une erreur est survenue" },
  updateTitle: { en: "Update available", nl: "Update beschikbaar", de: "Update verfügbar", es: "Actualización disponible", fr: "Mise à jour disponible" },
  fallback: { en: "An unexpected error occurred.", nl: "Er is een onverwachte fout opgetreden.", de: "Ein unerwarteter Fehler ist aufgetreten.", es: "Ocurrió un error inesperado.", fr: "Une erreur inattendue s'est produite." },
  updateMsg: { en: "A new version is available. Please reload to continue.", nl: "Er is een nieuwe versie beschikbaar. Herlaad de pagina.", de: "Eine neue Version ist verfügbar. Bitte laden Sie die Seite neu.", es: "Hay una nueva versión disponible. Por favor, recarga la página.", fr: "Une nouvelle version est disponible. Veuillez recharger la page." },
  retry: { en: "Try again", nl: "Opnieuw proberen", de: "Erneut versuchen", es: "Intentar de nuevo", fr: "Réessayer" },
  reload: { en: "Reload page", nl: "Pagina herladen", de: "Seite neu laden", es: "Recargar página", fr: "Recharger la page" },
} as const;

export default function AppError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const l = getLocale();
  const t = (map: Record<string, string>) => map[l] || map.en;
  const chunk = isChunkError(error.message);

  useEffect(() => {
    if (chunk) {
      const key = "mp_chunk_page_reload";
      const count = parseInt(sessionStorage.getItem(key) || "0", 10);
      if (count < 3) {
        sessionStorage.setItem(key, String(count + 1));
        window.location.reload();
      }
    }
  }, [chunk]);

  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: T.font.body, background: T.color.linen }}>
      <div style={{ textAlign: "center", maxWidth: "28rem", padding: "2rem" }}>
        <h2 style={{ fontFamily: T.font.display, fontSize: "1.5rem", color: T.color.charcoal, marginBottom: "1rem" }}>
          {t(chunk ? i.updateTitle : i.title)}
        </h2>
        <p style={{ color: T.color.muted, marginBottom: "1.5rem", fontSize: "0.875rem" }}>
          {chunk ? t(i.updateMsg) : (error.message || t(i.fallback))}
        </p>
        <button
          onClick={() => chunk ? window.location.reload() : reset()}
          style={{ padding: "0.75rem 1.5rem", background: T.color.terracotta, color: "#fff", border: "none", borderRadius: "0.5rem", cursor: "pointer", fontFamily: T.font.body, fontSize: "0.875rem" }}
        >
          {t(chunk ? i.reload : i.retry)}
        </button>
      </div>
    </div>
  );
}
