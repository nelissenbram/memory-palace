import { cookies } from "next/headers";
import type { Locale } from "@/i18n/config";
import { defaultLocale, locales } from "@/i18n/config";

/**
 * Lightweight server-side translations for fallback display names
 * used in API routes, server actions, and SSR pages.
 *
 * These are short strings that appear when a user's display name,
 * room name, or group name is missing from the database.
 */
const fallbackNames: Record<string, Record<string, string>> = {
  someone: {
    en: "Someone",
    nl: "Iemand",
    de: "Jemand",
    es: "Alguien",
    fr: "Quelqu'un",
  },
  unknown: {
    en: "Unknown",
    nl: "Onbekend",
    de: "Unbekannt",
    es: "Desconocido",
    fr: "Inconnu",
  },
  aRoom: {
    en: "A room",
    nl: "Een kamer",
    de: "Ein Raum",
    es: "Una sala",
    fr: "Une salle",
  },
  aMemoryRoom: {
    en: "A Memory Room",
    nl: "Een herinneringskamer",
    de: "Ein Erinnerungsraum",
    es: "Una sala de recuerdos",
    fr: "Une salle de souvenirs",
  },
  friend: {
    en: "Friend",
    nl: "Vriend",
    de: "Freund",
    es: "Amigo",
    fr: "Ami",
  },
  family: {
    en: "Family",
    nl: "Familie",
    de: "Familie",
    es: "Familia",
    fr: "Famille",
  },
  sharedRoom: {
    en: "Shared Room",
    nl: "Gedeelde kamer",
    de: "Geteilter Raum",
    es: "Sala compartida",
    fr: "Salle partagée",
  },
  memoryPalace: {
    en: "Memory Palace",
    nl: "Geheugenpaleis",
    de: "Gedächtnispalast",
    es: "Palacio de la memoria",
    fr: "Palais de la mémoire",
  },
  unknownRoom: {
    en: "Unknown room",
    nl: "Onbekende kamer",
    de: "Unbekannter Raum",
    es: "Sala desconocida",
    fr: "Salle inconnue",
  },
  aFriend: {
    en: "A friend",
    nl: "Een vriend",
    de: "Ein Freund",
    es: "Un amigo",
    fr: "Un ami",
  },
  // ── Notification templates ──
  notif_milestone_1: {
    en: "Your very first memory is in the palace.",
    nl: "Je allereerste herinnering staat in het paleis.",
    de: "Deine allererste Erinnerung ist im Palast.",
    es: "Tu primer recuerdo está en el palacio.",
    fr: "Votre tout premier souvenir est dans le palais.",
  },
  notif_milestone_10: {
    en: "Ten memories preserved — you're off to a beautiful start.",
    nl: "Tien herinneringen bewaard — een prachtig begin.",
    de: "Zehn Erinnerungen bewahrt — ein wunderbarer Anfang.",
    es: "Diez recuerdos preservados — un hermoso comienzo.",
    fr: "Dix souvenirs préservés — un magnifique début.",
  },
  notif_milestone_25: {
    en: "Twenty-five memories — the palace is taking shape.",
    nl: "Vijfentwintig herinneringen — het paleis krijgt vorm.",
    de: "Fünfundzwanzig Erinnerungen — der Palast nimmt Gestalt an.",
    es: "Veinticinco recuerdos — el palacio toma forma.",
    fr: "Vingt-cinq souvenirs — le palais prend forme.",
  },
  notif_milestone_50: {
    en: "Fifty memories. You're officially an Archivist.",
    nl: "Vijftig herinneringen. Je bent officieel een Archivaris.",
    de: "Fünfzig Erinnerungen. Du bist offiziell ein Archivar.",
    es: "Cincuenta recuerdos. Eres oficialmente un Archivista.",
    fr: "Cinquante souvenirs. Vous êtes officiellement un Archiviste.",
  },
  notif_milestone_100: {
    en: "One hundred memories — welcome to the Centurion club.",
    nl: "Honderd herinneringen — welkom in de Centurion club.",
    de: "Hundert Erinnerungen — willkommen im Centurion-Club.",
    es: "Cien recuerdos — bienvenido al club Centurión.",
    fr: "Cent souvenirs — bienvenue au club Centurion.",
  },
  notif_milestone_250: {
    en: "Two hundred and fifty — your palace is becoming a living archive.",
    nl: "Tweehonderdvijftig — je paleis wordt een levend archief.",
    de: "Zweihundertfünfzig — dein Palast wird zu einem lebendigen Archiv.",
    es: "Doscientos cincuenta — tu palacio se convierte en un archivo viviente.",
    fr: "Deux cent cinquante — votre palais devient une archive vivante.",
  },
  notif_milestone_500: {
    en: "Five hundred memories. An extraordinary legacy.",
    nl: "Vijfhonderd herinneringen. Een buitengewone nalatenschap.",
    de: "Fünfhundert Erinnerungen. Ein außergewöhnliches Vermächtnis.",
    es: "Quinientos recuerdos. Un legado extraordinario.",
    fr: "Cinq cents souvenirs. Un héritage extraordinaire.",
  },
  notif_milestone_1000: {
    en: "One thousand memories. A truly remarkable palace.",
    nl: "Duizend herinneringen. Een werkelijk opmerkelijk paleis.",
    de: "Tausend Erinnerungen. Ein wahrhaft bemerkenswerter Palast.",
    es: "Mil recuerdos. Un palacio verdaderamente notable.",
    fr: "Mille souvenirs. Un palais véritablement remarquable.",
  },
  notif_contribution: {
    en: "{name} added a memory to {room}",
    nl: "{name} heeft een herinnering toegevoegd aan {room}",
    de: "{name} hat eine Erinnerung zu {room} hinzugefügt",
    es: "{name} añadió un recuerdo a {room}",
    fr: "{name} a ajouté un souvenir à {room}",
  },
  notif_first_in_room: {
    en: "First memory in \"{room}\" — this room just came alive.",
    nl: "Eerste herinnering in \"{room}\" — deze kamer is tot leven gekomen.",
    de: "Erste Erinnerung in \"{room}\" — dieser Raum erwacht zum Leben.",
    es: "Primer recuerdo en \"{room}\" — esta sala acaba de cobrar vida.",
    fr: "Premier souvenir dans \"{room}\" — cette salle vient de prendre vie.",
  },
  notif_family_joined: {
    en: "{name} joined your family palace.",
    nl: "{name} is lid geworden van je familiepaleis.",
    de: "{name} ist deinem Familienpalast beigetreten.",
    es: "{name} se unió a tu palacio familiar.",
    fr: "{name} a rejoint votre palais familial.",
  },
  notif_welcome: {
    en: "Welcome to your Memory Palace — let's preserve something beautiful.",
    nl: "Welkom in je Geheugenpaleis — laten we iets moois bewaren.",
    de: "Willkommen in deinem Gedächtnispalast — lass uns etwas Schönes bewahren.",
    es: "Bienvenido a tu Palacio de la Memoria — preservemos algo hermoso.",
    fr: "Bienvenue dans votre Palais de la Mémoire — préservons quelque chose de beau.",
  },
  notif_on_this_day: {
    en: "On this day, {years} years ago — \"{title}\".",
    nl: "Op deze dag, {years} jaar geleden — \"{title}\".",
    de: "An diesem Tag vor {years} Jahren — \"{title}\".",
    es: "En este día, hace {years} años — \"{title}\".",
    fr: "En ce jour, il y a {years} ans — \"{title}\".",
  },
  notif_reminder: {
    en: "A quiet nudge: the Library has been patient. Want to add a story?",
    nl: "Een zachte herinnering: de Bibliotheek wacht geduldig. Wil je een verhaal toevoegen?",
    de: "Ein sanfter Hinweis: Die Bibliothek war geduldig. Möchtest du eine Geschichte hinzufügen?",
    es: "Un suave recordatorio: la Biblioteca ha sido paciente. ¿Quieres añadir una historia?",
    fr: "Un petit rappel : la Bibliothèque a été patiente. Voulez-vous ajouter une histoire ?",
  },
  notif_system: {
    en: "A new feature has arrived in your palace. Explore the Atrium.",
    nl: "Een nieuwe functie is in je paleis aangekomen. Verken het Atrium.",
    de: "Eine neue Funktion ist in deinem Palast angekommen. Erkunde das Atrium.",
    es: "Una nueva función ha llegado a tu palacio. Explora el Atrio.",
    fr: "Une nouvelle fonctionnalité est arrivée dans votre palais. Explorez l'Atrium.",
  },
  notif_kep_capture: {
    en: "New {type} captured \u2192 \"{room}\"",
    nl: "Nieuwe {type} vastgelegd \u2192 \"{room}\"",
    de: "Neues {type} aufgenommen \u2192 \"{room}\"",
    es: "Nuevo {type} capturado \u2192 \"{room}\"",
    fr: "Nouveau {type} captur\u00e9 \u2192 \"{room}\"",
  },
  // ── Push notification titles & bodies ──
  push_otd_title: {
    en: "On this day\u2026",
    nl: "Op deze dag\u2026",
    de: "An diesem Tag\u2026",
    es: "En este d\u00eda\u2026",
    fr: "En ce jour\u2026",
  },
  push_otd_single: {
    en: "\"{title}\" \u2014 {years} {yearWord} ago",
    nl: "\"{title}\" \u2014 {years} jaar geleden",
    de: "\"{title}\" \u2014 vor {years} {yearWord}",
    es: "\"{title}\" \u2014 hace {years} {yearWord}",
    fr: "\"{title}\" \u2014 il y a {years} {yearWord}",
  },
  push_otd_multi: {
    en: "{count} memories from years past, including \"{title}\"",
    nl: "{count} herinneringen uit het verleden, waaronder \"{title}\"",
    de: "{count} Erinnerungen aus vergangenen Jahren, darunter \"{title}\"",
    es: "{count} recuerdos de a\u00f1os pasados, incluyendo \"{title}\"",
    fr: "{count} souvenirs d'ann\u00e9es pass\u00e9es, dont \"{title}\"",
  },
  push_year_singular: {
    en: "year",
    nl: "jaar",
    de: "Jahr",
    es: "a\u00f1o",
    fr: "an",
  },
  push_year_plural: {
    en: "years",
    nl: "jaar",
    de: "Jahren",
    es: "a\u00f1os",
    fr: "ans",
  },
  push_capsule_title: {
    en: "A time capsule has opened!",
    nl: "Een tijdcapsule is geopend!",
    de: "Eine Zeitkapsel wurde ge\u00f6ffnet!",
    es: "\u00a1Una c\u00e1psula del tiempo se ha abierto!",
    fr: "Une capsule temporelle s'est ouverte !",
  },
  push_capsule_single: {
    en: "\"{title}\" is ready to be revealed",
    nl: "\"{title}\" is klaar om onthuld te worden",
    de: "\"{title}\" kann jetzt enth\u00fcllt werden",
    es: "\"{title}\" est\u00e1 listo para ser revelado",
    fr: "\"{title}\" est pr\u00eat \u00e0 \u00eatre r\u00e9v\u00e9l\u00e9",
  },
  push_capsule_multi: {
    en: "{count} time capsules are ready to open",
    nl: "{count} tijdcapsules zijn klaar om geopend te worden",
    de: "{count} Zeitkapseln k\u00f6nnen ge\u00f6ffnet werden",
    es: "{count} c\u00e1psulas del tiempo est\u00e1n listas para abrirse",
    fr: "{count} capsules temporelles sont pr\u00eates \u00e0 \u00eatre ouvertes",
  },
  // ── Re-engagement push notifications ──
  push_reengage_title: {
    en: "Your memories are waiting",
    nl: "Je herinneringen wachten",
    de: "Deine Erinnerungen warten",
    es: "Tus recuerdos te esperan",
    fr: "Vos souvenirs vous attendent",
  },
  push_reengage_body: {
    en: "It's been a while, {name}. Your palace is just as you left it.",
    nl: "Het is even geleden, {name}. Je paleis is precies zoals je het achterliet.",
    de: "Es ist eine Weile her, {name}. Dein Palast ist genau so, wie du ihn verlassen hast.",
    es: "Ha pasado un tiempo, {name}. Tu palacio est\u00e1 tal como lo dejaste.",
    fr: "Cela fait un moment, {name}. Votre palais est tel que vous l'avez laiss\u00e9.",
  },
};

/**
 * Look up a translated fallback name by key and locale.
 * Falls back to English, then returns the raw key.
 */
export function serverT(key: string, locale?: string): string {
  const l = locale || defaultLocale;
  return fallbackNames[key]?.[l] || fallbackNames[key]?.en || key;
}

/**
 * Translated template with {placeholder} interpolation.
 */
export function serverTf(key: string, locale?: string, params?: Record<string, string>): string {
  let msg = serverT(key, locale);
  if (params) {
    for (const [k, v] of Object.entries(params)) {
      msg = msg.replace(new RegExp(`\\{${k}\\}`, "g"), v);
    }
  }
  return msg;
}

/**
 * Look up a user's preferred locale from their profile.
 * Falls back to the default locale.
 */
export async function getUserLocale(userId: string): Promise<Locale> {
  try {
    const { createClient } = await import("@/lib/supabase/server");
    const supabase = await createClient();
    const { data } = await supabase
      .from("profiles")
      .select("preferred_locale")
      .eq("id", userId)
      .single();
    const loc = data?.preferred_locale as Locale | undefined;
    if (loc && (locales as readonly string[]).includes(loc)) return loc;
  } catch {}
  return defaultLocale;
}

/**
 * Read the user's preferred locale from the `mp_locale` cookie.
 * Safe to call in server actions and API routes.
 * Returns the default locale if the cookie is absent or invalid.
 */
export async function getServerLocale(): Promise<Locale> {
  try {
    const c = await cookies();
    const raw = c.get("mp_locale")?.value as Locale | undefined;
    if (raw && (locales as readonly string[]).includes(raw)) return raw;
    return defaultLocale;
  } catch {
    return defaultLocale;
  }
}
