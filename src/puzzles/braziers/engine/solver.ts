/**
 * Which braziers to touch to take one floor to another. Touching twice undoes a touch, and the
 * order of touches doesn't matter, so the answer is a set of braziers, each touched once: the
 * solution of a sum where every number is 0 or 1, found by Gaussian elimination. When more than one
 * set works, they differ by sets of touches that change nothing, and the fewest is found by trying
 * those.
 */
import { randomInt, shuffled, type Random } from '../../../kit/rng';
import { bit, countOf } from './floor';

/** How many sets of touches that change nothing are tried, at most, for the fewest: 2¹⁶. */
const MOST_TRIED = 16;

export interface Solution {
  /** The braziers to touch, as a mask. */
  touches: bigint;
  /** How many that is: the fewest there can be, unless `exact` is false. */
  fewest: number;
  /** Whether `fewest` is certainly the fewest, rather than the fewest found. */
  exact: boolean;
}

/** The fewest touches that take a floor from one state to another, or null if none can. `flips` is each brazier's touch, as a mask. */
export function solve(flips: readonly bigint[], from: bigint, to: bigint): Solution | null {
  const count = flips.length;
  const target = bit(count);
  const change = from ^ to;
  // A row for each brazier: which touches flip it, and whether it must change.
  const rows = Array.from({ length: count }, (_, brazier) => {
    let row = (change & bit(brazier)) !== 0n ? target : 0n;
    flips.forEach((flip, touch) => {
      if ((flip & bit(brazier)) !== 0n) row |= bit(touch);
    });
    return row;
  });
  const pivots: number[] = [];
  for (let touch = 0; touch < count; touch++) {
    const column = bit(touch);
    const found = rows.findIndex((row, i) => i >= pivots.length && (row & column) !== 0n);
    if (found < 0) continue;
    const at = pivots.length;
    [rows[at], rows[found]] = [rows[found], rows[at]];
    for (let i = 0; i < count; i++) if (i !== at && (rows[i] & column) !== 0n) rows[i] ^= rows[at];
    pivots.push(touch);
  }
  // A row with no touches left that must still change can't be solved.
  if (rows.slice(pivots.length).some((row) => (row & target) !== 0n)) return null;
  let touches = 0n;
  pivots.forEach((touch, i) => {
    if ((rows[i] & target) !== 0n) touches |= bit(touch);
  });
  // Each touch that isn't a pivot gives a set of touches that changes nothing.
  const free = Array.from({ length: count }, (_, touch) => touch).filter((touch) => !pivots.includes(touch));
  const idle = free.map((touch) => pivots.reduce((set, pivot, i) => ((rows[i] & bit(touch)) !== 0n ? set | bit(pivot) : set), bit(touch)));
  const tried = idle.slice(0, MOST_TRIED);
  let best = touches;
  let fewest = countOf(touches);
  // Through every combination of them, one change at a time (a Gray code).
  let now = touches;
  for (let step = 1; step < 2 ** tried.length; step++) {
    now ^= tried[Math.log2(step & -step)];
    const size = countOf(now);
    if (size < fewest) [best, fewest] = [now, size];
  }
  return { touches: best, fewest, exact: idle.length <= MOST_TRIED };
}

/**
 * A start so many touches from the goal: that many braziers, each touched once, from a seed; or,
 * for 0, each brazier touched or not at random, anywhere the goal can reach. Never the goal itself,
 * as touches can cancel out.
 */
export function startFrom(flips: readonly bigint[], goal: bigint, touches: number, random: Random): bigint {
  const braziers = Array.from({ length: flips.length }, (_, brazier) => brazier);
  for (let attempt = 0; attempt < 100; attempt++) {
    const touched = touches > 0 ? shuffled(braziers, random).slice(0, touches) : braziers.filter(() => randomInt(random, 2) === 1);
    const start = touched.reduce((floor, brazier) => floor ^ flips[brazier], goal);
    if (start !== goal) return start;
  }
  return goal ^ flips[0];
}
