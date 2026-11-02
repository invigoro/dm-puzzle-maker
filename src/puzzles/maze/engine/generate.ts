/** Making mazes at random, from a seed, so the same seed always makes the same maze. */
import { randomInt, shuffled, type Random } from '../../../kit/rng';
import { cellCount, cellsOf, DIRECTIONS, stepFrom, wallBetween, walledIn, type Maze } from './grid';

/**
 * How a maze twists. Winding mazes have long corridors that double back (a walk that backs up
 * when it's cornered). Branching mazes have many short dead ends (grown outwards from one cell,
 * a wall at a time).
 */
export type Twist = 'winding' | 'branching';
/** How many loops: none for one way between any two cells, or some, for several. */
export type Loops = 'none' | 'few' | 'many';
const LOOPS: Record<Loops, number> = { none: 0, few: 0.04, many: 0.1 };

/** A maze with every cell reachable and, before loops, exactly one way between any two. */
export function generate(width: number, height: number, twist: Twist, loops: Loops, random: Random): Maze {
  const maze = walledIn(width, height);
  const cells = cellCount(maze);
  const inside = new Set([randomInt(random, cells)]);
  const open = (from: number, to: number) => {
    maze.walls[wallBetween(maze, from, to)] = false;
    inside.add(to);
  };
  const outside = (cell: number) =>
    shuffled(DIRECTIONS, random)
      .map((direction) => stepFrom(maze, cell, direction))
      .filter((next) => next >= 0 && !inside.has(next));

  if (twist === 'winding') {
    const trail = [...inside];
    while (trail.length > 0) {
      const here = trail.at(-1)!;
      const [next] = outside(here);
      if (next === undefined) trail.pop();
      else {
        open(here, next);
        trail.push(next);
      }
    }
  } else {
    // Each wall from the maze so far to a cell outside it, picked at random.
    const edge: [number, number][] = [];
    const reach = (cell: number) => outside(cell).forEach((next) => edge.push([cell, next]));
    reach([...inside][0]);
    while (edge.length > 0) {
      const [from, to] = edge.splice(randomInt(random, edge.length), 1)[0];
      if (inside.has(to)) continue;
      open(from, to);
      reach(to);
    }
  }

  // Loops: take down a few walls still standing, each opening a second way round.
  const standing = shuffled(
    maze.walls.flatMap((wall, i) => (wall ? [i] : [])),
    random,
  );
  for (const wall of standing.slice(0, Math.round(LOOPS[loops] * cells))) maze.walls[wall] = false;
  return maze;
}

/** A maze with some walls flipped: taken down if they stood, put up if they didn't, as the game master drew them. */
export function withEdits(maze: Maze, edits: readonly number[]): Maze {
  const walls = [...maze.walls];
  for (const wall of edits) if (wall >= 0 && wall < walls.length) walls[wall] = !walls[wall];
  return { ...maze, walls };
}

/** Whether a wall stands between two cells inside the grid (rather than at its edge). */
export const isInside = (maze: Maze, wall: number) => wall >= 0 && wall < maze.walls.length && cellsOf(maze, wall).every((cell) => cell >= 0);
