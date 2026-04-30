"use client";

import React from "react";
import { T } from "@/lib/theme";

interface Props {
  children: React.ReactNode;
}

interface State {
  hasError: boolean;
}

export class TreeErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error("[TreeErrorBoundary]", error, info);
  }

  private getLocale(): string {
    if (typeof document !== "undefined") {
      const lang = document.documentElement.lang;
      if (lang) return lang.slice(0, 2);
    }
    return "en";
  }

  render() {
    if (!this.state.hasError) return this.props.children;

    const locale = this.getLocale();
    const message =
      ({ en: "Something went wrong displaying the family tree. Please try refreshing the page.", nl: "Er ging iets mis bij het weergeven van de stamboom. Probeer de pagina te vernieuwen.", de: "Beim Anzeigen des Stammbaums ist ein Fehler aufgetreten. Bitte laden Sie die Seite neu.", es: "Algo sali\u00f3 mal al mostrar el \u00e1rbol geneal\u00f3gico. Actualice la p\u00e1gina.", fr: "Une erreur est survenue lors de l\u2019affichage de l\u2019arbre g\u00e9n\u00e9alogique. Veuillez actualiser la page." } as Record<string, string>)[locale] || "Something went wrong displaying the family tree. Please try refreshing the page.";
    const retry = ({ en: "Try again", nl: "Opnieuw proberen", de: "Erneut versuchen", es: "Intentar de nuevo", fr: "Réessayer" } as Record<string, string>)[locale] || "Try again";

    return (
      <div
        role="alert"
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          height: "100%",
          minHeight: "20rem",
          gap: "1rem",
          padding: "2rem",
          fontFamily: T.font.body,
          color: T.color.walnut,
        }}
      >
        <p style={{ fontSize: "0.9375rem", textAlign: "center", maxWidth: "24rem" }}>{message}</p>
        <button
          onClick={() => this.setState({ hasError: false })}
          style={{
            padding: "0.625rem 1.25rem",
            borderRadius: "0.75rem",
            border: "none",
            background: T.color.terracotta,
            color: T.color.white,
            fontFamily: T.font.body,
            fontSize: "0.875rem",
            fontWeight: 600,
            cursor: "pointer",
            minHeight: "2.75rem",
          }}
        >
          {retry}
        </button>
      </div>
    );
  }
}
