/** A trapped floor as the game master makes it, traps and all, and what its player link holds. */
import { newSalt } from '../../kit/check';
import { isIconName } from '../../kit/icons';
import { mulberry32, randomSeed } from '../../kit/rng';
import { readWords, tidyWords, type Words } from '../../kit/words';
import { areaIn, squareCount, squaresOf, valuesOf, type Area, type Room } from './engine/floor';
import { maskValues } from './engine/mask';
import { fairTraps, isFair, keptClear, kindsFor, mostTraps, passable, placeTraps } from './engine/place';
import type { FloorPuzzle } from './puzzle';

/** What springing a trap does: the party carries on, goes back to the start, or fails after so many. */
export type OnTrap = 'carry-on' | 'restart' | 'fail';
/** How the party moves: onto any square beside one they've stood on, or only beside where they stand. */
export type Moves = 'spread' | 'single';

export interface TrapKind {
  icon: string;
  /** What springing it does, said to the players. */
  line: string;
}

export const SMALLEST = 3;
export const LARGEST = 20;
export const MOST_KINDS = 6;

export const DEFAULT_KINDS: TrapKind[] = [
  { icon: 'spiky-pit', line: 'A pit opens: DC 13 Dexterity save, or fall onto spikes (2d6 piercing).' },
  { icon: 'dart', line: 'Darts from the walls: 1d4 piercing, DC 12 Dexterity save for half.' },
  { icon: 'flame', line: 'A jet of fire: 2d6 fire, DC 13 Dexterity save for half.' },
];

export interface FloorDesign {
  v: 1;
  words: Words;
  width: number;
  height: number;
  start: Area;
  goal: Area;
  /** How many traps, when they're placed at random. */
  traps: number;
  seed: number;
  /** Whether the floor must be crossable by reasoning, never by luck. */
  fair: boolean;
  /** Traps placed by hand, by square, in place of the random ones. */
  placed: number[] | null;
  kinds: TrapKind[];
  onTrap: OnTrap;
  /** How many traps, sprung, fail the party, when that's what springing them does. */
  failAfter: number;
  failLine: string;
  moves: Moves;
}

export const NEW_WORDS: Words = { title: '', intro: '', success: 'The far side, and solid ground.' };

export function newDesign(): FloorDesign {
  return {
    v: 1,
    words: NEW_WORDS,
    width: 8,
    height: 10,
    start: { side: 'bottom' },
    goal: { side: 'top' },
    traps: 12,
    seed: randomSeed(),
    fair: true,
    placed: null,
    kinds: DEFAULT_KINDS,
    onTrap: 'carry-on',
    failAfter: 3,
    failLine: 'One trap too many: the party falls back, bloodied.',
    moves: 'spread',
  };
}

const sizeIn = (value: unknown, fallback: number) => (Number.isInteger(value) && (value as number) >= SMALLEST && (value as number) <= LARGEST ? (value as number) : fallback);
const textIn = (value: unknown, longest: number, fallback: string) => (typeof value === 'string' && value.length <= longest ? value : fallback);

/** A design from untrusted data, each field checked, with a new design's for any that's missing or malformed. */
export function readDesign(data: unknown): FloorDesign | null {
  if (!data || typeof data !== 'object' || Array.isArray(data)) return null;
  const input = data as Record<string, unknown>;
  if (input.v !== 1) return null;
  const fresh = newDesign();
  const width = sizeIn(input.width, fresh.width);
  const height = sizeIn(input.height, fresh.height);
  const squares = width * height;
  const kinds = (Array.isArray(input.kinds) ? input.kinds : [])
    .map((kind) => (kind && typeof kind === 'object' ? (kind as Record<string, unknown>) : {}))
    .map((kind) => ({ icon: isIconName(kind.icon) ? kind.icon : '', line: textIn(kind.line, 200, '') }))
    .slice(0, MOST_KINDS);
  const placed = Array.isArray(input.placed)
    ? [...new Set(input.placed.filter((cell): cell is number => Number.isInteger(cell) && cell >= 0 && cell < squares))]
    : null;
  return {
    v: 1,
    words: readWords(input.words, NEW_WORDS),
    width,
    height,
    start: areaIn(input.start, squares, fresh.start),
    goal: areaIn(input.goal, squares, fresh.goal),
    traps: Number.isInteger(input.traps) && (input.traps as number) >= 0 && (input.traps as number) <= squares ? (input.traps as number) : fresh.traps,
    seed: Number.isInteger(input.seed) && (input.seed as number) >= 0 && (input.seed as number) < 2 ** 32 ? (input.seed as number) : 1,
    fair: input.fair !== false,
    placed,
    kinds: kinds.length > 0 ? kinds : DEFAULT_KINDS,
    onTrap: input.onTrap === 'restart' || input.onTrap === 'fail' ? input.onTrap : 'carry-on',
    failAfter: Number.isInteger(input.failAfter) && (input.failAfter as number) >= 1 && (input.failAfter as number) <= 20 ? (input.failAfter as number) : fresh.failAfter,
    failLine: textIn(input.failLine, 200, fresh.failLine),
    moves: input.moves === 'single' ? 'single' : 'spread',
  };
}

export const roomOf = (design: FloorDesign): Room => ({ width: design.width, height: design.height });

export interface Floor {
  traps: boolean[];
  /** Each trap's kind, by its number among the design's kinds. */
  kinds: number[];
  /** What stepping on each square shows. */
  values: number[];
  /** Whether a party can cross it by reasoning alone. */
  fair: boolean;
}

/** The last few floors made: a fair one can take hundreds of tries, and the maker asks for it often. */
const made = new Map<string, Floor>();

/** The design's floor: traps placed by hand, or at random from the seed, fair ones if the game master asks. */
export function floorOf(design: FloorDesign): Floor {
  const key = JSON.stringify([design.width, design.height, design.start, design.goal, design.traps, design.seed, design.fair, design.placed, design.kinds.length]);
  const found = made.get(key) ?? makeFloor(design);
  made.delete(key);
  made.set(key, found);
  if (made.size > 8) made.delete(made.keys().next().value!);
  return found;
}

function makeFloor(design: FloorDesign): Floor {
  const room = roomOf(design);
  const { start, goal } = design;
  const count = Math.min(design.traps, mostTraps(room, start, goal));
  let traps: boolean[];
  if (design.placed) {
    const clear = keptClear(room, start, goal);
    const placed = new Set(design.placed);
    traps = Array.from({ length: squareCount(room) }, (_, cell) => placed.has(cell) && !clear.has(cell));
  } else {
    traps = (design.fair && fairTraps(room, count, start, goal, mulberry32(design.seed))) || placeTraps(room, count, start, goal, mulberry32(design.seed));
  }
  const kinds = kindsFor(traps, design.kinds.length, mulberry32(design.seed ^ 0x5eed));
  return { traps, kinds, values: valuesOf(room, traps, kinds), fair: isFair(room, traps, start, goal) };
}

/** Whether the start and the goal share a square. */
export function overlap(design: FloorDesign): boolean {
  const room = roomOf(design);
  const goal = new Set(squaresOf(room, design.goal));
  return squaresOf(room, design.start).some((cell) => goal.has(cell));
}

export function problemsOf(design: FloorDesign, floor = floorOf(design)): string[] {
  if (overlap(design)) return ['The start and the goal can’t share a square.'];
  if (!passable(roomOf(design), floor.traps, design.start, design.goal)) return ['The goal can’t be reached without stepping on a trap.'];
  if (design.fair && !floor.fair) {
    return [
      design.placed
        ? 'Somewhere on this floor the party would have to guess. Move a trap, or let it be unfair.'
        : 'No fair floor turned up with so many traps. Try fewer, or let it be unfair.',
    ];
  }
  return [];
}

/** What a player link holds: the room, where they start and are going, and every square masked. */
export async function toPuzzle(design: FloorDesign): Promise<FloorPuzzle> {
  const salt = newSalt();
  return {
    v: 1,
    words: tidyWords(design.words),
    width: design.width,
    height: design.height,
    start: design.start,
    goal: design.goal,
    cells: await maskValues(floorOf(design).values, salt),
    kinds: design.kinds.map((kind) => ({ icon: kind.icon, line: kind.line.trim() })),
    onTrap: design.onTrap,
    failAfter: design.failAfter,
    failLine: design.failLine.trim(),
    moves: design.moves,
    salt,
  };
}
