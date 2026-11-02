/** What a player link holds for the pedestals, read and checked on the players' side. */
import { fingerprint, quickFingerprint } from '../../kit/check';
import { readSealed, unseal, type Sealed } from '../../kit/seal';
import { readWords, type Words } from '../../kit/words';
import { readPlaced, type Placed } from './engine/placing';
import { LONGEST_OBJECT, LONGEST_RIDDLE, placeKey, thingIn, wholeKey, type Thing } from './engine/things';

/** When the answer is checked: once all are right, as each object is placed, or when the players ask. */
export type Checking = 'all' | 'placed' | 'asked';
/** What a wrong check tells the players, besides that it's wrong: nothing, how many are right, or which. */
export type Telling = 'wrong' | 'count' | 'which';

export const MOST_PEDESTALS = 8;
export const MOST_OTHERS = 12;
/** The longest a wrong placing's or check's line is, and failing's. */
export const LONGEST_LINE = 200;

/**
 * A puzzle as players get it: each pedestal's riddle, in order, and every object, scattered, with
 * nothing to say which are right or where they go. The answer is checked by fingerprints.
 */
export interface PedestalsPuzzle {
  v: 1;
  words: Words;
  riddles: Thing[];
  objects: Thing[];
  check: Checking;
  /** What a wrong check tells them, when checking on asking. */
  tell?: Telling;
  salt: string;
  /** A slow fingerprint of the whole answer. */
  answer: string;
  /** Quick fingerprints of each pedestal with its object, sorted: only when checking judges pedestals one at a time. */
  places?: string[];
  /** The line for solving it, sealed with the answer. */
  sealed: Sealed;
  /** What a wrong placing or check says. */
  wrong: string;
  /** After how many wrong placings or checks the players fail: 0 for never. */
  failAfter: number;
  failLine: string;
}

/** Whether checking judges pedestals one at a time, so needs a fingerprint of each. */
export const judgesEach = (check: Checking, tell: Telling | undefined) => check === 'placed' || (check === 'asked' && tell !== undefined && tell !== 'wrong');

const NO_WORDS: Words = { title: '', intro: '', success: '' };
const textIn = (value: unknown, longest: number): value is string => typeof value === 'string' && value.length <= longest;

/** Things from a link, each sound and with words or a picture, or null. */
function thingsIn(value: unknown, most: number, longest: number): Thing[] | null {
  if (!Array.isArray(value) || value.length === 0 || value.length > most) return null;
  const things = value.map((each) => thingIn(each, longest));
  const sound = value.every((each, i) => {
    const input = each && typeof each === 'object' ? (each as Record<string, unknown>) : {};
    return textIn(input.text, longest) && (input.icon === undefined || input.icon === things[i].icon) && (things[i].text.trim() !== '' || things[i].icon);
  });
  return sound ? things : null;
}

/** A puzzle from a player link, checked, or null if the link doesn't hold one. */
export function readPuzzle(data: unknown): PedestalsPuzzle | null {
  if (!data || typeof data !== 'object' || Array.isArray(data)) return null;
  const input = data as Record<string, unknown>;
  const { check, tell, salt, answer, places, wrong, failAfter, failLine } = input;
  if (input.v !== 1) return null;
  const riddles = thingsIn(input.riddles, MOST_PEDESTALS, LONGEST_RIDDLE);
  const objects = thingsIn(input.objects, MOST_PEDESTALS + MOST_OTHERS, LONGEST_OBJECT);
  if (!riddles || !objects || objects.length < riddles.length) return null;
  if (check !== 'all' && check !== 'placed' && check !== 'asked') return null;
  if (tell !== undefined && tell !== 'wrong' && tell !== 'count' && tell !== 'which') return null;
  if (!textIn(salt, 64) || salt === '' || !textIn(answer, 64)) return null;
  if (places !== undefined && !(Array.isArray(places) && places.length === riddles.length && places.every((each) => textIn(each, 64)))) return null;
  if (judgesEach(check, tell) && places === undefined) return null;
  const sealed = readSealed(input.sealed);
  if (!sealed || !textIn(wrong, LONGEST_LINE) || !textIn(failLine, LONGEST_LINE)) return null;
  if (!Number.isInteger(failAfter) || (failAfter as number) < 0 || (failAfter as number) > 20) return null;
  return {
    v: 1,
    words: readWords(input.words, NO_WORDS),
    riddles,
    objects,
    check,
    ...(tell !== undefined ? { tell } : {}),
    salt,
    answer,
    ...(places ? { places: places as string[] } : {}),
    sealed,
    wrong,
    failAfter: failAfter as number,
    failLine,
  };
}

/** Whether these objects, one on each pedestal in order, are the answer. */
export const isAnswer = async (puzzle: PedestalsPuzzle, things: readonly Thing[]) => (await fingerprint(wholeKey(things), puzzle.salt)) === puzzle.answer;

/** Whether an object is the right one for a pedestal, when the link can say so. */
export async function isRightAt(puzzle: PedestalsPuzzle, pedestal: number, thing: Thing): Promise<boolean> {
  return puzzle.places?.includes(await quickFingerprint(placeKey(pedestal, thing), puzzle.salt)) ?? false;
}

/** The line for solving it, opened with the answer. */
export const lineFor = async (puzzle: PedestalsPuzzle, things: readonly Thing[]) => (await unseal(puzzle.sealed, wholeKey(things), puzzle.salt)) ?? 'Solved.';

/** What's on each pedestal, how many placings or checks were wrong, and whether it's solved or failed, as the browser keeps them. */
export interface PedestalsProgress {
  placed: Placed;
  wrong: number;
  solved: boolean;
  failed: boolean;
}

/** Progress from untrusted data, for this puzzle, or null if it isn't any. */
export function readProgress(puzzle: PedestalsPuzzle, data: unknown): PedestalsProgress | null {
  const input = data && typeof data === 'object' ? (data as Record<string, unknown>) : {};
  const placed = readPlaced(input.placed, puzzle.riddles.length, puzzle.objects.length);
  const { wrong } = input;
  if (!placed || !Number.isInteger(wrong) || (wrong as number) < 0) return null;
  return { placed, wrong: wrong as number, solved: input.solved === true, failed: input.failed === true };
}
