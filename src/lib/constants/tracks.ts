// ═══ MEMORY BUILDING TRACKS ═══
// The 6 tracks that guide users from 0% to 100% completion.

export interface TrackStep {
  id: string;
  titleKey: string;
  descriptionKey: string;
  hintKey: string; // guidance for what to do
  pointValue: number;
  navigateTo?: string; // where to go: 'upload', 'room', 'settings', 'legacy', 'share', 'wings', 'corridor'
}

export interface Track {
  id: string;
  nameKey: string;
  icon: string;
  descriptionKey: string;
  color: string;
  completionBonus: number;
  relevantGoals: string[]; // onboarding goals this track is recommended for
  steps: TrackStep[];
}

export const TRACKS: Track[] = [
  // ─── Track 1: Preserve Past & New Data (5.1.1) ───
  {
    id: "preserve",
    nameKey: "tracks.preserve.name",
    icon: "\uD83D\uDCDC",
    descriptionKey: "tracks.preserve.description",
    color: "#4A6741", // sage
    completionBonus: 50,
    relevantGoals: ["preserve", "organize"],
    steps: [
      { id: "p_first_photo", titleKey: "tracks.preserve.p_first_photo.title", descriptionKey: "tracks.preserve.p_first_photo.desc", hintKey: "tracks.preserve.p_first_photo.hint", pointValue: 10, navigateTo: "room" },
      { id: "p_10_photos", titleKey: "tracks.preserve.p_10_photos.title", descriptionKey: "tracks.preserve.p_10_photos.desc", hintKey: "tracks.preserve.p_10_photos.hint", pointValue: 10, navigateTo: "upload" },
      { id: "p_50_photos", titleKey: "tracks.preserve.p_50_photos.title", descriptionKey: "tracks.preserve.p_50_photos.desc", hintKey: "tracks.preserve.p_50_photos.hint", pointValue: 10, navigateTo: "upload" },
      { id: "p_100_photos", titleKey: "tracks.preserve.p_100_photos.title", descriptionKey: "tracks.preserve.p_100_photos.desc", hintKey: "tracks.preserve.p_100_photos.hint", pointValue: 10, navigateTo: "upload" },
      { id: "p_first_video", titleKey: "tracks.preserve.p_first_video.title", descriptionKey: "tracks.preserve.p_first_video.desc", hintKey: "tracks.preserve.p_first_video.hint", pointValue: 10, navigateTo: "upload" },
      { id: "p_first_audio", titleKey: "tracks.preserve.p_first_audio.title", descriptionKey: "tracks.preserve.p_first_audio.desc", hintKey: "tracks.preserve.p_first_audio.hint", pointValue: 10, navigateTo: "upload" },
      { id: "p_3_rooms", titleKey: "tracks.preserve.p_3_rooms.title", descriptionKey: "tracks.preserve.p_3_rooms.desc", hintKey: "tracks.preserve.p_3_rooms.hint", pointValue: 10, navigateTo: "corridor" },
      { id: "p_mass_import", titleKey: "tracks.preserve.p_mass_import.title", descriptionKey: "tracks.preserve.p_mass_import.desc", hintKey: "tracks.preserve.p_mass_import.hint", pointValue: 10, navigateTo: "upload" },
      { id: "p_10_descriptions", titleKey: "tracks.preserve.p_10_descriptions.title", descriptionKey: "tracks.preserve.p_10_descriptions.desc", hintKey: "tracks.preserve.p_10_descriptions.hint", pointValue: 10, navigateTo: "room" },
      { id: "p_5_locations", titleKey: "tracks.preserve.p_5_locations.title", descriptionKey: "tracks.preserve.p_5_locations.desc", hintKey: "tracks.preserve.p_5_locations.hint", pointValue: 10, navigateTo: "room" },
    ],
  },

  // ─── Track 2: Visualize & Publish Data (5.1.2) ───
  {
    id: "visualize",
    nameKey: "tracks.visualize.name",
    icon: "\uD83C\uDFA8",
    descriptionKey: "tracks.visualize.description",
    color: "#C17F59", // terracotta
    completionBonus: 50,
    relevantGoals: ["organize"],
    steps: [
      { id: "v_visit_5_wings", titleKey: "tracks.visualize.v_visit_5_wings.title", descriptionKey: "tracks.visualize.v_visit_5_wings.desc", hintKey: "tracks.visualize.v_visit_5_wings.hint", pointValue: 10, navigateTo: "wings" },
      { id: "v_customize_wing", titleKey: "tracks.visualize.v_customize_wing.title", descriptionKey: "tracks.visualize.v_customize_wing.desc", hintKey: "tracks.visualize.v_customize_wing.hint", pointValue: 10, navigateTo: "wings" },
      { id: "v_change_layout", titleKey: "tracks.visualize.v_change_layout.title", descriptionKey: "tracks.visualize.v_change_layout.desc", hintKey: "tracks.visualize.v_change_layout.hint", pointValue: 10, navigateTo: "room" },
      { id: "v_create_room", titleKey: "tracks.visualize.v_create_room.title", descriptionKey: "tracks.visualize.v_create_room.desc", hintKey: "tracks.visualize.v_create_room.hint", pointValue: 10, navigateTo: "corridor" },
      { id: "v_rename_3_rooms", titleKey: "tracks.visualize.v_rename_3_rooms.title", descriptionKey: "tracks.visualize.v_rename_3_rooms.desc", hintKey: "tracks.visualize.v_rename_3_rooms.hint", pointValue: 10, navigateTo: "corridor" },
      { id: "v_set_5_hues", titleKey: "tracks.visualize.v_set_5_hues.title", descriptionKey: "tracks.visualize.v_set_5_hues.desc", hintKey: "tracks.visualize.v_set_5_hues.hint", pointValue: 10, navigateTo: "room" },
      { id: "v_reorder", titleKey: "tracks.visualize.v_reorder.title", descriptionKey: "tracks.visualize.v_reorder.desc", hintKey: "tracks.visualize.v_reorder.hint", pointValue: 10, navigateTo: "room" },
    ],
  },

  // ─── Track 3: Enhance Past Data (5.1.3) ───
  {
    id: "enhance",
    nameKey: "tracks.enhance.name",
    icon: "\u2728",
    descriptionKey: "tracks.enhance.description",
    color: "#8B7355", // walnut
    completionBonus: 50,
    relevantGoals: ["preserve", "legacy"],
    steps: [
      { id: "e_long_desc", titleKey: "tracks.enhance.e_long_desc.title", descriptionKey: "tracks.enhance.e_long_desc.desc", hintKey: "tracks.enhance.e_long_desc.hint", pointValue: 10, navigateTo: "room" },
      { id: "e_voice_memo", titleKey: "tracks.enhance.e_voice_memo.title", descriptionKey: "tracks.enhance.e_voice_memo.desc", hintKey: "tracks.enhance.e_voice_memo.hint", pointValue: 10, navigateTo: "upload" },
      { id: "e_journal", titleKey: "tracks.enhance.e_journal.title", descriptionKey: "tracks.enhance.e_journal.desc", hintKey: "tracks.enhance.e_journal.hint", pointValue: 10, navigateTo: "upload" },
      { id: "e_historical", titleKey: "tracks.enhance.e_historical.title", descriptionKey: "tracks.enhance.e_historical.desc", hintKey: "tracks.enhance.e_historical.hint", pointValue: 10, navigateTo: "room" },
      { id: "e_4_wings", titleKey: "tracks.enhance.e_4_wings.title", descriptionKey: "tracks.enhance.e_4_wings.desc", hintKey: "tracks.enhance.e_4_wings.hint", pointValue: 10, navigateTo: "wings" },
      { id: "e_all_types", titleKey: "tracks.enhance.e_all_types.title", descriptionKey: "tracks.enhance.e_all_types.desc", hintKey: "tracks.enhance.e_all_types.hint", pointValue: 10, navigateTo: "upload" },
    ],
  },

  // ─── Track 4: Make Future Resolutions (5.1.4) ───
  {
    id: "resolutions",
    nameKey: "tracks.resolutions.name",
    icon: "\u231B",
    descriptionKey: "tracks.resolutions.description",
    color: "#C4A962", // gold
    completionBonus: 50,
    relevantGoals: ["legacy", "preserve"],
    steps: [
      { id: "r_first_capsule", titleKey: "tracks.resolutions.r_first_capsule.title", descriptionKey: "tracks.resolutions.r_first_capsule.desc", hintKey: "tracks.resolutions.r_first_capsule.hint", pointValue: 10, navigateTo: "upload" },
      { id: "r_next_year", titleKey: "tracks.resolutions.r_next_year.title", descriptionKey: "tracks.resolutions.r_next_year.desc", hintKey: "tracks.resolutions.r_next_year.hint", pointValue: 10, navigateTo: "upload" },
      { id: "r_5_years", titleKey: "tracks.resolutions.r_5_years.title", descriptionKey: "tracks.resolutions.r_5_years.desc", hintKey: "tracks.resolutions.r_5_years.hint", pointValue: 10, navigateTo: "upload" },
      { id: "r_3_goals", titleKey: "tracks.resolutions.r_3_goals.title", descriptionKey: "tracks.resolutions.r_3_goals.desc", hintKey: "tracks.resolutions.r_3_goals.hint", pointValue: 10, navigateTo: "upload" },
      { id: "r_future_letter", titleKey: "tracks.resolutions.r_future_letter.title", descriptionKey: "tracks.resolutions.r_future_letter.desc", hintKey: "tracks.resolutions.r_future_letter.hint", pointValue: 10, navigateTo: "upload" },
    ],
  },

  // ─── Track 5: Digital Wills & Posthumous Access (5.1.5) ───
  {
    id: "legacy",
    nameKey: "tracks.legacy.name",
    icon: "\uD83C\uDFDB\uFE0F",
    descriptionKey: "tracks.legacy.description",
    color: "#2C2C2A", // charcoal
    completionBonus: 50,
    relevantGoals: ["legacy"],
    steps: [
      { id: "l_legacy_contact", titleKey: "tracks.legacy.l_legacy_contact.title", descriptionKey: "tracks.legacy.l_legacy_contact.desc", hintKey: "tracks.legacy.l_legacy_contact.hint", pointValue: 10, navigateTo: "legacy" },
      { id: "l_final_message", titleKey: "tracks.legacy.l_final_message.title", descriptionKey: "tracks.legacy.l_final_message.desc", hintKey: "tracks.legacy.l_final_message.hint", pointValue: 10, navigateTo: "legacy" },
      { id: "l_wing_access", titleKey: "tracks.legacy.l_wing_access.title", descriptionKey: "tracks.legacy.l_wing_access.desc", hintKey: "tracks.legacy.l_wing_access.hint", pointValue: 10, navigateTo: "legacy" },
      { id: "l_review", titleKey: "tracks.legacy.l_review.title", descriptionKey: "tracks.legacy.l_review.desc", hintKey: "tracks.legacy.l_review.hint", pointValue: 10, navigateTo: "legacy" },
    ],
  },

  // ─── Track 6: Co-Creating Memories (5.1.6) ───
  {
    id: "cocreate",
    nameKey: "tracks.cocreate.name",
    icon: "\uD83E\uDD1D",
    descriptionKey: "tracks.cocreate.description",
    color: "#5B8FA8", // sky
    completionBonus: 50,
    relevantGoals: ["share"],
    steps: [
      { id: "c_first_share", titleKey: "tracks.cocreate.c_first_share.title", descriptionKey: "tracks.cocreate.c_first_share.desc", hintKey: "tracks.cocreate.c_first_share.hint", pointValue: 10, navigateTo: "share" },
      { id: "c_accepted", titleKey: "tracks.cocreate.c_accepted.title", descriptionKey: "tracks.cocreate.c_accepted.desc", hintKey: "tracks.cocreate.c_accepted.hint", pointValue: 10, navigateTo: "share" },
      { id: "c_receive", titleKey: "tracks.cocreate.c_receive.title", descriptionKey: "tracks.cocreate.c_receive.desc", hintKey: "tracks.cocreate.c_receive.hint", pointValue: 10, navigateTo: "share" },
      { id: "c_3_wings", titleKey: "tracks.cocreate.c_3_wings.title", descriptionKey: "tracks.cocreate.c_3_wings.desc", hintKey: "tracks.cocreate.c_3_wings.hint", pointValue: 10, navigateTo: "share" },
      { id: "c_5_people", titleKey: "tracks.cocreate.c_5_people.title", descriptionKey: "tracks.cocreate.c_5_people.desc", hintKey: "tracks.cocreate.c_5_people.hint", pointValue: 10, navigateTo: "share" },
    ],
  },
];

// Quick lookup
export const TRACK_MAP: Record<string, Track> = Object.fromEntries(TRACKS.map((t) => [t.id, t]));
export const TRACK_IDS = TRACKS.map((t) => t.id);

// Goal → recommended track order
export const GOAL_TRACK_PRIORITY: Record<string, string[]> = {
  preserve: ["preserve", "enhance", "resolutions", "visualize", "cocreate", "legacy"],
  legacy: ["legacy", "enhance", "resolutions", "preserve", "visualize", "cocreate"],
  share: ["cocreate", "preserve", "visualize", "enhance", "resolutions", "legacy"],
  organize: ["visualize", "preserve", "enhance", "cocreate", "resolutions", "legacy"],
};
