/** A maze as the game master makes it, and what its player link holds. */
import { newSalt } from '../../kit/check';
import { mulberry32, randomSeed } from '../../kit/rng';
import { readWords, tidyWords, type Words } from '../../kit/words';
import { generate, withEdits, type Loops, type Twist } from './engine/generate';
import { packWalls, wallCount, type Maze } from './engine/grid';
import { distances, LANTERN, reachIn } from './engine/paths';
import type { MazePuzzle } from './puzzle';

/** How much of the maze the players see: all of it, the cells their lantern lights with a map of where it's lit, or only the cells near them. */
export type Light = 'lit' | 'lantern' | 'dark';

export const SMALLEST = 4;
export const LARGEST = 30;
export const SIZES: readonly { name: string; size: number }[] = [
  { name: 'Small', size: 8 },
  { name: 'Medium', size: 14 },
  { name: 'Large', size: 20 },
];
export const MOST_EXITS = 4;

export interface Exit {
  cell: number;
  /** What reaching it says. The first way out says the line for solving it, from the words, instead. */
  line: string;
}

export interface MazeDesign {
  v: 1;
  words: Words;
  width: number;
  height: number;
  twist: Twist;
  loops: Loops;
  seed: number;
  /** Walls the game master put up or took down, by number, flipped from the maze the seed makes. */
  edits: number[];
  start: number;
  exits: Exit[];
  light: Light;
  /** How far the players see by lantern or in the dark, in steps along the passages. */
  reach: number;
}

export const NEW_WORDS: Words = { title: '', intro: '', success: 'Daylight, and the way out.' };

/** A maze's way in, top left, and its way out, bottom right. */
const corners = (width: number, height: number) => ({ start: 0, exits: [{ cell: width * height - 1, line: '' }] });

export function newDesign(): MazeDesign {
  return { v: 1, words: NEW_WORDS, width: 10, height: 10, twist: 'winding', loops: 'none', seed: randomSeed(), edits: [], ...corners(10, 10), light: 'lantern', reach: LANTERN };
}

const sizeIn = (value: unknown, fallback: number) => (Number.isInteger(value) && (value as number) >= SMALLEST && (value as number) <= LARGEST ? (value as number) : fallback);

/** A design from untrusted data, each field checked. Anything that doesn't fit the maze's size falls back to the corners. */
export function readDesign(data: unknown): MazeDesign | null {
  if (!data || typeof data !== 'object' || Array.isArray(data)) return null;
  const input = data as Record<string, unknown>;
  if (input.v !== 1) return null;
  const width = sizeIn(input.width, 10);
  const height = sizeIn(input.height, 10);
  const cells = width * height;
  const inGrid = (cell: unknown): cell is number => Number.isInteger(cell) && (cell as number) >= 0 && (cell as number) < cells;
  const walls = wallCount({ width, height });
  const edits = Array.isArray(input.edits) ? input.edits.filter((wall): wall is number => Number.isInteger(wall) && wall >= 0 && wall < walls) : [];
  const start = inGrid(input.start) ? input.start : 0;
  const exits = (Array.isArray(input.exits) ? input.exits : [])
    .map((exit) => (exit && typeof exit === 'object' ? (exit as Record<string, unknown>) : {}))
    .filter((exit) => inGrid(exit.cell) && exit.cell !== start)
    .map((exit) => ({ cell: exit.cell as number, line: typeof exit.line === 'string' ? exit.line.slice(0, 200) : '' }))
    .filter((exit, i, all) => all.findIndex((other) => other.cell === exit.cell) === i)
    .slice(0, MOST_EXITS);
  const light = input.light === 'lit' || input.light === 'dark' ? input.light : 'lantern';
  return {
    v: 1,
    words: readWords(input.words, NEW_WORDS),
    width,
    height,
    twist: input.twist === 'branching' ? 'branching' : 'winding',
    loops: input.loops === 'few' || input.loops === 'many' ? input.loops : 'none',
    seed: Number.isInteger(input.seed) && (input.seed as number) >= 0 && (input.seed as number) < 2 ** 32 ? (input.seed as number) : 1,
    edits: [...new Set(edits)],
    ...(exits.length > 0 ? { start, exits } : corners(width, height)),
    light,
    reach: reachIn(input.reach, light === 'dark'),
  };
}

/** The design's maze: the one its seed makes, with the game master's walls put up or taken down. */
export const mazeOf = (design: MazeDesign): Maze =>
  withEdits(generate(design.width, design.height, design.twist, design.loops, mulberry32(design.seed)), design.edits);

/** How many steps it is from the way in to each way out, by the shortest way; -1 where there's no way. */
export function waysThrough(design: MazeDesign): number[] {
  const far = distances(mazeOf(design), design.start);
  return design.exits.map((exit) => far[exit.cell]);
}

export function problemsOf(design: MazeDesign): string[] {
  const ways = waysThrough(design);
  if (ways[0] < 0) return ['The first way out can’t be reached from the way in.'];
  return ways.some((steps) => steps < 0) ? ['A way out can’t be reached from the way in.'] : [];
}

/** A maze moved to a new size starts again from the corners, as walls are numbered by the size. */
export const resized = (design: MazeDesign, width: number, height: number): MazeDesign => ({
  ...design,
  width,
  height,
  edits: [],
  ...corners(width, height),
});

/** What a player link holds: the maze's walls, the way in, the ways out and their lines, and the light and how far it reaches. */
export async function toPuzzle(design: MazeDesign): Promise<MazePuzzle> {
  const words = tidyWords(design.words);
  return {
    v: 1,
    words,
    width: design.width,
    height: design.height,
    walls: packWalls(mazeOf(design).walls),
    start: design.start,
    exits: design.exits.map((exit, i) => ({ cell: exit.cell, line: i === 0 ? words.success : exit.line.trim() })),
    light: design.light,
    reach: design.reach,
    salt: newSalt(),
  };
}
