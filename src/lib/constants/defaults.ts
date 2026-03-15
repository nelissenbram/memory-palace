export interface Mem {
  id: string;
  title: string;
  hue: number;
  s: number;
  l: number;
  type: string;
  desc?: string;
  dataUrl?: string | null;
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
}

export interface SharingInfo {
  shared: boolean;
  sharedWith: string[];
}

export const HERO_IMG = "/palace-hero.jpg";

export const ROOM_MEMS: Record<string, Mem[]> = {
  fr1:[{id:"f1",title:"Christmas morning",hue:18,s:55,l:65,type:"photo",createdAt:"2024-03-14T10:30:00.000Z"},{id:"f4",title:"Summer lake house",hue:195,s:40,l:68,type:"photo",createdAt:"2023-06-15T14:20:00.000Z"}],
  fr2:[{id:"f2",title:"Mom\u2019s birthday",hue:32,s:45,l:62,type:"video",createdAt:"2023-03-14T09:00:00.000Z"},{id:"f6",title:"Wedding anniversary",hue:345,s:38,l:60,type:"case",createdAt:"2025-01-01T12:00:00.000Z"}],
  fr3:[{id:"f3",title:"First steps",hue:42,s:50,l:70,type:"orb",createdAt:"2024-08-22T16:45:00.000Z"},{id:"f5",title:"Grandpa\u2019s 80th",hue:28,s:48,l:58,type:"album",createdAt:"2022-03-14T11:00:00.000Z"}],
  tr1:[{id:"t1",title:"Santorini sunrise",hue:200,s:50,l:72,type:"photo",lat:41.9028,lng:12.4964,locationName:"Rome, Italy",createdAt:"2024-07-10T06:30:00.000Z"},{id:"t4",title:"Venice at dusk",hue:22,s:50,l:58,type:"photo",lat:41.9028,lng:12.4964,locationName:"Rome, Italy",createdAt:"2023-11-20T17:15:00.000Z"}],
  tr2:[{id:"t2",title:"Tokyo alleys",hue:355,s:40,l:55,type:"video",lat:35.6762,lng:139.6503,locationName:"Tokyo, Japan",createdAt:"2024-04-05T21:00:00.000Z"}],
  tr3:[{id:"t3",title:"Patagonia trek",hue:165,s:35,l:60,type:"case",lat:48.8566,lng:2.3522,locationName:"Paris, France",createdAt:"2023-09-12T08:00:00.000Z"}],
  tr4:[{id:"t5",title:"Northern lights",hue:140,s:45,l:45,type:"orb",lat:64.1466,lng:-21.9426,locationName:"Reykjavik, Iceland",createdAt:"2025-02-14T22:30:00.000Z"}],
  cr1:[{id:"c1",title:"Grandpa\u2019s workshop",hue:33,s:40,l:55,type:"photo",createdAt:"2024-03-14T15:00:00.000Z"}],
  cr2:[{id:"c2",title:"First day of school",hue:48,s:45,l:68,type:"album",createdAt:"2023-08-28T07:30:00.000Z"},{id:"c3",title:"Sandcastles",hue:42,s:50,l:75,type:"orb",createdAt:"2024-06-21T13:00:00.000Z"},{id:"c4",title:"The old treehouse",hue:105,s:30,l:50,type:"video",createdAt:"2022-05-18T10:00:00.000Z"}],
  kr1:[{id:"k1",title:"First office",hue:210,s:25,l:55,type:"photo",createdAt:"2025-03-01T09:00:00.000Z"},{id:"k2",title:"Launch day",hue:120,s:40,l:60,type:"video",createdAt:"2024-10-15T11:00:00.000Z"}],
  kr2:[{id:"k3",title:"Conference keynote",hue:240,s:30,l:48,type:"case",createdAt:"2023-12-05T14:00:00.000Z"}],
  rr1:[{id:"r1",title:"First watercolor",hue:280,s:40,l:65,type:"case",createdAt:"2024-01-20T16:00:00.000Z"}],
  rr2:[{id:"r2",title:"Guitar golden hour",hue:38,s:55,l:68,type:"video",createdAt:"2023-03-14T18:30:00.000Z"},{id:"r3",title:"Pottery weekend",hue:15,s:45,l:58,type:"photo",createdAt:"2024-09-08T10:00:00.000Z"}],
  at1:[],
};

export const UPLOAD_DEMOS = [
  {url:"https://upload.wikimedia.org/wikipedia/commons/thumb/e/ea/Van_Gogh_-_Starry_Night_-_Google_Art_Project.jpg/1280px-Van_Gogh_-_Starry_Night_-_Google_Art_Project.jpg",title:"Starry Night"},
  {url:"https://upload.wikimedia.org/wikipedia/commons/thumb/6/66/VanGogh-starry_night_ballance1.jpg/1280px-VanGogh-starry_night_ballance1.jpg",title:"Night Scene"},
  {url:"https://upload.wikimedia.org/wikipedia/commons/thumb/a/a5/Tsunami_by_hokusai_19th_century.jpg/1280px-Tsunami_by_hokusai_19th_century.jpg",title:"The Great Wave"},
];
