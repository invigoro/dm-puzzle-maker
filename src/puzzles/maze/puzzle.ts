/** What a player link holds for a maze, read and checked on the players' side. */
import { readWords, type Words } from '../../kit/words';
import type { Exit, Light } from './design';
import { unpackWalls, wallCount, type Maze } from './engine/grid';
import { reachIn } from './engine/paths';
import { onHazardIn, readPictures, viewIn, type OnHazard, type Picture } from './pictures';

export interface MazePuzzle {
  v: 1;
  words: Words;
  width: number;
  height: number;
  /** The walls, a bit each. */
  walls: string;
  start: number;
  /** The ways out, each with what reaching it says. */
  exits: Exit[];
  light: Light;
  /** How far the players see by lantern or in the dark, in steps along the passages. */
  reach: number;
  /** How many cells across the players' window onto the maze is; 0 for the whole maze. */
  view: number;
  pictures: Picture[];
  onHazard: OnHazard;
  /** The link's own, so a player's progress on it is kept apart from any other's. */
  salt: string;
}

const NO_WORDS: Words = { title: '', intro: '', success: '' };

/** A puzzle from a player link, checked, or null if the link doesn't hold one. */
export function readPuzzle(data: unknown): MazePuzzle | null {
  if (!data || typeof data !== 'object' || Array.isArray(data)) return null;
  const input = data as Record<string, unknown>;
  const { width, height, walls, start, exits, light, reach, view, pictures, onHazard, salt } = input;
  if (input.v !== 1 || typeof salt !== 'string' || !/^[\w-]{1,64}$/.test(salt)) return null;
  const size = (value: unknown): value is number => Number.isInteger(value) && (value as number) >= 4 && (value as number) <= 30;
  if (!size(width) || !size(height) || !unpackWalls(walls, wallCount({ width, height }))) return null;
  const inGrid = (cell: unknown): cell is number => Number.isInteger(cell) && (cell as number) >= 0 && (cell as number) < width * height;
  if (!inGrid(start) || !Array.isArray(exits) || exits.length === 0 || exits.length > 4) return null;
  const ways = exits.map((exit) => (exit && typeof exit === 'object' ? (exit as Record<string, unknown>) : {}));
  if (!ways.every((exit) => inGrid(exit.cell) && typeof exit.line === 'string' && exit.line.length <= 200)) return null;
  if (light !== 'lit' && light !== 'lantern' && light !== 'dark') return null;
  // A link made before the reach could be chosen has none, and sees as far as such links did.
  if (reach !== undefined && reachIn(reach, false) !== reach) return null;
  // Links made before views and pictures have neither; any they have must all be sound.
  if (view !== undefined && viewIn(view) !== view) return null;
  if (onHazard !== undefined && onHazardIn(onHazard) !== onHazard) return null;
  const taken = [start, ...ways.map((exit) => exit.cell as number)];
  const read = readPictures(pictures, width * height, taken);
  if (pictures !== undefined && (!Array.isArray(pictures) || read.length !== pictures.length)) return null;
  return {
    v: 1,
    words: readWords(input.words, NO_WORDS),
    width,
    height,
    walls: walls as string,
    start,
    exits: ways.map((exit) => ({ cell: exit.cell as number, line: exit.line as string })),
    light,
    reach: reachIn(reach, light === 'dark'),
    view: viewIn(view),
    pictures: read,
    onHazard: onHazardIn(onHazard),
    salt,
  };
}

/** The puzzle's maze. */
export const mazeIn = (puzzle: MazePuzzle): Maze => ({
  width: puzzle.width,
  height: puzzle.height,
  walls: unpackWalls(puzzle.walls, wallCount(puzzle))!,
});

/** Where a player is, how far they've come, where they've been, and which way out they reached, if any. */
export interface MazeProgress {
  at: number;
  steps: number;
  visited: number[];
  out: number | null;
}

/** Progress from untrusted data, for this puzzle, or null if it isn't any. */
export function readProgress(puzzle: MazePuzzle, data: unknown): MazeProgress | null {
  const input = data && typeof data === 'object' ? (data as Record<string, unknown>) : {};
  const cells = puzzle.width * puzzle.height;
  const inGrid = (cell: unknown): cell is number => Number.isInteger(cell) && (cell as number) >= 0 && (cell as number) < cells;
  const { at, steps, visited, out } = input;
  if (!inGrid(at) || !Number.isInteger(steps) || (steps as number) < 0 || !Array.isArray(visited) || !visited.every(inGrid)) return null;
  if (out !== null && !(Number.isInteger(out) && (out as number) >= 0 && (out as number) < puzzle.exits.length)) return null;
  return { at, steps: steps as number, visited: visited as number[], out: out as number | null };
}
