import { canonicalizeText, normalizeText } from "@/lib/text";

type JubileeChallenge = {
  title: string;
  story: string;
  keywords: [string, string, string];
};

const challenges: JubileeChallenge[] = [
  {
    title: "Online pubquiz corona",
    story:
      "Tijdens de coronatijd zat iedereen thuis, maar Schellerhart liet zich niet uit het veld slaan. Met drankjes binnen handbereik en fanatieke blikken op het scherm werd er vanuit huis fanatiek meegedaan aan een gezellige online pubquiz.",
    keywords: ["online", "pubquiz", "corona"]
  },
  {
    title: "WK kelder Hans",
    story:
      "Bij Hans in de kelder werd een WK-avond legendarisch: spanning voor de wedstrijd, volle glazen, luid gejuich en net iets te veel fanatisme maakten het tot zo'n avond waar nog vaak over gepraat wordt.",
    keywords: ["wk", "kelder", "hans"]
  },
  {
    title: "Adoptie buurttuin burendag",
    story:
      "Op Burendag liet Schellerhart zien dat gezelligheid en aanpakken samen kunnen gaan. De buurttuin werd geadopteerd, iedereen hielp mee en tussen het werken door was er volop ruimte voor ontmoeting en plezier.",
    keywords: ["adoptie", "buurttuin", "burendag"]
  },
  {
    title: "Graffiti workshop borden",
    story:
      "Tijdens een creatieve workshop gingen de borden op tafel en de spuitbussen open. Kleuren vlogen in het rond en voor je het wist ontstonden er opvallende graffiti-kunstwerken met een heel eigen Schellerhart-stijl.",
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

export function matchesJubileeKeywords(guess: string, keywords: readonly string[]): boolean {
  const normalizedGuess = normalizeText(guess);
  if (!normalizedGuess) {
    return false;
  }

  return keywords.every((keyword) => normalizedGuess.includes(normalizeText(keyword)));
}
