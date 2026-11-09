/** What a player link holds for a cipher, read and checked on the players' side. */
import { fingerprint } from '../../kit/check';
import { isIconName } from '../../kit/icons';
import { readSealed, unseal, type Sealed } from '../../kit/seal';
import { readWords, type Words } from '../../kit/words';
import { METHODS, readsAlike, type Method, type Step } from './engine/cipher';
import { isLetter } from './engine/letters';
import { RUNES, SCRIPTS, type Script } from './engine/rings';

/** How the players' reading is checked: not at all, once every box is filled, or by an answer they give. */
export type Checking = 'none' | 'filled' | 'answer';

/** The longest message, in its own words. */
export const LONGEST_MESSAGE = 300;
/** The longest a message is in cipher: its letters in groups of five can run longer than it did. */
export const LONGEST_CIPHER = 400;
/** The longest a wrong answer's line is, and failing's. */
export const LONGEST_LINE = 200;

/**
 * A cipher as players get it: the message in cipher and the wheel's inner ring, with no key. The
 * message's letters A to Z stand for the inner ring's places, so `ring` says what's drawn for each;
 * everything else in it is shown as it is. A cryptogram's symbols are sorted, so their order says
 * nothing.
 */
export interface CipherPuzzle {
  v: 1;
  words: Words;
  script: Script;
  /** The inner ring's 26 symbols, from the place with the mark on, or a cryptogram's: letters, runes, or icon names. */
  ring: string[];
  text: string;
  /** How the key moves the wheel along the message, which the players' boxes follow, but not the key itself. */
  method: Method;
  /** When the wheel turns as it goes, after every letter or every word. */
  step?: Step;
  /** The outer letter the mark sits under when the players first see the wheel, from 0 for A. */
  start: number;
  check: Checking;
  /** Whether the page reads the message at the wheel's setting, or with a keyword the players give. */
  reading?: true;
  /** A cryptogram's letters given away: each a symbol's place then its letter ("QE": Q's symbol is E). */
  given?: string[];
  salt: string;
  /** A slow fingerprint of what's checked: the message's letters, or the answer's. */
  answer?: string;
  /** The line for solving it, sealed with what's checked. */
  sealed?: Sealed;
  /** What a wrong answer says, after how many the players fail (0 for never), and what failing says. */
  wrong?: string;
  failAfter?: number;
  failLine?: string;
}

const NO_WORDS: Words = { title: '', intro: '', success: '' };
const textIn = (value: unknown, longest: number): value is string => typeof value === 'string' && value.length <= longest;

/** Whether a symbol is one a ring in this script can have. */
const symbolFits: Record<Script, (symbol: string) => boolean> = {
  letters: isLetter,
  runes: (symbol) => RUNES.includes(symbol),
  pictures: isIconName,
};

/** A ring from a link: 26 symbols of the script, each once, or null. */
function ringIn(value: unknown, script: Script): string[] | null {
  if (!Array.isArray(value) || value.length !== 26) return null;
  const fits = value.every((symbol) => typeof symbol === 'string' && symbolFits[script](symbol));
  return fits && new Set(value).size === 26 ? (value as string[]) : null;
}

/** A cryptogram's letters given away, from a link: each a place and a letter, no place nor letter twice, or null. */
function givenIn(value: unknown): string[] | null {
  if (!Array.isArray(value) || value.length === 0 || value.length > 25) return null;
  if (!value.every((pair) => typeof pair === 'string' && /^[A-Z]{2}$/.test(pair))) return null;
  const pairs = value as string[];
  return new Set(pairs.map((pair) => pair[0])).size === pairs.length && new Set(pairs.map((pair) => pair[1])).size === pairs.length ? pairs : null;
}

/** A puzzle from a player link, checked, or null if the link doesn't hold one. */
export function readPuzzle(data: unknown): CipherPuzzle | null {
  if (!data || typeof data !== 'object' || Array.isArray(data)) return null;
  const input = data as Record<string, unknown>;
  const { script, text, method, step, start, check, reading, salt, answer, wrong, failAfter, failLine } = input;
  // Letters are given away only in a cryptogram, which has no wheel to read at.
  const given = input.given === undefined ? undefined : method === 'cryptogram' ? givenIn(input.given) : null;
  if (given === null || (method === 'cryptogram' && reading !== undefined)) return null;
  if (input.v !== 1 || !SCRIPTS.includes(script as Script)) return null;
  const ring = ringIn(input.ring, script as Script);
  // Letters A to Z are the ring's places, and there must be one; nothing in it may be a control character.
  if (!ring || !textIn(text, LONGEST_CIPHER) || !/[A-Z]/.test(text) || /[\u0000-\u001f\u007f]/.test(text)) return null;
  if (!METHODS.includes(method as Method)) return null;
  if (method === 'turning' ? step !== 'letter' && step !== 'word' : step !== undefined) return null;
  if (!Number.isInteger(start) || (start as number) < 0 || (start as number) > 25) return null;
  if (check !== 'none' && check !== 'filled' && check !== 'answer') return null;
  if (reading !== undefined && reading !== true) return null;
  if (!textIn(salt, 64) || salt === '') return null;
  const sealed = check === 'none' ? null : readSealed(input.sealed);
  if (check !== 'none' && (!textIn(answer, 64) || !sealed)) return null;
  if (check === 'answer') {
    if (!textIn(wrong, LONGEST_LINE) || !textIn(failLine, LONGEST_LINE)) return null;
    if (!Number.isInteger(failAfter) || (failAfter as number) < 0 || (failAfter as number) > 20) return null;
  }
  return {
    v: 1,
    words: readWords(input.words, NO_WORDS),
    script: script as Script,
    ring,
    text,
    method: method as Method,
    ...(method === 'turning' ? { step: step as Step } : {}),
    start: start as number,
    check,
    ...(reading ? { reading: true as const } : {}),
    ...(given ? { given } : {}),
    salt,
    ...(check !== 'none' ? { answer: answer as string, sealed: sealed! } : {}),
    ...(check === 'answer' ? { wrong: wrong as string, failAfter: failAfter as number, failLine: failLine as string } : {}),
  };
}

/** Whether some letters, run together, are what's checked: the message, or the answer. */
export const isAnswer = async (puzzle: CipherPuzzle, letters: string) => puzzle.answer !== undefined && (await fingerprint(letters, puzzle.salt)) === puzzle.answer;

/** The line for solving it, opened with what's checked. */
export const lineFor = async (puzzle: CipherPuzzle, letters: string) => (puzzle.sealed && (await unseal(puzzle.sealed, letters, puzzle.salt))) || 'Solved.';

/** Where the players are: the wheel's setting, the letters they've written, the answer's tries, and the keyword they've given for reading. */
export interface CipherProgress {
  /** How far the wheel's turned, as a count of letters, so it never spins the long way round. */
  turns: number;
  /** A letter, or '' for none, for each box: one for each symbol at one setting and in a cryptogram, or for each letter of the message. */
  written: string[];
  wrong: number;
  solved: boolean;
  failed: boolean;
  /** The keyword or starting word typed for the page to read with. */
  reading: string;
  /** The last answer given, so a solved puzzle's line opens again. */
  answer: string;
}

/** How many boxes a puzzle's letters are written in: one for each symbol where like symbols read alike, or one for each letter. */
export const slotsOf = (method: Method, text: string) => (readsAlike(method) ? 26 : text.replace(/[^A-Z]/g, '').length);

/** Progress from untrusted data, for this puzzle, or null if it isn't any. */
export function readProgress(puzzle: CipherPuzzle, data: unknown): CipherProgress | null {
  const input = data && typeof data === 'object' ? (data as Record<string, unknown>) : {};
  const { turns, written, wrong, reading, answer } = input;
  if (!Number.isInteger(turns) || Math.abs(turns as number) > 1e6) return null;
  if (!Array.isArray(written) || written.length !== slotsOf(puzzle.method, puzzle.text) || !written.every((letter) => letter === '' || isLetter(letter))) return null;
  if (!Number.isInteger(wrong) || (wrong as number) < 0) return null;
  return {
    turns: turns as number,
    written: written as string[],
    wrong: wrong as number,
    solved: input.solved === true,
    failed: input.failed === true,
    reading: textIn(reading, 40) ? reading : '',
    answer: textIn(answer, 40) ? answer : '',
  };
}
