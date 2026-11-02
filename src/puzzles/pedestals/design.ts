/** Pedestals as the game master makes them, answer and all, and what their player link holds. */
import { fingerprint, newSalt, quickFingerprint } from '../../kit/check';
import { mulberry32, randomSeed } from '../../kit/rng';
import { seal } from '../../kit/seal';
import { readWords, tidyWords, type Words } from '../../kit/words';
import { scatter } from './engine/placing';
import { isBlank, LONGEST_OBJECT, LONGEST_RIDDLE, placeKey, sameThing, thingIn, tidyThing, wholeKey, type Thing } from './engine/things';
import { judgesEach, LONGEST_LINE, MOST_OTHERS, MOST_PEDESTALS, type Checking, type PedestalsPuzzle, type Telling } from './puzzle';

/** A pedestal: its riddle, and the one object that's right for it. */
export interface Pedestal {
  riddle: Thing;
  object: Thing;
}

/** The choices for failing: never (0), or after so many wrong. */
export const FAIL_AFTER: readonly number[] = [0, 1, 2, 3, 5];

export interface PedestalsDesign {
  v: 1;
  words: Words;
  pedestals: Pedestal[];
  /** Objects right for no pedestal, that only look as if they might be. Blank ones are left out. */
  others: Thing[];
  /** The seed for the objects' places on the floor. */
  seed: number;
  check: Checking;
  /** What a wrong check tells the players, when checking on asking. */
  tell: Telling;
  /** What a wrong placing or check says: the trap it sets off, say. */
  wrongLine: string;
  /** After how many wrong placings or checks the players fail: 0 for never. Never when all are checked at once. */
  failAfter: number;
  failLine: string;
}

export const NEW_WORDS: Words = { title: '', intro: '', success: 'The pedestals sink, and the way opens.' };

const blank = (): Thing => ({ text: '' });
const blankPedestal = (): Pedestal => ({ riddle: blank(), object: blank() });

export function newDesign(): PedestalsDesign {
  return {
    v: 1,
    words: NEW_WORDS,
    pedestals: [blankPedestal(), blankPedestal(), blankPedestal()],
    others: [blank(), blank(), blank()],
    seed: randomSeed(),
    check: 'all',
    tell: 'wrong',
    wrongLine: '',
    failAfter: 0,
    failLine: 'The pedestals sink into the floor, and the chance is gone.',
  };
}

const lineIn = (value: unknown, fallback: string) => (typeof value === 'string' ? value.slice(0, LONGEST_LINE) : fallback);

/** A design from untrusted data, each field checked, with a new design's for any that's missing or malformed. */
export function readDesign(data: unknown): PedestalsDesign | null {
  if (!data || typeof data !== 'object' || Array.isArray(data)) return null;
  const input = data as Record<string, unknown>;
  if (input.v !== 1) return null;
  const fresh = newDesign();
  const pedestals = (Array.isArray(input.pedestals) ? input.pedestals : []).slice(0, MOST_PEDESTALS).map((each): Pedestal => {
    const pedestal = each && typeof each === 'object' ? (each as Record<string, unknown>) : {};
    return { riddle: thingIn(pedestal.riddle, LONGEST_RIDDLE), object: thingIn(pedestal.object, LONGEST_OBJECT) };
  });
  const others = (Array.isArray(input.others) ? input.others : []).slice(0, MOST_OTHERS).map((each) => thingIn(each, LONGEST_OBJECT));
  return {
    v: 1,
    words: readWords(input.words, NEW_WORDS),
    pedestals: pedestals.length > 0 ? pedestals : fresh.pedestals,
    others,
    seed: Number.isInteger(input.seed) && (input.seed as number) >= 0 && (input.seed as number) < 2 ** 32 ? (input.seed as number) : 1,
    check: input.check === 'placed' || input.check === 'asked' ? input.check : 'all',
    tell: input.tell === 'count' || input.tell === 'which' ? input.tell : 'wrong',
    wrongLine: lineIn(input.wrongLine, ''),
    failAfter: FAIL_AFTER.includes(input.failAfter as number) ? (input.failAfter as number) : 0,
    failLine: lineIn(input.failLine, fresh.failLine),
  };
}

/** Every object, the pedestals' first in order, then the others that aren't blank. */
export const objectsOf = (design: PedestalsDesign): Thing[] => [...design.pedestals.map((pedestal) => pedestal.object), ...design.others.filter((other) => !isBlank(other))];

/** The objects as they lie on the floor: scattered from the seed. */
export function floorOf(design: PedestalsDesign): Thing[] {
  const objects = objectsOf(design);
  return scatter(objects.length, mulberry32(design.seed)).map((object) => objects[object]);
}

/** After how many wrong the players fail: never when all are checked at once, as nothing's ever wrong. */
export const failAfterOf = (design: PedestalsDesign) => (design.check === 'all' ? 0 : design.failAfter);

export function problemsOf(design: PedestalsDesign): string[] {
  const problems: string[] = [];
  if (design.pedestals.some((pedestal) => isBlank(pedestal.riddle) || isBlank(pedestal.object))) {
    problems.push('Give every pedestal a riddle and its object, in words or a picture.');
  }
  if (design.others.some((other) => !isBlank(other) && design.pedestals.some((pedestal) => sameThing(other, pedestal.object)))) {
    problems.push('An other object is the same as a pedestal’s, so it would be right too. Change it, or take it away.');
  }
  return problems;
}

/**
 * What a player link holds: the riddles, the objects as they lie on the floor, a slow fingerprint
 * of the answer, and the line for solving it sealed with it. Judging pedestals one at a time adds
 * a quick fingerprint of each pedestal with its object.
 */
export async function toPuzzle(design: PedestalsDesign): Promise<PedestalsPuzzle> {
  const words = tidyWords(design.words);
  const right = design.pedestals.map((pedestal) => pedestal.object);
  const salt = newSalt();
  const tell = design.check === 'asked' ? design.tell : undefined;
  return {
    v: 1,
    // The line for solving it is sealed with the answer, below, so only solving it opens it.
    words: { ...words, success: '' },
    riddles: design.pedestals.map((pedestal) => tidyThing(pedestal.riddle)),
    objects: floorOf(design).map(tidyThing),
    check: design.check,
    ...(tell ? { tell } : {}),
    salt,
    answer: await fingerprint(wholeKey(right), salt),
    // Sorted, so their order says nothing.
    ...(judgesEach(design.check, tell) ? { places: (await Promise.all(right.map((thing, pedestal) => quickFingerprint(placeKey(pedestal, thing), salt)))).sort() } : {}),
    sealed: await seal(words.success || 'Solved.', wholeKey(right), salt),
    wrong: design.wrongLine.trim(),
    failAfter: failAfterOf(design),
    failLine: design.failLine.trim(),
  };
}
