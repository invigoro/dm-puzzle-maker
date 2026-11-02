/** A turning discs puzzle as the game master makes it, answer and all, and what its player link holds. */
import { fingerprint, newSalt } from '../../kit/check';
import { isIconName } from '../../kit/icons';
import { mulberry32, randomSeed } from '../../kit/rng';
import { readWords, tidyWords, type Words } from '../../kit/words';
import { answerKeys, glowKeys, isBlank, LONGEST_HALF, piecesOf, wordsOf, type Content, type Piece } from './engine/answer';
import { readBoard, type Board } from './engine/board';
import { fillBlanks } from './engine/filler';
import { FLOWER, layoutById, LAYOUTS, positionCount, type Layout, type LayoutId } from './engine/layout';
import { scramble, solvedBoard, type Mix } from './engine/scramble';
import type { DiscsPuzzle } from './puzzle';

/** How many names a layout's answer has, and how many of its spokes are filler. */
export const pairCount = (layout: Layout) => layout.goals.length;
export const fillerCount = (layout: Layout) => positionCount(layout) - 2 * pairCount(layout);

/**
 * How many names and filler a design keeps: as many as the largest layout has. A smaller layout
 * uses the first of them, and keeps the rest aside for a change of mind.
 */
export const MOST_PAIRS = Math.max(...LAYOUTS.map(pairCount));
export const MOST_FILLER = Math.max(...LAYOUTS.map(fillerCount));

/** A number in words, as the maker says how many names there are: "three". */
export const inWords = (n: number) => ['no', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve'][n] ?? String(n);

/** How the board starts: a scramble (every piece anywhere, or a number of moves from solved), or set by hand. */
export type Start = Mix | 'hand';
export const STARTS: readonly Start[] = ['full', 20, 10, 5, 'hand'];

export interface DiscsDesign {
  v: 1;
  words: Words;
  /** Seven discs or three. Links made before there was a choice are seven. */
  layout: LayoutId;
  /** Each name's two halves, in order clockwise from the mark. Either may come first in the name. */
  pairs: [Piece, Piece][];
  /** What goes on the other spokes. Blanks fill themselves from halves of place names. */
  filler: Piece[];
  /** Whether the names count in order from any of their contacts, not just the mark's. */
  anyStart: boolean;
  /** Whether each name lights up as it comes right: easier, and quicker to guess at. */
  glow: boolean;
  mix: Start;
  /** The board set by hand, numbering pieces as `piecesOf` does: only when `mix` is 'hand'. */
  start?: number[];
  /** Seeds for the filler's blanks and for the scramble, so the same design always makes the same board. */
  fillSeed: number;
  seed: number;
}

export const NEW_WORDS: Words = { title: '', intro: '', success: 'The discs lock into place.' };

const blank = (): Piece => ({ text: '' });

export function newDesign(): DiscsDesign {
  return {
    v: 1,
    words: NEW_WORDS,
    layout: 'flower',
    pairs: Array.from({ length: MOST_PAIRS }, () => [blank(), blank()]),
    filler: Array.from({ length: MOST_FILLER }, blank),
    anyStart: false,
    glow: false,
    mix: 'full',
    fillSeed: randomSeed(),
    seed: randomSeed(),
  };
}

/** The design's layout. */
export const layoutOfDesign = (design: DiscsDesign): Layout => layoutById(design.layout) ?? FLOWER;

const textIn = (value: unknown) => (typeof value === 'string' && value.length <= LONGEST_HALF ? value : '');

/** A half from untrusted data: its words, and its picture if it names one. Links made before pictures hold just the words. */
function halfIn(value: unknown): Piece {
  if (typeof value === 'string') return { text: textIn(value) };
  const input = value && typeof value === 'object' ? (value as Record<string, unknown>) : {};
  return isIconName(input.icon) ? { text: textIn(input.text), icon: input.icon } : { text: textIn(input.text) };
}

const seedIn = (value: unknown) => (Number.isInteger(value) && (value as number) >= 0 && (value as number) < 2 ** 32 ? (value as number) : 1);

/** A design from untrusted data, each field checked, with a new design's for any that's missing or malformed. */
export function readDesign(data: unknown): DiscsDesign | null {
  if (!data || typeof data !== 'object' || Array.isArray(data)) return null;
  const input = data as Record<string, unknown>;
  if (input.v !== 1) return null;
  const layout = layoutById(input.layout) ?? FLOWER;
  const pairs: unknown[] = Array.isArray(input.pairs) ? input.pairs : [];
  const filler: unknown[] = Array.isArray(input.filler) ? input.filler : [];
  // A start set by hand counts only with a board to start from, on this layout.
  const start = input.mix === 'hand' ? readBoard(layout, input.start) : null;
  const mix = STARTS.find((mix) => mix === input.mix && mix !== 'hand') ?? (start ? 'hand' : 'full');
  return {
    v: 1,
    words: readWords(input.words, NEW_WORDS),
    layout: layout.id,
    pairs: Array.from({ length: MOST_PAIRS }, (_, i) => {
      const pair: unknown[] = Array.isArray(pairs[i]) ? pairs[i] : [];
      return [halfIn(pair[0]), halfIn(pair[1])];
    }),
    filler: Array.from({ length: MOST_FILLER }, (_, i) => halfIn(filler[i])),
    anyStart: input.anyStart === true,
    glow: input.glow === true,
    mix,
    ...(start ? { start: [...start] } : {}),
    fillSeed: seedIn(input.fillSeed),
    seed: seedIn(input.seed),
  };
}

/** The names the layout uses. */
export const pairsOf = (design: DiscsDesign) => design.pairs.slice(0, pairCount(layoutOfDesign(design)));

/** The filler as the board shows it, its blanks filled: as much as the layout uses. */
export const fillerOf = (design: DiscsDesign): Piece[] =>
  fillBlanks(design.filler.slice(0, fillerCount(layoutOfDesign(design))), pairsOf(design).flat(), mulberry32(design.fillSeed));

/** The design's pieces: its pairs, and its filler with the blanks filled. */
export const contentOf = (design: DiscsDesign): Content => ({ pairs: pairsOf(design), filler: fillerOf(design) });

/** The design's scramble, whatever its start: what a start set by hand begins from. */
export const scrambleOf = (design: DiscsDesign): Board =>
  scramble(layoutOfDesign(design), contentOf(design), mulberry32(design.seed), design.mix === 'hand' ? 'full' : design.mix);

/** The board as the players first see it. */
export const startOf = (design: DiscsDesign): Board => (design.mix === 'hand' && design.start ? design.start : scrambleOf(design));

/** The board solved, to show the game master. */
export const solvedOf = (design: DiscsDesign): Board => solvedBoard(layoutOfDesign(design), contentOf(design), mulberry32(design.seed));

export function problemsOf(design: DiscsDesign): string[] {
  const pairs = pairsOf(design);
  return pairs.some((pair) => pair.some(isBlank)) ? [`Give both halves of all ${inWords(pairs.length)} names words or a picture.`] : [];
}

/** What a player link holds: the pieces as they start, and fingerprints of the answers that count. */
export async function toPuzzle(design: DiscsDesign): Promise<DiscsPuzzle> {
  const content = contentOf(design);
  const pieces = piecesOf(content);
  const start = startOf(design).map((piece) => pieces[piece]);
  const salt = newSalt();
  return {
    v: 1,
    words: tidyWords(design.words),
    layout: design.layout,
    // Spoke by spoke, as they start: in no order that says which are the answer's, or which go together.
    pieces: start.map(wordsOf),
    // Only when there are pictures, to keep links short.
    ...(start.some((piece) => piece.icon) ? { icons: start.map((piece) => piece.icon ?? '') } : {}),
    mark: !design.anyStart,
    salt,
    answers: await Promise.all(answerKeys(content, design.anyStart).map((key) => fingerprint(key, salt))),
    // Sorted, so their order says nothing.
    ...(design.glow ? { glows: (await Promise.all(glowKeys(content, design.anyStart).map((key) => fingerprint(key, salt)))).sort() } : {}),
  };
}
