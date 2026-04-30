export const locales = ["en", "nl", "de", "es", "fr"] as const;
export type Locale = (typeof locales)[number];

export const defaultLocale: Locale = "en";

export const localeNames: Record<Locale, string> = {
  en: "English",
  nl: "Nederlands",
  de: "Deutsch",
  es: "Español",
  fr: "Français",
};

/** BCP 47 codes for Intl.DateTimeFormat / toLocaleDateString */
export const localeDateCodes: Record<Locale, string> = {
  en: "en-US",
  nl: "nl-NL",
  de: "de-DE",
  es: "es-ES",
  fr: "fr-FR",
};
