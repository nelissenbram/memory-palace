export interface InterviewQuestion {
  id: string;
  textKey: string; // translation key for display
  text: string; // English source text (also used as AI context)
  followUpHint?: string; // hint for AI to generate a follow-up
  estimatedMinutes: number;
}

export interface InterviewTemplate {
  id: string;
  titleKey: string; // translation key for the title
  descKey: string; // translation key for the description
  wingId: string; // wing ID or 'general'
  icon: string;
  questions: InterviewQuestion[];
  difficulty: "light" | "medium" | "deep";
  estimatedTotalMinutes: number;
}

// ═══ FAMILY WING INTERVIEWS ═══

const familyTraditions: InterviewTemplate = {
  id: "family-traditions",
  titleKey: "familyTraditionsTitle",
  descKey: "familyTraditionsDesc",
  wingId: "family",
  icon: "\uD83D\uDD6F\uFE0F",
  difficulty: "light",
  estimatedTotalMinutes: 20,
  questions: [
    { id: "ft-1", textKey: "ft1Text", text: "What's one tradition your family had that always made you smile?", followUpHint: "Ask about a specific sensory detail — a smell, a sound, a feeling.", estimatedMinutes: 3 },
    { id: "ft-2", textKey: "ft2Text", text: "Were there any holiday traditions that were uniquely yours — things other families didn't do?", followUpHint: "Ask how it started and who kept it going.", estimatedMinutes: 3 },
    { id: "ft-3", textKey: "ft3Text", text: "Was there a special meal or dish that meant 'family' to you?", followUpHint: "Ask who made it and whether the recipe has been passed down.", estimatedMinutes: 3 },
    { id: "ft-4", textKey: "ft4Text", text: "Did your family have any sayings, inside jokes, or little rituals that outsiders wouldn't understand?", followUpHint: "Ask for the story behind one of them.", estimatedMinutes: 3 },
    { id: "ft-5", textKey: "ft5Text", text: "Which of these traditions do you most want your grandchildren to carry on? Why that one?", followUpHint: "Ask what it would mean to them to see it continue.", estimatedMinutes: 4 },
    { id: "ft-6", textKey: "ft6Text", text: "Is there a tradition that ended — one you wish hadn't? What happened?", followUpHint: "Gently ask if they've ever thought about bringing it back.", estimatedMinutes: 4 },
  ],
};

const growingUp: InterviewTemplate = {
  id: "growing-up",
  titleKey: "growingUpTitle",
  descKey: "growingUpDesc",
  wingId: "family",
  icon: "\uD83C\uDFE0",
  difficulty: "light",
  estimatedTotalMinutes: 25,
  questions: [
    { id: "gu-1", textKey: "gu1Text", text: "Can you describe your childhood home for me? What did it look like, feel like?", followUpHint: "Ask about their favorite room and why.", estimatedMinutes: 4 },
    { id: "gu-2", textKey: "gu2Text", text: "What was your neighborhood like? Could you walk to a friend's house?", followUpHint: "Ask about the sounds and rhythms of the neighborhood.", estimatedMinutes: 3 },
    { id: "gu-3", textKey: "gu3Text", text: "Who was your closest friend growing up? What did you do together?", followUpHint: "Ask if they're still in touch.", estimatedMinutes: 4 },
    { id: "gu-4", textKey: "gu4Text", text: "What did a typical Saturday look like for your family?", followUpHint: "Ask what they looked forward to most each week.", estimatedMinutes: 3 },
    { id: "gu-5", textKey: "gu5Text", text: "Was there a place you weren't supposed to go — but went anyway?", followUpHint: "Ask what made it so irresistible.", estimatedMinutes: 3 },
    { id: "gu-6", textKey: "gu6Text", text: "If you could go back and spend one more afternoon in that childhood home, what would you do?", followUpHint: "Ask who they'd want there with them.", estimatedMinutes: 4 },
  ],
};

const parentsAndGrandparents: InterviewTemplate = {
  id: "parents-grandparents",
  titleKey: "parentsGrandparentsTitle",
  descKey: "parentsGrandparentsDesc",
  wingId: "family",
  icon: "\uD83D\uDC94",
  difficulty: "medium",
  estimatedTotalMinutes: 30,
  questions: [
    { id: "pg-1", textKey: "pg1Text", text: "Tell me about your mother. What kind of person was she?", followUpHint: "Ask for a specific memory that captures her personality.", estimatedMinutes: 5 },
    { id: "pg-2", textKey: "pg2Text", text: "And your father — what do you remember most about him?", followUpHint: "Ask what they inherited from him — a habit, a phrase, a value.", estimatedMinutes: 5 },
    { id: "pg-3", textKey: "pg3Text", text: "Did you know your grandparents well? What stories did they tell?", followUpHint: "Ask about a story they wish they'd asked more about.", estimatedMinutes: 4 },
    { id: "pg-4", textKey: "pg4Text", text: "What's the most important thing your parents taught you — not with words, but by example?", followUpHint: "Ask when they first realized they'd learned it.", estimatedMinutes: 4 },
    { id: "pg-5", textKey: "pg5Text", text: "Is there something you wish you'd said to them, or asked them, while you still could?", followUpHint: "Be gentle. Acknowledge the emotion. Ask if they've found other ways to feel close.", estimatedMinutes: 5 },
    { id: "pg-6", textKey: "pg6Text", text: "What part of them do you see living on — in you, or in your children?", followUpHint: "Ask for a specific moment when they noticed it.", estimatedMinutes: 4 },
  ],
};

const loveStory: InterviewTemplate = {
  id: "love-story",
  titleKey: "loveStoryTitle",
  descKey: "loveStoryDesc",
  wingId: "family",
  icon: "\u2764\uFE0F",
  difficulty: "medium",
  estimatedTotalMinutes: 25,
  questions: [
    { id: "ls-1", textKey: "ls1Text", text: "How did you meet your partner? Set the scene for me.", followUpHint: "Ask what they noticed first about them.", estimatedMinutes: 4 },
    { id: "ls-2", textKey: "ls2Text", text: "When did you know this was something special?", followUpHint: "Ask about the exact moment — where were they, what happened.", estimatedMinutes: 4 },
    { id: "ls-3", textKey: "ls3Text", text: "Tell me about your wedding day — or the day you committed to each other. What do you remember most?", followUpHint: "Ask about an unexpected or funny moment from that day.", estimatedMinutes: 4 },
    { id: "ls-4", textKey: "ls4Text", text: "What's been the secret to your relationship lasting?", followUpHint: "Ask about a time that secret was really put to the test.", estimatedMinutes: 4 },
    { id: "ls-5", textKey: "ls5Text", text: "What's a small, everyday thing your partner does that still makes you feel loved?", followUpHint: "Ask if their partner knows how much it means.", estimatedMinutes: 3 },
    { id: "ls-6", textKey: "ls6Text", text: "If your grandchildren asked, 'What is love, really?' — what would you tell them?", followUpHint: "Ask what experience taught them that answer.", estimatedMinutes: 4 },
  ],
};

const raisingChildren: InterviewTemplate = {
  id: "raising-children",
  titleKey: "raisingChildrenTitle",
  descKey: "raisingChildrenDesc",
  wingId: "family",
  icon: "\uD83D\uDC76",
  difficulty: "medium",
  estimatedTotalMinutes: 25,
  questions: [
    { id: "rc-1", textKey: "rc1Text", text: "What was the best part of being a parent?", followUpHint: "Ask for a specific moment that captures that feeling.", estimatedMinutes: 4 },
    { id: "rc-2", textKey: "rc2Text", text: "What surprised you most about parenthood?", followUpHint: "Ask if anyone had warned them or if it was a total surprise.", estimatedMinutes: 3 },
    { id: "rc-3", textKey: "rc3Text", text: "Was there a moment when your child made you incredibly proud?", followUpHint: "Ask what they said or did in that moment.", estimatedMinutes: 4 },
    { id: "rc-4", textKey: "rc4Text", text: "What was the hardest part? A moment that tested you?", followUpHint: "Acknowledge the difficulty. Ask what got them through it.", estimatedMinutes: 4 },
    { id: "rc-5", textKey: "rc5Text", text: "Is there something you'd do differently, knowing what you know now?", followUpHint: "Ask gently — no judgment. Ask what they learned from it.", estimatedMinutes: 4 },
    { id: "rc-6", textKey: "rc6Text", text: "What do you hope your children remember most about growing up with you?", followUpHint: "Ask if they've ever told their children this.", estimatedMinutes: 4 },
  ],
};

// ═══ TRAVEL WING INTERVIEWS ═══

const greatestAdventure: InterviewTemplate = {
  id: "greatest-adventure",
  titleKey: "greatestAdventureTitle",
  descKey: "greatestAdventureDesc",
  wingId: "travel",
  icon: "\uD83C\uDF0D",
  difficulty: "medium",
  estimatedTotalMinutes: 20,
  questions: [
    { id: "ga-1", textKey: "ga1Text", text: "What's the trip or adventure that changed your life the most?", followUpHint: "Ask what made them decide to go.", estimatedMinutes: 4 },
    { id: "ga-2", textKey: "ga2Text", text: "Take me there. What did it look like? What did it smell like? Sound like?", followUpHint: "Ask about their very first impression when they arrived.", estimatedMinutes: 4 },
    { id: "ga-3", textKey: "ga3Text", text: "Was there a moment during the trip that surprised you or moved you deeply?", followUpHint: "Ask how they felt in that exact moment.", estimatedMinutes: 4 },
    { id: "ga-4", textKey: "ga4Text", text: "Did you meet anyone memorable along the way?", followUpHint: "Ask what that person taught them.", estimatedMinutes: 3 },
    { id: "ga-5", textKey: "ga5Text", text: "How were you different when you came home?", followUpHint: "Ask if others noticed the change.", estimatedMinutes: 3 },
  ],
};

const placesOfTheHeart: InterviewTemplate = {
  id: "places-of-heart",
  titleKey: "placesOfHeartTitle",
  descKey: "placesOfHeartDesc",
  wingId: "travel",
  icon: "\uD83D\uDCCD",
  difficulty: "light",
  estimatedTotalMinutes: 15,
  questions: [
    { id: "ph-1", textKey: "ph1Text", text: "Is there a place you keep returning to — or one you dream about going back to?", followUpHint: "Ask when they first went there.", estimatedMinutes: 3 },
    { id: "ph-2", textKey: "ph2Text", text: "What is it about that place that calls you back?", followUpHint: "Ask if it's the place itself or what happened there.", estimatedMinutes: 3 },
    { id: "ph-3", textKey: "ph3Text", text: "What's your happiest memory in that place?", followUpHint: "Ask who they were with.", estimatedMinutes: 3 },
    { id: "ph-4", textKey: "ph4Text", text: "If you could take your grandchildren there, what would you show them first?", followUpHint: "Ask why that specific thing.", estimatedMinutes: 3 },
  ],
};

const travelWisdom: InterviewTemplate = {
  id: "travel-wisdom",
  titleKey: "travelWisdomTitle",
  descKey: "travelWisdomDesc",
  wingId: "travel",
  icon: "\uD83E\uDDED",
  difficulty: "deep",
  estimatedTotalMinutes: 20,
  questions: [
    { id: "tw-1", textKey: "tw1Text", text: "What has traveling taught you about yourself that you couldn't have learned at home?", followUpHint: "Ask for a specific trip where they learned this.", estimatedMinutes: 4 },
    { id: "tw-2", textKey: "tw2Text", text: "Have you ever felt truly out of your comfort zone while traveling? What happened?", followUpHint: "Ask how they got through it.", estimatedMinutes: 4 },
    { id: "tw-3", textKey: "tw3Text", text: "What's the most beautiful thing you've ever seen with your own eyes?", followUpHint: "Ask if a photo could ever capture what they felt.", estimatedMinutes: 3 },
    { id: "tw-4", textKey: "tw4Text", text: "Has a trip ever changed your mind about something important?", followUpHint: "Ask what they believed before vs. after.", estimatedMinutes: 4 },
    { id: "tw-5", textKey: "tw5Text", text: "What advice would you give to someone about to take their first big trip?", followUpHint: "Ask what they wish someone had told them.", estimatedMinutes: 3 },
  ],
};

// ═══ CHILDHOOD WING INTERVIEWS ═══

const earlyMemories: InterviewTemplate = {
  id: "early-memories",
  titleKey: "earlyMemoriesTitle",
  descKey: "earlyMemoriesDesc",
  wingId: "childhood",
  icon: "\uD83C\uDF1F",
  difficulty: "light",
  estimatedTotalMinutes: 20,
  questions: [
    { id: "em-1", textKey: "em1Text", text: "What is your very earliest memory? How old were you?", followUpHint: "Ask what makes this memory stick — is it a feeling, an image, a sound?", estimatedMinutes: 4 },
    { id: "em-2", textKey: "em2Text", text: "What did your world look like as a very young child? What was big, what was small?", followUpHint: "Ask about something that seemed enormous then but small now.", estimatedMinutes: 3 },
    { id: "em-3", textKey: "em3Text", text: "Was there a toy, blanket, or object you couldn't live without?", followUpHint: "Ask what happened to it.", estimatedMinutes: 3 },
    { id: "em-4", textKey: "em4Text", text: "What made you feel safe as a child?", followUpHint: "Ask who or what provided that safety.", estimatedMinutes: 3 },
    { id: "em-5", textKey: "em5Text", text: "Is there a smell or sound that instantly takes you back to childhood?", followUpHint: "Ask where they were when they last experienced that trigger.", estimatedMinutes: 3 },
  ],
};

const schoolDays: InterviewTemplate = {
  id: "school-days",
  titleKey: "schoolDaysTitle",
  descKey: "schoolDaysDesc",
  wingId: "childhood",
  icon: "\uD83C\uDFEB",
  difficulty: "light",
  estimatedTotalMinutes: 20,
  questions: [
    { id: "sd-1", textKey: "sd1Text", text: "Who was your favorite teacher? What made them special?", followUpHint: "Ask if they ever told the teacher how much they meant.", estimatedMinutes: 4 },
    { id: "sd-2", textKey: "sd2Text", text: "Who was your best friend in school? What did you get up to together?", followUpHint: "Ask about a specific adventure or trouble they got into.", estimatedMinutes: 4 },
    { id: "sd-3", textKey: "sd3Text", text: "What's the most embarrassing thing that happened to you at school?", followUpHint: "Ask if they can laugh about it now.", estimatedMinutes: 3 },
    { id: "sd-4", textKey: "sd4Text", text: "Was there a subject or skill you discovered at school that shaped your life?", followUpHint: "Ask about the moment of discovery.", estimatedMinutes: 3 },
    { id: "sd-5", textKey: "sd5Text", text: "What would your younger self think of who you've become?", followUpHint: "Ask what would surprise them most.", estimatedMinutes: 4 },
  ],
};

const dreamsAndPlay: InterviewTemplate = {
  id: "dreams-and-play",
  titleKey: "dreamsAndPlayTitle",
  descKey: "dreamsAndPlayDesc",
  wingId: "childhood",
  icon: "\uD83C\uDF08",
  difficulty: "light",
  estimatedTotalMinutes: 15,
  questions: [
    { id: "dp-1", textKey: "dp1Text", text: "What did you dream of becoming when you grew up?", followUpHint: "Ask what inspired that dream.", estimatedMinutes: 3 },
    { id: "dp-2", textKey: "dp2Text", text: "What games did you play? Did you have an imaginary world?", followUpHint: "Ask about the rules of their favorite game.", estimatedMinutes: 3 },
    { id: "dp-3", textKey: "dp3Text", text: "Was there a book, show, or movie that captured your imagination?", followUpHint: "Ask why it spoke to them.", estimatedMinutes: 3 },
    { id: "dp-4", textKey: "dp4Text", text: "Did any of those childhood dreams come true — even in an unexpected way?", followUpHint: "Ask about the connection between the dream and reality.", estimatedMinutes: 3 },
  ],
};

// ═══ CAREER WING INTERVIEWS ═══

const lifesWork: InterviewTemplate = {
  id: "lifes-work",
  titleKey: "lifesWorkTitle",
  descKey: "lifesWorkDesc",
  wingId: "career",
  icon: "\uD83C\uDFC6",
  difficulty: "medium",
  estimatedTotalMinutes: 25,
  questions: [
    { id: "lw-1", textKey: "lw1Text", text: "What did you do for a living? How did you end up in that field?", followUpHint: "Ask if it was by choice, by chance, or by necessity.", estimatedMinutes: 4 },
    { id: "lw-2", textKey: "lw2Text", text: "What drove you in your work? Was it passion, duty, creativity, or something else?", followUpHint: "Ask about a day when that drive was strongest.", estimatedMinutes: 4 },
    { id: "lw-3", textKey: "lw3Text", text: "What accomplishment are you most proud of in your career?", followUpHint: "Ask what made it possible — who helped, what they sacrificed.", estimatedMinutes: 4 },
    { id: "lw-4", textKey: "lw4Text", text: "Was there a moment when you wanted to give up? What kept you going?", followUpHint: "Ask what they'd tell someone in that same position today.", estimatedMinutes: 4 },
    { id: "lw-5", textKey: "lw5Text", text: "How did your work shape who you are as a person — beyond the job itself?", followUpHint: "Ask about skills or perspectives that carried over into life.", estimatedMinutes: 4 },
  ],
};

const mentorsAndLessons: InterviewTemplate = {
  id: "mentors-lessons",
  titleKey: "mentorsLessonsTitle",
  descKey: "mentorsLessonsDesc",
  wingId: "career",
  icon: "\uD83E\uDDD1\u200D\uD83C\uDFEB",
  difficulty: "medium",
  estimatedTotalMinutes: 20,
  questions: [
    { id: "ml-1", textKey: "ml1Text", text: "Who had the biggest influence on your career? How did you meet them?", followUpHint: "Ask what they saw in them that others didn't.", estimatedMinutes: 4 },
    { id: "ml-2", textKey: "ml2Text", text: "What's the best piece of advice you ever received about work or life?", followUpHint: "Ask about a time they had to use that advice.", estimatedMinutes: 4 },
    { id: "ml-3", textKey: "ml3Text", text: "Did you ever mentor someone else? What was that like?", followUpHint: "Ask what they learned from being a mentor.", estimatedMinutes: 4 },
    { id: "ml-4", textKey: "ml4Text", text: "What's a lesson you learned the hard way?", followUpHint: "Ask if they'd change anything, knowing what they know now.", estimatedMinutes: 4 },
  ],
};

const turningPoints: InterviewTemplate = {
  id: "turning-points",
  titleKey: "turningPointsTitle",
  descKey: "turningPointsDesc",
  wingId: "career",
  icon: "\u21AA\uFE0F",
  difficulty: "deep",
  estimatedTotalMinutes: 20,
  questions: [
    { id: "tp-1", textKey: "tp1Text", text: "Was there a single moment that changed the direction of your career?", followUpHint: "Ask what they were feeling right before the change.", estimatedMinutes: 4 },
    { id: "tp-2", textKey: "tp2Text", text: "Did you ever take a big risk professionally? What happened?", followUpHint: "Ask what gave them the courage.", estimatedMinutes: 4 },
    { id: "tp-3", textKey: "tp3Text", text: "Looking back, was there a 'closed door' that turned out to be a blessing?", followUpHint: "Ask how long it took to see it that way.", estimatedMinutes: 4 },
    { id: "tp-4", textKey: "tp4Text", text: "If you could go back and give your younger professional self one piece of advice, what would it be?", followUpHint: "Ask what would have been different if they'd known sooner.", estimatedMinutes: 4 },
  ],
};

// ═══ CREATIVITY WING INTERVIEWS ═══

const creativeSpirit: InterviewTemplate = {
  id: "creative-spirit",
  titleKey: "creativeSpiritTitle",
  descKey: "creativeSpiritDesc",
  wingId: "creativity",
  icon: "\uD83C\uDFA8",
  difficulty: "light",
  estimatedTotalMinutes: 20,
  questions: [
    { id: "cs-1", textKey: "cs1Text", text: "What do you create — or what have you created in your life?", followUpHint: "Ask what draws them to that particular form of expression.", estimatedMinutes: 4 },
    { id: "cs-2", textKey: "cs2Text", text: "When did you first discover this creative passion?", followUpHint: "Ask about the very first time they tried it.", estimatedMinutes: 3 },
    { id: "cs-3", textKey: "cs3Text", text: "What does creating feel like for you? What happens inside when you're in the flow?", followUpHint: "Ask about a specific piece or project where they felt most alive.", estimatedMinutes: 4 },
    { id: "cs-4", textKey: "cs4Text", text: "Is there something you've created that you're especially proud of? Tell me about it.", followUpHint: "Ask what it means to them, beyond the work itself.", estimatedMinutes: 4 },
    { id: "cs-5", textKey: "cs5Text", text: "Has your creativity ever helped you through a difficult time?", followUpHint: "Ask how it served as a refuge or healing.", estimatedMinutes: 4 },
  ],
};

const inspiration: InterviewTemplate = {
  id: "inspiration",
  titleKey: "inspirationTitle",
  descKey: "inspirationDesc",
  wingId: "creativity",
  icon: "\u2728",
  difficulty: "medium",
  estimatedTotalMinutes: 15,
  questions: [
    { id: "in-1", textKey: "in1Text", text: "What inspires you most? A person, a place, a feeling?", followUpHint: "Ask when they first felt that inspiration.", estimatedMinutes: 3 },
    { id: "in-2", textKey: "in2Text", text: "Is there an artist, musician, writer, or creator who deeply influenced you?", followUpHint: "Ask what specifically about their work resonates.", estimatedMinutes: 3 },
    { id: "in-3", textKey: "in3Text", text: "Where do you go — physically or mentally — when you need inspiration?", followUpHint: "Ask what happens there that opens things up.", estimatedMinutes: 3 },
    { id: "in-4", textKey: "in4Text", text: "What would you say to someone who says, 'I'm not creative'?", followUpHint: "Ask where they think that belief comes from.", estimatedMinutes: 3 },
  ],
};

// ═══ GENERAL / CROSS-WING INTERVIEWS ═══

const lifeWisdom: InterviewTemplate = {
  id: "life-wisdom",
  titleKey: "lifeWisdomTitle",
  descKey: "lifeWisdomDesc",
  wingId: "general",
  icon: "\uD83E\uDDD8",
  difficulty: "deep",
  estimatedTotalMinutes: 25,
  questions: [
    { id: "lwd-1", textKey: "lwd1Text", text: "If you could tell your younger self one thing, what would it be?", followUpHint: "Ask at what age they would tell them, and why.", estimatedMinutes: 4 },
    { id: "lwd-2", textKey: "lwd2Text", text: "What's a mistake you made that taught you the most?", followUpHint: "Ask how long it took to see it as a lesson instead of a failure.", estimatedMinutes: 4 },
    { id: "lwd-3", textKey: "lwd3Text", text: "Who has been the most important person in your life, and why?", followUpHint: "Ask for the moment that confirmed it.", estimatedMinutes: 4 },
    { id: "lwd-4", textKey: "lwd4Text", text: "What do you know now that you wish you'd known at 30?", followUpHint: "Ask if knowing it sooner would have changed anything.", estimatedMinutes: 4 },
    { id: "lwd-5", textKey: "lwd5Text", text: "What's the most important thing you've learned about happiness?", followUpHint: "Ask when this understanding arrived.", estimatedMinutes: 4 },
  ],
};

const legacyLetter: InterviewTemplate = {
  id: "legacy-letter",
  titleKey: "legacyLetterTitle",
  descKey: "legacyLetterDesc",
  wingId: "general",
  icon: "\u2709\uFE0F",
  difficulty: "deep",
  estimatedTotalMinutes: 30,
  questions: [
    { id: "ll-1", textKey: "ll1Text", text: "If your grandchildren could hear just one story about your life, which would you tell?", followUpHint: "Ask why that one above all others.", estimatedMinutes: 5 },
    { id: "ll-2", textKey: "ll2Text", text: "What values do you most hope to pass on to future generations?", followUpHint: "Ask how those values were passed to them.", estimatedMinutes: 4 },
    { id: "ll-3", textKey: "ll3Text", text: "What do you want people to remember about you?", followUpHint: "Ask what they'd like their legacy to feel like, not just be.", estimatedMinutes: 4 },
    { id: "ll-4", textKey: "ll4Text", text: "Is there something about your life that your family doesn't know — something you'd like them to understand?", followUpHint: "Be very gentle. Acknowledge the courage it takes to share.", estimatedMinutes: 5 },
    { id: "ll-5", textKey: "ll5Text", text: "If you could write a letter to someone who hasn't been born yet in your family — what would you say?", followUpHint: "Ask them to speak it as if writing that letter right now.", estimatedMinutes: 5 },
  ],
};

const meaningOfItAll: InterviewTemplate = {
  id: "meaning-of-it-all",
  titleKey: "meaningOfItAllTitle",
  descKey: "meaningOfItAllDesc",
  wingId: "general",
  icon: "\uD83C\uDF3F",
  difficulty: "deep",
  estimatedTotalMinutes: 25,
  questions: [
    { id: "ma-1", textKey: "ma1Text", text: "What has given your life the most meaning?", followUpHint: "Ask when they first became aware of it.", estimatedMinutes: 5 },
    { id: "ma-2", textKey: "ma2Text", text: "Was there a moment when everything seemed to make sense — even briefly?", followUpHint: "Ask them to describe that feeling.", estimatedMinutes: 4 },
    { id: "ma-3", textKey: "ma3Text", text: "What are you most grateful for?", followUpHint: "Ask if it was something they expected or something that surprised them.", estimatedMinutes: 4 },
    { id: "ma-4", textKey: "ma4Text", text: "Has your understanding of what matters most changed over the years?", followUpHint: "Ask what they valued at 20, at 40, and now.", estimatedMinutes: 4 },
    { id: "ma-5", textKey: "ma5Text", text: "If today were your last day, would you feel your story was complete?", followUpHint: "Gently. Ask what chapter, if any, is still unwritten.", estimatedMinutes: 5 },
  ],
};

// ═══ ALL TEMPLATES ═══

export const INTERVIEW_TEMPLATES: InterviewTemplate[] = [
  // Family
  familyTraditions,
  growingUp,
  parentsAndGrandparents,
  loveStory,
  raisingChildren,
  // Travel
  greatestAdventure,
  placesOfTheHeart,
  travelWisdom,
  // Childhood
  earlyMemories,
  schoolDays,
  dreamsAndPlay,
  // Career
  lifesWork,
  mentorsAndLessons,
  turningPoints,
  // Creativity
  creativeSpirit,
  inspiration,
  // General
  lifeWisdom,
  legacyLetter,
  meaningOfItAll,
];

export function getTemplatesByWing(wingId: string): InterviewTemplate[] {
  return INTERVIEW_TEMPLATES.filter((t) => t.wingId === wingId);
}

export function getTemplate(templateId: string): InterviewTemplate | undefined {
  return INTERVIEW_TEMPLATES.find((t) => t.id === templateId);
}

/** Maps wing IDs to translation keys (under the "interviewLibrary" namespace). */
export const WING_ID_TO_LABEL_KEY: Record<string, string> = {
  family: "family",
  travel: "travel",
  childhood: "childhood",
  career: "career",
  creativity: "creativity",
  general: "lifeAndLegacy",
};

/** @deprecated Use WING_ID_TO_LABEL_KEY with a translation function instead. */
export const WING_ID_TO_LABEL: Record<string, string> = {
  family: "Family",
  travel: "Travel",
  childhood: "Childhood",
  career: "Career",
  creativity: "Creativity",
  general: "Life & Legacy",
};
