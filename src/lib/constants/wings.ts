export interface Wing {
  id: string;
  name: string;
  nameKey: string;
  icon: string;
  accent: string;
  wall: string;
  floor: string;
  desc: string;
  descKey: string;
  layout: string;
  unlocked?: boolean; // defaults to true if not set
}

export interface WingRoom {
  id: string;
  name: string;
  nameKey?: string;
  icon: string;
  shared: boolean;
  sharedWith: string[];
  coverHue: number;
}

export const WINGS: Wing[] = [
  {id:"family",name:"Family",nameKey:"family",icon:"\u{1F468}\u200D\u{1F469}\u200D\u{1F467}\u200D\u{1F466}",accent:"#C17F59",wall:"#DDD4C6",floor:"#9E8264",desc:"Those closest to your heart",descKey:"familyDesc",layout:"L-shaped gallery"},
  {id:"travel",name:"Travel",nameKey:"travel",icon:"\u2708\uFE0F",accent:"#4A6741",wall:"#D8D5CA",floor:"#988868",desc:"Adventures and journeys",descKey:"travelDesc",layout:"Long corridor with alcoves"},
  {id:"childhood",name:"Childhood",nameKey:"childhood",icon:"\u{1F33B}",accent:"#B8926A",wall:"#E0D8CA",floor:"#A88E6E",desc:"Where your story began",descKey:"childhoodDesc",layout:"Circular rotunda"},
  {id:"career",name:"Career",nameKey:"career",icon:"\u{1F4D0}",accent:"#8B7355",wall:"#D5CFC2",floor:"#8E7C64",desc:"Milestones and achievements",descKey:"careerDesc",layout:"Exhibition hall"},
  {id:"creativity",name:"Creativity",nameKey:"creativity",icon:"\u{1F3A8}",accent:"#9B6B8E",wall:"#DCD6CE",floor:"#AA9488",desc:"Art, music, and expression",descKey:"creativityDesc",layout:"Open loft studio"},
  {id:"attic",name:"Storage Room",nameKey:"storageRoom",icon:"\u{1F4E6}",accent:"#8B7355",wall:"#C8BCA8",floor:"#7A6A52",desc:"Unassigned memories waiting to find their room",descKey:"storageRoomDesc",layout:"Compact storage"},
];

export const WING_ROOMS: Record<string, WingRoom[]> = {
  family:[
    {id:"fr1",name:"Christmas Traditions",nameKey:"roomChristmasTraditions",icon:"\u{1F384}",shared:false,sharedWith:[],coverHue:18},
    {id:"fr2",name:"Mom\u2019s Birthday Parties",nameKey:"roomMomsBirthdayParties",icon:"\u{1F382}",shared:true,sharedWith:["sister@email.com","brother@email.com"],coverHue:32},
    {id:"fr3",name:"Baby\u2019s First Year",nameKey:"roomBabysFirstYear",icon:"\u{1F476}",shared:true,sharedWith:["grandma@email.com"],coverHue:42},
  ],
  travel:[
    {id:"tr1",name:"Trip to Rome",nameKey:"roomTripToRome",icon:"\u{1F1EE}\u{1F1F9}",shared:true,sharedWith:["partner@email.com","friend@email.com"],coverHue:22},
    {id:"tr2",name:"Japan 2024",nameKey:"roomJapan2024",icon:"\u{1F1EF}\u{1F1F5}",shared:true,sharedWith:["travel-buddy@email.com","colleague@email.com","friend@email.com"],coverHue:355},
    {id:"tr3",name:"Weekend in Paris",nameKey:"roomWeekendInParis",icon:"\u{1F1EB}\u{1F1F7}",shared:false,sharedWith:[],coverHue:280},
    {id:"tr4",name:"Patagonia Trek",nameKey:"roomPatagoniaTrek",icon:"\u26F0\uFE0F",shared:false,sharedWith:[],coverHue:165},
  ],
  childhood:[
    {id:"cr1",name:"Grandpa\u2019s Workshop",nameKey:"roomGrandpasWorkshop",icon:"\u{1F6E0}\uFE0F",shared:true,sharedWith:["cousin@email.com"],coverHue:33},
    {id:"cr2",name:"School Days",nameKey:"roomSchoolDays",icon:"\u{1F3EB}",shared:false,sharedWith:[],coverHue:48},
  ],
  career:[
    {id:"kr1",name:"First Startup",nameKey:"roomFirstStartup",icon:"\u{1F680}",shared:false,sharedWith:[],coverHue:210},
    {id:"kr2",name:"Conference Keynotes",nameKey:"roomConferenceKeynotes",icon:"\u{1F3A4}",shared:true,sharedWith:["cofounder@email.com"],coverHue:240},
  ],
  creativity:[
    {id:"rr1",name:"Watercolor Collection",nameKey:"roomWatercolorCollection",icon:"\u{1F3A8}",shared:false,sharedWith:[],coverHue:280},
    {id:"rr2",name:"Guitar Sessions",nameKey:"roomGuitarSessions",icon:"\u{1F3B8}",shared:true,sharedWith:["bandmate@email.com"],coverHue:38},
  ],
  attic:[
    {id:"at1",name:"Storage Room",nameKey:"roomStorageRoom",icon:"\u{1F4E6}",shared:false,sharedWith:[],coverHue:40},
  ],
};
