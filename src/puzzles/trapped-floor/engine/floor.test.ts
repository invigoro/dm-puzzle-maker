import { describe, expect, it } from 'vitest';
import { mulberry32 } from '../../../kit/rng';
import { around, reachable, squaresOf, trapsAround, valuesOf } from './floor';
import { maskValues, unmaskValues } from './mask';
import { fairTraps, isFair, keptClear, mostTraps, passable, placeTraps } from './place';
import { crossable, opened } from './solver';

const room = { width: 5, height: 4 };
/** A floor drawn as text, a row a line: '*' a trap, '.' clear. */
const floor = (rows: string[]) => rows.join('').split('').map((square) => square === '*');

describe('the floor', () => {
  it('counts the eight squares round a square, diagonals and all', () => {
    expect(around(room, 0).sort((x, y) => x - y)).toEqual([1, 5, 6]);
    expect(around(room, 6)).toHaveLength(8);
    const traps = floor(['*....', '.*...', '.....', '....*']);
    expect(trapsAround(room, traps, 5)).toBe(2);
    expect(trapsAround(room, traps, 3)).toBe(0);
    // The trap in the bottom right corner is diagonally below.
    expect(trapsAround(room, traps, 13)).toBe(1);
  });

  it('gives each side’s squares, and a square’s own', () => {
    expect(squaresOf(room, { side: 'top' })).toEqual([0, 1, 2, 3, 4]);
    expect(squaresOf(room, { side: 'bottom' })).toEqual([15, 16, 17, 18, 19]);
    expect(squaresOf(room, { side: 'left' })).toEqual([0, 5, 10, 15]);
    expect(squaresOf(room, { side: 'right' })).toEqual([4, 9, 14, 19]);
    expect(squaresOf(room, { cell: 7 })).toEqual([7]);
  });

  it('shows counts on clear squares, and each trap’s kind on trapped ones', () => {
    const traps = floor(['*....', '.....', '.....', '.....']);
    const values = valuesOf(room, traps, traps.map((trap) => (trap ? 2 : 0)));
    expect(values[0]).toBe(11);
    expect(values[1]).toBe(1);
    expect(values[19]).toBe(0);
  });

  it('knows which squares can be reached without stepping on a trap', () => {
    const wall = floor(['.....', '*****', '.....', '.....']);
    expect(reachable(room, wall, { side: 'bottom' }).has(2)).toBe(false);
    expect(passable(room, wall, { side: 'bottom' }, { side: 'top' })).toBe(false);
    // A gap: diagonal steps count.
    const gap = floor(['.....', '**.**', '.....', '.....']);
    expect(passable(room, gap, { side: 'bottom' }, { side: 'top' })).toBe(true);
  });
});

describe('opening the floor', () => {
  it('opens the squares round a square with no traps round it, and on', () => {
    const traps = floor(['....*', '.....', '.....', '.....']);
    const values = valuesOf(room, traps, traps.map(() => 0));
    const known = opened(room, values, [15]);
    expect(known.has(4)).toBe(false);
    expect(known.has(3)).toBe(true);
    expect(known.size).toBe(19);
  });
});

describe('crossable', () => {
  const values = (rows: string[]) => {
    const traps = floor(rows);
    return valuesOf(room, traps, traps.map(() => 0));
  };

  it('crosses a floor where the counts prove each step', () => {
    expect(crossable(room, values(['.....', '.*.*.', '.....', '.....']), { side: 'bottom' }, { side: 'top' })).toBe(true);
  });

  it('won’t cross where the party would have to guess', () => {
    // Two squares wide: one of the top two is trapped, and both squares below them count one.
    const narrow = { width: 2, height: 3 };
    const traps = [true, false, false, false, false, false];
    expect(crossable(narrow, valuesOf(narrow, traps, traps.map(() => 0)), { side: 'bottom' }, { side: 'top' })).toBe(false);
    expect(isFair(narrow, traps, { side: 'bottom' }, { side: 'top' })).toBe(false);
  });
});

describe('placing traps', () => {
  const start = { side: 'bottom' } as const;
  const goal = { side: 'top' } as const;
  const big = { width: 8, height: 10 };

  it('keeps the start and the squares beside it clear, and a goal of one square', () => {
    const clear = keptClear(big, start, { cell: 3 });
    for (let seed = 0; seed < 20; seed++) {
      const traps = placeTraps(big, 15, start, { cell: 3 }, mulberry32(seed));
      expect(traps.filter(Boolean)).toHaveLength(15);
      for (const cell of clear) expect(traps[cell]).toBe(false);
    }
    expect(mostTraps(big, start, goal)).toBe(80 - 16);
  });

  it('places the same traps for the same seed', () => {
    expect(placeTraps(big, 12, start, goal, mulberry32(4))).toEqual(placeTraps(big, 12, start, goal, mulberry32(4)));
  });

  it('finds fair floors, ones a party can always cross by reasoning', () => {
    for (let seed = 0; seed < 10; seed++) {
      const traps = fairTraps(big, 14, start, goal, mulberry32(seed));
      expect(traps).not.toBeNull();
      expect(isFair(big, traps!, start, goal)).toBe(true);
    }
  });

  it('gives up on a fair floor when there are too many traps for one', () => {
    expect(fairTraps({ width: 5, height: 6 }, 18, start, goal, mulberry32(1))).toBeNull();
  });
});

describe('masking', () => {
  it('hides each square’s value, and gives it back with the salt', async () => {
    const values = [0, 1, 2, 9, 10, 3, 8, 0];
    const masked = await maskValues(values, 'pepper');
    expect(await unmaskValues(masked, 'pepper', values.length)).toEqual(values);
    expect(await unmaskValues(masked, 'pepper', values.length + 1)).toBeNull();
    expect(await unmaskValues('not masked!', 'pepper', values.length)).toBeNull();
    // Unmasked with the wrong salt, it's nonsense, not the floor.
    expect(await unmaskValues(masked, 'salt', values.length)).not.toEqual(values);
  });
});
