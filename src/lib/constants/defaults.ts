export interface Mem {
  id: string;
  title: string;
  titleKey?: string;
  hue: number;
  s: number;
  l: number;
  type: string;
  desc?: string;
  dataUrl?: string | null;
  thumbnailUrl?: string | null;
  videoBlob?: boolean;
  voiceBlob?: boolean;
  documentBlob?: boolean;
  revealDate?: string; // ISO date string, e.g. "2027-01-01"
  createdAt?: string; // ISO date string, set when memory is created
  lat?: number;
  lng?: number;
  locationName?: string; // e.g. "Rome, Italy"
  displayed?: boolean; // whether this memory is shown as a 3D object in the room (default true for first N items)
  historicalContext?: string; // AI-generated historical context for the memory's time period
  resolution?: { goal: string; targetDate?: string; progress?: number; reminders?: boolean; }; // goal/resolution tracking for time capsules
  visibility?: "private" | "shared" | "family" | "public"; // memory visibility level (default: "shared" if room is shared, else "private")
  _offline?: boolean; // queued for offline sync
  _cached?: boolean; // loaded from IndexedDB cache
  _filePath?: string | null; // file path from direct upload (bypasses re-upload in addMemory)
  _storageBackend?: string | null; // storage backend from direct upload
}

export interface SharingInfo {
  shared: boolean;
  sharedWith: string[];
}

export const HERO_IMG = "/palace-hero.jpg";

// Local demo images (public-domain fine-art, bundled in /public/demo/)
const DEMO_IMG = {
  // Available local images (downloaded from Wikimedia Commons)
  winter: "/demo/winter.jpg",       // Bruegel — Hunters in the Snow
  birthday: "/demo/birthday.jpg",   // Vermeer — Girl with a Pearl Earring
  starryNight: "/demo/starrynight.jpg", // Van Gogh — Starry Night
  greatWave: "/demo/greatwave.jpg", // Hokusai — The Great Wave
  wanderer: "/demo/wanderer.jpg",   // C.D. Friedrich — Wanderer above Sea of Fog
};

export const ROOM_MEMS: Record<string, Mem[]> = {
  // Only the Christmas room (fr1) gets demo media — painting, video & audio examples
  fr1:[
    {id:"f1",title:"Christmas morning",titleKey:"memChristmasMorning",hue:18,s:55,l:65,type:"photo",dataUrl:DEMO_IMG.winter,createdAt:"2024-03-14T10:30:00.000Z"},
    {id:"f4",title:"Winter family gathering",titleKey:"memSummerLakeHouse",hue:195,s:40,l:68,type:"photo",dataUrl:DEMO_IMG.starryNight,createdAt:"2023-06-15T14:20:00.000Z"},
    {id:"f7",title:"Gift exchange",titleKey:"memGiftExchange",hue:350,s:50,l:60,type:"photo",dataUrl:DEMO_IMG.birthday,createdAt:"2024-12-25T09:00:00.000Z"},
    {id:"f8",title:"Family singalong",titleKey:"memFamilySingalong",hue:30,s:45,l:62,type:"audio",dataUrl:"/demo/singalong.wav",createdAt:"2024-12-25T20:00:00.000Z"},
    {id:"f9",title:"Opening presents",titleKey:"memOpeningPresents",hue:10,s:55,l:58,type:"video",dataUrl:DEMO_IMG.wanderer,createdAt:"2024-12-25T10:30:00.000Z"},
  ],
};

const DEMOS_HIDDEN_KEY = "mp_demos_hidden";

/** Check if example/demo memories should be shown */
export function demosVisible(): boolean {
  try {
    return localStorage.getItem(DEMOS_HIDDEN_KEY) !== "true";
  } catch {
    return true;
  }
}

/** Toggle example media visibility */
export function setDemosHidden(hidden: boolean): void {
  try {
    if (hidden) localStorage.setItem(DEMOS_HIDDEN_KEY, "true");
    else localStorage.removeItem(DEMOS_HIDDEN_KEY);
  } catch {}
}

/** Get demo memories for a room, respecting the visibility flag */
export function getDemoMems(roomId: string): Mem[] {
  if (!demosVisible()) return [];
  return ROOM_MEMS[roomId] || [];
}

export const UPLOAD_DEMOS = [
  {url:"/demo/starrynight.jpg",title:"Starry Night",titleKey:"demoStarryNight"},
  {url:"/demo/greatwave.jpg",title:"The Great Wave",titleKey:"demoTheGreatWave"},
  {url:"/demo/wanderer.jpg",title:"Wanderer above the Sea of Fog",titleKey:"demoWanderer"},
];
