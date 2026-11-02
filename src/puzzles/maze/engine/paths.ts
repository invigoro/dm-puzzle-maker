/** Finding the way: how far every cell is from a cell, and what a lantern shows. */
import { cellCount, openFrom, type Maze } from './grid';

/** How many steps each cell is from a cell, following the passages; -1 where there's no way. */
export function distances(maze: Maze, from: number): number[] {
  const far = Array(cellCount(maze)).fill(-1);
  far[from] = 0;
  const queue = [from];
  for (let i = 0; i < queue.length; i++) {
    for (const next of openFrom(maze, queue[i])) {
      if (far[next] < 0) {
        far[next] = far[queue[i]] + 1;
        queue.push(next);
      }
    }
  }
  return far;
}

/** The shortest way from one cell to another, cell by cell, or null if there's none. */
export function wayBetween(maze: Maze, from: number, to: number): number[] | null {
  const far = distances(maze, to);
  if (far[from] < 0) return null;
  const way = [from];
  while (way.at(-1) !== to) way.push(openFrom(maze, way.at(-1)!).find((next) => far[next] === far[way.at(-1)!] - 1)!);
  return way;
}

/** How far a lantern's light reaches, in steps along the passages: it doesn't shine through walls. */
export const LANTERN = 2;

/** The cells a lantern lights from where it stands: a search that stops where the light does. */
export function lit(maze: Maze, from: number, reach = LANTERN): number[] {
  const steps = new Map([[from, 0]]);
  const queue = [from];
  for (let i = 0; i < queue.length; i++) {
    const here = queue[i];
    if (steps.get(here)! >= reach) continue;
    for (const next of openFrom(maze, here)) {
      if (steps.has(next)) continue;
      steps.set(next, steps.get(here)! + 1);
      queue.push(next);
    }
  }
  return queue;
}
