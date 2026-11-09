import { describe, expect, it } from 'vitest';
import { mulberry32 } from '../../../kit/rng';
import { allOf, bit, braziersOf, cellsOf, countOf, flipsOf, keyOf, maskOf, type Floor } from './floor';
import { solve, startFrom } from './solver';

const grid = (width: number, height: number, change: Partial<Floor> = {}): Floor => ({ shape: 'grid', width, height, bare: [], count: 0, reach: 'beside', ...change });
const ring = (count: number): Floor => ({ shape: 'ring', width: 0, height: 0, bare: [], count, reach: 'beside' });
/** The braziers a touch flips, by number. */
const flipped = (floor: Floor, brazier: number) => cellsOf(flipsOf(floor)[brazier], braziersOf(floor).map((_, i) => i));

/** The fewest touches from one floor to another, found by trying every set of touches: for small floors only. */
function bruteForce(flips: readonly bigint[], from: bigint, to: bigint): number | null {
  let fewest: number | null = null;
  for (let set = 0; set < 2 ** flips.length; set++) {
    let floor = from;
    flips.forEach((flip, brazier) => {
      if (set & (1 << brazier)) floor ^= flip;
    });
    if (floor === to) fewest = Math.min(fewest ?? Infinity, countOf(BigInt(set)));
  }
  return fewest;
}

describe('a floor', () => {
  it('numbers its braziers in reading order, passing over bare squares', () => {
    expect(braziersOf(grid(3, 3, { bare: [0, 4] }))).toEqual([1, 2, 3, 5, 6, 7, 8]);
    expect(braziersOf(ring(5))).toEqual([0, 1, 2, 3, 4]);
  });

  it('flips a brazier and those beside it, on its corners, all round it, or in its row and column', () => {
    // The middle of three by three, and a corner.
    expect(flipped(grid(3, 3), 4)).toEqual([1, 3, 4, 5, 7]);
    expect(flipped(grid(3, 3), 0)).toEqual([0, 1, 3]);
    expect(flipped(grid(3, 3, { reach: 'corners' }), 4)).toEqual([0, 2, 4, 6, 8]);
    expect(flipped(grid(3, 3, { reach: 'round' }), 4)).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8]);
    expect(flipped(grid(4, 3, { reach: 'lines' }), 5)).toEqual([1, 4, 5, 6, 7, 9]);
  });

  it('leaves out bare squares, and numbers the rest as braziers', () => {
    // With the middle bare, the top middle (brazier 1) flips itself and its two neighbours.
    expect(flipped(grid(3, 3, { bare: [4] }), 1)).toEqual([0, 1, 2]);
  });

  it('flips the two beside a brazier on a ring, round the end', () => {
    expect(flipped(ring(5), 0)).toEqual([0, 1, 4]);
    expect(flipped(ring(5), 2)).toEqual([1, 2, 3]);
  });

  it('turns cells into a mask and back, and a mask into text', () => {
    const braziers = braziersOf(grid(3, 3, { bare: [4] }));
    const mask = maskOf([0, 5, 4, 8], braziers);
    expect(mask).toBe(bit(0) | bit(4) | bit(7));
    expect(cellsOf(mask, braziers)).toEqual([0, 5, 8]);
    expect(keyOf(mask, braziers.length)).toBe('10001001');
  });
});

describe('the solver', () => {
  it('puts out a five by five floor, all burning, in the fifteen touches it takes', () => {
    const flips = flipsOf(grid(5, 5));
    const solution = solve(flips, allOf(25), 0n)!;
    expect(solution).toMatchObject({ fewest: 15, exact: true });
    expect([...Array(25).keys()].reduce((floor, brazier) => ((solution.touches & bit(brazier)) !== 0n ? floor ^ flips[brazier] : floor), allOf(25))).toBe(0n);
  });

  it('agrees with trying every set of touches, on whether a floor can be solved and in how few', () => {
    const floors = [grid(3, 3), grid(4, 4), grid(4, 3, { reach: 'corners' }), grid(3, 4, { reach: 'lines' }), grid(4, 4, { bare: [5, 10], reach: 'round' }), ring(6), ring(7)];
    const random = mulberry32(9);
    for (const floor of floors) {
      const flips = flipsOf(floor);
      for (let i = 0; i < 12; i++) {
        const from = BigInt(Math.floor(random() * 2 ** flips.length));
        const to = BigInt(Math.floor(random() * 2 ** flips.length));
        expect(solve(flips, from, to)?.fewest ?? null).toBe(bruteForce(flips, from, to));
      }
    }
  });

  it('says when no touches can do it', () => {
    // Four by four, with a single brazier burning in the corner, can't be put out.
    const flips = flipsOf(grid(4, 4));
    expect(bruteForce(flips, bit(0), 0n)).toBeNull();
    expect(solve(flips, bit(0), 0n)).toBeNull();
  });
});

describe('a start', () => {
  it('is so many touches from the goal, from a seed, can always be solved, and is never the goal', () => {
    const flips = flipsOf(grid(5, 5));
    for (let seed = 0; seed < 30; seed++) {
      for (const touches of [3, 8, 0]) {
        const start = startFrom(flips, 0n, touches, mulberry32(seed));
        expect(start).not.toBe(0n);
        const solution = solve(flips, start, 0n)!;
        expect(solution).not.toBeNull();
        if (touches > 0) expect(solution.fewest).toBeLessThanOrEqual(touches);
      }
    }
    expect(startFrom(flips, 0n, 5, mulberry32(4))).toBe(startFrom(flips, 0n, 5, mulberry32(4)));
  });

  it('is never the goal, even where touches cancel out', () => {
    // On a ring of three, touching every brazier changes nothing.
    const flips = flipsOf(ring(3));
    for (let seed = 0; seed < 20; seed++) expect(startFrom(flips, 0n, 3, mulberry32(seed))).not.toBe(0n);
  });
});
