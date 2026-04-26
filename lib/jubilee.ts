import { canonicalizeText, normalizeText } from "@/lib/text";

export type JubileeChallenge = {
  title: string;
  story: string;
  keywords: [string, string, string];
};

const challenges: JubileeChallenge[] = [
  {
    title: "Online pubquiz corona",
    story:
      "Tijdens **corona** zat iedereen thuis, maar de lol ging gewoon door met een fanatieke **online** **pubquiz** aan de keukentafel.",
    keywords: ["online", "pubquiz", "corona"]
  },
  {
    title: "WK kelder Hans",
    story:
      "Bij **Hans** in de **kelder** werd een legendarische **WK**-avond beleefd met spanning, gejuich en veel te fanatieke analyses.",
    keywords: ["wk", "kelder", "hans"]
  },
  {
    title: "Adoptie buurttuin burendag",
    story:
      "Tijdens **burendag** stak Schellerhart de handen uit de mouwen na de **adoptie** van de **buurttuin**, met gezelligheid tussendoor.",
    keywords: ["adoptie", "buurttuin", "burendag"]
  },
  {
    title: "Graffiti workshop borden",
    story:
      "Tijdens een creatieve **graffiti** **workshop** veranderden gewone **borden** in een vrolijke Schellerhart-chaos vol kleur.",
    keywords: ["graffiti", "workshop", "borden"]
  }
];

const challengeMap = new Map(
  challenges.map((challenge) => [normalizeText(challenge.title), challenge])
);

export function getJubileeChallenge(title: string | null | undefined): JubileeChallenge | null {
  if (!title) {
    return null;
  }

  return challengeMap.get(normalizeText(title)) ?? null;
}

export function isJubileeChallenge(title: string | null | undefined): boolean {
  return Boolean(getJubileeChallenge(title));
}

export function formatJubileeKeywords(keywords: readonly string[]): string {
  return keywords.map((keyword) => canonicalizeText(keyword)).join(", ");
}

export function maskJubileeStory(story: string, keywords: readonly string[]): string {
  return keywords.reduce((result, keyword) => {
    const pattern = new RegExp(`\\b${escapeRegExp(keyword)}\\b`, "gi");
    return result.replace(pattern, ".....");
  }, story.replace(/\*\*/g, ""));
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function matchesJubileeKeywords(guess: string, keywords: readonly string[]): boolean {
  const normalizedGuess = normalizeText(guess);
  if (!normalizedGuess) {
    return false;
  }

  return keywords.every((keyword) => normalizedGuess.includes(normalizeText(keyword)));
}
