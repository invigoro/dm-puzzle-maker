/** Braziers as the game master makes them, and what their player link holds. */
import { fingerprint, newSalt } from '../../kit/check';
import { isIconName } from '../../kit/icons';
import { mulberry32, randomSeed } from '../../kit/rng';
import { seal } from '../../kit/seal';
import { readWords, tidyWords, type Words } from '../../kit/words';
import {
  allOf,
  braziersOf,
  cellsOf,
  FEWEST_ROUND,
  flipsOf,
  keyOf,
  LARGEST_SIDE,
  maskOf,
  MOST_ROUND,
  REACHES,
  SMALLEST_SIDE,
  type Floor,
  type Reach,
  type Shape,
} from './engine/floor';
import { solve, startFrom, type Solution } from './engine/solver';
import { LONGEST_LINE, MOST_TOUCHES, type Aim, type BraziersPuzzle } from './puzzle';

/** What the players must reach: every brazier out, every one burning, or a pattern the game master draws. */
export type Goal = 'out' | 'lit' | 'pattern';
/** How the start is set: so many touches from the goal, from a seed, or by hand. */
export type Starting = 'touches' | 'hand';

/** How many touches from the goal a start can be: 0 is anywhere the goal can reach. */
export const TOUCHES: readonly number[] = [3, 5, 8, 12, 0];
/** The picture a brazier has, unless the game master picks another. */
export const BRAZIER = 'fire-bowl';

export interface BraziersDesign {
  v: 1;
  words: Words;
  shape: Shape;
  width: number;
  height: number;
  /** A grid's squares left bare. */
  bare: number[];
  /** How many braziers a ring has. */
  count: number;
  /** What a touch on a grid flips. */
  reach: Reach;
  icon: string;
  goal: Goal;
  /** The cells burning in the goal, when it's a pattern. */
  pattern: number[];
  /** Whether a pattern is shown to the players, or left for them to learn in the game. */
  shown: boolean;
  starting: Starting;
  /** How many touches from the goal the start is, from the seed: 0 for anywhere. */
  touches: number;
  seed: number;
  /** The cells burning at a start set by hand. */
  drawn: number[];
  /** After how many touches the players fail: 0 for never. */
  limit: number;
  failLine: string;
}

export const NEW_WORDS: Words = { title: '', intro: '', success: 'The last flame dies, and the way opens.' };

export function newDesign(): BraziersDesign {
  return {
    v: 1,
    words: NEW_WORDS,
    shape: 'grid',
    width: 5,
    height: 5,
    bare: [],
    count: 8,
    reach: 'beside',
    icon: BRAZIER,
    goal: 'out',
    pattern: [],
    shown: true,
    starting: 'touches',
    touches: 8,
    seed: randomSeed(),
    drawn: [],
    limit: 0,
    failLine: 'The braziers roar up together, and the floor is ablaze.',
  };
}

const inRange = (value: unknown, least: number, most: number) => Number.isInteger(value) && (value as number) >= least && (value as number) <= most;
/** Cells from untrusted data: each a whole number on a floor of so many, each once, in order. */
const cellsIn = (value: unknown, cells: number) => [...new Set((Array.isArray(value) ? value : []).filter((cell) => inRange(cell, 0, cells - 1)) as number[])].sort((one, other) => one - other);

/** A design from untrusted data, each field checked, with a new design's for any that's missing or malformed. */
export function readDesign(data: unknown): BraziersDesign | null {
  if (!data || typeof data !== 'object' || Array.isArray(data)) return null;
  const input = data as Record<string, unknown>;
  if (input.v !== 1) return null;
  const fresh = newDesign();
  const shape: Shape = input.shape === 'ring' ? 'ring' : 'grid';
  const width = inRange(input.width, SMALLEST_SIDE, LARGEST_SIDE) ? (input.width as number) : fresh.width;
  const height = inRange(input.height, SMALLEST_SIDE, LARGEST_SIDE) ? (input.height as number) : fresh.height;
  const count = inRange(input.count, FEWEST_ROUND, MOST_ROUND) ? (input.count as number) : fresh.count;
  const cells = shape === 'grid' ? width * height : count;
  return {
    v: 1,
    words: readWords(input.words, NEW_WORDS),
    shape,
    width,
    height,
    bare: cellsIn(input.bare, width * height),
    count,
    reach: REACHES.includes(input.reach as Reach) ? (input.reach as Reach) : 'beside',
    icon: isIconName(input.icon) ? input.icon : BRAZIER,
    goal: input.goal === 'lit' || input.goal === 'pattern' ? input.goal : 'out',
    pattern: cellsIn(input.pattern, cells),
    shown: input.shown !== false,
    starting: input.starting === 'hand' ? 'hand' : 'touches',
    touches: TOUCHES.includes(input.touches as number) ? (input.touches as number) : fresh.touches,
    seed: inRange(input.seed, 0, 2 ** 32 - 1) ? (input.seed as number) : 1,
    drawn: cellsIn(input.drawn, cells),
    limit: inRange(input.limit, 0, MOST_TOUCHES) ? (input.limit as number) : 0,
    failLine: typeof input.failLine === 'string' ? input.failLine.slice(0, LONGEST_LINE) : fresh.failLine,
  };
}

/** The design's floor. */
export const floorOf = (design: BraziersDesign): Floor => ({
  shape: design.shape,
  width: design.width,
  height: design.height,
  bare: design.shape === 'grid' ? design.bare : [],
  count: design.count,
  reach: design.shape === 'grid' ? design.reach : 'beside',
});

/** The goal, as a mask over the floor's braziers. */
export function goalOf(design: BraziersDesign): bigint {
  const braziers = braziersOf(floorOf(design));
  if (design.goal === 'lit') return allOf(braziers.length);
  if (design.goal === 'pattern') return maskOf(design.pattern, braziers);
  return 0n;
}

/** The start, as a mask: so many touches from the goal, from the seed, or as drawn. */
export function startOf(design: BraziersDesign): bigint {
  const floor = floorOf(design);
  if (design.starting === 'hand') return maskOf(design.drawn, braziersOf(floor));
  return startFrom(flipsOf(floor), goalOf(design), design.touches, mulberry32(design.seed));
}

/** The fewest touches from the start to the goal, or null if none can take it there. */
export const solutionOf = (design: BraziersDesign): Solution | null => solve(flipsOf(floorOf(design)), startOf(design), goalOf(design));

/** How many braziers the floor has. */
export const brazierCount = (design: BraziersDesign) => braziersOf(floorOf(design)).length;

/** What the players must reach, as the link says it. */
export const aimOf = (design: BraziersDesign): Aim => (design.goal === 'pattern' ? (design.shown ? 'shown' : 'hidden') : design.goal);

export function problemsOf(design: BraziersDesign): string[] {
  if (brazierCount(design) < 2) return ['Leave at least two braziers on the floor.'];
  const start = startOf(design);
  if (start === goalOf(design)) return ['The start is the goal already: light or put out a brazier or two.'];
  const solution = solutionOf(design);
  if (!solution) return ['No touches take this start to the goal: change the start, or set it so many touches from the goal.'];
  if (design.limit > 0 && design.limit < solution.fewest) {
    return [`The limit is fewer than the ${solution.fewest} touches it takes at the least.`];
  }
  return [];
}

/**
 * What a player link holds: the floor, the start, the goal unless it's hidden, and the line for
 * solving it sealed with the goal. A hidden goal is a slow fingerprint.
 */
export async function toPuzzle(design: BraziersDesign): Promise<BraziersPuzzle> {
  const words = tidyWords(design.words);
  const floor = floorOf(design);
  const braziers = braziersOf(floor);
  const goal = goalOf(design);
  const key = keyOf(goal, braziers.length);
  const salt = newSalt();
  const aim = aimOf(design);
  return {
    v: 1,
    // The line for solving it is sealed with the goal, below, so only reaching it opens it.
    words: { ...words, success: '' },
    floor: { ...floor, bare: [...floor.bare] },
    start: cellsOf(startOf(design), braziers),
    aim,
    ...(aim === 'shown' ? { pattern: cellsOf(goal, braziers) } : {}),
    icon: design.icon,
    limit: design.limit,
    failLine: design.failLine.trim(),
    salt,
    ...(aim === 'hidden' ? { answer: await fingerprint(key, salt) } : {}),
    sealed: await seal(words.success || 'Solved.', key, salt),
  };
}

