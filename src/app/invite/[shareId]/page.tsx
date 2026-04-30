import { Metadata } from "next";
import { cookies } from "next/headers";
import { getInviteDetails } from "@/lib/auth/invite-actions";
import InviteLanding from "./InviteLanding";

const metaTitle: Record<string, string> = {
  en: "Invitation — The Memory Palace",
  nl: "Uitnodiging — The Memory Palace",
  de: "Einladung — The Memory Palace",
  es: "Invitación — The Memory Palace",
  fr: "Invitation — The Memory Palace",
};

const metaDesc: Record<string, string> = {
  en: "You've been invited to explore a Memory Palace.",
  nl: "Je bent uitgenodigd om een Memory Palace te verkennen.",
  de: "Sie wurden eingeladen, einen Memory Palace zu erkunden.",
  es: "Has sido invitado a explorar un Memory Palace.",
  fr: "Vous avez été invité(e) à explorer un Memory Palace.",
};

const invitedTitle: Record<string, string> = {
  en: "{name} invited you to explore their Memory Palace",
  nl: "{name} heeft je uitgenodigd om hun Memory Palace te verkennen",
  de: "{name} hat Sie eingeladen, ihren Memory Palace zu erkunden",
  es: "{name} te ha invitado a explorar su Memory Palace",
  fr: "{name} vous a invité(e) à explorer son Memory Palace",
};

const invitedDesc: Record<string, string> = {
  en: "{name} wants to share \"{room}\"{wing} with you. Open to view their precious memories.",
  nl: "{name} wil \"{room}\"{wing} met je delen. Open om hun dierbare herinneringen te bekijken.",
  de: "{name} möchte \"{room}\"{wing} mit Ihnen teilen. Öffnen Sie, um die wertvollen Erinnerungen anzusehen.",
  es: "{name} quiere compartir \"{room}\"{wing} contigo. Ábrelo para ver sus preciados recuerdos.",
  fr: "{name} souhaite partager \"{room}\"{wing} avec vous. Ouvrez pour voir ses précieux souvenirs.",
};

const wingLabel: Record<string, string> = {
  en: " in their {wing} wing",
  nl: " in hun {wing}-vleugel",
  de: " in ihrem {wing}-Flügel",
  es: " en su ala {wing}",
  fr: " dans leur aile {wing}",
};

interface PageProps {
  params: Promise<{ shareId: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { shareId } = await params;
  const cookieStore = await cookies();
  const locale = cookieStore.get("mp_locale")?.value?.slice(0, 2) || "en";
  const result = await getInviteDetails(shareId);

  if (result.error || !result.invite) {
    return {
      title: metaTitle[locale] || metaTitle.en,
      description: metaDesc[locale] || metaDesc.en,
    };
  }

  const { inviter, room, wing } = result;
  const wingStr = wing.name
    ? (wingLabel[locale] || wingLabel.en).replace("{wing}", wing.name)
    : "";
  const title = (invitedTitle[locale] || invitedTitle.en).replace("{name}", inviter.name);
  const description = (invitedDesc[locale] || invitedDesc.en)
    .replace("{name}", inviter.name)
    .replace("{room}", room.name)
    .replace("{wing}", wingStr);

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: "website",
      siteName: "The Memory Palace",
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
    },
  };
}

export default async function InvitePage({ params }: PageProps) {
  const { shareId } = await params;
  const result = await getInviteDetails(shareId);

  return <InviteLanding shareId={shareId} result={result} />;
}
