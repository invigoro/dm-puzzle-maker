/** Placing traps at random from a seed, the same way for the same seed, and keeping the start clear. */
import { randomInt, shuffled, type Random } from '../../../kit/rng';
import { around, reachable, squareCount, squaresOf, valuesOf, type Area, type Room } from './floor';
import { crossable } from './solver';

/** How many floors to try for a fair one before giving up. */
const TRIES = 300;

/** The squares no trap may be on: the start and the squares round it, so the first step tells the party something, and a goal of one square. */
export function keptClear(room: Room, start: Area, goal: Area): Set<number> {
  const clear = new Set(squaresOf(room, start).flatMap((cell) => [cell, ...around(room, cell)]));
  if ('cell' in goal) clear.add(goal.cell);
  return clear;
}

/** The most traps a room can hold, with the start kept clear. */
export const mostTraps = (room: Room, start: Area, goal: Area) => squareCount(room) - keptClear(room, start, goal).size;

/** Traps placed at random, never where the start keeps clear. */
export function placeTraps(room: Room, count: number, start: Area, goal: Area, random: Random): boolean[] {
  const clear = keptClear(room, start, goal);
  const free = Array.from({ length: squareCount(room) }, (_, cell) => cell).filter((cell) => !clear.has(cell));
  const chosen = new Set(shuffled(free, random).slice(0, count));
  return Array.from({ length: squareCount(room) }, (_, cell) => chosen.has(cell));
}

/** Which kind each trap is, at random among so many kinds; 0 for squares with no trap. */
export const kindsFor = (traps: readonly boolean[], kinds: number, random: Random) => traps.map((trap) => (trap ? randomInt(random, kinds) : 0));

/** Whether the goal can be reached at all without stepping on a trap. */
export const passable = (room: Room, traps: readonly boolean[], start: Area, goal: Area) => {
  const safe = reachable(room, traps, start);
  return squaresOf(room, goal).some((cell) => safe.has(cell));
};

/** Whether a floor can be crossed by reasoning, never by luck. */
export const isFair = (room: Room, traps: readonly boolean[], start: Area, goal: Area) =>
  crossable(
    room,
    valuesOf(
      room,
      traps,
      traps.map(() => 0),
    ),
    start,
    goal,
  );

/**
 * A fair floor: traps placed again and again, from the one seed, until a party could cross by
 * reasoning alone. Null if none turns up, as happens when there are too many traps.
 */
export function fairTraps(room: Room, count: number, start: Area, goal: Area, random: Random): boolean[] | null {
  for (let i = 0; i < TRIES; i++) {
    const traps = placeTraps(room, count, start, goal, random);
    if (isFair(room, traps, start, goal)) return traps;
  }
  return null;
}
