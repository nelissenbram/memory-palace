/**
 * Kep creation wizard step definitions and validation.
 */

import type { KepSourceType } from "@/types/kep";

export interface WizardStep {
  id: number;
  key: string;
  isValid: (data: WizardData) => boolean;
}

export interface WizardData {
  name: string;
  description: string;
  icon: string;
  source_type: KepSourceType | null;
  // WhatsApp-specific
  wa_group_id: string;
  wa_group_name: string;
  // Photos-specific
  photos_album_id: string;
  photos_date_from: string;
  photos_date_to: string;
  photos_media_types: string[];
  // Routing
  default_wing_id: string;
  default_room_id: string;
  auto_route_enabled: boolean;
}

export const INITIAL_WIZARD_DATA: WizardData = {
  name: "",
  description: "",
  icon: "📥",
  source_type: null,
  wa_group_id: "",
  wa_group_name: "",
  photos_album_id: "",
  photos_date_from: "",
  photos_date_to: "",
  photos_media_types: ["PHOTO", "VIDEO"],
  default_wing_id: "",
  default_room_id: "",
  auto_route_enabled: true,
};

export const WIZARD_STEPS: WizardStep[] = [
  {
    id: 1,
    key: "step1",
    isValid: (data) => data.source_type !== null,
  },
  {
    id: 2,
    key: "step2",
    isValid: (data) => {
      if (!data.name.trim()) return false;
      if (data.source_type === "whatsapp") {
        return data.wa_group_id.trim().length > 0;
      }
      if (data.source_type === "photos") {
        return true; // Photos config is optional (can scan all)
      }
      return false;
    },
  },
  {
    id: 3,
    key: "step3",
    isValid: () => true, // Routing is optional (AI handles it)
  },
  {
    id: 4,
    key: "step4",
    isValid: () => true, // Review step always valid
  },
];

export const SOURCE_ICONS: Record<KepSourceType, string> = {
  whatsapp: "💬",
  photos: "📸",
};

/**
 * Build the API payload from wizard data.
 */
export function buildCreatePayload(data: WizardData) {
  const payload: Record<string, unknown> = {
    name: data.name.trim(),
    description: data.description.trim() || undefined,
    icon: data.icon,
    source_type: data.source_type,
    auto_route_enabled: data.auto_route_enabled,
    default_wing_id: data.default_wing_id || undefined,
    default_room_id: data.default_room_id || undefined,
  };

  if (data.source_type === "photos") {
    payload.source_config = {
      albumId: data.photos_album_id || undefined,
      dateRanges: data.photos_date_from
        ? [{ startDate: data.photos_date_from, endDate: data.photos_date_to || new Date().toISOString() }]
        : undefined,
      mediaTypes: data.photos_media_types,
    };
  }

  return payload;
}
