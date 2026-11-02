/** What a player link holds for a word guess, read and checked on the players' side. */
import { fingerprint, quickFingerprint } from '../../kit/check';
import { readSealed, unseal, type Sealed } from '../../kit/seal';
import { readWords, type Words } from '../../kit/words';
import { markBy, type Mark } from './engine/marking';

export interface GuessPuzzle {
  v: 1;
  words: Words;
  /** The lengths of the words the players see. */
  shape: number[];
  /** The answer's letters, shuffled, when the players arrange tiles. */
  tiles?: string;
  /** How many tries they have: 0 for as many as they like. */
  tries: number;
  salt: string;
  /** A slow fingerprint of the answer's letters. */
  answer: string;
  /** For marking letter by letter: quick fingerprints of each letter in its place, and of each letter's count. */
  marks?: { places: string[]; counts: string[] };
  /** The letters hints may give, in order: a place, and its letter. */
  hints: [number, string][];
  /** The line for solving it, sealed with the answer. */
  sealed: Sealed;
  /** The line for running out of tries. */
  out: string;
}

const NO_WORDS: Words = { title: '', intro: '', success: '' };
const LONGEST = 30;

const textIn = (value: unknown, longest: number): value is string => typeof value === 'string' && value.length <= longest;
const prints = (value: unknown, most: number): value is string[] =>
  Array.isArray(value) && value.length <= most && value.every((print) => textIn(print, 64));

/** A puzzle from a player link, checked, or null if the link doesn't hold one. */
export function readPuzzle(data: unknown): GuessPuzzle | null {
  if (!data || typeof data !== 'object' || Array.isArray(data)) return null;
  const input = data as Record<string, unknown>;
  const { shape, tiles, tries, salt, answer, marks, hints, out } = input;
  if (input.v !== 1) return null;
  if (!Array.isArray(shape) || shape.length === 0 || !shape.every((length) => Number.isInteger(length) && length > 0)) return null;
  const total = (shape as number[]).reduce((sum, length) => sum + length, 0);
  if (total < 2 || total > LONGEST) return null;
  if (tiles !== undefined && !(typeof tiles === 'string' && tiles.length === total && /^[A-Z]+$/.test(tiles))) return null;
  if (!Number.isInteger(tries) || (tries as number) < 0 || (tries as number) > 100) return null;
  if (!textIn(salt, 64) || salt === '' || !textIn(answer, 64)) return null;
  const marked = marks && typeof marks === 'object' ? (marks as Record<string, unknown>) : null;
  if (marks !== undefined && !(marked && prints(marked.places, total) && prints(marked.counts, total))) return null;
  if (!Array.isArray(hints) || hints.length >= total) return null;
  const hinted = hints.every(
    (hint) => Array.isArray(hint) && Number.isInteger(hint[0]) && hint[0] >= 0 && hint[0] < total && typeof hint[1] === 'string' && /^[A-Z]$/.test(hint[1]),
  );
  const sealed = readSealed(input.sealed);
  if (!hinted || !sealed) return null;
  return {
    v: 1,
    words: readWords(input.words, NO_WORDS),
    shape: shape as number[],
    ...(typeof tiles === 'string' ? { tiles } : {}),
    tries: tries as number,
    salt,
    answer,
    ...(marked ? { marks: { places: marked.places as string[], counts: marked.counts as string[] } } : {}),
    hints: hints as [number, string][],
    sealed,
    out: textIn(out, 200) ? out : '',
  };
}

/** How many letters a try has. */
export const lengthOf = (puzzle: GuessPuzzle) => puzzle.shape.reduce((sum, length) => sum + length, 0);

export interface Checked {
  right: boolean;
  /** Each letter's mark, when the puzzle marks letter by letter. */
  marks: Mark[] | null;
}

/** A try checked against the puzzle's fingerprints. */
export async function check(puzzle: GuessPuzzle, guess: string): Promise<Checked> {
  const right = (await fingerprint(guess, puzzle.salt)) === puzzle.answer;
  if (right) return { right, marks: [...guess].map(() => 'right') };
  if (!puzzle.marks) return { right, marks: null };
  const places = new Set(puzzle.marks.places);
  const counts = new Set(puzzle.marks.counts);
  const rightAt = await Promise.all([...guess].map(async (letter, at) => places.has(await quickFingerprint(`${at}:${letter}`, puzzle.salt))));
  const found = new Map<string, number>();
  for (const letter of new Set(guess)) {
    let count = 0;
    for (let n = 1; n <= guess.length && count === 0; n++) {
      if (counts.has(await quickFingerprint(`${letter}:${n}`, puzzle.salt))) count = n;
    }
    found.set(letter, count);
  }
  return { right, marks: markBy(guess, rightAt, (letter) => found.get(letter) ?? 0) };
}

/** The line for solving it, opened with the right answer. */
export const lineFor = async (puzzle: GuessPuzzle, guess: string) => (await unseal(puzzle.sealed, guess, puzzle.salt)) ?? 'Solved.';

/** A player's tries, and how many hints they've taken, as the browser keeps them. */
export interface GuessProgress {
  tries: string[];
  hints: number;
}

/** Progress from untrusted data, for this puzzle, or null if it isn't any. */
export function readProgress(puzzle: GuessPuzzle, data: unknown): GuessProgress | null {
  const input = data && typeof data === 'object' ? (data as Record<string, unknown>) : {};
  const { tries, hints } = input;
  const length = lengthOf(puzzle);
  if (!Array.isArray(tries) || !tries.every((guess) => typeof guess === 'string' && guess.length === length && /^[A-Z]+$/.test(guess))) return null;
  if (puzzle.tries > 0 && tries.length > puzzle.tries) return null;
  if (!Number.isInteger(hints) || (hints as number) < 0 || (hints as number) > puzzle.hints.length) return null;
  return { tries: tries as string[], hints: hints as number };
}
