/**
 * WhatsApp disclosure message sender.
 * Sends privacy disclosure to groups when a Kep is first activated.
 */

const GRAPH_API_BASE = "https://graph.facebook.com/v21.0";

/**
 * Send a disclosure message to a WhatsApp group.
 */
export async function sendDisclosureMessage(
  groupId: string,
  locale: string = "en",
): Promise<boolean> {
  const token = process.env.WHATSAPP_ACCESS_TOKEN?.trim();
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;

  if (!token || !phoneNumberId) {
    console.error("[Kep Disclosure] WhatsApp credentials not configured");
    return false;
  }

  const message = getDisclosureText(locale);

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
          to: groupId,
          type: "text",
          text: { body: message },
        }),
      },
    );

    if (!res.ok) {
      const err = await res.text();
      console.error(`[Kep Disclosure] Failed to send: ${res.status} ${err}`);
      return false;
    }

    return true;
  } catch (err) {
    console.error("[Kep Disclosure] Error:", err);
    return false;
  }
}

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || "https://thememorypalace.ai";

/**
 * Send a branded welcome message to a new sender.
 * Includes links for virtual room and palace room creation.
 */
export async function sendWelcomeMessage(
  recipientPhone: string,
  inviteCode: string | null,
  locale: string = "en",
): Promise<boolean> {
  const token = process.env.WHATSAPP_ACCESS_TOKEN?.trim();
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;

  if (!token || !phoneNumberId) {
    console.error("[Kep Welcome] WhatsApp credentials not configured");
    return false;
  }

  const message = getWelcomeText(inviteCode, locale);

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
          text: { preview_url: true, body: message },
        }),
      },
    );

    if (!res.ok) {
      const err = await res.text();
      console.error(`[Kep Welcome] Failed to send: ${res.status} ${err}`);
      return false;
    }

    return true;
  } catch (err) {
    console.error("[Kep Welcome] Error:", err);
    return false;
  }
}

/**
 * Send a combined welcome + disclosure message TO a WhatsApp group.
 * Sent once when the group link is auto-created.
 */
export async function sendGroupWelcomeMessage(
  groupChatId: string,
  inviteCode: string,
  locale: string = "en",
): Promise<boolean> {
  const token = process.env.WHATSAPP_ACCESS_TOKEN?.trim();
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;

  if (!token || !phoneNumberId) {
    console.error("[Kep Group Welcome] WhatsApp credentials not configured");
    return false;
  }

  const message = getGroupWelcomeText(inviteCode, locale);

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
          to: groupChatId,
          type: "text",
          text: { preview_url: true, body: message },
        }),
      },
    );

    if (!res.ok) {
      const err = await res.text();
      console.error(`[Kep Group Welcome] Failed to send: ${res.status} ${err}`);
      return false;
    }

    return true;
  } catch (err) {
    console.error("[Kep Group Welcome] Error:", err);
    return false;
  }
}

/**
 * Send a text message to a WhatsApp user.
 */
export async function sendTextMessage(
  recipientPhone: string,
  text: string,
): Promise<boolean> {
  const token = process.env.WHATSAPP_ACCESS_TOKEN?.trim();
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;

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
          text: { body: text },
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

/**
 * Send room confirmation with action buttons after high-confidence auto-route.
 */
export async function sendRoomConfirmation(
  recipientPhone: string,
  roomName: string,
  wingName: string,
  captureId: string,
  locale: string = "en",
): Promise<boolean> {
  const token = process.env.WHATSAPP_ACCESS_TOKEN?.trim();
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;

  if (!token || !phoneNumberId) return false;

  const t = getInteractiveTexts(locale);

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
          interactive: {
            type: "button",
            body: { text: t.savedTo.replace("{wing}", wingName).replace("{room}", roomName) },
            action: {
              buttons: [
                { type: "reply", reply: { id: `confirm:${captureId}`, title: "OK" } },
                { type: "reply", reply: { id: `move:${captureId}`, title: t.moveIt } },
                { type: "reply", reply: { id: `delete:${captureId}`, title: t.deleteBtn } },
              ],
            },
          },
        }),
      },
    );

    if (!res.ok) {
      const err = await res.text();
      console.error(`[Kep] Failed to send confirmation: ${res.status} ${err}`);
      return false;
    }
    return true;
  } catch (err) {
    console.error("[Kep] sendRoomConfirmation error:", err);
    return false;
  }
}

interface RoomForPicker {
  id: string;
  name: string;
  wing_id: string;
  wings?: { id?: string; slug?: string; custom_name?: string; name?: string } | null;
}

/**
 * Send a room picker list message when AI confidence is low.
 * Rooms are grouped by wing as sections. Max 10 rows.
 */
export async function sendRoomPicker(
  recipientPhone: string,
  rooms: RoomForPicker[],
  captureId: string,
  locale: string = "en",
): Promise<boolean> {
  const token = process.env.WHATSAPP_ACCESS_TOKEN?.trim();
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;

  if (!token || !phoneNumberId) return false;

  const t = getInteractiveTexts(locale);

  // Group rooms by wing, limit to 10 total
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
          interactive: {
            type: "list",
            body: { text: t.whereSave },
            action: {
              button: t.pickRoom,
              sections,
            },
          },
        }),
      },
    );

    if (!res.ok) {
      const err = await res.text();
      console.error(`[Kep] Failed to send room picker: ${res.status} ${err}`);
      return false;
    }
    return true;
  } catch (err) {
    console.error("[Kep] sendRoomPicker error:", err);
    return false;
  }
}

function getInteractiveTexts(locale: string): {
  savedTo: string;
  whereSave: string;
  pickRoom: string;
  moveIt: string;
  deleteBtn: string;
  deleted: string;
  movedTo: string;
  noRoomsYet: string;
  welcomeForward: string;
} {
  const texts: Record<string, ReturnType<typeof getInteractiveTexts>> = {
    en: {
      savedTo: "Saved to {wing} / {room}",
      whereSave: "Where should I save this?",
      pickRoom: "Pick a room",
      moveIt: "Move it",
      deleteBtn: "Delete",
      deleted: "Deleted",
      movedTo: "Moved to {wing} / {room}",
      noRoomsYet: "You don't have any rooms yet. Create your first wing at thememorypalace.ai",
      welcomeForward: "Forward photos, videos, or messages from any chat and I'll help you file them in the right room.",
    },
    nl: {
      savedTo: "Opgeslagen in {wing} / {room}",
      whereSave: "Waar wil je dit opslaan?",
      pickRoom: "Kies een kamer",
      moveIt: "Verplaats",
      deleteBtn: "Verwijder",
      deleted: "Verwijderd",
      movedTo: "Verplaatst naar {wing} / {room}",
      noRoomsYet: "Je hebt nog geen kamers. Maak je eerste vleugel aan op thememorypalace.ai",
      welcomeForward: "Stuur foto's, video's of berichten door vanuit elke chat en ik help je ze in de juiste kamer te plaatsen.",
    },
    de: {
      savedTo: "Gespeichert in {wing} / {room}",
      whereSave: "Wo soll ich das speichern?",
      pickRoom: "Raum w\u00e4hlen",
      moveIt: "Verschieben",
      deleteBtn: "L\u00f6schen",
      deleted: "Gel\u00f6scht",
      movedTo: "Verschoben nach {wing} / {room}",
      noRoomsYet: "Du hast noch keine R\u00e4ume. Erstelle deinen ersten Fl\u00fcgel auf thememorypalace.ai",
      welcomeForward: "Leite Fotos, Videos oder Nachrichten aus jedem Chat weiter und ich helfe dir, sie im richtigen Raum abzulegen.",
    },
    es: {
      savedTo: "Guardado en {wing} / {room}",
      whereSave: "\u00bfD\u00f3nde quieres guardar esto?",
      pickRoom: "Elige una sala",
      moveIt: "Mover",
      deleteBtn: "Eliminar",
      deleted: "Eliminado",
      movedTo: "Movido a {wing} / {room}",
      noRoomsYet: "A\u00fan no tienes salas. Crea tu primera ala en thememorypalace.ai",
      welcomeForward: "Reenv\u00eda fotos, videos o mensajes de cualquier chat y te ayudar\u00e9 a archivarlos en la sala correcta.",
    },
    fr: {
      savedTo: "Enregistr\u00e9 dans {wing} / {room}",
      whereSave: "O\u00f9 dois-je enregistrer ceci ?",
      pickRoom: "Choisir une salle",
      moveIt: "D\u00e9placer",
      deleteBtn: "Supprimer",
      deleted: "Supprim\u00e9",
      movedTo: "D\u00e9plac\u00e9 vers {wing} / {room}",
      noRoomsYet: "Vous n'avez pas encore de salles. Cr\u00e9ez votre premi\u00e8re aile sur thememorypalace.ai",
      welcomeForward: "Transf\u00e9rez des photos, vid\u00e9os ou messages de n'importe quel chat et je vous aiderai \u00e0 les classer dans la bonne salle.",
    },
  };

  return texts[locale] || texts.en;
}

function getGroupWelcomeText(inviteCode: string, locale: string): string {
  const texts: Record<string, (code: string) => string> = {
    en: (code) => [
      "📸 Memory Palace Kep",
      "",
      "Hi! I'm Kep — I capture photos, videos, and messages shared in this group and save them to a Memory Palace room.",
      "",
      `👉 Create a room for this group:`,
      `${BASE_URL}/kep/join/${code}`,
      "",
      "📋 Privacy: Media shared here may be automatically saved. Reply STOP to opt out your messages, or STOP KEP to deactivate me entirely.",
    ].join("\n"),
    nl: (code) => [
      "📸 Memory Palace Kep",
      "",
      "Hoi! Ik ben Kep — ik bewaar foto's, video's en berichten uit deze groep in een Memory Palace kamer.",
      "",
      `👉 Maak een kamer voor deze groep:`,
      `${BASE_URL}/kep/join/${code}`,
      "",
      "📋 Privacy: Gedeelde media kan automatisch worden opgeslagen. Antwoord STOP om je berichten uit te sluiten, of STOP KEP om mij volledig te deactiveren.",
    ].join("\n"),
    de: (code) => [
      "📸 Memory Palace Kep",
      "",
      "Hallo! Ich bin Kep — ich speichere Fotos, Videos und Nachrichten aus dieser Gruppe in einem Memory Palace Raum.",
      "",
      `👉 Erstelle einen Raum für diese Gruppe:`,
      `${BASE_URL}/kep/join/${code}`,
      "",
      "📋 Datenschutz: Geteilte Medien können automatisch gespeichert werden. Antworte STOP um deine Nachrichten auszuschließen, oder STOP KEP um mich vollständig zu deaktivieren.",
    ].join("\n"),
    es: (code) => [
      "📸 Memory Palace Kep",
      "",
      "¡Hola! Soy Kep — guardo fotos, videos y mensajes de este grupo en una sala de Memory Palace.",
      "",
      `👉 Crea una sala para este grupo:`,
      `${BASE_URL}/kep/join/${code}`,
      "",
      "📋 Privacidad: Los medios compartidos pueden guardarse automáticamente. Responde STOP para excluir tus mensajes, o STOP KEP para desactivarme por completo.",
    ].join("\n"),
    fr: (code) => [
      "📸 Memory Palace Kep",
      "",
      "Salut ! Je suis Kep — je sauvegarde les photos, vidéos et messages de ce groupe dans une salle Memory Palace.",
      "",
      `👉 Créez une salle pour ce groupe :`,
      `${BASE_URL}/kep/join/${code}`,
      "",
      "📋 Confidentialité : Les médias partagés peuvent être automatiquement sauvegardés. Répondez STOP pour exclure vos messages, ou STOP KEP pour me désactiver entièrement.",
    ].join("\n"),
  };

  const textFn = texts[locale] || texts.en;
  return textFn(inviteCode);
}

function getWelcomeText(inviteCode: string | null, locale: string = "en"): string {
  const texts: Record<string, { intro: string; forward: string; viewRoom: string; palaceRoom: string; stop: string }> = {
    en: {
      intro: "I'm Kep \u2014 I save your memories to your Memory Palace.",
      forward: "Forward photos, videos, or messages from any chat and I'll help you file them in the right room.",
      viewRoom: "View room (anyone):",
      palaceRoom: "Add to your palace (host only):",
      stop: "Reply STOP KEP to deactivate.",
    },
    nl: {
      intro: "Ik ben Kep \u2014 ik bewaar je herinneringen in je Memory Palace.",
      forward: "Stuur foto's, video's of berichten door vanuit elke chat en ik help je ze in de juiste kamer te plaatsen.",
      viewRoom: "Bekijk kamer (iedereen):",
      palaceRoom: "Voeg toe aan je paleis (alleen host):",
      stop: "Antwoord STOP KEP om te deactiveren.",
    },
    de: {
      intro: "Ich bin Kep \u2014 ich speichere deine Erinnerungen in deinem Memory Palace.",
      forward: "Leite Fotos, Videos oder Nachrichten aus jedem Chat weiter und ich helfe dir, sie im richtigen Raum abzulegen.",
      viewRoom: "Raum ansehen (jeder):",
      palaceRoom: "Zu deinem Palast hinzuf\u00fcgen (nur Host):",
      stop: "Antworte STOP KEP zum Deaktivieren.",
    },
    es: {
      intro: "Soy Kep \u2014 guardo tus recuerdos en tu Memory Palace.",
      forward: "Reenv\u00eda fotos, videos o mensajes de cualquier chat y te ayudar\u00e9 a archivarlos en la sala correcta.",
      viewRoom: "Ver sala (cualquiera):",
      palaceRoom: "A\u00f1adir a tu palacio (solo anfitri\u00f3n):",
      stop: "Responde STOP KEP para desactivar.",
    },
    fr: {
      intro: "Je suis Kep \u2014 je sauvegarde vos souvenirs dans votre Memory Palace.",
      forward: "Transf\u00e9rez des photos, vid\u00e9os ou messages de n'importe quel chat et je vous aiderai \u00e0 les classer dans la bonne salle.",
      viewRoom: "Voir la salle (tout le monde) :",
      palaceRoom: "Ajouter \u00e0 votre palais (h\u00f4te uniquement) :",
      stop: "R\u00e9pondez STOP KEP pour d\u00e9sactiver.",
    },
  };

  const t = texts[locale] || texts.en;
  const lines = [
    "\ud83d\udcf8 Memory Palace Kep",
    "",
    t.intro,
    "",
    t.forward,
  ];

  if (inviteCode) {
    lines.push(
      "",
      `\ud83d\udc49 ${t.viewRoom}`,
      `${BASE_URL}/kep/view/${inviteCode}`,
      "",
      `\ud83d\udc49 ${t.palaceRoom}`,
      `${BASE_URL}/kep/palace/${inviteCode}`,
    );
  }

  lines.push("", t.stop);

  return lines.join("\n");
}

function getDisclosureText(locale: string): string {
  const texts: Record<string, string> = {
    en: "📋 Privacy Notice: This group is connected to a Memory Palace Kep. Media shared here may be automatically saved to a private memory collection. Reply STOP at any time to opt out of capture for your messages.",
    nl: "📋 Privacymelding: Deze groep is verbonden met een Memory Palace Kep. Gedeelde media kan automatisch worden opgeslagen in een privé-herinneringenverzameling. Antwoord STOP om je berichten uit te sluiten van opname.",
    de: "📋 Datenschutzhinweis: Diese Gruppe ist mit einem Memory Palace Kep verbunden. Geteilte Medien können automatisch in einer privaten Erinnerungssammlung gespeichert werden. Antworten Sie STOP, um Ihre Nachrichten von der Aufnahme auszuschließen.",
    es: "📋 Aviso de privacidad: Este grupo está conectado a un Kep de Memory Palace. Los medios compartidos pueden guardarse automáticamente en una colección privada de recuerdos. Responde STOP para excluir tus mensajes de la captura.",
    fr: "📋 Avis de confidentialité : Ce groupe est connecté à un Kep Memory Palace. Les médias partagés peuvent être automatiquement sauvegardés dans une collection de souvenirs privée. Répondez STOP pour exclure vos messages de la capture.",
  };

  return texts[locale] || texts.en;
}
