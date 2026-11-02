/** What a player link holds for a trapped floor, read and checked on the players' side. */
import { isIconName } from '../../kit/icons';
import { readWords, type Words } from '../../kit/words';
import type { Moves, OnTrap, TrapKind } from './design';
import { areaIn, type Area } from './engine/floor';
import { unmaskValues } from './engine/mask';

export interface FloorPuzzle {
  v: 1;
  words: Words;
  width: number;
  height: number;
  start: Area;
  goal: Area;
  /** Each square's count, or its trap's kind, masked with the salt. */
  cells: string;
  kinds: TrapKind[];
  onTrap: OnTrap;
  failAfter: number;
  failLine: string;
  moves: Moves;
  salt: string;
}

const NO_WORDS: Words = { title: '', intro: '', success: '' };
const BAD: Area = { cell: -1 };

/** A puzzle from a player link, checked, or null if the link doesn't hold one. */
export function readPuzzle(data: unknown): FloorPuzzle | null {
  if (!data || typeof data !== 'object' || Array.isArray(data)) return null;
  const input = data as Record<string, unknown>;
  const { width, height, cells, kinds, onTrap, failAfter, failLine, moves, salt } = input;
  if (input.v !== 1) return null;
  const size = (value: unknown): value is number => Number.isInteger(value) && (value as number) >= 3 && (value as number) <= 20;
  if (!size(width) || !size(height) || typeof cells !== 'string' || cells.length > 600) return null;
  const start = areaIn(input.start, width * height, BAD);
  const goal = areaIn(input.goal, width * height, BAD);
  if (start === BAD || goal === BAD) return null;
  if (!Array.isArray(kinds) || kinds.length === 0 || kinds.length > 6) return null;
  const trapKinds = kinds.map((kind) => (kind && typeof kind === 'object' ? (kind as Record<string, unknown>) : {}));
  if (!trapKinds.every((kind) => (kind.icon === '' || isIconName(kind.icon)) && typeof kind.line === 'string' && kind.line.length <= 200)) return null;
  if (onTrap !== 'carry-on' && onTrap !== 'restart' && onTrap !== 'fail') return null;
  if (!Number.isInteger(failAfter) || (failAfter as number) < 1 || (failAfter as number) > 20) return null;
  if (moves !== 'spread' && moves !== 'single') return null;
  if (typeof salt !== 'string' || !/^[\w-]{1,64}$/.test(salt)) return null;
  return {
    v: 1,
    words: readWords(input.words, NO_WORDS),
    width,
    height,
    start,
    goal,
    cells,
    kinds: trapKinds.map((kind) => ({ icon: kind.icon as string, line: kind.line as string })),
    onTrap,
    failAfter: failAfter as number,
    failLine: typeof failLine === 'string' && failLine.length <= 200 ? failLine : '',
    moves,
    salt,
  };
}

/** The floor's values, unmasked, or null if the link's squares don't make a floor of its size and kinds. */
export async function valuesIn(puzzle: FloorPuzzle): Promise<number[] | null> {
  const values = await unmaskValues(puzzle.cells, puzzle.salt, puzzle.width * puzzle.height);
  return values && values.every((value) => value < 9 + puzzle.kinds.length) ? values : null;
}

/** A party's progress: where they've stood, the squares they've marked, the traps they've sprung, and where their token is. */
export interface FloorProgress {
  stepped: number[];
  marks: number[];
  sprung: number[];
  at: number;
}

/** Progress from untrusted data, for this puzzle, or null if it isn't any. */
export function readProgress(puzzle: FloorPuzzle, data: unknown): FloorProgress | null {
  const input = data && typeof data === 'object' ? (data as Record<string, unknown>) : {};
  const squares = puzzle.width * puzzle.height;
  const cell = (value: unknown): value is number => Number.isInteger(value) && (value as number) >= 0 && (value as number) < squares;
  const list = (value: unknown): value is number[] => Array.isArray(value) && value.length <= squares * 2 && value.every(cell);
  const { stepped, marks, sprung, at } = input;
  return list(stepped) && list(marks) && list(sprung) && cell(at) ? { stepped, marks, sprung, at } : null;
}
