"use client";

import { useState, useEffect, useCallback } from "react";
import { defaultLocale, locales, type Locale } from "@/i18n/config";
import enMessages from "@/messages/en.json";

type Messages = typeof enMessages;
type Section = keyof Messages;

// Module-level cache so we don't re-fetch on every render
const messageCache = new Map<Locale, Messages>();
messageCache.set("en", enMessages);

// Pub/sub so setLocaleNoReload broadcasts to ALL hook instances
type LocaleChangeListener = (locale: Locale, messages: Messages) => void;
const localeChangeListeners = new Set<LocaleChangeListener>();

async function loadMessages(locale: Locale): Promise<Messages> {
  const cached = messageCache.get(locale);
  if (cached) return cached;

  let messages: Messages;
  switch (locale) {
    case "nl":
      messages = (await import("@/messages/nl.json")).default as Messages;
      break;
    case "de":
      messages = (await import("@/messages/de.json")).default as Messages;
      break;
    case "es":
      messages = (await import("@/messages/es.json")).default as Messages;
      break;
    case "fr":
      messages = (await import("@/messages/fr.json")).default as Messages;
      break;
    default:
      messages = enMessages;
  }
  messageCache.set(locale, messages);
  return messages;
}

function getStoredLocale(): Locale {
  if (typeof window === "undefined") return defaultLocale;
  const stored = localStorage.getItem("mp_locale") as Locale | null;
  if (stored && locales.includes(stored)) return stored;
  return defaultLocale;
}

/** Detect best matching locale from browser language settings */
export function detectBrowserLocale(): Locale {
  if (typeof navigator === "undefined") return defaultLocale;
  for (const lang of navigator.languages ?? [navigator.language]) {
    const code = lang.split("-")[0].toLowerCase() as Locale;
    if (locales.includes(code)) return code;
  }
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
  // Initialize synchronously from cache if available — avoids flash of English
  // in canvas textures (Three.js) that render on first mount before useEffect fires
  const [locale, setLocaleState] = useState<Locale>(() => {
    if (typeof window === "undefined") return defaultLocale;
    const stored = getStoredLocale();
    return stored;
  });
  const [messages, setMessages] = useState<Messages>(() => {
    if (typeof window === "undefined") return enMessages;
    const stored = getStoredLocale();
    return messageCache.get(stored) ?? enMessages;
  });

  useEffect(() => {
    const stored = getStoredLocale();
    setLocaleState(stored);
    loadMessages(stored).then(setMessages);
  }, []);

  // Subscribe to locale changes from other hook instances
  useEffect(() => {
    const listener: LocaleChangeListener = (newLocale, newMessages) => {
      setLocaleState(newLocale);
      setMessages(newMessages);
    };
    localeChangeListeners.add(listener);
    return () => { localeChangeListeners.delete(listener); };
  }, []);

  const t = useCallback(
    (key: keyof Messages[S] | (string & {}), params?: Record<string, string>): string => {
      const sectionMessages = messages[section] as Record<string, string>;
      const fallback = enMessages[section] as Record<string, string>;
      let value = sectionMessages[key as string] ?? fallback[key as string] ?? (key as string);

      // Simple parameter interpolation: {name} -> value
      if (params) {
        for (const [k, v] of Object.entries(params)) {
          value = value.split(`{${k}}`).join(v);
        }
      }

      return value;
    },
    [messages, section]
  );

  const setLocale = useCallback((newLocale: Locale) => {
    localStorage.setItem("mp_locale", newLocale);
    // Only set cookie if user accepted cookie consent (preference cookie)
    const consent = localStorage.getItem("mp_cookie_consent");
    if (consent !== "rejected") {
      document.cookie = `mp_locale=${newLocale};path=/;max-age=${60 * 60 * 24 * 365};SameSite=Lax`;
    }
    // Sync the lang attribute on <html> for accessibility
    document.documentElement.lang = newLocale;
    setLocaleState(newLocale);
    // Reload to apply everywhere
    window.location.reload();
  }, []);

  /** Change locale without reload — for onboarding flow where reload would destroy state */
  const setLocaleNoReload = useCallback((newLocale: Locale) => {
    localStorage.setItem("mp_locale", newLocale);
    const consent = localStorage.getItem("mp_cookie_consent");
    if (consent !== "rejected") {
      document.cookie = `mp_locale=${newLocale};path=/;max-age=${60 * 60 * 24 * 365};SameSite=Lax`;
    }
    document.documentElement.lang = newLocale;
    setLocaleState(newLocale);
    loadMessages(newLocale).then((msgs) => {
      setMessages(msgs);
      // Broadcast to all other hook instances so every section updates
      for (const listener of localeChangeListeners) listener(newLocale, msgs);
    });
  }, []);

  return { t, locale, setLocale, setLocaleNoReload };
}
