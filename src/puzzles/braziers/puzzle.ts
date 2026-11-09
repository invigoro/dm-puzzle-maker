/** What a player link holds for the braziers, read and checked on the players' side. */
import { fingerprint } from '../../kit/check';
import { isIconName } from '../../kit/icons';
import { readSealed, unseal, type Sealed } from '../../kit/seal';
import { readWords, type Words } from '../../kit/words';
import { allOf, braziersOf, cellCount, FEWEST_ROUND, keyOf, LARGEST_SIDE, maskOf, MOST_ROUND, REACHES, SMALLEST_SIDE, type Floor, type Reach } from './engine/floor';

/** What the players must reach: every brazier out, or burning, or a pattern that's shown them, or one they must learn in the game. */
export type Aim = 'out' | 'lit' | 'shown' | 'hidden';

/** The longest failing's line is. */
export const LONGEST_LINE = 200;
/** The most touches a limit can allow. */
export const MOST_TOUCHES = 999;

/** A floor of braziers as players get it: the floor, the start, and the goal, unless it's hidden. */
export interface BraziersPuzzle {
  v: 1;
  words: Words;
  floor: Floor;
  /** The cells burning at the start. */
  start: number[];
  aim: Aim;
  /** The cells burning in a pattern that's shown. */
  pattern?: number[];
  /** The picture each brazier has. */
  icon: string;
  /** After how many touches the players fail: 0 for never. */
  limit: number;
  failLine: string;
  salt: string;
  /** A hidden goal's slow fingerprint. */
  answer?: string;
  /** The line for solving it, sealed with the goal. */
  sealed: Sealed;
}

const NO_WORDS: Words = { title: '', intro: '', success: '' };
const sideIn = (value: unknown) => Number.isInteger(value) && (value as number) >= SMALLEST_SIDE && (value as number) <= LARGEST_SIDE;

/** A floor from untrusted data, or null: a grid of 3 to 8 a side with at least two braziers, or a ring of 5 to 16. */
export function floorIn(data: unknown): Floor | null {
  const input = data && typeof data === 'object' ? (data as Record<string, unknown>) : {};
  const { shape, width, height, bare, count, reach } = input;
  if (shape === 'ring') {
    if (!Number.isInteger(count) || (count as number) < FEWEST_ROUND || (count as number) > MOST_ROUND) return null;
    return { shape, width: 0, height: 0, bare: [], count: count as number, reach: 'beside' };
  }
  if (shape !== 'grid' || !sideIn(width) || !sideIn(height) || !REACHES.includes(reach as Reach)) return null;
  const cells = (width as number) * (height as number);
  if (!cellsIn(bare, cells)) return null;
  const floor: Floor = { shape, width: width as number, height: height as number, bare: bare as number[], count: 0, reach: reach as Reach };
  return braziersOf(floor).length >= 2 ? floor : null;
}

/** Whether some data is a list of cells, each once, all on a floor of so many. */
function cellsIn(value: unknown, cells: number): value is number[] {
  return Array.isArray(value) && value.length <= cells && value.every((cell) => Number.isInteger(cell) && cell >= 0 && cell < cells) && new Set(value).size === value.length;
}

/** A puzzle from a player link, checked, or null if the link doesn't hold one. */
export function readPuzzle(data: unknown): BraziersPuzzle | null {
  if (!data || typeof data !== 'object' || Array.isArray(data)) return null;
  const input = data as Record<string, unknown>;
  const { start, aim, pattern, icon, limit, failLine, salt, answer } = input;
  if (input.v !== 1) return null;
  const floor = floorIn(input.floor);
  if (!floor) return null;
  const braziers = new Set(braziersOf(floor));
  const onFloor = (value: unknown): value is number[] => cellsIn(value, cellCount(floor)) && value.every((cell) => braziers.has(cell));
  if (!onFloor(start)) return null;
  if (aim !== 'out' && aim !== 'lit' && aim !== 'shown' && aim !== 'hidden') return null;
  if (aim === 'shown' ? !onFloor(pattern) : pattern !== undefined) return null;
  if (aim === 'hidden' ? typeof answer !== 'string' || answer.length > 64 : answer !== undefined) return null;
  if (!isIconName(icon)) return null;
  if (!Number.isInteger(limit) || (limit as number) < 0 || (limit as number) > MOST_TOUCHES) return null;
  if (typeof failLine !== 'string' || failLine.length > LONGEST_LINE) return null;
  if (typeof salt !== 'string' || salt === '' || salt.length > 64) return null;
  const sealed = readSealed(input.sealed);
  if (!sealed) return null;
  return {
    v: 1,
    words: readWords(input.words, NO_WORDS),
    floor,
    start,
    aim,
    ...(aim === 'shown' ? { pattern: pattern as number[] } : {}),
    icon,
    limit: limit as number,
    failLine,
    salt,
    ...(aim === 'hidden' ? { answer: answer as string } : {}),
    sealed,
  };
}

/** The goal as a mask, when the players can see it: every brazier out or burning, or the pattern shown. A hidden one isn't known. */
export function goalOf(puzzle: BraziersPuzzle): bigint | null {
  const braziers = braziersOf(puzzle.floor);
  if (puzzle.aim === 'out') return 0n;
  if (puzzle.aim === 'lit') return allOf(braziers.length);
  if (puzzle.aim === 'shown') return maskOf(puzzle.pattern!, braziers);
  return null;
}

/** Whether the floor's braziers, as a mask, are the goal: compared, or by the fingerprint when the goal is hidden. */
export async function isGoal(puzzle: BraziersPuzzle, lit: bigint): Promise<boolean> {
  const goal = goalOf(puzzle);
  if (goal !== null) return lit === goal;
  return (await fingerprint(keyOf(lit, braziersOf(puzzle.floor).length), puzzle.salt)) === puzzle.answer;
}

/** The line for solving it, opened with the goal. */
export const lineFor = async (puzzle: BraziersPuzzle, lit: bigint) => (await unseal(puzzle.sealed, keyOf(lit, braziersOf(puzzle.floor).length), puzzle.salt)) ?? 'Solved.';

/** Which braziers burn, how many touches there have been, the touches to undo, and whether it's solved or failed, as the browser keeps them. */
export interface BraziersProgress {
  /** The cells burning. */
  lit: number[];
  count: number;
  /** The cells touched, in order, for Undo. */
  touched: number[];
  solved: boolean;
  failed: boolean;
}

/** Progress from untrusted data, for this puzzle, or null if it isn't any. */
export function readProgress(puzzle: BraziersPuzzle, data: unknown): BraziersProgress | null {
  const input = data && typeof data === 'object' ? (data as Record<string, unknown>) : {};
  const { lit, count, touched } = input;
  const braziers = new Set(braziersOf(puzzle.floor));
  if (!cellsIn(lit, cellCount(puzzle.floor)) || !lit.every((cell) => braziers.has(cell))) return null;
  if (!Number.isInteger(count) || (count as number) < 0) return null;
  if (!Array.isArray(touched) || touched.length > 10_000 || !touched.every((cell) => braziers.has(cell))) return null;
  return { lit, count: count as number, touched: touched as number[], solved: input.solved === true, failed: input.failed === true };
}
