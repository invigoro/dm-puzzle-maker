/**
 * Crossing a floor by reasoning alone, as a careful party would: stepping only where the counts
 * prove it's safe. A floor this can cross from the start to the goal never needs a guess.
 */
import { around, squaresOf, type Area, type Room } from './floor';

/**
 * The squares a party knows are safe once they've stepped on some: a square showing no traps
 * round it opens the squares round it too, and so on, as minesweeper does.
 */
export function opened(room: Room, values: readonly number[], stepped: Iterable<number>, known = new Set<number>()): Set<number> {
  const queue = [...stepped].filter((cell) => values[cell] < 9 && !known.has(cell));
  for (const cell of queue) known.add(cell);
  for (let i = 0; i < queue.length; i++) {
    if (values[queue[i]] !== 0) continue;
    for (const next of around(room, queue[i])) {
      if (!known.has(next) && values[next] < 9) {
        known.add(next);
        queue.push(next);
      }
    }
  }
  return known;
}

/** Whether a floor can be crossed from the start to the goal without ever guessing. */
export function crossable(room: Room, values: readonly number[], start: Area, goal: Area): boolean {
  const goals = squaresOf(room, goal);
  const safe = opened(room, values, squaresOf(room, start));
  const trapped = new Set<number>();
  const reached = () => goals.some((cell) => safe.has(cell));

  /** What a square shown says: these unknown squares round it hold this many traps. */
  const constraint = (cell: number) => {
    const unknown = around(room, cell).filter((next) => !safe.has(next) && !trapped.has(next));
    const left = values[cell] - around(room, cell).filter((next) => trapped.has(next)).length;
    return { unknown, left };
  };

  while (!reached()) {
    const toOpen = new Set<number>();
    const toMark = new Set<number>();
    const shown = [...safe].map(constraint).filter(({ unknown }) => unknown.length > 0);
    for (const { unknown, left } of shown) {
      if (left === 0) unknown.forEach((cell) => toOpen.add(cell));
      else if (left === unknown.length) unknown.forEach((cell) => toMark.add(cell));
    }
    // Two squares' counts together: where one's unknown squares lie within the other's, the rest
    // of the other's hold the difference.
    if (toOpen.size === 0 && toMark.size === 0) {
      for (const one of shown) {
        for (const other of shown) {
          if (one === other || one.unknown.length >= other.unknown.length || !one.unknown.every((cell) => other.unknown.includes(cell))) continue;
          const rest = other.unknown.filter((cell) => !one.unknown.includes(cell));
          const traps = other.left - one.left;
          if (traps === 0) rest.forEach((cell) => toOpen.add(cell));
          else if (traps === rest.length) rest.forEach((cell) => toMark.add(cell));
        }
      }
    }
    if (toOpen.size === 0 && toMark.size === 0) return false;
    toMark.forEach((cell) => trapped.add(cell));
    opened(room, values, toOpen, safe);
  }
  return true;
}
