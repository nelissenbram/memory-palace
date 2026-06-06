/**
 * WhatsApp message sender — all outgoing Kep messages.
 * 1:1 DM only, no group support.
 */

import type { SupabaseClient } from "@supabase/supabase-js";

const GRAPH_API_BASE = "https://graph.facebook.com/v21.0";
const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || "https://thememorypalace.ai";

// ── Core send helpers ────────────────────────────────────────

function getCredentials() {
  const token = process.env.WHATSAPP_ACCESS_TOKEN?.trim();
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  return { token, phoneNumberId };
}

/**
 * Send a text message to a WhatsApp user.
 */
export async function sendTextMessage(
  recipientPhone: string,
  text: string,
): Promise<boolean> {
  const { token, phoneNumberId } = getCredentials();
  if (!token || !phoneNumberId) return false;

  try {
    const res = await fetch(
      `${GRAPH_API_BASE}/${phoneNumberId}/messages`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          messaging_product: "whatsapp",
          to: recipientPhone,
          type: "text",
          text: { preview_url: true, body: text },
        }),
      },
    );

    if (!res.ok) {
      const err = await res.text();
      console.error(`[Kep] Failed to send text: ${res.status} ${err}`);
      return false;
    }
    return true;
  } catch (err) {
    console.error("[Kep] sendTextMessage error:", err);
    return false;
  }
}

async function sendInteractiveMessage(
  recipientPhone: string,
  interactive: Record<string, unknown>,
): Promise<boolean> {
  const { token, phoneNumberId } = getCredentials();
  if (!token || !phoneNumberId) return false;

  try {
    const res = await fetch(
      `${GRAPH_API_BASE}/${phoneNumberId}/messages`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          messaging_product: "whatsapp",
          to: recipientPhone,
          type: "interactive",
          interactive,
        }),
      },
    );

    if (!res.ok) {
      const err = await res.text();
      console.error(`[Kep] Failed to send interactive: ${res.status} ${err}`);
      return false;
    }
    return true;
  } catch (err) {
    console.error("[Kep] sendInteractiveMessage error:", err);
    return false;
  }
}

// ── Welcome & Onboarding ────────────────────────────────────

/**
 * Send welcome message to a new 1:1 sender (known user, first message).
 */
export async function sendWelcomeMessage(
  recipientPhone: string,
  locale: string = "en",
): Promise<boolean> {
  const t = getWelcomeTexts(locale);
  const message = [
    t.header,
    "",
    t.intro,
    "",
    t.forward,
    "",
    `${t.setRoom}: ROOM [name]`,
    `${t.seeRooms}: ROOMS`,
    `${t.allCommands}: HELP`,
    "",
    t.letsStart,
  ].join("\n");

  return sendTextMessage(recipientPhone, message);
}

/**
 * Send link-account message for unknown phone numbers.
 * Covers both no-account AND unlinked-phone scenarios.
 */
export async function sendLinkAccountMessage(
  recipientPhone: string,
  locale: string = "en",
): Promise<boolean> {
  const t = getLinkAccountTexts(locale);
  const message = [
    t.header,
    "",
    t.dontRecognize,
    "",
    t.alreadyHaveAccount,
    `  ${t.addNumber}: ${BASE_URL}/settings/profile`,
    "",
    t.newToMemoryPalace,
    `  ${t.createPalace}: ${BASE_URL}/register`,
    "",
    t.onceLlinked,
  ].join("\n");

  return sendTextMessage(recipientPhone, message);
}

// ── Room confirmation ────────────────────────────────────────

/**
 * Send room confirmation with action buttons after auto-route.
 */
export async function sendRoomConfirmation(
  recipientPhone: string,
  roomName: string,
  wingName: string,
  captureId: string,
  locale: string = "en",
): Promise<boolean> {
  const t = getInteractiveTexts(locale);

  return sendInteractiveMessage(recipientPhone, {
    type: "button",
    body: { text: t.savedTo.replace("{wing}", wingName).replace("{room}", roomName) },
    action: {
      buttons: [
        { type: "reply", reply: { id: `confirm:${captureId}`, title: "OK" } },
        { type: "reply", reply: { id: `move:${captureId}`, title: t.moveIt } },
        { type: "reply", reply: { id: `delete:${captureId}`, title: t.deleteBtn } },
      ],
    },
  });
}

/**
 * Send room switch confirmation.
 */
export async function sendRoomSwitchConfirmation(
  recipientPhone: string,
  wingName: string,
  roomName: string,
  locale: string = "en",
): Promise<boolean> {
  const t = getRoomSwitchTexts(locale);
  return sendTextMessage(recipientPhone, t.activeRoom.replace("{wing}", wingName).replace("{room}", roomName));
}

// ── Room pickers ─────────────────────────────────────────────

interface RoomForPicker {
  id: string;
  name: string;
  wing_id: string;
  wings?: { id?: string; slug?: string; custom_name?: string; name?: string } | null;
}

/**
 * Send a room picker list for routing a specific capture.
 */
export async function sendRoomPicker(
  recipientPhone: string,
  rooms: RoomForPicker[],
  captureId: string,
  locale: string = "en",
): Promise<boolean> {
  const t = getInteractiveTexts(locale);

  const wingMap = new Map<string, { wingName: string; rows: { id: string; title: string }[] }>();
  let totalRows = 0;

  for (const room of rooms) {
    if (totalRows >= 10) break;
    const wingName = room.wings?.custom_name || room.wings?.name || room.wings?.slug || "Palace";
    const wingId = room.wings?.id || room.wing_id;

    if (!wingMap.has(wingId)) {
      wingMap.set(wingId, { wingName, rows: [] });
    }
    wingMap.get(wingId)!.rows.push({
      id: `route:${captureId}:${room.id}`,
      title: (room.name || "Room").slice(0, 24),
    });
    totalRows++;
  }

  const sections = Array.from(wingMap.values()).map(({ wingName, rows }) => ({
    title: wingName.slice(0, 24),
    rows,
  }));

  return sendInteractiveMessage(recipientPhone, {
    type: "list",
    body: { text: t.whereSave },
    action: {
      button: t.pickRoom,
      sections,
    },
  });
}

/**
 * Send a room picker for switching active room (setroom: prefix).
 */
export async function sendRoomPickerForSwitch(
  recipientPhone: string,
  rooms: RoomForPicker[],
  locale: string = "en",
): Promise<boolean> {
  const t = getRoomSwitchTexts(locale);

  const wingMap = new Map<string, { wingName: string; rows: { id: string; title: string }[] }>();
  let totalRows = 0;
  let totalRooms = rooms.length;

  // Sort alphabetically
  const sorted = [...rooms].sort((a, b) => a.name.localeCompare(b.name));

  for (const room of sorted) {
    if (totalRows >= 10) break;
    const wingName = room.wings?.custom_name || room.wings?.name || room.wings?.slug || "Palace";
    const wingId = room.wings?.id || room.wing_id;

    if (!wingMap.has(wingId)) {
      wingMap.set(wingId, { wingName, rows: [] });
    }
    wingMap.get(wingId)!.rows.push({
      id: `setroom:${room.id}`,
      title: (room.name || "Room").slice(0, 24),
    });
    totalRows++;
  }

  const sections = Array.from(wingMap.values()).map(({ wingName, rows }) => ({
    title: wingName.slice(0, 24),
    rows,
  }));

  let bodyText = t.pickActiveRoom;
  if (totalRooms > 10) {
    bodyText += ` (${t.showing.replace("{shown}", "10").replace("{total}", String(totalRooms))})`;
  }

  return sendInteractiveMessage(recipientPhone, {
    type: "list",
    body: { text: bodyText },
    action: {
      button: t.pickRoom,
      sections,
    },
  });
}

// ── Status, Help, Paused ─────────────────────────────────────

/**
 * Send status message with active room + capture stats.
 */
export async function sendStatusMessage(
  recipientPhone: string,
  link: Record<string, unknown>,
  supabase: SupabaseClient,
  locale: string = "en",
): Promise<boolean> {
  const t = getStatusTexts(locale);

  let activeRoomText = t.aiRouting;
  if (link.active_room_id) {
    const { data: room } = await supabase
      .from("rooms")
      .select("name, wings(custom_name, name, slug)")
      .eq("id", link.active_room_id as string)
      .single();

    if (room) {
      const wing = room.wings as unknown as Record<string, unknown> | null;
      const wingName = (wing?.custom_name || wing?.name || wing?.slug || "Palace") as string;
      activeRoomText = `${wingName} / ${room.name}`;
    }
  }

  // Get capture stats
  const { count: totalCaptures } = await supabase
    .from("kep_captures")
    .select("id", { count: "exact", head: true })
    .eq("kep_id", link.kep_id as string);

  const { count: routedCaptures } = await supabase
    .from("kep_captures")
    .select("id", { count: "exact", head: true })
    .eq("kep_id", link.kep_id as string)
    .eq("status", "routed");

  const status = link.stopped ? t.paused : t.active;

  const message = [
    t.header,
    "",
    `${t.statusLabel}: ${status}`,
    `${t.activeRoomLabel}: ${activeRoomText}`,
    `${t.capturesLabel}: ${routedCaptures || 0} / ${totalCaptures || 0}`,
  ].join("\n");

  return sendTextMessage(recipientPhone, message);
}

/**
 * Send help message with all available commands.
 */
export async function sendHelpMessage(
  recipientPhone: string,
  locale: string = "en",
): Promise<boolean> {
  const t = getHelpTexts(locale);

  const message = [
    t.header,
    "",
    `ROOM [${t.name}] — ${t.roomDesc}`,
    `ROOMS — ${t.roomsDesc}`,
    `STATUS — ${t.statusDesc}`,
    `CLEAR — ${t.clearDesc}`,
    `STOP — ${t.stopDesc}`,
    `START — ${t.startDesc}`,
    `HELP — ${t.helpDesc}`,
    "",
    t.tip,
  ].join("\n");

  return sendTextMessage(recipientPhone, message);
}

/**
 * Send a paused reminder when receiving messages while stopped.
 */
export async function sendPausedReminder(
  recipientPhone: string,
  locale: string = "en",
): Promise<boolean> {
  const t = getPausedTexts(locale);
  return sendTextMessage(recipientPhone, t.paused);
}

// ── i18n text getters (5 locales) ────────────────────────────

function getWelcomeTexts(locale: string) {
  const texts: Record<string, {
    header: string; intro: string; forward: string;
    setRoom: string; seeRooms: string; allCommands: string; letsStart: string;
  }> = {
    en: {
      header: "Welcome to Kep!",
      intro: "I'll save your memories to your Memory Palace.",
      forward: "Just send me any photo, video, voice note, or message.",
      setRoom: "Set your active room",
      seeRooms: "See all rooms",
      allCommands: "All commands",
      letsStart: "Let's start — pick a room:",
    },
    nl: {
      header: "Welkom bij Kep!",
      intro: "Ik sla je herinneringen op in je Memory Palace.",
      forward: "Stuur me gewoon een foto, video, spraakbericht of bericht.",
      setRoom: "Actieve kamer instellen",
      seeRooms: "Alle kamers bekijken",
      allCommands: "Alle commando's",
      letsStart: "Laten we beginnen — kies een kamer:",
    },
    de: {
      header: "Willkommen bei Kep!",
      intro: "Ich speichere deine Erinnerungen in deinem Memory Palace.",
      forward: "Schick mir einfach ein Foto, Video, eine Sprachnachricht oder Nachricht.",
      setRoom: "Aktiven Raum festlegen",
      seeRooms: "Alle Raume anzeigen",
      allCommands: "Alle Befehle",
      letsStart: "Los geht's — wahle einen Raum:",
    },
    es: {
      header: "Bienvenido a Kep!",
      intro: "Guardare tus recuerdos en tu Memory Palace.",
      forward: "Solo envlame cualquier foto, video, nota de voz o mensaje.",
      setRoom: "Establecer sala activa",
      seeRooms: "Ver todas las salas",
      allCommands: "Todos los comandos",
      letsStart: "Empecemos — elige una sala:",
    },
    fr: {
      header: "Bienvenue sur Kep !",
      intro: "Je sauvegarderai vos souvenirs dans votre Memory Palace.",
      forward: "Envoyez-moi simplement une photo, video, note vocale ou message.",
      setRoom: "Definir la salle active",
      seeRooms: "Voir toutes les salles",
      allCommands: "Toutes les commandes",
      letsStart: "Commencons — choisissez une salle :",
    },
  };
  return texts[locale] || texts.en;
}

function getLinkAccountTexts(locale: string) {
  const texts: Record<string, {
    header: string; dontRecognize: string;
    alreadyHaveAccount: string; addNumber: string;
    newToMemoryPalace: string; createPalace: string; onceLlinked: string;
  }> = {
    en: {
      header: "Hi! I'm Kep — your Memory Palace assistant.",
      dontRecognize: "I don't recognize your phone number yet.",
      alreadyHaveAccount: "Already have an account?",
      addNumber: "Add your number",
      newToMemoryPalace: "New to Memory Palace?",
      createPalace: "Create your free palace",
      onceLlinked: "Once linked, text me again!",
    },
    nl: {
      header: "Hoi! Ik ben Kep — je Memory Palace assistent.",
      dontRecognize: "Ik herken je telefoonnummer nog niet.",
      alreadyHaveAccount: "Heb je al een account?",
      addNumber: "Voeg je nummer toe",
      newToMemoryPalace: "Nieuw bij Memory Palace?",
      createPalace: "Maak je gratis paleis",
      onceLlinked: "Zodra gekoppeld, stuur me opnieuw een bericht!",
    },
    de: {
      header: "Hallo! Ich bin Kep — dein Memory Palace Assistent.",
      dontRecognize: "Ich erkenne deine Telefonnummer noch nicht.",
      alreadyHaveAccount: "Hast du schon ein Konto?",
      addNumber: "Nummer hinzufugen",
      newToMemoryPalace: "Neu bei Memory Palace?",
      createPalace: "Erstelle deinen kostenlosen Palast",
      onceLlinked: "Sobald verknupft, schreib mir nochmal!",
    },
    es: {
      header: "Hola! Soy Kep — tu asistente de Memory Palace.",
      dontRecognize: "Aun no reconozco tu numero de telefono.",
      alreadyHaveAccount: "Ya tienes una cuenta?",
      addNumber: "Agrega tu numero",
      newToMemoryPalace: "Nuevo en Memory Palace?",
      createPalace: "Crea tu palacio gratis",
      onceLlinked: "Una vez vinculado, enviame un mensaje de nuevo!",
    },
    fr: {
      header: "Bonjour ! Je suis Kep — votre assistant Memory Palace.",
      dontRecognize: "Je ne reconnais pas encore votre numero de telephone.",
      alreadyHaveAccount: "Vous avez deja un compte ?",
      addNumber: "Ajoutez votre numero",
      newToMemoryPalace: "Nouveau sur Memory Palace ?",
      createPalace: "Creez votre palais gratuit",
      onceLlinked: "Une fois lie, envoyez-moi un message !",
    },
  };
  return texts[locale] || texts.en;
}

function getInteractiveTexts(locale: string): {
  savedTo: string; whereSave: string; pickRoom: string;
  moveIt: string; deleteBtn: string;
} {
  const texts: Record<string, ReturnType<typeof getInteractiveTexts>> = {
    en: {
      savedTo: "Saved to {wing} / {room}",
      whereSave: "Where should I save this?",
      pickRoom: "Pick a room",
      moveIt: "Move it",
      deleteBtn: "Delete",
    },
    nl: {
      savedTo: "Opgeslagen in {wing} / {room}",
      whereSave: "Waar wil je dit opslaan?",
      pickRoom: "Kies een kamer",
      moveIt: "Verplaats",
      deleteBtn: "Verwijder",
    },
    de: {
      savedTo: "Gespeichert in {wing} / {room}",
      whereSave: "Wo soll ich das speichern?",
      pickRoom: "Raum wahlen",
      moveIt: "Verschieben",
      deleteBtn: "Loschen",
    },
    es: {
      savedTo: "Guardado en {wing} / {room}",
      whereSave: "Donde quieres guardar esto?",
      pickRoom: "Elige una sala",
      moveIt: "Mover",
      deleteBtn: "Eliminar",
    },
    fr: {
      savedTo: "Enregistre dans {wing} / {room}",
      whereSave: "Ou dois-je enregistrer ceci ?",
      pickRoom: "Choisir une salle",
      moveIt: "Deplacer",
      deleteBtn: "Supprimer",
    },
  };
  return texts[locale] || texts.en;
}

function getRoomSwitchTexts(locale: string) {
  const texts: Record<string, {
    activeRoom: string; pickActiveRoom: string; pickRoom: string;
    showing: string;
  }> = {
    en: {
      activeRoom: "Active room: {wing} / {room}",
      pickActiveRoom: "Pick your active room",
      pickRoom: "Pick a room",
      showing: "showing {shown} of {total}",
    },
    nl: {
      activeRoom: "Actieve kamer: {wing} / {room}",
      pickActiveRoom: "Kies je actieve kamer",
      pickRoom: "Kies een kamer",
      showing: "{shown} van {total} weergegeven",
    },
    de: {
      activeRoom: "Aktiver Raum: {wing} / {room}",
      pickActiveRoom: "Wahle deinen aktiven Raum",
      pickRoom: "Raum wahlen",
      showing: "{shown} von {total} angezeigt",
    },
    es: {
      activeRoom: "Sala activa: {wing} / {room}",
      pickActiveRoom: "Elige tu sala activa",
      pickRoom: "Elige una sala",
      showing: "mostrando {shown} de {total}",
    },
    fr: {
      activeRoom: "Salle active : {wing} / {room}",
      pickActiveRoom: "Choisissez votre salle active",
      pickRoom: "Choisir une salle",
      showing: "{shown} sur {total} affiches",
    },
  };
  return texts[locale] || texts.en;
}

function getStatusTexts(locale: string) {
  const texts: Record<string, {
    header: string; statusLabel: string; activeRoomLabel: string;
    capturesLabel: string; active: string; paused: string; aiRouting: string;
  }> = {
    en: {
      header: "Kep Status",
      statusLabel: "Status",
      activeRoomLabel: "Active room",
      capturesLabel: "Routed / Total captures",
      active: "Active",
      paused: "Paused",
      aiRouting: "AI routing (no fixed room)",
    },
    nl: {
      header: "Kep Status",
      statusLabel: "Status",
      activeRoomLabel: "Actieve kamer",
      capturesLabel: "Gerouteerd / Totaal",
      active: "Actief",
      paused: "Gepauzeerd",
      aiRouting: "AI-routering (geen vaste kamer)",
    },
    de: {
      header: "Kep Status",
      statusLabel: "Status",
      activeRoomLabel: "Aktiver Raum",
      capturesLabel: "Geroutet / Gesamt",
      active: "Aktiv",
      paused: "Pausiert",
      aiRouting: "KI-Routing (kein fester Raum)",
    },
    es: {
      header: "Estado de Kep",
      statusLabel: "Estado",
      activeRoomLabel: "Sala activa",
      capturesLabel: "Enrutados / Total",
      active: "Activo",
      paused: "Pausado",
      aiRouting: "Enrutamiento IA (sin sala fija)",
    },
    fr: {
      header: "Statut Kep",
      statusLabel: "Statut",
      activeRoomLabel: "Salle active",
      capturesLabel: "Routes / Total",
      active: "Actif",
      paused: "En pause",
      aiRouting: "Routage IA (pas de salle fixe)",
    },
  };
  return texts[locale] || texts.en;
}

function getHelpTexts(locale: string) {
  const texts: Record<string, {
    header: string; name: string;
    roomDesc: string; roomsDesc: string; statusDesc: string;
    clearDesc: string; stopDesc: string; startDesc: string; helpDesc: string;
    tip: string;
  }> = {
    en: {
      header: "Kep Commands",
      name: "name",
      roomDesc: "Set active room",
      roomsDesc: "Show all your rooms",
      statusDesc: "Show active room + stats",
      clearDesc: "Clear active room (use AI routing)",
      stopDesc: "Pause Kep",
      startDesc: "Resume Kep",
      helpDesc: "Show this help",
      tip: "Just send a photo, video, or message and Kep saves it!",
    },
    nl: {
      header: "Kep Commando's",
      name: "naam",
      roomDesc: "Stel actieve kamer in",
      roomsDesc: "Toon al je kamers",
      statusDesc: "Toon actieve kamer + statistieken",
      clearDesc: "Wis actieve kamer (gebruik AI-routering)",
      stopDesc: "Pauzeer Kep",
      startDesc: "Hervat Kep",
      helpDesc: "Toon deze hulp",
      tip: "Stuur gewoon een foto, video of bericht en Kep slaat het op!",
    },
    de: {
      header: "Kep Befehle",
      name: "Name",
      roomDesc: "Aktiven Raum festlegen",
      roomsDesc: "Alle Raume anzeigen",
      statusDesc: "Aktiven Raum + Statistiken anzeigen",
      clearDesc: "Aktiven Raum loschen (KI-Routing nutzen)",
      stopDesc: "Kep pausieren",
      startDesc: "Kep fortsetzen",
      helpDesc: "Diese Hilfe anzeigen",
      tip: "Schick einfach ein Foto, Video oder eine Nachricht und Kep speichert es!",
    },
    es: {
      header: "Comandos de Kep",
      name: "nombre",
      roomDesc: "Establecer sala activa",
      roomsDesc: "Mostrar todas tus salas",
      statusDesc: "Mostrar sala activa + estadisticas",
      clearDesc: "Borrar sala activa (usar enrutamiento IA)",
      stopDesc: "Pausar Kep",
      startDesc: "Reanudar Kep",
      helpDesc: "Mostrar esta ayuda",
      tip: "Solo envia una foto, video o mensaje y Kep lo guarda!",
    },
    fr: {
      header: "Commandes Kep",
      name: "nom",
      roomDesc: "Definir la salle active",
      roomsDesc: "Afficher toutes vos salles",
      statusDesc: "Afficher salle active + statistiques",
      clearDesc: "Effacer la salle active (routage IA)",
      stopDesc: "Mettre Kep en pause",
      startDesc: "Reprendre Kep",
      helpDesc: "Afficher cette aide",
      tip: "Envoyez simplement une photo, video ou message et Kep le sauvegarde !",
    },
  };
  return texts[locale] || texts.en;
}

function getPausedTexts(locale: string) {
  const texts: Record<string, { paused: string }> = {
    en: { paused: "Kep is paused. Send START to resume." },
    nl: { paused: "Kep is gepauzeerd. Stuur START om te hervatten." },
    de: { paused: "Kep ist pausiert. Sende START zum Fortsetzen." },
    es: { paused: "Kep esta pausado. Envia START para reanudar." },
    fr: { paused: "Kep est en pause. Envoyez START pour reprendre." },
  };
  return texts[locale] || texts.en;
}
