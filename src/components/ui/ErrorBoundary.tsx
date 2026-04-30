"use client";

import React from "react";
import { T } from "@/lib/theme";

interface ErrorBoundaryProps {
  children: React.ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
}

/**
 * App-level ErrorBoundary — catches render errors and shows a
 * Tuscan-styled fallback with a retry button.
 *
 * Because this is a class component (required for componentDidCatch),
 * we cannot call useTranslation(). Instead we read the locale from
 * <html lang="…"> and provide inline translations for both languages.
 */
export default class ErrorBoundary extends React.Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    // eslint-disable-next-line no-console
    console.error("[ErrorBoundary]", error, info);
  }

  private getLocale(): string {
    if (typeof document !== "undefined") {
      const lang = document.documentElement.lang;
      if (lang) return lang.slice(0, 2);
    }
    return "en";
  }

  render() {
    if (!this.state.hasError) {
      return this.props.children;
    }

    const locale = this.getLocale();
    const title =
      ({ en: "Something went wrong", nl: "Er is iets misgegaan", de: "Etwas ist schiefgelaufen", es: "Algo sali\u00f3 mal", fr: "Une erreur est survenue" } as Record<string, string>)[locale] || "Something went wrong";
    const message =
      ({ en: "An unexpected error occurred. Please try again.", nl: "Er is een onverwachte fout opgetreden. Probeer het opnieuw.", de: "Ein unerwarteter Fehler ist aufgetreten. Bitte versuchen Sie es erneut.", es: "Ocurri\u00f3 un error inesperado. Int\u00e9ntelo de nuevo.", fr: "Une erreur inattendue s\u2019est produite. Veuillez r\u00e9essayer." } as Record<string, string>)[locale] || "An unexpected error occurred. Please try again.";
    const retry =
      ({ en: "Try again", nl: "Opnieuw proberen", de: "Erneut versuchen", es: "Intentar de nuevo", fr: "Réessayer" } as Record<string, string>)[locale] || "Try again";

    return (
      <div
        role="alert"
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          minHeight: "100dvh",
          padding: "2rem",
          background: T.color.linen,
          fontFamily: T.font.body,
        }}
      >
        <div
          style={{
            maxWidth: "28rem",
            textAlign: "center",
            padding: "2.5rem 2rem",
            borderRadius: "1rem",
            background: T.color.white,
            border: `1px solid ${T.color.cream}`,
            boxShadow: "0 0.25rem 1rem rgba(44,44,42,.08)",
          }}
        >
          <div
            aria-hidden
            style={{
              fontSize: "2.5rem",
              marginBottom: "1rem",
            }}
          >
            {"\u26A0\uFE0F"}
          </div>
          <h2
            style={{
              fontFamily: T.font.display,
              fontSize: "1.5rem",
              fontWeight: 600,
              color: T.color.charcoal,
              margin: "0 0 0.75rem",
            }}
          >
            {title}
          </h2>
          <p
            style={{
              fontSize: "0.9375rem",
              color: T.color.walnut,
              lineHeight: 1.6,
              margin: "0 0 1.5rem",
            }}
          >
            {message}
          </p>
          <button
            onClick={() => this.setState({ hasError: false })}
            style={{
              padding: "0.75rem 1.5rem",
              borderRadius: "0.75rem",
              border: "none",
              background: T.color.terracotta,
              color: T.color.white,
              fontFamily: T.font.body,
              fontSize: "0.9375rem",
              fontWeight: 600,
              cursor: "pointer",
              minHeight: "2.75rem",
            }}
          >
            {retry}
          </button>
        </div>
      </div>
    );
  }
}
