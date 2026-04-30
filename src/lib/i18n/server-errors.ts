import type { Locale } from "@/i18n/config";
import { getServerLocale } from "./server";

/**
 * Server-side error translation helper.
 *
 * Server actions return `{ error: string }` which clients show in toasts/alerts.
 * Instead of hardcoded English, we translate them server-side using the user's
 * locale cookie (mp_locale), matching the same mechanism as next-intl's
 * `src/i18n/request.ts`.
 */

const errors: Record<string, Record<Locale, string>> = {
  // ── Auth (actions.ts) ──
  emailRequired: {
    en: "Email is required.",
    nl: "E-mailadres is verplicht.",
    de: "E-Mail ist erforderlich.",
    es: "El correo es obligatorio.",
    fr: "L'adresse e-mail est requise.",
  },
  passwordRequired: {
    en: "Password is required.",
    nl: "Wachtwoord is verplicht.",
    de: "Passwort ist erforderlich.",
    es: "La contrase\u00f1a es obligatoria.",
    fr: "Le mot de passe est requis.",
  },
  invalidEmail: {
    en: "Please enter a valid email address.",
    nl: "Voer een geldig e-mailadres in.",
    de: "Bitte geben Sie eine g\u00fcltige E-Mail-Adresse ein.",
    es: "Introduce una direcci\u00f3n de correo v\u00e1lida.",
    fr: "Veuillez saisir une adresse e-mail valide.",
  },
  passwordTooShort: {
    en: "Password must be at least 8 characters long.",
    nl: "Wachtwoord moet minimaal 8 tekens lang zijn.",
    de: "Das Passwort muss mindestens 8 Zeichen lang sein.",
    es: "La contrase\u00f1a debe tener al menos 8 caracteres.",
    fr: "Le mot de passe doit contenir au moins 8 caract\u00e8res.",
  },

  // ── Sharing (sharing-actions.ts) ──
  notAuthenticated: {
    en: "Not authenticated",
    nl: "Niet ingelogd",
    de: "Nicht authentifiziert",
    es: "No autenticado",
    fr: "Non authentifi\u00e9",
  },
  cannotShareWithYourself: {
    en: "Cannot share with yourself",
    nl: "Je kunt niet met jezelf delen",
    de: "Sie k\u00f6nnen nicht mit sich selbst teilen",
    es: "No puedes compartir contigo mismo",
    fr: "Vous ne pouvez pas partager avec vous-m\u00eame",
  },
  alreadySharedWithThisPerson: {
    en: "Already shared with this person",
    nl: "Al gedeeld met deze persoon",
    de: "Bereits mit dieser Person geteilt",
    es: "Ya compartido con esta persona",
    fr: "D\u00e9j\u00e0 partag\u00e9 avec cette personne",
  },
  couldNotResolveRoom: {
    en: "Could not resolve room",
    nl: "Kamer kon niet worden gevonden",
    de: "Raum konnte nicht aufgel\u00f6st werden",
    es: "No se pudo resolver la sala",
    fr: "Impossible de r\u00e9soudre la salle",
  },
  cannotShareWingWithYourself: {
    en: "You cannot share a wing with yourself",
    nl: "Je kunt een vleugel niet met jezelf delen",
    de: "Sie k\u00f6nnen einen Fl\u00fcgel nicht mit sich selbst teilen",
    es: "No puedes compartir un ala contigo mismo",
    fr: "Vous ne pouvez pas partager une aile avec vous-m\u00eame",
  },
  validEmailRequired: {
    en: "Valid email is required",
    nl: "Een geldig e-mailadres is verplicht",
    de: "Eine g\u00fcltige E-Mail-Adresse ist erforderlich",
    es: "Se requiere un correo v\u00e1lido",
    fr: "Une adresse e-mail valide est requise",
  },

  // ── Invites (invite-actions.ts) ──
  invitationNotFound: {
    en: "Invitation not found",
    nl: "Uitnodiging niet gevonden",
    de: "Einladung nicht gefunden",
    es: "Invitaci\u00f3n no encontrada",
    fr: "Invitation introuvable",
  },
  invitationDeclined: {
    en: "This invitation was declined",
    nl: "Deze uitnodiging is afgewezen",
    de: "Diese Einladung wurde abgelehnt",
    es: "Esta invitaci\u00f3n fue rechazada",
    fr: "Cette invitation a \u00e9t\u00e9 refus\u00e9e",
  },
  invitationExpired: {
    en: "This invitation has expired",
    nl: "Deze uitnodiging is verlopen",
    de: "Diese Einladung ist abgelaufen",
    es: "Esta invitaci\u00f3n ha expirado",
    fr: "Cette invitation a expir\u00e9",
  },
  invitationWrongEmail: {
    en: "This invitation was sent to a different email address",
    nl: "Deze uitnodiging is naar een ander e-mailadres gestuurd",
    de: "Diese Einladung wurde an eine andere E-Mail-Adresse gesendet",
    es: "Esta invitaci\u00f3n fue enviada a otra direcci\u00f3n de correo",
    fr: "Cette invitation a \u00e9t\u00e9 envoy\u00e9e \u00e0 une autre adresse e-mail",
  },
  alreadyAccepted: {
    en: "Already accepted",
    nl: "Al geaccepteerd",
    de: "Bereits akzeptiert",
    es: "Ya aceptada",
    fr: "D\u00e9j\u00e0 accept\u00e9e",
  },
  notAuthorizedDecline: {
    en: "Not authorized to decline this invitation",
    nl: "Niet gemachtigd om deze uitnodiging af te wijzen",
    de: "Nicht berechtigt, diese Einladung abzulehnen",
    es: "No autorizado para rechazar esta invitaci\u00f3n",
    fr: "Non autoris\u00e9 \u00e0 refuser cette invitation",
  },

  // ── Family tree (family-tree-actions.ts) ──
  firstNameRequired: {
    en: "First name is required",
    nl: "Voornaam is verplicht",
    de: "Vorname ist erforderlich",
    es: "El nombre es obligatorio",
    fr: "Le pr\u00e9nom est requis",
  },
  cannotRelateSelf: {
    en: "Cannot relate a person to themselves",
    nl: "Een persoon kan niet aan zichzelf worden gekoppeld",
    de: "Eine Person kann nicht mit sich selbst verkn\u00fcpft werden",
    es: "No se puede relacionar a una persona consigo misma",
    fr: "Impossible de lier une personne \u00e0 elle-m\u00eame",
  },
  relationshipAlreadyExists: {
    en: "Relationship already exists",
    nl: "Relatie bestaat al",
    de: "Beziehung existiert bereits",
    es: "La relaci\u00f3n ya existe",
    fr: "La relation existe d\u00e9j\u00e0",
  },
  titleRequired: {
    en: "Title is required",
    nl: "Titel is verplicht",
    de: "Titel ist erforderlich",
    es: "El t\u00edtulo es obligatorio",
    fr: "Le titre est requis",
  },
  cannotMergeSelf: {
    en: "Cannot merge a person with themselves",
    nl: "Een persoon kan niet met zichzelf worden samengevoegd",
    de: "Eine Person kann nicht mit sich selbst zusammengef\u00fchrt werden",
    es: "No se puede fusionar a una persona consigo misma",
    fr: "Impossible de fusionner une personne avec elle-m\u00eame",
  },

  // ── Family groups (family-actions.ts) ──
  groupNameRequired: {
    en: "Group name is required",
    nl: "Groepsnaam is verplicht",
    de: "Gruppenname ist erforderlich",
    es: "El nombre del grupo es obligatorio",
    fr: "Le nom du groupe est requis",
  },
  noPermissionInvite: {
    en: "You do not have permission to invite members",
    nl: "Je hebt geen toestemming om leden uit te nodigen",
    de: "Sie haben keine Berechtigung, Mitglieder einzuladen",
    es: "No tienes permiso para invitar miembros",
    fr: "Vous n'avez pas la permission d'inviter des membres",
  },
  alreadyInGroup: {
    en: "This person is already in the group",
    nl: "Deze persoon zit al in de groep",
    de: "Diese Person ist bereits in der Gruppe",
    es: "Esta persona ya est\u00e1 en el grupo",
    fr: "Cette personne est d\u00e9j\u00e0 dans le groupe",
  },
  noPermissionRemove: {
    en: "You do not have permission to remove members",
    nl: "Je hebt geen toestemming om leden te verwijderen",
    de: "Sie haben keine Berechtigung, Mitglieder zu entfernen",
    es: "No tienes permiso para eliminar miembros",
    fr: "Vous n'avez pas la permission de supprimer des membres",
  },
  cannotRemoveOwner: {
    en: "Cannot remove the group owner",
    nl: "De groepseigenaar kan niet worden verwijderd",
    de: "Der Gruppeneigent\u00fcmer kann nicht entfernt werden",
    es: "No se puede eliminar al propietario del grupo",
    fr: "Impossible de supprimer le propri\u00e9taire du groupe",
  },
  noPermissionRename: {
    en: "You do not have permission to rename this group",
    nl: "Je hebt geen toestemming om deze groep te hernoemen",
    de: "Sie haben keine Berechtigung, diese Gruppe umzubenennen",
    es: "No tienes permiso para renombrar este grupo",
    fr: "Vous n'avez pas la permission de renommer ce groupe",
  },
  onlyCreatorCanDelete: {
    en: "Only the group creator can delete this group",
    nl: "Alleen de maker van de groep kan deze verwijderen",
    de: "Nur der Ersteller der Gruppe kann diese l\u00f6schen",
    es: "Solo el creador del grupo puede eliminarlo",
    fr: "Seul le cr\u00e9ateur du groupe peut le supprimer",
  },
  noPendingInvite: {
    en: "No pending invite found",
    nl: "Geen openstaande uitnodiging gevonden",
    de: "Keine ausstehende Einladung gefunden",
    es: "No se encontr\u00f3 invitaci\u00f3n pendiente",
    fr: "Aucune invitation en attente trouv\u00e9e",
  },
  noPermissionCancelInvites: {
    en: "You do not have permission to cancel invites",
    nl: "Je hebt geen toestemming om uitnodigingen te annuleren",
    de: "Sie haben keine Berechtigung, Einladungen abzubrechen",
    es: "No tienes permiso para cancelar invitaciones",
    fr: "Vous n'avez pas la permission d'annuler des invitations",
  },
  noPermissionChangeRoles: {
    en: "You do not have permission to change roles",
    nl: "Je hebt geen toestemming om rollen te wijzigen",
    de: "Sie haben keine Berechtigung, Rollen zu \u00e4ndern",
    es: "No tienes permiso para cambiar roles",
    fr: "Vous n'avez pas la permission de modifier les r\u00f4les",
  },
  cannotChangeOwnerRole: {
    en: "Cannot change the owner's role",
    nl: "De rol van de eigenaar kan niet worden gewijzigd",
    de: "Die Rolle des Eigent\u00fcmers kann nicht ge\u00e4ndert werden",
    es: "No se puede cambiar el rol del propietario",
    fr: "Impossible de modifier le r\u00f4le du propri\u00e9taire",
  },
  memberAlreadyActive: {
    en: "Member is already active, use remove instead",
    nl: "Lid is al actief, gebruik verwijderen",
    de: "Mitglied ist bereits aktiv, verwenden Sie Entfernen",
    es: "El miembro ya est\u00e1 activo, usa eliminar",
    fr: "Le membre est d\u00e9j\u00e0 actif, utilisez supprimer",
  },

  // ── Memory (memory-actions.ts) ──
  couldNotResolveTargetRoom: {
    en: "Could not resolve target room",
    nl: "Doelkamer kon niet worden gevonden",
    de: "Zielraum konnte nicht aufgel\u00f6st werden",
    es: "No se pudo resolver la sala destino",
    fr: "Impossible de r\u00e9soudre la salle cible",
  },

  // ── Legacy (legacy-actions.ts) ──
  cannotDeleteLastContact: {
    en: "Cannot delete last contact while legacy delivery is pending",
    nl: "Laatste contact kan niet worden verwijderd terwijl nalatenschap in behandeling is",
    de: "Letzter Kontakt kann nicht gel\u00f6scht werden, w\u00e4hrend die Nachlasszustellung aussteht",
    es: "No se puede eliminar el \u00faltimo contacto mientras la entrega est\u00e1 pendiente",
    fr: "Impossible de supprimer le dernier contact pendant la livraison en attente",
  },
  // ── Generic / reusable ──
  supabaseNotConfigured: {
    en: "Supabase not configured",
    nl: "Supabase niet geconfigureerd",
    de: "Supabase nicht konfiguriert",
    es: "Supabase no configurado",
    fr: "Supabase non configur\u00e9",
  },
  notConfigured: {
    en: "Not configured",
    nl: "Niet geconfigureerd",
    de: "Nicht konfiguriert",
    es: "No configurado",
    fr: "Non configur\u00e9",
  },
  noFieldsToUpdate: {
    en: "No fields to update",
    nl: "Geen velden om bij te werken",
    de: "Keine Felder zum Aktualisieren",
    es: "No hay campos para actualizar",
    fr: "Aucun champ \u00e0 mettre \u00e0 jour",
  },
  somethingWentWrong: {
    en: "Something went wrong",
    nl: "Er is iets misgegaan",
    de: "Etwas ist schiefgelaufen",
    es: "Algo sali\u00f3 mal",
    fr: "Quelque chose s'est mal pass\u00e9",
  },

  // ── Legacy extra (legacy-actions.ts) ──
  invalidWingOrRoomAccess: {
    en: "Invalid wing or room access",
    nl: "Ongeldige vleugel- of kamertoegang",
    de: "Ung\u00fcltiger Fl\u00fcgel- oder Raumzugang",
    es: "Acceso a ala o sala no v\u00e1lido",
    fr: "Acc\u00e8s \u00e0 l'aile ou \u00e0 la salle invalide",
  },

  // ── Sharing extra (sharing-actions.ts) ──
  invalidWing: {
    en: "Invalid wing",
    nl: "Ongeldige vleugel",
    de: "Ung\u00fcltiger Fl\u00fcgel",
    es: "Ala no v\u00e1lida",
    fr: "Aile invalide",
  },
  wingNotFoundOrNotOwned: {
    en: "Wing not found or not owned by you",
    nl: "Vleugel niet gevonden of niet van jou",
    de: "Fl\u00fcgel nicht gefunden oder nicht in deinem Besitz",
    es: "Ala no encontrada o no es tuya",
    fr: "Aile introuvable ou ne vous appartenant pas",
  },
  shareNotFoundOrNotAuthorized: {
    en: "Share not found or not authorized",
    nl: "Deling niet gevonden of niet geautoriseerd",
    de: "Freigabe nicht gefunden oder nicht autorisiert",
    es: "Compartici\u00f3n no encontrada o no autorizada",
    fr: "Partage introuvable ou non autoris\u00e9",
  },
  wingNotFound: {
    en: "Wing not found",
    nl: "Vleugel niet gevonden",
    de: "Fl\u00fcgel nicht gefunden",
    es: "Ala no encontrada",
    fr: "Aile introuvable",
  },
  wingShareNotFoundOrNotAccepted: {
    en: "Wing share not found or not accepted",
    nl: "Vleugeldeling niet gevonden of niet geaccepteerd",
    de: "Fl\u00fcgelfreigabe nicht gefunden oder nicht akzeptiert",
    es: "Compartici\u00f3n de ala no encontrada o no aceptada",
    fr: "Partage d'aile introuvable ou non accept\u00e9",
  },
  roomDoesNotBelongToSharedWing: {
    en: "Room does not belong to the shared wing",
    nl: "Kamer behoort niet tot de gedeelde vleugel",
    de: "Raum geh\u00f6rt nicht zum geteilten Fl\u00fcgel",
    es: "La sala no pertenece al ala compartida",
    fr: "La salle n'appartient pas \u00e0 l'aile partag\u00e9e",
  },
  roomShareNotFoundOrNotAccepted: {
    en: "Room share not found or not accepted",
    nl: "Kamerdeling niet gevonden of niet geaccepteerd",
    de: "Raumfreigabe nicht gefunden oder nicht akzeptiert",
    es: "Compartici\u00f3n de sala no encontrada o no aceptada",
    fr: "Partage de salle introuvable ou non accept\u00e9",
  },
  roomDoesNotMatchShare: {
    en: "Room does not match the share",
    nl: "Kamer komt niet overeen met de deling",
    de: "Raum stimmt nicht mit der Freigabe \u00fcberein",
    es: "La sala no coincide con la compartici\u00f3n",
    fr: "La salle ne correspond pas au partage",
  },
  shareNotFoundOrNotAccepted: {
    en: "Share not found or not accepted",
    nl: "Deling niet gevonden of niet geaccepteerd",
    de: "Freigabe nicht gefunden oder nicht akzeptiert",
    es: "Compartici\u00f3n no encontrada o no aceptada",
    fr: "Partage introuvable ou non accept\u00e9",
  },

  // ── Public share (public-share-actions.ts) ──
  roomNotFound: {
    en: "Room not found",
    nl: "Kamer niet gevonden",
    de: "Raum nicht gefunden",
    es: "Sala no encontrada",
    fr: "Salle introuvable",
  },

  // ── Interview (interview-actions.ts) ──
  sessionNotFound: {
    en: "Session not found",
    nl: "Sessie niet gevonden",
    de: "Sitzung nicht gefunden",
    es: "Sesi\u00f3n no encontrada",
    fr: "Session introuvable",
  },

  // ── Family (family-actions.ts) ──
  invalidUserId: {
    en: "Invalid user ID",
    nl: "Ongeldig gebruikers-ID",
    de: "Ung\u00fcltige Benutzer-ID",
    es: "ID de usuario no v\u00e1lido",
    fr: "ID utilisateur invalide",
  },
  invalidRole: {
    en: "Invalid role",
    nl: "Ongeldige rol",
    de: "Ung\u00fcltige Rolle",
    es: "Rol no v\u00e1lido",
    fr: "R\u00f4le invalide",
  },
  memberNotFound: {
    en: "Member not found",
    nl: "Lid niet gevonden",
    de: "Mitglied nicht gefunden",
    es: "Miembro no encontrado",
    fr: "Membre introuvable",
  },

  // ── Family tree extra (family-tree-actions.ts) ──
  personsNotFound: {
    en: "One or both persons not found",
    nl: "Een of beide personen niet gevonden",
    de: "Eine oder beide Personen nicht gefunden",
    es: "Una o ambas personas no encontradas",
    fr: "Une ou les deux personnes introuvables",
  },
  shareNotFoundOrInactive: {
    en: "Share not found or inactive",
    nl: "Deling niet gevonden of inactief",
    de: "Freigabe nicht gefunden oder inaktiv",
    es: "Compartici\u00f3n no encontrada o inactiva",
    fr: "Partage introuvable ou inactif",
  },

  // ── Kep (join-actions.ts) ──
  invalidInviteCode: {
    en: "Invalid invite code",
    nl: "Ongeldige uitnodigingscode",
    de: "Ung\u00fcltiger Einladungscode",
    es: "C\u00f3digo de invitaci\u00f3n no v\u00e1lido",
    fr: "Code d'invitation invalide",
  },
  kepNotFound: {
    en: "Kep not found",
    nl: "Kep niet gevonden",
    de: "Kep nicht gefunden",
    es: "Kep no encontrado",
    fr: "Kep introuvable",
  },
  failedToCreateRoom: {
    en: "Failed to create room",
    nl: "Kamer aanmaken mislukt",
    de: "Raum konnte nicht erstellt werden",
    es: "No se pudo crear la sala",
    fr: "Impossible de cr\u00e9er la salle",
  },
  onlyPalaceOwnerCanCreateRoom: {
    en: "Only the palace owner can create a palace room",
    nl: "Alleen de paleiseigenaar kan een paleiskamer aanmaken",
    de: "Nur der Palastbesitzer kann einen Palastraum erstellen",
    es: "Solo el propietario del palacio puede crear una sala",
    fr: "Seul le propri\u00e9taire du palais peut cr\u00e9er une salle",
  },
  palaceRoomAlreadyCreated: {
    en: "Palace room already created for this Kep",
    nl: "Paleiskamer is al aangemaakt voor deze Kep",
    de: "Palastraum wurde bereits f\u00fcr diesen Kep erstellt",
    es: "Ya se cre\u00f3 una sala de palacio para este Kep",
    fr: "La salle du palais a d\u00e9j\u00e0 \u00e9t\u00e9 cr\u00e9\u00e9e pour ce Kep",
  },
  notYourRoom: {
    en: "Not your room",
    nl: "Niet jouw kamer",
    de: "Nicht dein Raum",
    es: "No es tu sala",
    fr: "Ce n'est pas votre salle",
  },
  roomAlreadyAllocated: {
    en: "Room is already allocated",
    nl: "Kamer is al toegewezen",
    de: "Raum ist bereits zugewiesen",
    es: "La sala ya est\u00e1 asignada",
    fr: "La salle est d\u00e9j\u00e0 attribu\u00e9e",
  },

  inactivityPeriodRange: {
    en: "Inactivity period must be between 1 and 60 months",
    nl: "Inactiviteitsperiode moet tussen 1 en 60 maanden zijn",
    de: "Inaktivit\u00e4tszeitraum muss zwischen 1 und 60 Monaten liegen",
    es: "El per\u00edodo de inactividad debe ser entre 1 y 60 meses",
    fr: "La p\u00e9riode d'inactivit\u00e9 doit \u00eatre entre 1 et 60 mois",
  },
};

/**
 * Translate a server error key into the user's locale.
 *
 * Usage:
 *   const t = await serverError();
 *   return { error: t("emailRequired") };
 *
 * Returns a translator function bound to the current request's locale.
 */
export async function serverError(): Promise<(key: string) => string> {
  const locale = await getServerLocale();
  return (key: string) => errors[key]?.[locale] || errors[key]?.en || key;
}
