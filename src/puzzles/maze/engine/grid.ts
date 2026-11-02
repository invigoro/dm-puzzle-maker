/**
 * A maze as a grid of cells with walls between them. Cells are numbered row by row from the top
 * left. Every wall inside the grid has a number: first each cell's right-hand wall, row by row,
 * then each cell's lower wall. The grid's outside is always walled.
 */
import { fromBase64Url, toBase64Url } from '../../../kit/packing';

export interface Maze {
  width: number;
  height: number;
  /** Whether each inside wall stands, by its number. */
  walls: boolean[];
}

export type Direction = 'up' | 'right' | 'down' | 'left';
export const DIRECTIONS: readonly Direction[] = ['up', 'right', 'down', 'left'];
const STEP: Record<Direction, [number, number]> = { up: [0, -1], right: [1, 0], down: [0, 1], left: [-1, 0] };

export const cellCount = ({ width, height }: { width: number; height: number }) => width * height;
export const wallCount = ({ width, height }: { width: number; height: number }) => height * (width - 1) + width * (height - 1);
export const xyOf = (maze: { width: number }, cell: number) => [cell % maze.width, Math.floor(cell / maze.width)] as const;
export const cellAt = (maze: { width: number; height: number }, x: number, y: number) =>
  x >= 0 && y >= 0 && x < maze.width && y < maze.height ? y * maze.width + x : -1;

/** A maze with every inside wall standing. */
export const walledIn = (width: number, height: number): Maze => ({ width, height, walls: Array(wallCount({ width, height })).fill(true) });

/** The number of the wall between two cells side by side, or -1 if they aren't, or either is off the grid. */
export function wallBetween(maze: Maze, one: number, other: number): number {
  const cells = cellCount(maze);
  if (!(one >= 0 && one < cells && other >= 0 && other < cells)) return -1;
  const [x1, y1] = xyOf(maze, one);
  const [x2, y2] = xyOf(maze, other);
  if (y1 === y2 && Math.abs(x1 - x2) === 1) return y1 * (maze.width - 1) + Math.min(x1, x2);
  if (x1 === x2 && Math.abs(y1 - y2) === 1) return maze.height * (maze.width - 1) + Math.min(y1, y2) * maze.width + x1;
  return -1;
}

/** The two cells a wall stands between. */
export function cellsOf(maze: Maze, wall: number): [number, number] {
  const across = maze.height * (maze.width - 1);
  if (wall < across) {
    const [y, x] = [Math.floor(wall / (maze.width - 1)), wall % (maze.width - 1)];
    return [cellAt(maze, x, y), cellAt(maze, x + 1, y)];
  }
  const below = wall - across;
  const [y, x] = [Math.floor(below / maze.width), below % maze.width];
  return [cellAt(maze, x, y), cellAt(maze, x, y + 1)];
}

/** The cell one step from a cell in a direction, or -1 off the grid. */
export function stepFrom(maze: Maze, cell: number, direction: Direction): number {
  const [x, y] = xyOf(maze, cell);
  const [dx, dy] = STEP[direction];
  return cellAt(maze, x + dx, y + dy);
}

/** Whether there's a way from a cell to the next one in a direction: no wall, and not the grid's edge. */
export function canStep(maze: Maze, cell: number, direction: Direction): boolean {
  const next = stepFrom(maze, cell, direction);
  return next >= 0 && !maze.walls[wallBetween(maze, cell, next)];
}

/** The cells a cell opens onto. */
export const openFrom = (maze: Maze, cell: number): number[] =>
  DIRECTIONS.filter((direction) => canStep(maze, cell, direction)).map((direction) => stepFrom(maze, cell, direction));

/** Walls as text for a link: a bit each, packed eight to a byte. A 20 by 20 maze is 95 bytes. */
export function packWalls(walls: readonly boolean[]): string {
  const bytes = new Uint8Array(Math.ceil(walls.length / 8));
  walls.forEach((wall, i) => {
    if (wall) bytes[i >> 3] |= 1 << (i & 7);
  });
  return toBase64Url(bytes);
}

/** Walls from a link, for a maze of so many walls, or null if they don't fit it. */
export function unpackWalls(text: unknown, count: number): boolean[] | null {
  if (typeof text !== 'string' || !/^[\w-]*$/.test(text)) return null;
  try {
    const bytes = fromBase64Url(text);
    if (bytes.length !== Math.ceil(count / 8)) return null;
    return Array.from({ length: count }, (_, i) => (bytes[i >> 3] & (1 << (i & 7))) !== 0);
  } catch {
    return null;
  }
}
