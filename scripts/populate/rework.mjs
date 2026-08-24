// Reworks personas.json per owner feedback:
//  1) NO under-18 profiles: the 14 child/teen personas become ADULT PARENT
//     accounts documenting their child (memory photos stay — they ARE the kids).
//     -> new adult username, displayName, avatarPrompt, parent-voice bio.
//     -> rename media dir old->new; delete avatar.jpg so it regenerates as an adult.
//  2) De-templated, varied bios for all 42 (no age/location-first pattern) +
//     individual featuredCategory.
//  3) Spread join dates: add `joinedDaysAgo` (2..89) per persona for the seed to backdate.
import fs from "fs";
import { PERSONAS_PATH, personaMediaDir } from "./lib.mjs";

// --- 14 minor -> adult-parent conversions ---
const PARENTS = {
  "little-mateo":        { newUsername: "sol-alvarez",      displayName: "Sol Álvarez",        avatarPrompt: "photorealistic portrait of a 34-year-old Argentine woman with dark wavy hair and a warm smile, soft daylight, plain cream background", bio: "Somewhere between the nappies and the dulce de leche, I'm keeping every small moment of my son Mateo's first years.", featuredCategory: "First years" },
  "amara-sunshine":     { newUsername: "chidi-okafor",      displayName: "Chidi Okafor",       avatarPrompt: "photorealistic portrait of a 38-year-old Nigerian man with a broad warm smile, bright daylight, plain background", bio: "My daughter Amara came out dancing and never stopped. A father, saving the music before it fades.", featuredCategory: "Little dancer" },
  "yuki-and-me":        { newUsername: "kenji-tanaka",      displayName: "Kenji Tanaka",       avatarPrompt: "photorealistic portrait of a 36-year-old Japanese man in a crisp shirt, calm friendly expression, soft daylight, plain background", bio: "Trains, dinosaurs, and a four-year-old expert on both — keeping my son Yuki's world before he outgrows it.", featuredCategory: "A boy and his trains" },
  "baby-sofia":         { newUsername: "giulia-rossi",      displayName: "Giulia Rossi",       avatarPrompt: "photorealistic portrait of a 33-year-old Italian woman with soft curls and a gentle smile, warm window light, plain background", bio: "Our tiny Florentine arrived and rearranged everything. Saving baby Sofia's firsts, flour-dusted and all.", featuredCategory: "Baby days" },
  "liam-the-brave":     { newUsername: "siobhan-oconnor",   displayName: "Siobhán O'Connor",   avatarPrompt: "photorealistic portrait of a 35-year-old Irish woman with reddish hair and freckles, soft overcast light, plain background", bio: "Freckles, scraped knees, and a hundred questions — keeping my son Liam's small brave adventures.", featuredCategory: "Brave little man" },
  "aisha-blooms":       { newUsername: "nadia-rahman",      displayName: "Nadia Rahman",       avatarPrompt: "photorealistic portrait of a 37-year-old Bangladeshi woman with an elegant scarf and warm eyes, soft daylight, plain background", bio: "My Aisha tells stories before she can spell them. A mother, keeping them safe on the page.", featuredCategory: "Bedtime tales" },
  "noah-explores":      { newUsername: "astrid-andersen",   displayName: "Astrid Andersen",    avatarPrompt: "photorealistic portrait of a 34-year-old Norwegian woman with blonde hair in a knit sweater, crisp northern light, plain background", bio: "Happiest boy in the biggest puddle. Keeping my son Noah's muddy, wind-bitten Norwegian childhood.", featuredCategory: "Out in the wild" },
  "zara-plays-11":      { newUsername: "yasmin-malik",      displayName: "Yasmin Malik",       avatarPrompt: "photorealistic portrait of a 44-year-old British South Asian woman with a warm confident smile, natural daylight, plain background", bio: "Left-back by day, bedroom drummer by night. Keeping my daughter Zara's loud, brilliant teenage years.", featuredCategory: "Pitch & drums" },
  "diego-rolls":        { newUsername: "carmen-fernandez",  displayName: "Carmen Fernández",   avatarPrompt: "photorealistic portrait of a 46-year-old Spanish woman with dark hair and a kind smile, warm golden light, plain background", bio: "A skateboard, his abuelo's guitar, and the plaza at sunset — my son Diego's Sevilla, kept.", featuredCategory: "Board & strings" },
  "mei-builds":         { newUsername: "wei-chen",          displayName: "Wei Chen",           avatarPrompt: "photorealistic portrait of a 47-year-old Chinese-Canadian man with glasses and a gentle smile, soft indoor light, plain background", bio: "She builds apps and paints koi and swears they're the same thing. Keeping my daughter Mei's making years.", featuredCategory: "Maker in the making" },
  "kwame-runs":         { newUsername: "ama-mensah",        displayName: "Ama Mensah",         avatarPrompt: "photorealistic portrait of a 45-year-old Ghanaian woman with a bold headwrap and proud smile, bright daylight, plain background", bio: "First in our family to finish school, and the fastest boy on the track. So proud I had to keep it all.", featuredCategory: "Run, my son" },
  "freya-strings":      { newUsername: "karin-lindqvist",   displayName: "Karin Lindqvist",    avatarPrompt: "photorealistic portrait of a 48-year-old Swedish woman with light hair and a quiet warm smile, soft Nordic daylight, plain background", bio: "Cello in one hand, reins in the other. Keeping my daughter Freya's music and her horses.", featuredCategory: "Strings & stables" },
  "arjun-at-the-crease":{ newUsername: "meera-patel",       displayName: "Meera Patel",        avatarPrompt: "photorealistic portrait of a 46-year-old Indian woman with a warm assured smile, bright daylight, plain background", bio: "Cricket in the gully, chemistry past midnight — a mother keeping my son Arjun's Mumbai boyhood.", featuredCategory: "At the crease" },
  "isa-moves":          { newUsername: "luana-santos",      displayName: "Luana Santos",       avatarPrompt: "photorealistic portrait of a 44-year-old Brazilian woman with curly hair and a lively smile, warm sunlight, plain background", bio: "Always in motion — capoeira, samba, a Saturday job. Keeping my daughter Isabella's São Paulo rhythm.", featuredCategory: "Always dancing" },
};

// --- new varied bios + categories for the 28 adult personas (identity unchanged) ---
const ADULTS = {
  "chloe-tastes-the-world": { bio: "Trained in a Lyon kitchen, then chased flavour across Asia. If it's fermented, fried, or on a stick, I've probably eaten it.", featuredCategory: "Kitchen & road" },
  "tom-two-wheels":         { bio: "First flat, secondhand bike, speakers too big for the room. Amsterdam does the rest.", featuredCategory: "City life" },
  "priya-goes-far":         { bio: "Code on weekdays, mountains on weekends. The Himalaya keep pulling me back.", featuredCategory: "Peaks & pixels" },
  "marcus-in-berlin":       { bio: "Left Chicago with two bags and a hard drive of beats. Berlin made me earn it.", featuredCategory: "Sound & the city" },
  "sofia-and-bruno":        { bio: "Freshly graduated, freshly adopted a very large dog. We're learning Ljubljana one walk at a time.", featuredCategory: "New chapters" },
  "rafa-chases-waves":      { bio: "Home is a van, work is the sea, and the camera catches whatever's left over.", featuredCategory: "Salt & film" },
  "nadia-writes":           { bio: "I collect cities, strangers' stories, and recipes I wasn't supposed to learn.", featuredCategory: "Notes & cities" },
  "emma-and-the-baby":      { bio: "Wife, brand-new mum, terrible sleeper — painting our first front door a very bold green.", featuredCategory: "Building a home" },
  "hiroshi-builds":         { bio: "New title at work, new house in the suburbs, same old bicycle.", featuredCategory: "Steady ground" },
  "lucia-in-bloom":         { bio: "Just married, newly an aunt, forever with soil under my nails. Naples on every plate.", featuredCategory: "In bloom" },
  "david-tel-aviv":         { bio: "New dad, product guy, sea-swimmer — running on sunshine and no sleep.", featuredCategory: "Three of us" },
  "grace-builds-nairobi":   { bio: "Built a house and a business in the same year. Nairobi doesn't do things by halves.", featuredCategory: "Builders" },
  "lars-renovates":         { bio: "Weekend carpenter, new father, cabin dreamer. There's always one more wall to sand.", featuredCategory: "Made by hand" },
  "camila-bogota":          { bio: "Newlywed, newly promoted, and outnumbered by one ridiculous three-legged dog.", featuredCategory: "Us three" },
  "robert-restores":        { bio: "If it has a carburettor and a story, I'll bring it back. Grease on the hands, snow on the boots.", featuredCategory: "The workshop" },
  "fatima-weaves":          { bio: "Turned my mother's loom into a workshop that now employs thirty women.", featuredCategory: "Threads" },
  "james-goes-long":        { bio: "Two teenagers, one dodgy knee, and a habit of signing up for things I can't run yet.", featuredCategory: "The long way" },
  "ingrid-late-bloom":      { bio: "An architect who finally learned piano at fifty. It's never too late for the good things.", featuredCategory: "Late bloomers" },
  "samuel-houston":         { bio: "One truck became forty. Faith, family, and a to-do list that never ends.", featuredCategory: "From one truck" },
  "mercedes-cocina":        { bio: "My little fonda became the best table in the barrio. Feed people well and they never forget you.", featuredCategory: "La fonda" },
  "anders-northbound":      { bio: "Traded the city for a fjord, a workshop, and long silences. The mountains don't mind.", featuredCategory: "Northbound" },
  "eleanor-remembers":      { bio: "A Welsh valley girl who taught for forty years. I keep these so my grandchildren will know.", featuredCategory: "A life in chapters" },
  "giovanni-del-mare":      { bio: "A fisherman's son who crossed an ocean and came home. The sea gave me everything.", featuredCategory: "By the sea" },
  "rosa-baila":             { bio: "I've danced tango since I was seventeen, and I don't intend to stop. Buenos Aires is in my feet.", featuredCategory: "Still dancing" },
  "henry-the-headmaster":   { bio: "Rebuilt a school from rubble and led it for thirty years. Educate one child, change a line.", featuredCategory: "The schoolhouse" },
  "margit-garden":          { bio: "Seamstress, gardener, keeper of recipes nobody wrote down. Budapest winters made me stubborn.", featuredCategory: "Garden & thread" },
  "arthur-ink":             { bio: "From a Hong Kong rooftop to a San Francisco shop counter — and in old age, the brush found me.", featuredCategory: "Ink & years" },
  "beatrice-provence":      { bio: "Born among the vines, married among them, still walking them each morning. Provence is my whole heart.", featuredCategory: "Among the vines" },
};

const personas = JSON.parse(fs.readFileSync(PERSONAS_PATH, "utf8"));
let converted = 0, rebio = 0;
// spread join dates: shuffle a set of distinct day-offsets across 2..89
const offsets = personas.map((_, i) => 2 + Math.floor((i * 87) / (personas.length - 1)));
for (let k = offsets.length - 1; k > 0; k--) { const j = Math.floor(Math.random() * (k + 1)); [offsets[k], offsets[j]] = [offsets[j], offsets[k]]; }

personas.forEach((p, i) => {
  p.joinedDaysAgo = offsets[i] + Math.floor(Math.random() * 2); // small jitter
  const P = PARENTS[p.username];
  if (P) {
    const oldDir = personaMediaDir(p.username);
    const newDir = personaMediaDir(P.newUsername);
    if (fs.existsSync(oldDir) && !fs.existsSync(newDir)) fs.renameSync(oldDir, newDir);
    // force adult avatar regen
    const av = personaMediaDir(P.newUsername) + "/avatar.jpg";
    if (fs.existsSync(av)) fs.rmSync(av);
    p.username = P.newUsername;
    p.displayName = P.displayName;
    p.avatarPrompt = P.avatarPrompt;
    p.bio = P.bio;
    p.featuredCategory = P.featuredCategory;
    p.lifeStage = "parent";
    converted++;
  } else if (ADULTS[p.username]) {
    p.bio = ADULTS[p.username].bio;
    p.featuredCategory = ADULTS[p.username].featuredCategory;
    rebio++;
  }
});

// validate unique usernames
const u = new Set(), dups = [];
personas.forEach((p) => { if (u.has(p.username)) dups.push(p.username); u.add(p.username); });
if (dups.length) { console.error("DUP usernames:", dups); process.exit(1); }

fs.writeFileSync(PERSONAS_PATH, JSON.stringify(personas, null, 2));
console.log(`converted ${converted} minors -> adults, rebio'd ${rebio} adults, ${personas.length} personas.`);
console.log(`joinedDaysAgo range: ${Math.min(...personas.map(p=>p.joinedDaysAgo))}..${Math.max(...personas.map(p=>p.joinedDaysAgo))} days`);
console.log("avatars to regenerate:", personas.filter(p => !fs.existsSync(personaMediaDir(p.username) + "/avatar.jpg")).length);
