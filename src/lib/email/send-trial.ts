import { escapeHtml, emailLayout, emailLink, sendEmail, ornamentalDivider } from "./shared";
import { PLANS, annualTotalCopy, type PlanId } from "@/lib/constants/plans";

/* ── Trial-ending email (SUCCESS_PLAYBOOK Pillar 2 §1: close the silent-cancel trial) ──
 *
 * Sent from the Stripe `customer.subscription.trial_will_end` webhook (~3 days
 * before a 14-day trial ends). Calm, no-pressure voice: what the user has kept
 * so far, the plain price, and one CTA to the signed /api/billing/pm-update
 * link (mints the Billing-Portal session at click time — works signed-out).
 * If they do nothing, their palace stays safe on the free plan (1 GB) — the
 * checkout's `missing_payment_method: "cancel"` is stated honestly, not hidden.
 *
 * Gated by LIFECYCLE_EMAILS_ENABLED at the caller; own ledger category
 * ("trial-ending"), exempt from the ≤1/6d lifecycle cap, hard-capped by the
 * webhook's per-user dedupe.
 */

type Locale = "en" | "nl" | "de" | "es" | "fr";

const copy = {
  en: {
    subject: (days: number) => `Your Palace trial ends in ${days} ${days === 1 ? "day" : "days"}`,
    preheader: (price: string) => `Keep everything for ${price} a year — or do nothing and stay safely on the free plan.`,
    heading: (name: string) => `Your trial is almost over,<br/>${name}`,
    subtitle: (date: string) => `Your free trial ends on ${date}.`,
    kept: (n: number) =>
      n > 0
        ? `You've placed ${n} ${n === 1 ? "memory" : "memories"} in your palace so far. They stay yours, whatever you decide.`
        : `Your palace is standing and ready. Everything you place in it stays yours, whatever you decide.`,
    keep: (price: string, date: string) =>
      `If you'd like to keep everything as it is, add a payment method — it takes about 30 seconds — and nothing changes on ${date}. Your plan continues at ${price} per year.`,
    nothing: `If you do nothing, that's fine too: your palace stays safe on the free plan, with up to 1 GB of space. Nothing is deleted.`,
    ctaText: (price: string) => `Keep everything — ${price}/year`,
    manageHint: "The button opens a secure Stripe page where you can add or update your payment method.",
    footer: "You received this because you started a free trial at thememorypalace.ai.",
  },
  nl: {
    subject: (days: number) => `Je Paleis-proefperiode eindigt over ${days} ${days === 1 ? "dag" : "dagen"}`,
    preheader: (price: string) => `Bewaar alles voor ${price} per jaar — of doe niets en blijf veilig op het gratis plan.`,
    heading: (name: string) => `Je proefperiode is bijna voorbij,<br/>${name}`,
    subtitle: (date: string) => `Je gratis proefperiode eindigt op ${date}.`,
    kept: (n: number) =>
      n > 0
        ? `Je hebt tot nu toe ${n} ${n === 1 ? "herinnering" : "herinneringen"} in je paleis geplaatst. Die blijven van jou, wat je ook beslist.`
        : `Je paleis staat klaar. Alles wat je erin plaatst blijft van jou, wat je ook beslist.`,
    keep: (price: string, date: string) =>
      `Wil je alles zo houden? Voeg dan een betaalmethode toe — dat duurt zo'n 30 seconden — en er verandert niets op ${date}. Je abonnement loopt door voor ${price} per jaar.`,
    nothing: `Doe je niets, dan is dat ook prima: je paleis blijft veilig op het gratis plan, met maximaal 1 GB ruimte. Er wordt niets verwijderd.`,
    ctaText: (price: string) => `Alles bewaren — ${price}/jaar`,
    manageHint: "De knop opent een beveiligde Stripe-pagina waar je je betaalmethode kunt toevoegen of wijzigen.",
    footer: "Je ontvangt dit bericht omdat je een gratis proefperiode bent gestart op thememorypalace.ai.",
  },
  de: {
    subject: (days: number) => `Deine Palast-Testphase endet in ${days} ${days === 1 ? "Tag" : "Tagen"}`,
    preheader: (price: string) => `Behalte alles für ${price} pro Jahr — oder tu nichts und bleib sicher im Gratis-Plan.`,
    heading: (name: string) => `Deine Testphase ist fast vorbei,<br/>${name}`,
    subtitle: (date: string) => `Deine kostenlose Testphase endet am ${date}.`,
    kept: (n: number) =>
      n > 0
        ? `Du hast bisher ${n} ${n === 1 ? "Erinnerung" : "Erinnerungen"} in deinem Palast bewahrt. Sie bleiben deine, wie auch immer du dich entscheidest.`
        : `Dein Palast steht bereit. Alles, was du hineinstellst, bleibt deins — wie auch immer du dich entscheidest.`,
    keep: (price: string, date: string) =>
      `Wenn du alles so behalten möchtest, füge eine Zahlungsmethode hinzu — das dauert etwa 30 Sekunden — und am ${date} ändert sich nichts. Dein Abo läuft weiter für ${price} pro Jahr.`,
    nothing: `Wenn du nichts tust, ist das auch in Ordnung: Dein Palast bleibt sicher im Gratis-Plan mit bis zu 1 GB Speicher. Nichts wird gelöscht.`,
    ctaText: (price: string) => `Alles behalten — ${price}/Jahr`,
    manageHint: "Der Button öffnet eine sichere Stripe-Seite, auf der du deine Zahlungsmethode hinzufügen oder ändern kannst.",
    footer: "Du erhältst diese E-Mail, weil du eine kostenlose Testphase auf thememorypalace.ai gestartet hast.",
  },
  es: {
    subject: (days: number) => `Tu prueba del Palacio termina en ${days} ${days === 1 ? "día" : "días"}`,
    preheader: (price: string) => `Consérvalo todo por ${price} al año — o no hagas nada y quédate tranquilo en el plan gratuito.`,
    heading: (name: string) => `Tu prueba está por terminar,<br/>${name}`,
    subtitle: (date: string) => `Tu prueba gratuita termina el ${date}.`,
    kept: (n: number) =>
      n > 0
        ? `Hasta ahora has guardado ${n} ${n === 1 ? "recuerdo" : "recuerdos"} en tu palacio. Seguirán siendo tuyos, decidas lo que decidas.`
        : `Tu palacio está listo. Todo lo que guardes en él seguirá siendo tuyo, decidas lo que decidas.`,
    keep: (price: string, date: string) =>
      `Si quieres conservarlo todo tal cual, añade un método de pago — tarda unos 30 segundos — y nada cambiará el ${date}. Tu plan continúa por ${price} al año.`,
    nothing: `Si no haces nada, también está bien: tu palacio permanece seguro en el plan gratuito, con hasta 1 GB de espacio. No se borra nada.`,
    ctaText: (price: string) => `Conservarlo todo — ${price}/año`,
    manageHint: "El botón abre una página segura de Stripe donde puedes añadir o actualizar tu método de pago.",
    footer: "Recibes este mensaje porque iniciaste una prueba gratuita en thememorypalace.ai.",
  },
  fr: {
    subject: (days: number) => `Votre essai du Palais se termine dans ${days} ${days === 1 ? "jour" : "jours"}`,
    preheader: (price: string) => `Gardez tout pour ${price} par an — ou ne faites rien et restez sereinement sur l'offre gratuite.`,
    heading: (name: string) => `Votre essai touche à sa fin,<br/>${name}`,
    subtitle: (date: string) => `Votre essai gratuit se termine le ${date}.`,
    kept: (n: number) =>
      n > 0
        ? `Vous avez déjà placé ${n} ${n === 1 ? "souvenir" : "souvenirs"} dans votre palais. Ils restent les vôtres, quoi que vous décidiez.`
        : `Votre palais est prêt. Tout ce que vous y placez reste à vous, quoi que vous décidiez.`,
    keep: (price: string, date: string) =>
      `Si vous souhaitez tout garder tel quel, ajoutez un moyen de paiement — cela prend environ 30 secondes — et rien ne changera le ${date}. Votre abonnement continue pour ${price} par an.`,
    nothing: `Si vous ne faites rien, ce n'est pas grave : votre palais reste en sécurité sur l'offre gratuite, avec jusqu'à 1 Go d'espace. Rien n'est supprimé.`,
    ctaText: (price: string) => `Tout garder — ${price}/an`,
    manageHint: "Le bouton ouvre une page Stripe sécurisée où vous pouvez ajouter ou mettre à jour votre moyen de paiement.",
    footer: "Vous recevez cet e-mail car vous avez commencé un essai gratuit sur thememorypalace.ai.",
  },
} as const;

function resolveLocale(locale?: string): Locale {
  if (locale && locale in copy) return locale as Locale;
  return "en";
}

const dateLocales: Record<Locale, string> = {
  en: "en-GB",
  nl: "nl-NL",
  de: "de-DE",
  es: "es-ES",
  fr: "fr-FR",
};

export interface TrialEndingEmailParams {
  recipientEmail: string;
  displayName: string;
  locale?: string;
  /** Which paid plan the trial is on — price copy is read from PLANS. */
  planId: Exclude<PlanId, "free">;
  /** Memories the user has placed so far ("what you've kept"). */
  memoriesCount: number;
  /** When the trial ends (Stripe trial_end). */
  trialEnd: Date;
  daysLeft: number;
  /** Signed /api/billing/pm-update link (see pm-update-token.ts). */
  pmUpdateUrl: string;
}

export function generateTrialEndingEmailHtml(params: TrialEndingEmailParams): string {
  const locale = resolveLocale(params.locale);
  const c = copy[locale];
  const displayName = escapeHtml(params.displayName);
  const price = annualTotalCopy(params.planId); // "€49" / "€79"
  const endDate = escapeHtml(
    params.trialEnd.toLocaleDateString(dateLocales[locale], {
      day: "numeric",
      month: "long",
      year: "numeric",
    }),
  );
  // CTA carries the signed token — UTM-tag it like every lifecycle link.
  const ctaUrl = emailLink(params.pmUpdateUrl, { campaign: "trial_ending", content: "cta" });

  const headerHtml = `
    <p style="margin:0 0 14px;font-family:'Cormorant Garamond',Georgia,serif;font-size:13px;font-weight:600;color:#B8922E;letter-spacing:0.18em;text-transform:uppercase;">
      Memory Palace
    </p>
    <h1 class="header-title" style="margin:0;font-family:'Cormorant Garamond','Playfair Display',Georgia,'Times New Roman',serif;font-size:32px;font-weight:500;color:#2C2C2A;line-height:1.25;letter-spacing:-0.005em;">
      ${c.heading(displayName)}
    </h1>
    <p class="header-subtitle" style="margin:16px 0 0;font-family:Georgia,'Times New Roman',serif;font-size:16px;color:#5C4733;line-height:1.65;font-style:italic;">
      ${c.subtitle(endDate)}
    </p>`;

  const bodyHtml = `
    <p class="text-primary" style="margin:0 0 20px;font-family:Georgia,'Times New Roman',serif;font-size:16px;color:#2C2C2A;line-height:1.8;">
      ${c.kept(params.memoriesCount)}
    </p>

    ${ornamentalDivider()}

    <p class="text-primary" style="margin:20px 0 16px;font-family:Georgia,'Times New Roman',serif;font-size:16px;color:#2C2C2A;line-height:1.8;">
      ${c.keep(price, endDate)}
    </p>
    <p class="text-secondary" style="margin:0 0 8px;font-family:Georgia,'Times New Roman',serif;font-size:15px;color:#5C564E;line-height:1.8;">
      ${c.nothing}
    </p>`;

  return emailLayout({
    preheader: c.preheader(price),
    headerHtml,
    bodyHtml,
    ctaText: c.ctaText(price),
    ctaUrl,
    utmCampaign: "trial_ending",
    locale,
    footerExtra: `
      <p style="margin:0 0 6px;font-family:Georgia,'Times New Roman',serif;font-size:11px;color:#B8A99A;">
        ${c.manageHint}
      </p>
      <p style="margin:0;font-family:Georgia,'Times New Roman',serif;font-size:11px;color:#B8A99A;">
        ${c.footer}
      </p>`,
  });
}

export function generateTrialEndingEmailSubject(daysLeft: number, locale?: string): string {
  const c = copy[resolveLocale(locale)];
  return c.subject(daysLeft);
}

export async function sendTrialEndingEmail(
  params: TrialEndingEmailParams,
): Promise<{ success: boolean; error?: string }> {
  // Belt-and-braces: never reference a plan that has no paid definition.
  if (!PLANS[params.planId] || params.planId === ("free" as PlanId)) {
    return { success: false, error: "invalid plan" };
  }
  return sendEmail({
    to: params.recipientEmail,
    subject: generateTrialEndingEmailSubject(params.daysLeft, params.locale),
    html: generateTrialEndingEmailHtml(params),
    tag: "trial-ending",
  });
}
