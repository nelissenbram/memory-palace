// Adds the landingV2 i18n namespace to all 5 locale files (EN master; NL/DE/ES/FR).
// DE uses Sie-register. Run: node scripts/add-landing-v2-keys.mjs
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

const en = {
  nav: { tour: "Tour", how: "How it works", features: "Features", faq: "FAQ", pricing: "Pricing", signIn: "Sign In", cta: "Get Started" },
  hero: {
    eyebrow: "A 3D home for your family's memories",
    h1: "Turn a lifetime of photos into a place your family can visit.",
    sub: "A beautiful 3D palace for your photos, voice recordings, and life stories — explore it together with your family. Free to start, no credit card needed.",
    sub_ios: "A beautiful 3D palace for your photos, voice recordings, and life stories — explore it together with your family. Ready in minutes — no tech skills needed.",
    cta: "Create Your Palace",
    ctaMicro: "Free forever · No credit card · No tech skills needed",
    ctaMicro_ios: "Ready in minutes · No tech skills needed",
    secondary: "Watch the 90-second tour",
    chipGdpr: "GDPR Compliant",
    chipEncrypted: "Encrypted at Rest & in Transit",
    chipEu: "Stored in the EU",
    securityLink: "Read exactly how we protect your memories"
  },
  proof: {
    p1: "€0", p1Label: "Free plan — no time limit, no card",
    p1_ios: "Unlimited", p1Label_ios: "Wings & rooms",
    p2: "5", p2Label: "Languages",
    p3: "AES-256", p3Label: "Encrypted at rest",
    p4: "100%", p4Label: "Yours — export anytime"
  },
  showcase: {
    eyebrow: "See it in action",
    h2: "Step inside a real palace.",
    sub: "Don't take our word for it. Walk through rooms filled with photos, hear the stories, feel the atmosphere.",
    attribution: "Guillaume's palace — a real member's home for three generations of memories",
    exploreCta: "Explore public palaces",
    noAccount: "No account needed"
  },
  notAlbum: {
    eyebrow: "This is not a photo album.",
    h2: "This is a palace.",
    line: "Step inside. This is what a memory looks like when it has a home."
  },
  bands: {
    whatsappEyebrow: "Effortless",
    whatsappH2: "If you can send a WhatsApp message, you can build a palace.",
    whatsappBody: "Forward a photo or a voice message on WhatsApp — it appears in your palace, sorted and ready. No new app to learn; you already know WhatsApp.",
    palaceEyebrow: "Walkable",
    palaceH2: "A home you can walk through.",
    palaceBody: "Your photos, voices and stories live in rooms — walk past them, together. Each wing holds a chapter of your life.",
    palacePull: "Photos show what happened. Your voice tells why it mattered.",
    aiEyebrow: "No sorting required",
    aiH2: "You bring the photos. AI does the sorting.",
    aiBody: "Connect Google Photos, Dropbox or OneDrive — what would take you months happens while you have coffee. Your originals stay untouched.",
    aiFootnote: "AI is optional and never trains on your memories.",
    togetherEyebrow: "Passed on",
    togetherH2: "A palace has heirs.",
    togetherBody: "Your daughter adds her wedding photos. Seal a letter for a birthday in 2040. Choose who gets the keys — and decide exactly when your words arrive."
  },
  more: {
    title: "And when you're ready for more",
    map: "Memory Map — every memory pinned to the place it happened",
    tree: "Family Tree — fan charts, plus bring your existing tree with you",
    journeys: "Guided Journeys — your life story, one gentle question at a time",
    interviews: "AI-guided interviews — the questions your grandchildren would ask",
    sharing: "Share one room or a whole chapter of your palace",
    uploads: "Upload photos, videos, audio and documents"
  },
  how: {
    eyebrow: "Getting started",
    h2: "Three steps. Five minutes.",
    toggleSelf: "For yourself",
    toggleGift: "As a gift",
    s1t: "Add your memories",
    s1d: "Upload photos and videos, or import from Google Photos, Dropbox or OneDrive. AI sorts everything into rooms that match the chapters of your life.",
    s2t: "Tell the story behind them",
    s2d: "Record your voice telling the story behind the photo — or let a gentle interviewer ask the questions your grandchildren would ask.",
    s3t: "Walk through it together",
    s3d: "Invite family and friends to visit your palace. They can explore, add their own memories, or receive yours as time capsules.",
    g1t: "Create a palace in their name",
    g1d: "Set it up in five minutes — you handle the technology, they get the joy.",
    g2t: "They only answer questions",
    g2d: "A gentle interviewer records their stories on WhatsApp or in the browser — no new app for them to learn.",
    g3t: "The stories stay in the family",
    g3d: "Everyone you invite can walk through the palace — and it's ready to pass on, whenever the time is right.",
    midCta: "Your palace starts free — 1 GB of memories, unlimited rooms, no credit card. Upgrade only if you outgrow it.",
    midCta_ios: "Your palace is ready in minutes. No tech skills needed."
  },
  why: {
    eyebrow: "Why a palace?",
    h2: "Because your brain thinks in places.",
    body: "For 2,500 years, people remembered what mattered by placing it in imagined rooms. We recall places far better than files — that's why a palace, not a folder.",
    link: "Read the 2,500-year story"
  },
  compare: {
    h2: "Keep Google Photos. It's the drive. This is the home.",
    sub: "A folder stores your photos. A palace remembers your life.",
    colLeft: "Cloud photo storage",
    colRight: "The Memory Palace",
    r1l: "Organization", r1a: "Folders and albums, sorted by date", r1b: "3D rooms you walk through, organized by life chapter",
    r2l: "Storytelling", r2a: "Photos without context", r2b: "Every photo can carry your voice telling why it mattered",
    r3l: "Sharing", r3a: "Shared albums — great for last weekend", r3b: "A shared palace your family builds together, across generations",
    r4l: "Legacy", r4a: "Heirs inherit a raw archive of thousands of unlabeled files", r4b: "Time capsules, legacy contacts, and a home that's ready to hand down",
    r5l: "Backup & camera sync", r5a: "Excellent — keep using it", r5b: "Not our job. Bring the photos that matter over when you're ready."
  },
  pricing: {
    h2: "Simple, honest pricing",
    line: "Free forever — unlimited wings and rooms, 1 GB of memories, full export anytime. Upgrade only if you outgrow it, and the trial never auto-charges.",
    cta: "See full pricing"
  },
  promise: {
    h2: "The Forever Promise",
    body: "Export everything as a ZIP anytime, on every plan. And if we ever shut down, you get 90 days and your complete archive — your memories are never locked in.",
    founderTitle: "From a small team that means it",
    founderBody: "The Memory Palace is built by a small, independent European team. No big-tech backing, no ads, no selling your data — your memories are our mission, not a product."
  },
  phone: {
    title: "Also in your pocket",
    sub: "Your palace on your phone and tablet — or in any browser."
  },
  final: {
    h2: "Begin with one memory. The rest will follow.",
    cta: "Create Your Palace"
  },
  a11y: {
    heroVideo: "Aerial view of a Tuscan memory palace at golden hour",
    pause: "Pause background video",
    play: "Play background video",
    tourDialog: "Product tour video",
    close: "Close",
    phoneStrip: "App screenshots",
    prev: "Previous",
    next: "Next",
    bandPalace: "The entrance hall of a 3D memory palace",
    bandTogether: "A visitor touching framed photos in a sunlit gallery",
    showcaseFrame: "A framed family photo hanging in a palace wing",
    bandWhatsapp: "A WhatsApp photo appearing framed on a palace wall",
    bandAi: "Photos being sorted into palace rooms"
  }
};

const nl = {
  nav: { tour: "Tour", how: "Hoe het werkt", features: "Functies", faq: "FAQ", pricing: "Prijzen", signIn: "Inloggen", cta: "Aan de slag" },
  hero: {
    eyebrow: "Een 3D-thuis voor de herinneringen van je familie",
    h1: "Maak van een leven vol foto's een plek die je familie kan bezoeken.",
    sub: "Een prachtig 3D-paleis voor je foto's, stemopnames en levensverhalen — verken het samen met je familie. Gratis te beginnen, geen creditcard nodig.",
    sub_ios: "Een prachtig 3D-paleis voor je foto's, stemopnames en levensverhalen — verken het samen met je familie. Binnen enkele minuten klaar — geen technische kennis nodig.",
    cta: "Maak je Paleis",
    ctaMicro: "Voor altijd gratis · Geen creditcard · Geen technische kennis nodig",
    ctaMicro_ios: "Binnen enkele minuten klaar · Geen technische kennis nodig",
    secondary: "Bekijk de tour van 90 seconden",
    chipGdpr: "AVG-conform",
    chipEncrypted: "Versleuteld bij opslag & verzending",
    chipEu: "Opgeslagen in de EU",
    securityLink: "Lees precies hoe we je herinneringen beschermen"
  },
  proof: {
    p1: "€0", p1Label: "Gratis plan — geen tijdslimiet, geen kaart",
    p1_ios: "Onbeperkt", p1Label_ios: "Vleugels & kamers",
    p2: "5", p2Label: "Talen",
    p3: "AES-256", p3Label: "Versleuteld bij opslag",
    p4: "100%", p4Label: "Van jou — altijd te exporteren"
  },
  showcase: {
    eyebrow: "Zie het in actie",
    h2: "Stap een echt paleis binnen.",
    sub: "Geloof ons niet op ons woord. Loop door kamers vol foto's, hoor de verhalen, voel de sfeer.",
    attribution: "Het paleis van Guillaume — het echte thuis van een lid, met drie generaties herinneringen",
    exploreCta: "Verken openbare paleizen",
    noAccount: "Geen account nodig"
  },
  notAlbum: {
    eyebrow: "Dit is geen fotoalbum.",
    h2: "Dit is een paleis.",
    line: "Stap binnen. Zo ziet een herinnering eruit als ze een thuis heeft."
  },
  bands: {
    whatsappEyebrow: "Moeiteloos",
    whatsappH2: "Kun je een WhatsApp-bericht sturen? Dan kun je een paleis bouwen.",
    whatsappBody: "Stuur een foto of spraakbericht door via WhatsApp — het verschijnt in je paleis, gesorteerd en wel. Geen nieuwe app om te leren; WhatsApp ken je al.",
    palaceEyebrow: "Beloopbaar",
    palaceH2: "Een thuis waar je doorheen kunt lopen.",
    palaceBody: "Je foto's, stemmen en verhalen wonen in kamers — loop er samen langs. Elke vleugel bewaart een hoofdstuk van je leven.",
    palacePull: "Foto's laten zien wat er gebeurde. Jouw stem vertelt waarom het ertoe deed.",
    aiEyebrow: "Sorteren hoeft niet",
    aiH2: "Jij brengt de foto's. AI doet het sorteren.",
    aiBody: "Koppel Google Foto's, Dropbox of OneDrive — wat jou maanden zou kosten, gebeurt terwijl jij koffie drinkt. Je originelen blijven onaangeroerd.",
    aiFootnote: "AI is optioneel en traint nooit op je herinneringen.",
    togetherEyebrow: "Doorgegeven",
    togetherH2: "Een paleis heeft erfgenamen.",
    togetherBody: "Je dochter voegt haar trouwfoto's toe. Verzegel een brief voor een verjaardag in 2040. Kies wie de sleutels krijgt — en bepaal precies wanneer je woorden aankomen."
  },
  more: {
    title: "En als je klaar bent voor meer",
    map: "Herinneringskaart — elke herinnering op de plek waar ze gebeurde",
    tree: "Familiestamboom — waaierdiagrammen, en neem je bestaande stamboom mee",
    journeys: "Begeleide reizen — je levensverhaal, één zachte vraag per keer",
    interviews: "AI-interviews — de vragen die je kleinkinderen zouden stellen",
    sharing: "Deel één kamer of een heel hoofdstuk van je paleis",
    uploads: "Upload foto's, video's, audio en documenten"
  },
  how: {
    eyebrow: "Aan de slag",
    h2: "Drie stappen. Vijf minuten.",
    toggleSelf: "Voor jezelf",
    toggleGift: "Als cadeau",
    s1t: "Voeg je herinneringen toe",
    s1d: "Upload foto's en video's, of importeer uit Google Foto's, Dropbox of OneDrive. AI sorteert alles in kamers die passen bij de hoofdstukken van je leven.",
    s2t: "Vertel het verhaal erachter",
    s2d: "Neem je stem op terwijl je het verhaal achter de foto vertelt — of laat een zachte interviewer de vragen stellen die je kleinkinderen zouden stellen.",
    s3t: "Loop er samen doorheen",
    s3d: "Nodig familie en vrienden uit in je paleis. Ze kunnen rondkijken, eigen herinneringen toevoegen, of die van jou als tijdcapsule ontvangen.",
    g1t: "Maak een paleis op hun naam",
    g1d: "In vijf minuten opgezet — jij regelt de techniek, zij krijgen het plezier.",
    g2t: "Zij beantwoorden alleen vragen",
    g2d: "Een zachte interviewer legt hun verhalen vast via WhatsApp of in de browser — geen nieuwe app om te leren.",
    g3t: "De verhalen blijven in de familie",
    g3d: "Iedereen die je uitnodigt kan door het paleis lopen — en het is klaar om door te geven, wanneer de tijd rijp is.",
    midCta: "Je paleis begint gratis — 1 GB aan herinneringen, onbeperkt kamers, geen creditcard. Upgrade alleen als je eruit groeit.",
    midCta_ios: "Je paleis is binnen enkele minuten klaar. Geen technische kennis nodig."
  },
  why: {
    eyebrow: "Waarom een paleis?",
    h2: "Omdat je brein in plekken denkt.",
    body: "Al 2.500 jaar onthouden mensen wat belangrijk is door het in denkbeeldige kamers te plaatsen. Plekken onthouden we veel beter dan bestanden — daarom een paleis, geen map.",
    link: "Lees het verhaal van 2.500 jaar"
  },
  compare: {
    h2: "Houd Google Foto's. Dat is de schijf. Dit is het thuis.",
    sub: "Een map bewaart je foto's. Een paleis onthoudt je leven.",
    colLeft: "Cloudopslag voor foto's",
    colRight: "The Memory Palace",
    r1l: "Organisatie", r1a: "Mappen en albums, gesorteerd op datum", r1b: "3D-kamers waar je doorheen loopt, geordend per levenshoofdstuk",
    r2l: "Verhalen", r2a: "Foto's zonder context", r2b: "Elke foto kan jouw stem dragen die vertelt waarom het ertoe deed",
    r3l: "Delen", r3a: "Gedeelde albums — prima voor vorig weekend", r3b: "Een gedeeld paleis dat je familie samen bouwt, over generaties heen",
    r4l: "Nalatenschap", r4a: "Erfgenamen krijgen een ruw archief van duizenden naamloze bestanden", r4b: "Tijdcapsules, nalatenschapscontacten en een thuis dat klaar is om door te geven",
    r5l: "Back-up & camerasynchronisatie", r5a: "Uitstekend — blijf het gebruiken", r5b: "Niet ons werk. Haal de foto's die ertoe doen over wanneer jij er klaar voor bent."
  },
  pricing: {
    h2: "Eenvoudige, eerlijke prijzen",
    line: "Voor altijd gratis — onbeperkt vleugels en kamers, 1 GB aan herinneringen, altijd volledig te exporteren. Upgrade alleen als je eruit groeit; de proefperiode wordt nooit automatisch betaald.",
    cta: "Bekijk alle prijzen"
  },
  promise: {
    h2: "De Voor-Altijd-Belofte",
    body: "Exporteer alles als ZIP, op elk moment, in elk plan. En mochten wij er ooit mee stoppen, dan krijg je 90 dagen en je complete archief — je herinneringen zitten nooit op slot.",
    founderTitle: "Van een klein team dat het meent",
    founderBody: "The Memory Palace wordt gebouwd door een klein, onafhankelijk Europees team. Geen big tech erachter, geen advertenties, geen verkoop van je gegevens — jouw herinneringen zijn onze missie, geen product."
  },
  phone: {
    title: "Ook in je broekzak",
    sub: "Je paleis op je telefoon en tablet — of in elke browser."
  },
  final: {
    h2: "Begin met één herinnering. De rest volgt vanzelf.",
    cta: "Maak je Paleis"
  },
  a11y: {
    heroVideo: "Luchtopname van een Toscaans herinneringspaleis bij avondlicht",
    pause: "Achtergrondvideo pauzeren",
    play: "Achtergrondvideo afspelen",
    tourDialog: "Productrondleiding (video)",
    close: "Sluiten",
    phoneStrip: "App-schermafbeeldingen",
    prev: "Vorige",
    next: "Volgende",
    bandPalace: "De entreehal van een 3D-herinneringspaleis",
    bandTogether: "Een bezoeker raakt ingelijste foto's aan in een zonovergoten galerij",
    showcaseFrame: "Een ingelijste familiefoto in een paleisvleugel",
    bandWhatsapp: "Een WhatsApp-foto die ingelijst aan een paleismuur verschijnt",
    bandAi: "Foto's die in paleiskamers worden gesorteerd"
  }
};

const de = {
  nav: { tour: "Tour", how: "So funktioniert's", features: "Funktionen", faq: "FAQ", pricing: "Preise", signIn: "Anmelden", cta: "Loslegen" },
  hero: {
    eyebrow: "Ein 3D-Zuhause für die Erinnerungen Ihrer Familie",
    h1: "Machen Sie aus einem Leben voller Fotos einen Ort, den Ihre Familie besuchen kann.",
    sub: "Ein wunderschöner 3D-Palast für Ihre Fotos, Sprachaufnahmen und Lebensgeschichten — erkunden Sie ihn gemeinsam mit Ihrer Familie. Kostenlos starten, keine Kreditkarte nötig.",
    sub_ios: "Ein wunderschöner 3D-Palast für Ihre Fotos, Sprachaufnahmen und Lebensgeschichten — erkunden Sie ihn gemeinsam mit Ihrer Familie. In wenigen Minuten bereit — keine Technikkenntnisse nötig.",
    cta: "Erstellen Sie Ihren Palast",
    ctaMicro: "Für immer kostenlos · Keine Kreditkarte · Keine Technikkenntnisse nötig",
    ctaMicro_ios: "In wenigen Minuten bereit · Keine Technikkenntnisse nötig",
    secondary: "Die 90-Sekunden-Tour ansehen",
    chipGdpr: "DSGVO-konform",
    chipEncrypted: "Verschlüsselt bei Speicherung & Übertragung",
    chipEu: "Gespeichert in der EU",
    securityLink: "Lesen Sie genau, wie wir Ihre Erinnerungen schützen"
  },
  proof: {
    p1: "0 €", p1Label: "Kostenloser Plan — ohne Zeitlimit, ohne Karte",
    p1_ios: "Unbegrenzt", p1Label_ios: "Flügel & Räume",
    p2: "5", p2Label: "Sprachen",
    p3: "AES-256", p3Label: "Verschlüsselt gespeichert",
    p4: "100 %", p4Label: "Ihres — jederzeit exportierbar"
  },
  showcase: {
    eyebrow: "In Aktion erleben",
    h2: "Betreten Sie einen echten Palast.",
    sub: "Verlassen Sie sich nicht auf unser Wort. Gehen Sie durch Räume voller Fotos, hören Sie die Geschichten, spüren Sie die Atmosphäre.",
    attribution: "Guillaumes Palast — das echte Zuhause eines Mitglieds mit Erinnerungen aus drei Generationen",
    exploreCta: "Öffentliche Paläste erkunden",
    noAccount: "Kein Konto erforderlich"
  },
  notAlbum: {
    eyebrow: "Das ist kein Fotoalbum.",
    h2: "Das ist ein Palast.",
    line: "Treten Sie ein. So sieht eine Erinnerung aus, wenn sie ein Zuhause hat."
  },
  bands: {
    whatsappEyebrow: "Mühelos",
    whatsappH2: "Wenn Sie eine WhatsApp-Nachricht senden können, können Sie einen Palast bauen.",
    whatsappBody: "Leiten Sie ein Foto oder eine Sprachnachricht per WhatsApp weiter — es erscheint in Ihrem Palast, sortiert und bereit. Keine neue App zu lernen; WhatsApp kennen Sie bereits.",
    palaceEyebrow: "Begehbar",
    palaceH2: "Ein Zuhause, durch das Sie gehen können.",
    palaceBody: "Ihre Fotos, Stimmen und Geschichten wohnen in Räumen — gehen Sie gemeinsam daran vorbei. Jeder Flügel bewahrt ein Kapitel Ihres Lebens.",
    palacePull: "Fotos zeigen, was geschah. Ihre Stimme erzählt, warum es wichtig war.",
    aiEyebrow: "Sortieren nicht nötig",
    aiH2: "Sie bringen die Fotos. Die KI sortiert.",
    aiBody: "Verbinden Sie Google Fotos, Dropbox oder OneDrive — was Sie Monate kosten würde, geschieht, während Sie Kaffee trinken. Ihre Originale bleiben unberührt.",
    aiFootnote: "KI ist optional und trainiert niemals mit Ihren Erinnerungen.",
    togetherEyebrow: "Weitergegeben",
    togetherH2: "Ein Palast hat Erben.",
    togetherBody: "Ihre Tochter fügt ihre Hochzeitsfotos hinzu. Versiegeln Sie einen Brief für einen Geburtstag im Jahr 2040. Wählen Sie, wer die Schlüssel bekommt — und bestimmen Sie genau, wann Ihre Worte ankommen."
  },
  more: {
    title: "Und wenn Sie bereit für mehr sind",
    map: "Erinnerungskarte — jede Erinnerung am Ort ihres Geschehens",
    tree: "Stammbaum — Fächerdiagramme, und bringen Sie Ihren bestehenden Baum mit",
    journeys: "Geführte Reisen — Ihre Lebensgeschichte, eine behutsame Frage nach der anderen",
    interviews: "KI-geführte Interviews — die Fragen, die Ihre Enkel stellen würden",
    sharing: "Teilen Sie einen Raum oder ein ganzes Kapitel Ihres Palastes",
    uploads: "Laden Sie Fotos, Videos, Audio und Dokumente hoch"
  },
  how: {
    eyebrow: "Erste Schritte",
    h2: "Drei Schritte. Fünf Minuten.",
    toggleSelf: "Für Sie selbst",
    toggleGift: "Als Geschenk",
    s1t: "Fügen Sie Ihre Erinnerungen hinzu",
    s1d: "Laden Sie Fotos und Videos hoch oder importieren Sie aus Google Fotos, Dropbox oder OneDrive. Die KI sortiert alles in Räume, die zu den Kapiteln Ihres Lebens passen.",
    s2t: "Erzählen Sie die Geschichte dahinter",
    s2d: "Nehmen Sie Ihre Stimme auf, während Sie die Geschichte hinter dem Foto erzählen — oder lassen Sie einen behutsamen Interviewer die Fragen stellen, die Ihre Enkel stellen würden.",
    s3t: "Gehen Sie gemeinsam hindurch",
    s3d: "Laden Sie Familie und Freunde in Ihren Palast ein. Sie können ihn erkunden, eigene Erinnerungen hinzufügen oder Ihre als Zeitkapseln erhalten.",
    g1t: "Erstellen Sie einen Palast in ihrem Namen",
    g1d: "In fünf Minuten eingerichtet — Sie übernehmen die Technik, sie bekommen die Freude.",
    g2t: "Sie beantworten nur Fragen",
    g2d: "Ein behutsamer Interviewer hält ihre Geschichten per WhatsApp oder im Browser fest — keine neue App zu lernen.",
    g3t: "Die Geschichten bleiben in der Familie",
    g3d: "Jeder, den Sie einladen, kann durch den Palast gehen — und er ist bereit, weitergegeben zu werden, wann immer die Zeit reif ist.",
    midCta: "Ihr Palast beginnt kostenlos — 1 GB Erinnerungen, unbegrenzt Räume, keine Kreditkarte. Upgraden Sie nur, wenn Sie herauswachsen.",
    midCta_ios: "Ihr Palast ist in wenigen Minuten bereit. Keine Technikkenntnisse nötig."
  },
  why: {
    eyebrow: "Warum ein Palast?",
    h2: "Weil Ihr Gehirn in Orten denkt.",
    body: "Seit 2.500 Jahren erinnern sich Menschen an das Wichtige, indem sie es in vorgestellte Räume legen. Orte merken wir uns weit besser als Dateien — deshalb ein Palast, kein Ordner.",
    link: "Die 2.500-jährige Geschichte lesen"
  },
  compare: {
    h2: "Behalten Sie Google Fotos. Das ist die Festplatte. Dies ist das Zuhause.",
    sub: "Ein Ordner speichert Ihre Fotos. Ein Palast erinnert sich an Ihr Leben.",
    colLeft: "Cloud-Fotospeicher",
    colRight: "The Memory Palace",
    r1l: "Organisation", r1a: "Ordner und Alben, nach Datum sortiert", r1b: "3D-Räume, durch die Sie gehen — geordnet nach Lebenskapiteln",
    r2l: "Geschichten", r2a: "Fotos ohne Kontext", r2b: "Jedes Foto kann Ihre Stimme tragen, die erzählt, warum es wichtig war",
    r3l: "Teilen", r3a: "Geteilte Alben — gut für letztes Wochenende", r3b: "Ein gemeinsamer Palast, den Ihre Familie über Generationen hinweg baut",
    r4l: "Vermächtnis", r4a: "Erben erhalten ein rohes Archiv aus Tausenden unbeschrifteten Dateien", r4b: "Zeitkapseln, Vermächtnis-Kontakte und ein Zuhause, das bereit ist, weitergegeben zu werden",
    r5l: "Backup & Kamera-Sync", r5a: "Hervorragend — nutzen Sie es weiter", r5b: "Nicht unsere Aufgabe. Holen Sie die wichtigen Fotos herüber, wann Sie bereit sind."
  },
  pricing: {
    h2: "Einfache, ehrliche Preise",
    line: "Für immer kostenlos — unbegrenzt Flügel und Räume, 1 GB Erinnerungen, jederzeit vollständiger Export. Upgraden Sie nur, wenn Sie herauswachsen; die Testphase wird niemals automatisch berechnet.",
    cta: "Alle Preise ansehen"
  },
  promise: {
    h2: "Das Für-Immer-Versprechen",
    body: "Exportieren Sie jederzeit alles als ZIP, in jedem Plan. Und sollten wir jemals schließen, erhalten Sie 90 Tage und Ihr vollständiges Archiv — Ihre Erinnerungen sind niemals eingesperrt.",
    founderTitle: "Von einem kleinen Team, das es ernst meint",
    founderBody: "The Memory Palace wird von einem kleinen, unabhängigen europäischen Team gebaut. Kein Big-Tech-Kapital, keine Werbung, kein Verkauf Ihrer Daten — Ihre Erinnerungen sind unsere Mission, kein Produkt."
  },
  phone: {
    title: "Auch in Ihrer Tasche",
    sub: "Ihr Palast auf Telefon und Tablet — oder in jedem Browser."
  },
  final: {
    h2: "Beginnen Sie mit einer Erinnerung. Der Rest folgt von selbst.",
    cta: "Erstellen Sie Ihren Palast"
  },
  a11y: {
    heroVideo: "Luftaufnahme eines toskanischen Erinnerungspalastes im Abendlicht",
    pause: "Hintergrundvideo pausieren",
    play: "Hintergrundvideo abspielen",
    tourDialog: "Produkttour (Video)",
    close: "Schließen",
    phoneStrip: "App-Bildschirmfotos",
    prev: "Zurück",
    next: "Weiter",
    bandPalace: "Die Eingangshalle eines 3D-Erinnerungspalastes",
    bandTogether: "Ein Besucher berührt gerahmte Fotos in einer sonnendurchfluteten Galerie",
    showcaseFrame: "Ein gerahmtes Familienfoto in einem Palastflügel",
    bandWhatsapp: "Ein WhatsApp-Foto erscheint gerahmt an einer Palastwand",
    bandAi: "Fotos werden in Palasträume sortiert"
  }
};

const es = {
  nav: { tour: "Tour", how: "Cómo funciona", features: "Funciones", faq: "FAQ", pricing: "Precios", signIn: "Iniciar sesión", cta: "Empezar" },
  hero: {
    eyebrow: "Un hogar 3D para los recuerdos de tu familia",
    h1: "Convierte toda una vida de fotos en un lugar que tu familia puede visitar.",
    sub: "Un precioso palacio 3D para tus fotos, grabaciones de voz e historias de vida — explóralo junto a tu familia. Empieza gratis, sin tarjeta de crédito.",
    sub_ios: "Un precioso palacio 3D para tus fotos, grabaciones de voz e historias de vida — explóralo junto a tu familia. Listo en minutos — sin conocimientos técnicos.",
    cta: "Crea tu palacio",
    ctaMicro: "Gratis para siempre · Sin tarjeta de crédito · Sin conocimientos técnicos",
    ctaMicro_ios: "Listo en minutos · Sin conocimientos técnicos",
    secondary: "Ver el tour de 90 segundos",
    chipGdpr: "Conforme al RGPD",
    chipEncrypted: "Cifrado en reposo y en tránsito",
    chipEu: "Almacenado en la UE",
    securityLink: "Lee exactamente cómo protegemos tus recuerdos"
  },
  proof: {
    p1: "0 €", p1Label: "Plan gratuito — sin límite de tiempo, sin tarjeta",
    p1_ios: "Ilimitado", p1Label_ios: "Alas y habitaciones",
    p2: "5", p2Label: "Idiomas",
    p3: "AES-256", p3Label: "Cifrado en reposo",
    p4: "100 %", p4Label: "Tuyo — exporta cuando quieras"
  },
  showcase: {
    eyebrow: "Míralo en acción",
    h2: "Entra en un palacio real.",
    sub: "No te fíes solo de nuestra palabra. Recorre habitaciones llenas de fotos, escucha las historias, siente la atmósfera.",
    attribution: "El palacio de Guillaume — el hogar real de un miembro, con recuerdos de tres generaciones",
    exploreCta: "Explora palacios públicos",
    noAccount: "Sin necesidad de cuenta"
  },
  notAlbum: {
    eyebrow: "Esto no es un álbum de fotos.",
    h2: "Esto es un palacio.",
    line: "Entra. Así es un recuerdo cuando tiene un hogar."
  },
  bands: {
    whatsappEyebrow: "Sin esfuerzo",
    whatsappH2: "Si sabes enviar un mensaje de WhatsApp, sabes construir un palacio.",
    whatsappBody: "Reenvía una foto o un mensaje de voz por WhatsApp — aparece en tu palacio, ordenado y listo. Ninguna app nueva que aprender; WhatsApp ya lo conoces.",
    palaceEyebrow: "Transitable",
    palaceH2: "Un hogar que puedes recorrer.",
    palaceBody: "Tus fotos, voces e historias viven en habitaciones — pasea entre ellas, en compañía. Cada ala guarda un capítulo de tu vida.",
    palacePull: "Las fotos muestran lo que pasó. Tu voz cuenta por qué importó.",
    aiEyebrow: "Sin necesidad de ordenar",
    aiH2: "Tú traes las fotos. La IA las ordena.",
    aiBody: "Conecta Google Fotos, Dropbox o OneDrive — lo que te llevaría meses sucede mientras tomas un café. Tus originales quedan intactos.",
    aiFootnote: "La IA es opcional y nunca se entrena con tus recuerdos.",
    togetherEyebrow: "Transmitido",
    togetherH2: "Un palacio tiene herederos.",
    togetherBody: "Tu hija añade las fotos de su boda. Sella una carta para un cumpleaños de 2040. Elige quién recibe las llaves — y decide exactamente cuándo llegan tus palabras."
  },
  more: {
    title: "Y cuando quieras más",
    map: "Mapa de recuerdos — cada recuerdo fijado al lugar donde ocurrió",
    tree: "Árbol genealógico — gráficos de abanico, y trae tu árbol actual contigo",
    journeys: "Viajes guiados — la historia de tu vida, una pregunta amable cada vez",
    interviews: "Entrevistas guiadas por IA — las preguntas que harían tus nietos",
    sharing: "Comparte una habitación o un capítulo entero de tu palacio",
    uploads: "Sube fotos, vídeos, audio y documentos"
  },
  how: {
    eyebrow: "Primeros pasos",
    h2: "Tres pasos. Cinco minutos.",
    toggleSelf: "Para ti",
    toggleGift: "Como regalo",
    s1t: "Añade tus recuerdos",
    s1d: "Sube fotos y vídeos, o importa desde Google Fotos, Dropbox o OneDrive. La IA lo ordena todo en habitaciones que reflejan los capítulos de tu vida.",
    s2t: "Cuenta la historia que hay detrás",
    s2d: "Graba tu voz contando la historia detrás de la foto — o deja que un entrevistador amable te haga las preguntas que harían tus nietos.",
    s3t: "Recorredlo juntos",
    s3d: "Invita a familiares y amigos a visitar tu palacio. Pueden explorarlo, añadir sus propios recuerdos o recibir los tuyos como cápsulas del tiempo.",
    g1t: "Crea un palacio a su nombre",
    g1d: "Listo en cinco minutos — tú te ocupas de la tecnología, ellos reciben la alegría.",
    g2t: "Ellos solo responden preguntas",
    g2d: "Un entrevistador amable graba sus historias por WhatsApp o en el navegador — sin apps nuevas que aprender.",
    g3t: "Las historias quedan en la familia",
    g3d: "Todos los que invites pueden recorrer el palacio — y está listo para transmitirse cuando llegue el momento.",
    midCta: "Tu palacio empieza gratis — 1 GB de recuerdos, habitaciones ilimitadas, sin tarjeta de crédito. Mejora solo si te quedas pequeño.",
    midCta_ios: "Tu palacio está listo en minutos. Sin conocimientos técnicos."
  },
  why: {
    eyebrow: "¿Por qué un palacio?",
    h2: "Porque tu cerebro piensa en lugares.",
    body: "Desde hace 2.500 años, las personas recuerdan lo importante colocándolo en habitaciones imaginadas. Recordamos los lugares mucho mejor que los archivos — por eso un palacio, no una carpeta.",
    link: "Lee la historia de 2.500 años"
  },
  compare: {
    h2: "Quédate con Google Fotos. Es el disco. Esto es el hogar.",
    sub: "Una carpeta guarda tus fotos. Un palacio recuerda tu vida.",
    colLeft: "Almacenamiento de fotos en la nube",
    colRight: "The Memory Palace",
    r1l: "Organización", r1a: "Carpetas y álbumes, ordenados por fecha", r1b: "Habitaciones 3D que recorres, organizadas por capítulos de vida",
    r2l: "Historias", r2a: "Fotos sin contexto", r2b: "Cada foto puede llevar tu voz contando por qué importó",
    r3l: "Compartir", r3a: "Álbumes compartidos — perfectos para el finde pasado", r3b: "Un palacio compartido que tu familia construye junta, entre generaciones",
    r4l: "Legado", r4a: "Los herederos reciben un archivo en bruto con miles de ficheros sin nombre", r4b: "Cápsulas del tiempo, contactos de legado y un hogar listo para transmitirse",
    r5l: "Copia de seguridad y sincronización", r5a: "Excelente — sigue usándolo", r5b: "No es lo nuestro. Trae las fotos que importan cuando estés listo."
  },
  pricing: {
    h2: "Precios simples y honestos",
    line: "Gratis para siempre — alas y habitaciones ilimitadas, 1 GB de recuerdos, exportación completa cuando quieras. Mejora solo si te quedas pequeño; la prueba nunca se cobra automáticamente.",
    cta: "Ver todos los precios"
  },
  promise: {
    h2: "La Promesa Para Siempre",
    body: "Exporta todo como ZIP en cualquier momento, en todos los planes. Y si algún día cerráramos, tendrás 90 días y tu archivo completo — tus recuerdos nunca quedan encerrados.",
    founderTitle: "De un equipo pequeño que lo dice en serio",
    founderBody: "The Memory Palace lo construye un equipo europeo pequeño e independiente. Sin grandes tecnológicas detrás, sin anuncios, sin vender tus datos — tus recuerdos son nuestra misión, no un producto."
  },
  phone: {
    title: "También en tu bolsillo",
    sub: "Tu palacio en el móvil y la tableta — o en cualquier navegador."
  },
  final: {
    h2: "Empieza con un recuerdo. El resto vendrá solo.",
    cta: "Crea tu palacio"
  },
  a11y: {
    heroVideo: "Vista aérea de un palacio de la memoria toscano a la luz dorada",
    pause: "Pausar el vídeo de fondo",
    play: "Reproducir el vídeo de fondo",
    tourDialog: "Vídeo del tour del producto",
    close: "Cerrar",
    phoneStrip: "Capturas de pantalla de la app",
    prev: "Anterior",
    next: "Siguiente",
    bandPalace: "El vestíbulo de un palacio de la memoria en 3D",
    bandTogether: "Un visitante toca fotos enmarcadas en una galería soleada",
    showcaseFrame: "Una foto familiar enmarcada en un ala del palacio",
    bandWhatsapp: "Una foto de WhatsApp aparece enmarcada en la pared del palacio",
    bandAi: "Fotos ordenándose en las habitaciones del palacio"
  }
};

const fr = {
  nav: { tour: "Visite", how: "Comment ça marche", features: "Fonctionnalités", faq: "FAQ", pricing: "Tarifs", signIn: "Se connecter", cta: "Commencer" },
  hero: {
    eyebrow: "Un foyer en 3D pour les souvenirs de votre famille",
    h1: "Transformez une vie de photos en un lieu que votre famille peut visiter.",
    sub: "Un magnifique palais en 3D pour vos photos, vos enregistrements et vos histoires de vie — à explorer en famille. Gratuit pour commencer, sans carte bancaire.",
    sub_ios: "Un magnifique palais en 3D pour vos photos, vos enregistrements et vos histoires de vie — à explorer en famille. Prêt en quelques minutes — sans compétences techniques.",
    cta: "Créez votre palais",
    ctaMicro: "Gratuit pour toujours · Sans carte bancaire · Sans compétences techniques",
    ctaMicro_ios: "Prêt en quelques minutes · Sans compétences techniques",
    secondary: "Voir la visite en 90 secondes",
    chipGdpr: "Conforme au RGPD",
    chipEncrypted: "Chiffré au repos et en transit",
    chipEu: "Hébergé dans l'UE",
    securityLink: "Découvrez exactement comment nous protégeons vos souvenirs"
  },
  proof: {
    p1: "0 €", p1Label: "Offre gratuite — sans limite de durée, sans carte",
    p1_ios: "Illimité", p1Label_ios: "Ailes et pièces",
    p2: "5", p2Label: "Langues",
    p3: "AES-256", p3Label: "Chiffré au repos",
    p4: "100 %", p4Label: "À vous — exportable à tout moment"
  },
  showcase: {
    eyebrow: "Voyez-le en action",
    h2: "Entrez dans un vrai palais.",
    sub: "Ne nous croyez pas sur parole. Parcourez des pièces remplies de photos, écoutez les histoires, ressentez l'atmosphère.",
    attribution: "Le palais de Guillaume — le vrai foyer d'un membre, avec trois générations de souvenirs",
    exploreCta: "Explorer les palais publics",
    noAccount: "Sans créer de compte"
  },
  notAlbum: {
    eyebrow: "Ceci n'est pas un album photo.",
    h2: "Ceci est un palais.",
    line: "Entrez. Voilà à quoi ressemble un souvenir quand il a un foyer."
  },
  bands: {
    whatsappEyebrow: "Sans effort",
    whatsappH2: "Si vous savez envoyer un message WhatsApp, vous savez bâtir un palais.",
    whatsappBody: "Transférez une photo ou un message vocal sur WhatsApp — il apparaît dans votre palais, trié et prêt. Aucune nouvelle application à apprendre ; WhatsApp, vous connaissez déjà.",
    palaceEyebrow: "Un lieu à parcourir",
    palaceH2: "Un foyer que l'on peut traverser.",
    palaceBody: "Vos photos, vos voix et vos histoires habitent des pièces — passez devant elles, ensemble. Chaque aile garde un chapitre de votre vie.",
    palacePull: "Les photos montrent ce qui s'est passé. Votre voix raconte pourquoi cela comptait.",
    aiEyebrow: "Rien à trier",
    aiH2: "Vous apportez les photos. L'IA fait le tri.",
    aiBody: "Connectez Google Photos, Dropbox ou OneDrive — ce qui vous prendrait des mois se fait pendant votre café. Vos originaux restent intacts.",
    aiFootnote: "L'IA est facultative et ne s'entraîne jamais sur vos souvenirs.",
    togetherEyebrow: "Transmis",
    togetherH2: "Un palais a des héritiers.",
    togetherBody: "Votre fille ajoute ses photos de mariage. Scellez une lettre pour un anniversaire en 2040. Choisissez qui reçoit les clés — et décidez exactement quand vos mots arrivent."
  },
  more: {
    title: "Et quand vous voudrez aller plus loin",
    map: "Carte des souvenirs — chaque souvenir épinglé là où il a eu lieu",
    tree: "Arbre généalogique — éventails, et apportez votre arbre existant",
    journeys: "Parcours guidés — votre histoire de vie, une question douce à la fois",
    interviews: "Entretiens guidés par l'IA — les questions que poseraient vos petits-enfants",
    sharing: "Partagez une pièce ou un chapitre entier de votre palais",
    uploads: "Ajoutez photos, vidéos, audio et documents"
  },
  how: {
    eyebrow: "Premiers pas",
    h2: "Trois étapes. Cinq minutes.",
    toggleSelf: "Pour vous",
    toggleGift: "En cadeau",
    s1t: "Ajoutez vos souvenirs",
    s1d: "Téléversez photos et vidéos, ou importez depuis Google Photos, Dropbox ou OneDrive. L'IA range tout dans des pièces qui suivent les chapitres de votre vie.",
    s2t: "Racontez l'histoire derrière chaque photo",
    s2d: "Enregistrez votre voix racontant l'histoire derrière la photo — ou laissez un intervieweur bienveillant vous poser les questions que poseraient vos petits-enfants.",
    s3t: "Parcourez-le ensemble",
    s3d: "Invitez famille et amis à visiter votre palais. Ils peuvent l'explorer, ajouter leurs propres souvenirs ou recevoir les vôtres en capsules temporelles.",
    g1t: "Créez un palais à leur nom",
    g1d: "Installé en cinq minutes — vous gérez la technique, ils reçoivent la joie.",
    g2t: "Ils ne font que répondre à des questions",
    g2d: "Un intervieweur bienveillant enregistre leurs histoires sur WhatsApp ou dans le navigateur — aucune nouvelle application à apprendre.",
    g3t: "Les histoires restent dans la famille",
    g3d: "Tous ceux que vous invitez peuvent parcourir le palais — prêt à être transmis, le moment venu.",
    midCta: "Votre palais commence gratuitement — 1 Go de souvenirs, pièces illimitées, sans carte bancaire. Passez à l'offre supérieure seulement si vous en avez besoin.",
    midCta_ios: "Votre palais est prêt en quelques minutes. Sans compétences techniques."
  },
  why: {
    eyebrow: "Pourquoi un palais ?",
    h2: "Parce que votre cerveau pense en lieux.",
    body: "Depuis 2 500 ans, on retient ce qui compte en le plaçant dans des pièces imaginaires. Nous retenons les lieux bien mieux que les fichiers — d'où un palais, pas un dossier.",
    link: "Lire l'histoire de 2 500 ans"
  },
  compare: {
    h2: "Gardez Google Photos. C'est le disque. Ici, c'est le foyer.",
    sub: "Un dossier stocke vos photos. Un palais se souvient de votre vie.",
    colLeft: "Stockage photo dans le cloud",
    colRight: "The Memory Palace",
    r1l: "Organisation", r1a: "Dossiers et albums, triés par date", r1b: "Des pièces en 3D que l'on parcourt, organisées par chapitres de vie",
    r2l: "Histoires", r2a: "Des photos sans contexte", r2b: "Chaque photo peut porter votre voix racontant pourquoi elle comptait",
    r3l: "Partage", r3a: "Des albums partagés — parfaits pour le week-end dernier", r3b: "Un palais partagé que votre famille bâtit ensemble, à travers les générations",
    r4l: "Héritage", r4a: "Les héritiers reçoivent une archive brute de milliers de fichiers sans nom", r4b: "Capsules temporelles, contacts d'héritage et un foyer prêt à être transmis",
    r5l: "Sauvegarde et synchronisation", r5a: "Excellent — continuez à l'utiliser", r5b: "Ce n'est pas notre rôle. Rapatriez les photos qui comptent quand vous serez prêt."
  },
  pricing: {
    h2: "Des tarifs simples et honnêtes",
    line: "Gratuit pour toujours — ailes et pièces illimitées, 1 Go de souvenirs, export complet à tout moment. Passez à l'offre supérieure seulement si nécessaire ; l'essai n'est jamais facturé automatiquement.",
    cta: "Voir tous les tarifs"
  },
  promise: {
    h2: "La Promesse Pour Toujours",
    body: "Exportez tout en ZIP à tout moment, quelle que soit l'offre. Et si nous devions un jour fermer, vous auriez 90 jours et votre archive complète — vos souvenirs ne sont jamais enfermés.",
    founderTitle: "D'une petite équipe qui le pense vraiment",
    founderBody: "The Memory Palace est construit par une petite équipe européenne indépendante. Pas de géant de la tech derrière, pas de publicité, pas de vente de vos données — vos souvenirs sont notre mission, pas un produit."
  },
  phone: {
    title: "Aussi dans votre poche",
    sub: "Votre palais sur téléphone et tablette — ou dans n'importe quel navigateur."
  },
  final: {
    h2: "Commencez par un souvenir. Le reste suivra.",
    cta: "Créez votre palais"
  },
  a11y: {
    heroVideo: "Vue aérienne d'un palais de la mémoire toscan à la lumière dorée",
    pause: "Mettre la vidéo d'arrière-plan en pause",
    play: "Lire la vidéo d'arrière-plan",
    tourDialog: "Vidéo de présentation du produit",
    close: "Fermer",
    phoneStrip: "Captures d'écran de l'application",
    prev: "Précédent",
    next: "Suivant",
    bandPalace: "Le hall d'entrée d'un palais de la mémoire en 3D",
    bandTogether: "Un visiteur effleure des photos encadrées dans une galerie ensoleillée",
    showcaseFrame: "Une photo de famille encadrée dans une aile du palais",
    bandWhatsapp: "Une photo WhatsApp apparaît encadrée sur un mur du palais",
    bandAi: "Des photos rangées dans les pièces du palais"
  }
};

const payloads = { en, nl, de, es, fr };

for (const [locale, payload] of Object.entries(payloads)) {
  const file = join(root, "src", "messages", `${locale}.json`);
  const data = JSON.parse(readFileSync(file, "utf8"));
  data.landingV2 = payload;
  writeFileSync(file, JSON.stringify(data, null, 2) + "\n", "utf8");
  console.log(`${locale}.json: landingV2 written (${Object.keys(payload).length} groups)`);
}
