/** A turning discs puzzle as the game master makes it, answer and all, and what its player link holds. */
import { fingerprint, newSalt } from '../../kit/check';
import { mulberry32, randomSeed } from '../../kit/rng';
import { readWords, tidyWords, type Words } from '../../kit/words';
import { answerKeys, keyOf, LONGEST_HALF, piecesOf, type Content } from './engine/answer';
import type { Board } from './engine/board';
import { fillBlanks } from './engine/filler';
import { FLOWER, positionCount } from './engine/layout';
import { scramble, solvedBoard, type Mix } from './engine/scramble';
import type { DiscsPuzzle } from './puzzle';

/** How many names the answer has, and how many spokes are filler. */
export const PAIRS = FLOWER.goals.length;
export const FILLER = positionCount(FLOWER) - 2 * PAIRS;

/** The mixes on offer: every piece anywhere, or a number of moves away from solved. */
export const MIXES: readonly Mix[] = ['full', 20, 10, 5];

export interface DiscsDesign {
  v: 1;
  words: Words;
  /** Each name's two halves, in order clockwise from the mark. Either may come first in the name. */
  pairs: [string, string][];
  /** What goes on the other spokes. Blanks fill themselves from halves of place names. */
  filler: string[];
  /** Whether the names count in order from any contact round the centre, not just the mark's. */
  anyStart: boolean;
  mix: Mix;
  /** Seeds for the filler's blanks and for the scramble, so the same design always makes the same board. */
  fillSeed: number;
  seed: number;
}

export const NEW_WORDS: Words = { title: '', intro: '', success: 'The discs lock into place.' };

export function newDesign(): DiscsDesign {
  return {
    v: 1,
    words: NEW_WORDS,
    pairs: Array.from({ length: PAIRS }, () => ['', '']),
    filler: Array.from({ length: FILLER }, () => ''),
    anyStart: false,
    mix: 'full',
    fillSeed: randomSeed(),
    seed: randomSeed(),
  };
}

const half = (value: unknown) => (typeof value === 'string' && value.length <= LONGEST_HALF ? value : '');
const seedIn = (value: unknown) => (Number.isInteger(value) && (value as number) >= 0 && (value as number) < 2 ** 32 ? (value as number) : 1);

/** A design from untrusted data, each field checked, with a new design's for any that's missing or malformed. */
export function readDesign(data: unknown): DiscsDesign | null {
  if (!data || typeof data !== 'object' || Array.isArray(data)) return null;
  const input = data as Record<string, unknown>;
  if (input.v !== 1) return null;
  const pairs: unknown[] = Array.isArray(input.pairs) ? input.pairs : [];
  const filler: unknown[] = Array.isArray(input.filler) ? input.filler : [];
  return {
    v: 1,
    words: readWords(input.words, NEW_WORDS),
    pairs: Array.from({ length: PAIRS }, (_, i) => {
      const pair: unknown[] = Array.isArray(pairs[i]) ? pairs[i] : [];
      return [half(pair[0]), half(pair[1])];
    }),
    filler: Array.from({ length: FILLER }, (_, i) => half(filler[i])),
    anyStart: input.anyStart === true,
    mix: MIXES.find((mix) => mix === input.mix) ?? 'full',
    fillSeed: seedIn(input.fillSeed),
    seed: seedIn(input.seed),
  };
}

/** The filler as the board shows it, its blanks filled. */
export const fillerOf = (design: DiscsDesign): string[] => fillBlanks(design.filler, design.pairs.flat(), mulberry32(design.fillSeed));

/** The design's pieces: its pairs, and its filler with the blanks filled. */
export function contentOf(design: DiscsDesign): Content {
  return {
    pairs: design.pairs.map(([first, second]) => [{ text: first }, { text: second }] as const),
    filler: fillerOf(design).map((text) => ({ text })),
  };
}

/** The board as the players first see it. */
export const startOf = (design: DiscsDesign): Board => scramble(FLOWER, contentOf(design), mulberry32(design.seed), design.mix);

/** The board solved, to show the game master. */
export const solvedOf = (design: DiscsDesign): Board => solvedBoard(FLOWER, contentOf(design), mulberry32(design.seed));

export function problemsOf(design: DiscsDesign): string[] {
  return design.pairs.some((pair) => pair.some((text) => keyOf({ text }) === '')) ? ['Write both halves of all six names.'] : [];
}

/** What a player link holds: the pieces as they start, and fingerprints of the answers that count. */
export async function toPuzzle(design: DiscsDesign): Promise<DiscsPuzzle> {
  const content = contentOf(design);
  const pieces = piecesOf(content);
  const salt = newSalt();
  return {
    v: 1,
    words: tidyWords(design.words),
    layout: 'flower',
    // Spoke by spoke, as they start: in no order that says which are the answer's, or which go together.
    pieces: startOf(design).map((piece) => keyOf(pieces[piece])),
    mark: !design.anyStart,
    salt,
    answers: await Promise.all(answerKeys(content, design.anyStart).map((key) => fingerprint(key, salt))),
  };
}
