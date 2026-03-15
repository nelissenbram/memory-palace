"use client";

import { useState, useEffect, useCallback } from "react";
import { defaultLocale, locales, type Locale } from "@/i18n/config";
import enMessages from "@/messages/en.json";
import nlMessages from "@/messages/nl.json";

type Messages = typeof enMessages;
type Section = keyof Messages;

const allMessages: Record<Locale, Messages> = {
  en: enMessages,
  nl: nlMessages,
};

function getStoredLocale(): Locale {
  if (typeof window === "undefined") return defaultLocale;
  const stored = localStorage.getItem("mp_locale") as Locale | null;
  if (stored && locales.includes(stored)) return stored;
  return defaultLocale;
}

/**
 * Client-side translation hook.
 * Usage: const { t, locale, setLocale } = useTranslation("auth");
 *        t("signIn") -> "Sign In" or "Inloggen"
 *
 * Falls back to English if key is missing in the active locale.
 */
export function useTranslation<S extends Section>(section: S) {
  const [locale, setLocaleState] = useState<Locale>(defaultLocale);

  useEffect(() => {
    setLocaleState(getStoredLocale());
  }, []);

  const t = useCallback(
    (key: keyof Messages[S] | (string & {}), params?: Record<string, string>): string => {
      const messages = allMessages[locale][section] as Record<string, string>;
      const fallback = allMessages[defaultLocale][section] as Record<string, string>;
      let value = messages[key as string] ?? fallback[key as string] ?? (key as string);

      // Simple parameter interpolation: {name} -> value
      if (params) {
        for (const [k, v] of Object.entries(params)) {
          value = value.replace(new RegExp(`\\{${k}\\}`, "g"), v);
        }
      }

      return value;
    },
    [locale, section]
  );

  const setLocale = useCallback((newLocale: Locale) => {
    localStorage.setItem("mp_locale", newLocale);
    // Also set cookie so server-side can read it
    document.cookie = `mp_locale=${newLocale};path=/;max-age=${60 * 60 * 24 * 365};SameSite=Lax`;
    setLocaleState(newLocale);
    // Reload to apply everywhere
    window.location.reload();
  }, []);

  return { t, locale, setLocale };
}
