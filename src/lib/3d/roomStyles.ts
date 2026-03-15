// ── 8 Room Style Variants ──
// Deterministically selected by room ID hash, visually distinct palettes

export interface RoomStyle {
  name: string;
  wallColor: string;
  floorColor: string;
  floorAccent: string;
  ceilColor: string;
  wainColor: string;
  trimColor: string;
  rugPrimary: string;
  rugSecondary: string;
  rugDark: string;
  brickColor: string;
  brickDark: string;
  curtainColor: string;
  woodDark: string;
  woodLight: string;
  leatherColor: string;
  leatherDark: string;
}

export const ROOM_STYLES: RoomStyle[] = [
  { // 0: Classic Warm (original)
    name: "Classic", wallColor: "#DDD4C6", floorColor: "#8A7358", floorAccent: "#B8A480",
    ceilColor: "#F0EAE0", wainColor: "#B8A890", trimColor: "#CFC3AE",
    rugPrimary: "#6A2028", rugSecondary: "#C8A868", rugDark: "#1A2438",
    brickColor: "#8A5040", brickDark: "#6A3830", curtainColor: "#8A6848",
    woodDark: "#3E2A18", woodLight: "#A08060", leatherColor: "#5A3020", leatherDark: "#4A2818",
  },
  { // 1: Maritime
    name: "Maritime", wallColor: "#D8DDE5", floorColor: "#7A6E58", floorAccent: "#B0A890",
    ceilColor: "#EEF0F2", wainColor: "#A8B0B8", trimColor: "#C0C8D0",
    rugPrimary: "#1E3A5F", rugSecondary: "#C4A050", rugDark: "#0E1A28",
    brickColor: "#6A7080", brickDark: "#4A5060", curtainColor: "#3A5570",
    woodDark: "#2A3040", woodLight: "#8A9098", leatherColor: "#3A4A5A", leatherDark: "#2A3848",
  },
  { // 2: Bohemian
    name: "Bohemian", wallColor: "#E5D5C5", floorColor: "#9A7850", floorAccent: "#C8A870",
    ceilColor: "#F2EAE0", wainColor: "#C8A880", trimColor: "#D0B890",
    rugPrimary: "#8A2830", rugSecondary: "#E8A840", rugDark: "#2A1018",
    brickColor: "#A85840", brickDark: "#7A3828", curtainColor: "#9A4830",
    woodDark: "#4A2A10", woodLight: "#B89060", leatherColor: "#6A3820", leatherDark: "#5A2A18",
  },
  { // 3: Nordic
    name: "Nordic", wallColor: "#E8E4DE", floorColor: "#C0AA90", floorAccent: "#D8C8B0",
    ceilColor: "#F5F2EE", wainColor: "#D0C8BE", trimColor: "#DDD5CA",
    rugPrimary: "#505860", rugSecondary: "#B8B0A0", rugDark: "#303840",
    brickColor: "#A0A098", brickDark: "#808078", curtainColor: "#B0A898",
    woodDark: "#5A5048", woodLight: "#C8B8A0", leatherColor: "#706860", leatherDark: "#585048",
  },
  { // 4: Library
    name: "Library", wallColor: "#D0CCC0", floorColor: "#6A5840", floorAccent: "#9A8868",
    ceilColor: "#E8E4DA", wainColor: "#4A6848", trimColor: "#8A7A60",
    rugPrimary: "#1A3A28", rugSecondary: "#8A7A50", rugDark: "#0A1A10",
    brickColor: "#705838", brickDark: "#504028", curtainColor: "#3A5A38",
    woodDark: "#2A1A0A", woodLight: "#7A6840", leatherColor: "#3A4A28", leatherDark: "#2A3818",
  },
  { // 5: Art Deco
    name: "Art Deco", wallColor: "#D8D0C8", floorColor: "#3A3838", floorAccent: "#585050",
    ceilColor: "#E8E2DA", wainColor: "#2A2828", trimColor: "#C8A850",
    rugPrimary: "#1A1818", rugSecondary: "#C8A850", rugDark: "#0A0808",
    brickColor: "#484040", brickDark: "#2A2428", curtainColor: "#2A2830",
    woodDark: "#1A1418", woodLight: "#686058", leatherColor: "#2A2020", leatherDark: "#1A1418",
  },
  { // 6: Rustic
    name: "Rustic", wallColor: "#D8CDB8", floorColor: "#8A7250", floorAccent: "#A89070",
    ceilColor: "#E8DEC8", wainColor: "#A89878", trimColor: "#B8A888",
    rugPrimary: "#5A3A20", rugSecondary: "#C8A860", rugDark: "#2A1A08",
    brickColor: "#9A7858", brickDark: "#7A5838", curtainColor: "#7A6840",
    woodDark: "#4A3018", woodLight: "#9A8058", leatherColor: "#6A4828", leatherDark: "#5A3818",
  },
  { // 7: Victorian
    name: "Victorian", wallColor: "#D5C8C0", floorColor: "#5A3828", floorAccent: "#8A6848",
    ceilColor: "#E8DED5", wainColor: "#6A2838", trimColor: "#A89078",
    rugPrimary: "#4A1828", rugSecondary: "#C8A050", rugDark: "#1A0808",
    brickColor: "#7A4838", brickDark: "#5A2828", curtainColor: "#5A2030",
    woodDark: "#2A1008", woodLight: "#7A5838", leatherColor: "#4A1820", leatherDark: "#3A1018",
  },
];

export function styleForRoom(roomId: string): RoomStyle {
  let h = 0;
  for (const c of roomId) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return ROOM_STYLES[h % ROOM_STYLES.length];
}
