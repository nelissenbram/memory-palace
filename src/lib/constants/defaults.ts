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
  rotation?: 0 | 90 | 180 | 270; // manual rotation override for video playback (degrees clockwise)
  voiceBlob?: boolean;
  documentBlob?: boolean;
  revealDate?: string; // ISO date string, e.g. "2027-01-01"
  createdAt?: string; // ISO date string, set when memory is created
  lat?: number;
  lng?: number;
  locationName?: string; // e.g. "Rome, Italy"
  displayed?: boolean; // whether this memory is shown as a 3D object in the room (default true for first N items)
  displayUnit?: string; // which display unit this memory is assigned to (e.g. "frame", "screen", "vinyl")
  displayOrder?: number; // position index within the display unit (used for exhibition/peristylium individual painting slots)
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

// Local demo media bundled in /public/demo/
const DEMO = {
  graduation: "/demo/graduation.jpg",
  quietMorning: "/demo/quiet-morning.jpg",
  edgeOfWater: "/demo/edge-of-water.jpg",
  pianoRecital: "/demo/piano-recital.mp4",
  pianoThumb: "/demo/piano-recital-thumb.jpg",
  songOfSummer: "/demo/song-of-summer.mp3",
  songThumb: "/demo/song-of-summer-thumb.jpg",
  betweenTwoHands: "/demo/between-two-hands.jpg",
};

export const ROOM_MEMS: Record<string, Mem[]> = {
  // "Me, Over Time" (ro1) — five demo memories across all media types
  ro1:[
    {id:"d1",title:"The Day I Graduated",titleKey:"memDayIGraduated",desc:"I was twenty-two, broke, and certain I knew what came next. I didn't. When they told us to throw the caps on three, I held mine too tight and let go too late. It landed near someone I'd never see again. That's the day I learned how endings actually work — not with a plan, not with a speech, but with letting go of something you were holding without knowing it.",hue:210,s:35,l:60,type:"photo",dataUrl:DEMO.graduation,displayUnit:"vitrine",displayed:true,createdAt:"2020-06-15T14:00:00.000Z"},
    {id:"d2",title:"A Quiet Morning",titleKey:"memQuietMorning",desc:"For most of my twenties, I thought stillness was wasted time. Somewhere in my thirties, I stopped believing that. I can't point to the morning it changed — just that, one day, I woke up and let the day come to me instead of chasing it. Now the quiet mornings are when I figure out who I still am. Nothing gets solved. Nothing needs to.",hue:35,s:45,l:65,type:"photo",dataUrl:DEMO.quietMorning,displayUnit:"album",displayed:true,createdAt:"2024-09-08T07:30:00.000Z"},
    {id:"d3",title:"At the Edge of the Water",titleKey:"memEdgeOfWater",desc:"I was seventeen, just old enough to think I had problems, too young to name them. Someone suggested a walk. The tide was going out, and for a few minutes I stopped being the center of my own story. The water had been doing this longer than I'd been alive, and would keep doing it long after. It's a strange comfort, being small like that. I've chased that feeling ever since.",hue:25,s:55,l:50,type:"photo",dataUrl:DEMO.edgeOfWater,displayUnit:"frame",displayed:true,createdAt:"2015-08-22T19:45:00.000Z"},
    {id:"d4",title:"My Piano Performance",titleKey:"memPianoPerformance",desc:"Around nine or ten — old enough to be nervous, young enough that my legs didn't reach the pedals. It was my first recital, and I was sure I was going to fall apart. Somewhere in the third measure I stopped counting and started listening. When I finished, there was a breath of silence before the clapping. That breath is what I remember. That's the moment I learned I could make the room go quiet — and that some things you can only find out by doing them scared.",hue:260,s:30,l:55,type:"video",dataUrl:DEMO.pianoRecital,thumbnailUrl:DEMO.pianoThumb,displayUnit:"screen",displayed:true,videoBlob:false,createdAt:"2005-05-10T18:00:00.000Z"},
    {id:"d5",title:"The Song of That Summer",titleKey:"memSongOfSummer",desc:"I was seventeen, maybe eighteen — that summer when everything felt like it was about to start. I can't remember the exact year. I remember the song. It was on every radio, leaking out of every car window, and for three months it was the sound my life made. I thought I was so grown. I wasn't. But listening to it now, I hear the person I was becoming — louder than the guitars, three minutes at a time, chorus by chorus.",hue:45,s:50,l:60,type:"audio",dataUrl:DEMO.songOfSummer,thumbnailUrl:DEMO.songThumb,displayUnit:"vinyl",displayed:true,createdAt:"2016-07-20T16:00:00.000Z"},
    {id:"d6",title:"Between Two Hands",titleKey:"memBetweenTwoHands",desc:"I couldn't have been more than three. I don't remember the walk, the field, or where we were going. What I remember is the feeling — being held on both sides, trusting the ground because they were sure of it. I understand now how much of my life I've walked that way: steadier than I know, because someone believed in the step before I did.",hue:35,s:40,l:55,type:"photo",dataUrl:DEMO.betweenTwoHands,displayed:false,createdAt:"1999-04-12T11:00:00.000Z"},
  ],
};

/** Default corridor painting for the Roots wing — shown outside the ro1 door */
export const DEFAULT_CORRIDOR_PAINTINGS: Record<string, Record<string, { url: string; title: string; memId: string; roomId: string }>> = {
  roots: {
    ro1: { url: DEMO.betweenTwoHands, title: "Between Two Hands", memId: "d6", roomId: "ro1" },
  },
};

// v2 keys — reset from old "mp_demos_hidden" so new demo content shows fresh
const DEMOS_HIDDEN_KEY = "mp_demos_hidden_v2";
const DELETED_DEMOS_KEY = "mp_deleted_demos_v2";

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

/** Mark a specific demo memory as deleted so it never reappears */
export function markDemoDeleted(memId: string): void {
  try {
    const raw = localStorage.getItem(DELETED_DEMOS_KEY);
    const set: string[] = raw ? JSON.parse(raw) : [];
    if (!set.includes(memId)) set.push(memId);
    localStorage.setItem(DELETED_DEMOS_KEY, JSON.stringify(set));
  } catch {}
}

/** Get set of individually deleted demo memory IDs */
function getDeletedDemoIds(): Set<string> {
  try {
    const raw = localStorage.getItem(DELETED_DEMOS_KEY);
    return raw ? new Set(JSON.parse(raw)) : new Set();
  } catch {
    return new Set();
  }
}

/** Get demo memories for a room, respecting both global visibility and individual deletions */
export function getDemoMems(roomId: string): Mem[] {
  if (!demosVisible()) return [];
  const deleted = getDeletedDemoIds();
  return (ROOM_MEMS[roomId] || []).filter(m => !deleted.has(m.id));
}

/** Get ALL demo memories (all rooms), respecting visibility and deletions */
export function getAllDemoMems(): Record<string, Mem[]> {
  if (!demosVisible()) return {};
  const deleted = getDeletedDemoIds();
  const out: Record<string, Mem[]> = {};
  for (const [roomId, mems] of Object.entries(ROOM_MEMS)) {
    const filtered = mems.filter(m => !deleted.has(m.id));
    if (filtered.length > 0) out[roomId] = filtered;
  }
  return out;
}

export const UPLOAD_DEMOS = [
  {url:"/demo/graduation.jpg",title:"The Day I Graduated",titleKey:"memDayIGraduated"},
  {url:"/demo/quiet-morning.jpg",title:"A Quiet Morning",titleKey:"memQuietMorning"},
  {url:"/demo/edge-of-water.jpg",title:"At the Edge of the Water",titleKey:"memEdgeOfWater"},
];
