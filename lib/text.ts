import type { ProverbSuggestion } from "@/lib/types";

const PUNCTUATION = /[^\p{L}\p{N}\s]/gu;
const MULTI_SPACE = /\s+/g;

export function normalizeText(input: string): string {
  return input
    .toLocaleLowerCase("nl-NL")
    .replace(PUNCTUATION, " ")
    .trim()
    .replace(MULTI_SPACE, " ");
}

export function canonicalizeText(input: string): string {
  return input.trim().replace(MULTI_SPACE, " ");
}

function bigrams(input: string): string[] {
  const value = ` ${normalizeText(input)} `;
  if (value.length < 3) {
    return [value];
  }

  const parts: string[] = [];
  for (let index = 0; index < value.length - 1; index += 1) {
    parts.push(value.slice(index, index + 2));
  }
  return parts;
}

function words(input: string): string[] {
  return normalizeText(input)
    .split(" ")
    .map((part) => part.trim())
    .filter(Boolean);
}

function tokenOverlapScore(a: string, b: string): number {
  const left = new Set(words(a));
  const right = new Set(words(b));

  if (left.size === 0 || right.size === 0) {
    return 0;
  }

  let overlap = 0;
  for (const token of left) {
    if (right.has(token)) {
      overlap += 1;
    }
  }

  return overlap / Math.max(left.size, right.size);
}

export function similarityScore(a: string, b: string): number {
  const left = normalizeText(a);
  const right = normalizeText(b);

  if (!left || !right) {
    return 0;
  }

  if (left === right) {
    return 1;
  }

  const leftBigrams = bigrams(left);
  const rightBigrams = bigrams(right);
  const available = [...rightBigrams];
  let overlap = 0;

  for (const pair of leftBigrams) {
    const matchIndex = available.indexOf(pair);
    if (matchIndex >= 0) {
      overlap += 1;
      available.splice(matchIndex, 1);
    }
  }

  return (2 * overlap) / (leftBigrams.length + rightBigrams.length);
}

export function rankProverbs(
  input: string,
  proverbs: Array<{ id: string; canonical_text: string }>
): ProverbSuggestion[] {
  const normalized = normalizeText(input);
  if (!normalized || normalized.length < 4) {
    return [];
  }

  return proverbs
    .map((proverb) => {
      const phrase = proverb.canonical_text;
      const normalizedPhrase = normalizeText(phrase);
      const bigramScore = similarityScore(normalized, phrase);
      const overlapScore = tokenOverlapScore(normalized, phrase);
      const startsWithMatch =
        normalizedPhrase.startsWith(normalized) || normalized.startsWith(normalizedPhrase);
      const score = Math.max(
        bigramScore * 0.55 + overlapScore * 0.45,
        startsWithMatch ? 0.9 : 0
      );

      return {
        id: proverb.id,
        canonical_text: phrase,
        similarity: score,
        exact: normalizedPhrase === normalized
      };
    })
    .filter((item) => item.exact || item.similarity >= 0.58)
    .sort((a, b) => b.similarity - a.similarity)
    .slice(0, 4);
}

export function bestSuggestion(
  input: string,
  proverbs: Array<{ id: string; canonical_text: string }>
): ProverbSuggestion | null {
  return rankProverbs(input, proverbs)[0] ?? null;
}
