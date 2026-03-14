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
}

export interface SharingInfo {
  shared: boolean;
  sharedWith: string[];
}

export const HERO_IMG = "/palace-hero.jpg";

export const ROOM_MEMS: Record<string, Mem[]> = {
  fr1:[{id:"f1",title:"Christmas morning",hue:18,s:55,l:65,type:"photo"},{id:"f4",title:"Summer lake house",hue:195,s:40,l:68,type:"photo"}],
  fr2:[{id:"f2",title:"Mom\u2019s birthday",hue:32,s:45,l:62,type:"video"},{id:"f6",title:"Wedding anniversary",hue:345,s:38,l:60,type:"case"}],
  fr3:[{id:"f3",title:"First steps",hue:42,s:50,l:70,type:"orb"},{id:"f5",title:"Grandpa\u2019s 80th",hue:28,s:48,l:58,type:"album"}],
  tr1:[{id:"t1",title:"Santorini sunrise",hue:200,s:50,l:72,type:"photo"},{id:"t4",title:"Venice at dusk",hue:22,s:50,l:58,type:"photo"}],
  tr2:[{id:"t2",title:"Tokyo alleys",hue:355,s:40,l:55,type:"video"}],
  tr3:[{id:"t3",title:"Patagonia trek",hue:165,s:35,l:60,type:"journal"}],
  tr4:[{id:"t5",title:"Northern lights",hue:140,s:45,l:45,type:"orb"}],
  cr1:[{id:"c1",title:"Grandpa\u2019s workshop",hue:33,s:40,l:55,type:"photo"}],
  cr2:[{id:"c2",title:"First day of school",hue:48,s:45,l:68,type:"album"},{id:"c3",title:"Sandcastles",hue:42,s:50,l:75,type:"orb"},{id:"c4",title:"The old treehouse",hue:105,s:30,l:50,type:"video"}],
  kr1:[{id:"k1",title:"First office",hue:210,s:25,l:55,type:"photo"},{id:"k2",title:"Launch day",hue:120,s:40,l:60,type:"video"}],
  kr2:[{id:"k3",title:"Conference keynote",hue:240,s:30,l:48,type:"journal"}],
  rr1:[{id:"r1",title:"First watercolor",hue:280,s:40,l:65,type:"case"}],
  rr2:[{id:"r2",title:"Guitar golden hour",hue:38,s:55,l:68,type:"video"},{id:"r3",title:"Pottery weekend",hue:15,s:45,l:58,type:"photo"}],
};

export const UPLOAD_DEMOS = [
  {url:"https://upload.wikimedia.org/wikipedia/commons/thumb/e/ea/Van_Gogh_-_Starry_Night_-_Google_Art_Project.jpg/1280px-Van_Gogh_-_Starry_Night_-_Google_Art_Project.jpg",title:"Starry Night"},
  {url:"https://upload.wikimedia.org/wikipedia/commons/thumb/6/66/VanGogh-starry_night_ballance1.jpg/1280px-VanGogh-starry_night_ballance1.jpg",title:"Night Scene"},
  {url:"https://upload.wikimedia.org/wikipedia/commons/thumb/a/a5/Tsunami_by_hokusai_19th_century.jpg/1280px-Tsunami_by_hokusai_19th_century.jpg",title:"The Great Wave"},
];
