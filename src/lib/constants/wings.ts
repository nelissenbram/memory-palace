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
  subtitle?: string;
  subtitleKey?: string;
  icon: string;
  shared: boolean;
  sharedWith: string[];
  coverHue: number;
}

export const WINGS: Wing[] = [
  {id:"roots",name:"Roots",nameKey:"roots",icon:"🌱",accent:"#C66B3D",wall:"#DDD4C6",floor:"#9E8264",desc:"Where I come from",descKey:"rootsDesc",layout:"L-shaped gallery"},
  {id:"nest",name:"Nest",nameKey:"nest",icon:"🪺",accent:"#7AA0C8",wall:"#D8D5CA",floor:"#988868",desc:"The home I've made",descKey:"nestDesc",layout:"L-shaped gallery"},
  {id:"craft",name:"Craft",nameKey:"craft",icon:"🛠",accent:"#8B7355",wall:"#D5CFC2",floor:"#8E7C64",desc:"What I've built and learned",descKey:"craftDesc",layout:"Exhibition hall"},
  {id:"travel",name:"Travel",nameKey:"travel",icon:"🧭",accent:"#4A6741",wall:"#D8D5CA",floor:"#988868",desc:"Places I've been",descKey:"travelDesc",layout:"Long corridor with alcoves"},
  {id:"passions",name:"Passions",nameKey:"passions",icon:"✨",accent:"#9B6B8E",wall:"#DCD6CE",floor:"#AA9488",desc:"What I do for love",descKey:"passionsDesc",layout:"Open loft studio"},
  {id:"attic",name:"Storage Room",nameKey:"storageRoom",icon:"📦",accent:"#8B7355",wall:"#C8BCA8",floor:"#7A6A52",desc:"Unassigned memories waiting to find their room",descKey:"storageRoomDesc",layout:"Compact storage"},
];

export function translateWingName(wing: { name: string; nameKey?: string }, t: (key: string) => string): string {
  if (wing.nameKey) {
    const translated = t(wing.nameKey);
    if (translated !== wing.nameKey) return translated;
  }
  return wing.name;
}

export function translateRoomName(room: { name: string; nameKey?: string }, t: (key: string) => string): string {
  if (room.nameKey) {
    const translated = t(room.nameKey);
    if (translated !== room.nameKey) return translated;
  }
  return room.name;
}

export const WING_ROOMS: Record<string, WingRoom[]> = {
  roots:[
    {id:"ro1",name:"Me, Over Time",nameKey:"roomMeOverTime",subtitle:"The story of me, from my first photo to today",subtitleKey:"roomMeOverTimeSub",icon:"🪞",shared:false,sharedWith:[],coverHue:18},
    {id:"ro2",name:"Sunday Lunches",nameKey:"roomSundayLunches",subtitle:"Nonna's kitchen, too much garlic, the loud table",subtitleKey:"roomSundayLunchesSub",icon:"🍝",shared:false,sharedWith:[],coverHue:32},
    {id:"ro3",name:"Dad's Garage",nameKey:"roomDadsGarage",subtitle:"Engine oil, tools I wasn't allowed to touch, Saturday mornings",subtitleKey:"roomDadsGarageSub",icon:"🛠",shared:false,sharedWith:[],coverHue:42},
    {id:"ro4",name:"School Days",nameKey:"roomSchoolDays",subtitle:"Teachers, best friends, the corner desk by the window",subtitleKey:"roomSchoolDaysSub",icon:"🎒",shared:false,sharedWith:[],coverHue:48},
  ],
  nest:[
    {id:"ne1",name:"Baby's First Year",nameKey:"roomBabysFirstYear",subtitle:"First laugh, first tooth, the tired and wonderful months",subtitleKey:"roomBabysFirstYearSub",icon:"👶",shared:false,sharedWith:[],coverHue:18},
    {id:"ne2",name:"Birthdays at Home",nameKey:"roomBirthdaysAtHome",subtitle:"Candles, chaos, cake on someone's face",subtitleKey:"roomBirthdaysAtHomeSub",icon:"🎂",shared:false,sharedWith:[],coverHue:32},
    {id:"ne3",name:"The House on Elm Street",nameKey:"roomHouseOnElmStreet",subtitle:"The walls we painted, the garden we planted, the years inside",subtitleKey:"roomHouseOnElmStreetSub",icon:"🏡",shared:false,sharedWith:[],coverHue:42},
    {id:"ne4",name:"Our Wedding",nameKey:"roomOurWedding",subtitle:"Borrowed dresses, the toast that made everyone cry",subtitleKey:"roomOurWeddingSub",icon:"💍",shared:false,sharedWith:[],coverHue:350},
  ],
  craft:[
    {id:"cf1",name:"My First Job",nameKey:"roomMyFirstJob",subtitle:"The nervous start, the boss who believed in me, the lessons I still use",subtitleKey:"roomMyFirstJobSub",icon:"📓",shared:false,sharedWith:[],coverHue:210},
    {id:"cf2",name:"The Big Project of 2019",nameKey:"roomBigProject2019",subtitle:"Long days, late nights, the one I'm most proud of",subtitleKey:"roomBigProject2019Sub",icon:"🏆",shared:false,sharedWith:[],coverHue:240},
    {id:"cf3",name:"Diploma Day",nameKey:"roomDiplomaDay",subtitle:"The gown, my parents in the crowd, what came after",subtitleKey:"roomDiplomaDaySub",icon:"🎓",shared:false,sharedWith:[],coverHue:48},
  ],
  travel:[
    {id:"tv1",name:"Tokyo, 2023",nameKey:"roomTokyo2023",subtitle:"Cherry blossoms, neon streets, getting lost on purpose",subtitleKey:"roomTokyo2023Sub",icon:"🇯🇵",shared:false,sharedWith:[],coverHue:355},
    {id:"tv2",name:"Patagonia, 2022",nameKey:"roomPatagonia2022",subtitle:"Ten days, no signal, the wind that wouldn't stop",subtitleKey:"roomPatagonia2022Sub",icon:"🏔",shared:false,sharedWith:[],coverHue:165},
    {id:"tv3",name:"Rome, 2024",nameKey:"roomRome2024",subtitle:"Warm stones, long lunches, a hundred years in every square",subtitleKey:"roomRome2024Sub",icon:"🇮🇹",shared:false,sharedWith:[],coverHue:22},
    {id:"tv4",name:"Coast Road, 2021",nameKey:"roomCoastRoad2021",subtitle:"Rental car playlist, wrong turns, the sea on our left",subtitleKey:"roomCoastRoad2021Sub",icon:"🛣",shared:false,sharedWith:[],coverHue:200},
  ],
  passions:[
    {id:"pa1",name:"The Saxophone Years",nameKey:"roomSaxophoneYears",subtitle:"Late-night practice, the jazz bar on Thursdays, the solo I nailed once",subtitleKey:"roomSaxophoneYearsSub",icon:"🎷",shared:false,sharedWith:[],coverHue:280},
    {id:"pa2",name:"In the Kitchen",nameKey:"roomInTheKitchen",subtitle:"Failed soufflés, perfected pasta, the curry I'm famous for",subtitleKey:"roomInTheKitchenSub",icon:"🍳",shared:false,sharedWith:[],coverHue:38},
    {id:"pa3",name:"Saturday Football",nameKey:"roomSaturdayFootball",subtitle:"Matches with my team, the radio in the kitchen, the one cup final",subtitleKey:"roomSaturdayFootballSub",icon:"⚽",shared:false,sharedWith:[],coverHue:120},
  ],
  attic:[
    {id:"at1",name:"Storage Room",nameKey:"roomStorageRoom",icon:"📦",shared:false,sharedWith:[],coverHue:40},
  ],
};
