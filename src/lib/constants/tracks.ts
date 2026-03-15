// ═══ MEMORY BUILDING TRACKS ═══
// The 6 tracks that guide users from 0% to 100% completion.

export interface TrackStep {
  id: string;
  title: string;
  description: string;
  hint: string; // guidance for what to do
  pointValue: number;
  navigateTo?: string; // where to go: 'upload', 'room', 'settings', 'legacy', 'share', 'wings', 'corridor'
}

export interface Track {
  id: string;
  name: string;
  icon: string;
  description: string;
  color: string;
  completionBonus: number;
  relevantGoals: string[]; // onboarding goals this track is recommended for
  steps: TrackStep[];
}

export const TRACKS: Track[] = [
  // ─── Track 1: Preserve Past & New Data (5.1.1) ───
  {
    id: "preserve",
    name: "Preserve Your Memories",
    icon: "\uD83D\uDCDC",
    description: "Upload and organize your existing memories into beautiful rooms.",
    color: "#4A6741", // sage
    completionBonus: 50,
    relevantGoals: ["preserve", "organize"],
    steps: [
      { id: "p_first_photo", title: "Upload your first photo", description: "Add a photo memory to any room.", hint: "Enter a room and tap the + button to upload a photo.", pointValue: 10, navigateTo: "room" },
      { id: "p_10_photos", title: "Upload 10 photos", description: "Build a collection of 10 photo memories.", hint: "Keep adding photos to your rooms. You can use Mass Import for batches.", pointValue: 10, navigateTo: "upload" },
      { id: "p_50_photos", title: "Upload 50 photos", description: "Reach 50 photo memories across your palace.", hint: "Use Mass Import to add photos in bulk.", pointValue: 10, navigateTo: "upload" },
      { id: "p_100_photos", title: "Upload 100 photos", description: "A true archivist with 100 photos preserved.", hint: "Keep going! Your palace is growing beautifully.", pointValue: 10, navigateTo: "upload" },
      { id: "p_first_video", title: "Upload your first video", description: "Add a video memory to preserve moving moments.", hint: "Create a new memory and choose the video type.", pointValue: 10, navigateTo: "upload" },
      { id: "p_first_audio", title: "Upload your first audio", description: "Preserve a voice or sound as a memory.", hint: "Create a new memory and choose the audio type.", pointValue: 10, navigateTo: "upload" },
      { id: "p_3_rooms", title: "Fill 3 rooms with memories", description: "Spread your memories across at least 3 rooms.", hint: "Visit different rooms in your wings and add memories to each.", pointValue: 10, navigateTo: "corridor" },
      { id: "p_mass_import", title: "Use mass import", description: "Import multiple memories at once.", hint: "Use the Mass Import button to bring in many memories at once.", pointValue: 10, navigateTo: "upload" },
      { id: "p_10_descriptions", title: "Add descriptions to 10 memories", description: "Give context to your memories with descriptions.", hint: "Edit your memories and add descriptions that tell the story.", pointValue: 10, navigateTo: "room" },
      { id: "p_5_locations", title: "Add location data to 5 memories", description: "Pin memories to places on the map.", hint: "Edit memories and add location information.", pointValue: 10, navigateTo: "room" },
    ],
  },

  // ─── Track 2: Visualize & Publish Data (5.1.2) ───
  {
    id: "visualize",
    name: "Visualize Your Palace",
    icon: "\uD83C\uDFA8",
    description: "Customize and curate your palace to make it uniquely yours.",
    color: "#C17F59", // terracotta
    completionBonus: 50,
    relevantGoals: ["organize"],
    steps: [
      { id: "v_visit_5_wings", title: "Visit all 5 wings", description: "Explore every wing of your memory palace.", hint: "Click each wing from the exterior to visit them all.", pointValue: 10, navigateTo: "wings" },
      { id: "v_customize_wing", title: "Customize a wing", description: "Rename or change the icon of any wing.", hint: "Use the wing manager to personalize a wing's name or icon.", pointValue: 10, navigateTo: "wings" },
      { id: "v_change_layout", title: "Change a room layout", description: "Try a different layout for one of your rooms.", hint: "In a room, use the layout dropdown to change how it looks.", pointValue: 10, navigateTo: "room" },
      { id: "v_create_room", title: "Create a custom room", description: "Add a brand new room to a wing.", hint: "Use the room manager in any corridor to add a new room.", pointValue: 10, navigateTo: "corridor" },
      { id: "v_rename_3_rooms", title: "Rename 3 rooms", description: "Make rooms your own by giving them personal names.", hint: "Use the room manager to rename rooms to match your memories.", pointValue: 10, navigateTo: "corridor" },
      { id: "v_set_5_hues", title: "Set cover hues for 5 memories", description: "Customize the color appearance of your memories.", hint: "Edit memories and adjust their color hue.", pointValue: 10, navigateTo: "room" },
      { id: "v_reorder", title: "Arrange memories in a room", description: "Reorder memories to tell a better story.", hint: "Move memories between rooms using the directory.", pointValue: 10, navigateTo: "room" },
    ],
  },

  // ─── Track 3: Enhance Past Data (5.1.3) ───
  {
    id: "enhance",
    name: "Enhance Your Memories",
    icon: "\u2728",
    description: "Deepen your memories with context, stories, and rich details.",
    color: "#8B7355", // walnut
    completionBonus: 50,
    relevantGoals: ["preserve", "legacy"],
    steps: [
      { id: "e_long_desc", title: "Write a detailed description", description: "Add a description longer than 100 words to a memory.", hint: "Edit a memory and write a rich, detailed description of the moment.", pointValue: 10, navigateTo: "room" },
      { id: "e_voice_memo", title: "Record a voice memo", description: "Create a journal memory with a voice recording.", hint: "Add a new journal-type memory to capture your spoken thoughts.", pointValue: 10, navigateTo: "upload" },
      { id: "e_journal", title: "Write a journal entry", description: "Create a journal-type memory with your written reflections.", hint: "Add a new memory and choose the journal type to write your thoughts.", pointValue: 10, navigateTo: "upload" },
      { id: "e_historical", title: "Add historical context", description: "Add a description mentioning a year or date.", hint: "Edit a memory and mention when it happened in the description.", pointValue: 10, navigateTo: "room" },
      { id: "e_4_wings", title: "Memories in 4 wings", description: "Create memories in at least 4 different wings.", hint: "Spread your memories across multiple wings of your palace.", pointValue: 10, navigateTo: "wings" },
      { id: "e_all_types", title: "Use all 6 memory types", description: "Create at least one of each: photo, video, album, orb, journal, case.", hint: "Try creating memories of each type to diversify your collection.", pointValue: 10, navigateTo: "upload" },
    ],
  },

  // ─── Track 4: Make Future Resolutions (5.1.4) ───
  {
    id: "resolutions",
    name: "Future Resolutions",
    icon: "\u231B",
    description: "Create forward-looking content — time capsules, goals, and letters to your future self.",
    color: "#C4A962", // gold
    completionBonus: 50,
    relevantGoals: ["legacy", "preserve"],
    steps: [
      { id: "r_first_capsule", title: "Create a time capsule", description: "Make a memory with a future reveal date.", hint: "Create a memory and set a reveal date in the future.", pointValue: 10, navigateTo: "upload" },
      { id: "r_next_year", title: "Time capsule for next year", description: "Create a capsule that opens next year.", hint: "Set the reveal date to at least one year from now.", pointValue: 10, navigateTo: "upload" },
      { id: "r_5_years", title: "Time capsule for 5+ years", description: "Create a capsule that opens in 5 or more years.", hint: "Set the reveal date to 5+ years from today. What will you want to remember?", pointValue: 10, navigateTo: "upload" },
      { id: "r_3_goals", title: "Set 3 future goals", description: "Create 3 memories marked as future goals.", hint: "Create journal entries about your goals and aspirations.", pointValue: 10, navigateTo: "upload" },
      { id: "r_future_letter", title: "Letter to your future self", description: "Write a journal entry with a future reveal date.", hint: "Create a journal memory addressed to your future self with a future reveal date.", pointValue: 10, navigateTo: "upload" },
    ],
  },

  // ─── Track 5: Digital Wills & Posthumous Access (5.1.5) ───
  {
    id: "legacy",
    name: "Your Legacy",
    icon: "\uD83C\uDFDB\uFE0F",
    description: "Set up legacy controls so your memories live on for those you love.",
    color: "#2C2C2A", // charcoal
    completionBonus: 50,
    relevantGoals: ["legacy"],
    steps: [
      { id: "l_legacy_contact", title: "Designate a legacy contact", description: "Add at least one person who will inherit access to your palace.", hint: "Go to Settings > Legacy > Legacy Contacts and add a trusted person.", pointValue: 10, navigateTo: "legacy" },
      { id: "l_final_message", title: "Write a final message", description: "Compose a heartfelt letter for a loved one.", hint: "Go to Settings > Legacy > Final Messages and write a letter to someone special.", pointValue: 10, navigateTo: "legacy" },
      { id: "l_wing_access", title: "Set wing access for a contact", description: "Choose which wings a legacy contact can see.", hint: "Edit a legacy contact and set their access level to specific wings.", pointValue: 10, navigateTo: "legacy" },
      { id: "l_review", title: "Review legacy settings", description: "Set your inactivity trigger and trusted verifier.", hint: "Go to Settings > Legacy > Legacy Settings and configure your inactivity period and trusted verifier.", pointValue: 10, navigateTo: "legacy" },
    ],
  },

  // ─── Track 6: Co-Creating Memories (5.1.6) ───
  {
    id: "cocreate",
    name: "Co-Create Together",
    icon: "\uD83E\uDD1D",
    description: "Share rooms, invite loved ones, and build memories together.",
    color: "#5B8FA8", // sky
    completionBonus: 50,
    relevantGoals: ["share"],
    steps: [
      { id: "c_first_share", title: "Share your first room", description: "Share a room with someone special.", hint: "Enter a room and use the Share button to invite someone.", pointValue: 10, navigateTo: "share" },
      { id: "c_accepted", title: "Have a share accepted", description: "Someone has accepted your shared room.", hint: "Wait for someone you shared with to accept the invitation.", pointValue: 10, navigateTo: "share" },
      { id: "c_receive", title: "Receive a contributed memory", description: "A collaborator adds a memory to your shared room.", hint: "Invite someone to contribute to a shared room.", pointValue: 10, navigateTo: "share" },
      { id: "c_3_wings", title: "Share rooms in 3 wings", description: "Share rooms across 3 different wings.", hint: "Share rooms in different wings of your palace.", pointValue: 10, navigateTo: "share" },
      { id: "c_5_people", title: "Invite 5 different people", description: "Share with 5 unique individuals.", hint: "Invite family and friends to see different parts of your palace.", pointValue: 10, navigateTo: "share" },
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
