/**
 * WhatsApp disclosure message sender.
 * Sends privacy disclosure to groups when a Kep is first activated.
 */

const GRAPH_API_BASE = "https://graph.facebook.com/v19.0";

/**
 * Send a disclosure message to a WhatsApp group.
 */
export async function sendDisclosureMessage(
  groupId: string,
  locale: string = "en",
): Promise<boolean> {
  const token = process.env.WHATSAPP_ACCESS_TOKEN;
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
  const token = process.env.WHATSAPP_ACCESS_TOKEN;
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
  const token = process.env.WHATSAPP_ACCESS_TOKEN;
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
  const texts: Record<string, { intro: string; virtualRoom: string; palaceRoom: string; stop: string }> = {
    en: {
      intro: "I capture photos, videos, and messages you share here and add them to your Memory Palace room.",
      virtualRoom: "Create a virtual room (anyone):",
      palaceRoom: "Add to your palace (host only):",
      stop: "Reply STOP KEP to deactivate.",
    },
    nl: {
      intro: "Ik bewaar foto's, video's en berichten die je hier deelt en voeg ze toe aan je Memory Palace kamer.",
      virtualRoom: "Maak een virtuele kamer (iedereen):",
      palaceRoom: "Voeg toe aan je paleis (alleen host):",
      stop: "Antwoord STOP KEP om te deactiveren.",
    },
    de: {
      intro: "Ich speichere Fotos, Videos und Nachrichten, die du hier teilst, und f\u00fcge sie deinem Memory Palace Raum hinzu.",
      virtualRoom: "Erstelle einen virtuellen Raum (jeder):",
      palaceRoom: "Zu deinem Palast hinzuf\u00fcgen (nur Host):",
      stop: "Antworte STOP KEP zum Deaktivieren.",
    },
    es: {
      intro: "Capturo fotos, videos y mensajes que compartes aqu\u00ed y los a\u00f1ado a tu sala de Memory Palace.",
      virtualRoom: "Crea una sala virtual (cualquiera):",
      palaceRoom: "A\u00f1adir a tu palacio (solo anfitri\u00f3n):",
      stop: "Responde STOP KEP para desactivar.",
    },
    fr: {
      intro: "Je capture les photos, vid\u00e9os et messages que vous partagez ici et les ajoute \u00e0 votre salle Memory Palace.",
      virtualRoom: "Cr\u00e9ez une salle virtuelle (tout le monde) :",
      palaceRoom: "Ajouter \u00e0 votre palais (h\u00f4te uniquement) :",
      stop: "R\u00e9pondez STOP KEP pour d\u00e9sactiver.",
    },
  };

  const t = texts[locale] || texts.en;
  const lines = [
    "\ud83d\udcf8 Memory Palace Kep",
    "",
    t.intro,
  ];

  if (inviteCode) {
    lines.push(
      "",
      `\ud83d\udc49 ${t.virtualRoom}`,
      `${BASE_URL}/kep/join/${inviteCode}`,
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
