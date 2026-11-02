/** A word guess as the game master makes it, answer and all, and what its player link holds. */
import { fingerprint, newSalt, quickFingerprint } from '../../kit/check';
import { mulberry32, randomSeed, shuffled } from '../../kit/rng';
import { seal } from '../../kit/seal';
import { readWords, tidyWords, type Words } from '../../kit/words';
import { hintOrder, lettersIn, wordsIn } from './engine/letters';
import type { GuessPuzzle } from './puzzle';

/** How the players make a try: arranging the answer's letters as tiles, or typing any letters. */
export type LetterMode = 'tiles' | 'any';
/** What a try tells them: each letter's mark, or only whether the whole is right. */
export type Marking = 'letters' | 'whole';

/** The numbers of tries on offer; 0 is as many as they like. */
export const TRIES: readonly number[] = [1, 3, 6, 10, 0];
/** The most letters an answer may have, and the most hints. */
export const LONGEST_ANSWER = 30;
export const MOST_HINTS = 10;

export interface GuessDesign {
  v: 1;
  words: Words;
  /** The answer as the game master wrote it. It's compared by its letters, A to Z. */
  answer: string;
  letters: LetterMode;
  /** Whether the players see where the answer's words break, when they type any letters. Tiles always show it. */
  breaks: boolean;
  /** How many tries they have: 0 for as many as they like. */
  tries: number;
  marking: Marking;
  /** How many letters hints may give away, one at a time. */
  hints: number;
  /** The line for running out of tries. */
  out: string;
  /** The seed for the tiles' shuffle. */
  seed: number;
}

export const NEW_WORDS: Words = { title: '', intro: '', success: 'That’s it.' };

export function newDesign(): GuessDesign {
  return {
    v: 1,
    words: NEW_WORDS,
    answer: '',
    letters: 'any',
    breaks: true,
    tries: 6,
    marking: 'letters',
    hints: 0,
    out: 'Nothing happens, and nothing more will.',
    seed: randomSeed(),
  };
}

const textIn = (value: unknown, longest: number, fallback: string) => (typeof value === 'string' && value.length <= longest ? value : fallback);
const wholeIn = (value: unknown, most: number, fallback: number) =>
  Number.isInteger(value) && (value as number) >= 0 && (value as number) <= most ? (value as number) : fallback;

/** A design from untrusted data, each field checked, with a new design's for any that's missing or malformed. */
export function readDesign(data: unknown): GuessDesign | null {
  if (!data || typeof data !== 'object' || Array.isArray(data)) return null;
  const input = data as Record<string, unknown>;
  if (input.v !== 1) return null;
  const fresh = newDesign();
  return {
    v: 1,
    words: readWords(input.words, NEW_WORDS),
    answer: textIn(input.answer, 60, ''),
    letters: input.letters === 'tiles' ? 'tiles' : 'any',
    breaks: input.breaks !== false,
    tries: TRIES.includes(input.tries as number) ? (input.tries as number) : fresh.tries,
    marking: input.marking === 'whole' ? 'whole' : 'letters',
    hints: wholeIn(input.hints, MOST_HINTS, 0),
    out: textIn(input.out, 200, fresh.out),
    seed: wholeIn(input.seed, 2 ** 32 - 1, 1),
  };
}

/** The answer's letters, run together. */
export const lettersOf = (design: GuessDesign) => lettersIn(design.answer);

/** The lengths of the words the players see: the answer's words, or one run of letters with the breaks hidden. */
export function shapeOf(design: GuessDesign): number[] {
  const words = wordsIn(design.answer).map((word) => word.length);
  return design.letters === 'any' && !design.breaks ? [words.reduce((sum, length) => sum + length, 0)] : words;
}

/** The answer's letters as shuffled tiles, never in the answer's own order when there's another. */
export function tilesOf(design: GuessDesign): string {
  const letters = lettersOf(design);
  const random = mulberry32(design.seed);
  let tiles = letters;
  for (let i = 0; i < 20 && tiles === letters; i++) tiles = shuffled([...letters], random).join('');
  return tiles;
}

export function problemsOf(design: GuessDesign): string[] {
  const letters = lettersOf(design).length;
  if (letters < 2) return ['Write an answer of two letters or more.'];
  if (letters > LONGEST_ANSWER) return [`Keep the answer to ${LONGEST_ANSWER} letters.`];
  return [];
}

/**
 * What a player link holds: the answer's shape, the tiles if there are any, and a slow fingerprint
 * of the answer. Marking letter by letter adds a quick fingerprint of each letter in its place and
 * of how many of each letter there are; they're quick to guess, as the maker warns.
 */
export async function toPuzzle(design: GuessDesign): Promise<GuessPuzzle> {
  const letters = lettersOf(design);
  const shape = shapeOf(design);
  const salt = newSalt();
  const words = tidyWords(design.words);
  const counts = [...new Set(letters)].map((letter) => `${letter}:${[...letters].filter((other) => other === letter).length}`);
  return {
    v: 1,
    // The line for solving it is sealed with the answer, below, so only solving it opens it.
    words: { ...words, success: '' },
    shape,
    ...(design.letters === 'tiles' ? { tiles: tilesOf(design) } : {}),
    tries: design.tries,
    salt,
    answer: await fingerprint(letters, salt),
    // Sorted, so their order says nothing.
    ...(design.marking === 'letters'
      ? {
          marks: {
            places: (await Promise.all([...letters].map((letter, at) => quickFingerprint(`${at}:${letter}`, salt)))).sort(),
            counts: (await Promise.all(counts.map((count) => quickFingerprint(count, salt)))).sort(),
          },
        }
      : {}),
    hints: hintOrder(shape)
      .slice(0, Math.min(design.hints, letters.length - 1))
      .map((at): [number, string] => [at, letters[at]]),
    sealed: await seal(words.success || 'Solved.', letters, salt),
    out: design.out.trim(),
  };
}
