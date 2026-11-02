import { describe, expect, it } from 'vitest';
import { playerHash } from '../../kit/route';
import { floorOf, newDesign, problemsOf, readDesign, toPuzzle, type FloorDesign } from './design';
import { squaresOf } from './engine/floor';
import { keptClear } from './engine/place';
import { readProgress, readPuzzle, valuesIn } from './puzzle';

const design: FloorDesign = { ...newDesign(), seed: 21 };
const room = { width: 8, height: 10 };

describe('a design', () => {
  it('starts as a fair floor of twelve traps, the start and the squares beside it kept clear', () => {
    const floor = floorOf(design);
    expect(floor.traps.filter(Boolean)).toHaveLength(12);
    expect(floor.fair).toBe(true);
    for (const cell of keptClear(room, design.start, design.goal)) expect(floor.traps[cell]).toBe(false);
    expect(problemsOf(design)).toEqual([]);
  });

  it('makes the same floor for the same seed', () => {
    expect(floorOf({ ...design })).toEqual(floorOf(design));
    expect(floorOf({ ...design, seed: 22 }).traps).not.toEqual(floorOf(design).traps);
  });

  it('takes traps placed by hand, but never on the start', () => {
    const floor = floorOf({ ...design, placed: [3, 12, 75] });
    expect(floor.traps.flatMap((trap, cell) => (trap ? [cell] : []))).toEqual([3, 12]);
  });

  it('says what stops it being sent', () => {
    expect(problemsOf({ ...design, goal: { side: 'bottom' } })).toEqual(['The start and the goal can’t share a square.']);
    // A wall of traps across the room.
    const wall = Array.from({ length: 8 }, (_, x) => 3 * 8 + x);
    expect(problemsOf({ ...design, placed: wall })).toEqual(['The goal can’t be reached without stepping on a trap.']);
    // Too many traps to cross at all, or fairly.
    expect(problemsOf({ ...design, traps: 55 })).toHaveLength(1);
  });

  it('says when a floor would need a guess, if the game master wants it fair', () => {
    // An unfair floor that can still be crossed, found among random ones.
    const unfair = Array.from({ length: 60 }, (_, seed) => ({ ...design, fair: false, traps: 22, seed })).find(
      (each) => !floorOf(each).fair && problemsOf(each).length === 0,
    )!;
    expect(unfair).toBeDefined();
    const placed = floorOf(unfair).traps.flatMap((trap, cell) => (trap ? [cell] : []));
    expect(problemsOf({ ...unfair, placed, fair: true })).toEqual(['Somewhere on this floor the party would have to guess. Move a trap, or let it be unfair.']);
    // Placed at random, a fair floor with that many traps turns up, or the maker says it didn't.
    const random = problemsOf({ ...unfair, fair: true });
    expect(random.length === 0 || random[0].startsWith('No fair floor')).toBe(true);
  });

  it('reads back, and puts right whatever’s malformed', () => {
    const square = { ...design, start: { cell: 75 }, goal: { cell: 3 }, kinds: [{ icon: 'dart', line: 'Darts.' }] };
    expect(readDesign(JSON.parse(JSON.stringify(square)))).toEqual(square);
    const read = readDesign({ ...design, width: 40, start: { side: 'up' }, goal: { cell: 999 }, kinds: [], onTrap: 'explode', moves: 'fly' })!;
    expect(read.width).toBe(8);
    expect(read.start).toEqual({ side: 'bottom' });
    expect(read.goal).toEqual({ side: 'top' });
    expect(read.kinds).toEqual(design.kinds);
    expect(read.onTrap).toBe('carry-on');
    expect(read.moves).toBe('spread');
    for (const junk of [null, 'floor', [], { ...design, v: 2 }]) expect(readDesign(junk)).toBeNull();
  });
});

describe('a player link', () => {
  it('holds every square masked, which the players’ page unmasks', async () => {
    const puzzle = readPuzzle(JSON.parse(JSON.stringify(await toPuzzle(design))))!;
    expect(await valuesIn(puzzle)).toEqual(floorOf(design).values);
    // Masked, the squares aren't the values as they are.
    const plain = btoa(String.fromCharCode(...floorOf(design).values)).replace(/=+$/, '');
    expect(puzzle.cells).not.toBe(plain);
  });

  it('says so when its squares don’t make a floor of its size', async () => {
    const puzzle = await toPuzzle(design);
    expect(await valuesIn({ ...puzzle, width: 9 })).toBeNull();
    expect(await valuesIn({ ...puzzle, salt: 'other' })).not.toEqual(floorOf(design).values);
  });

  it('turns away what’s been tampered with', async () => {
    const puzzle = JSON.parse(JSON.stringify(await toPuzzle(design)));
    for (const junk of [{ ...puzzle, width: 2 }, { ...puzzle, start: { side: 'up' } }, { ...puzzle, kinds: [] }, { ...puzzle, moves: 'fly' }, { ...puzzle, salt: '' }, null]) {
      expect(readPuzzle(junk)).toBeNull();
    }
  });

  it('fits in a Discord message, even the largest room', async () => {
    const largest: FloorDesign = { ...design, width: 20, height: 20, traps: 60, fair: false };
    const link = `https://daedalus.invigoro.me/${await playerHash('trapped-floor', await toPuzzle(largest))}`;
    expect(link.length).toBeLessThan(2000);
  });

  it('reads back a party’s progress', async () => {
    const puzzle = await toPuzzle(design);
    const progress = { stepped: [70, 62], marks: [5], sprung: [], at: 76 };
    expect(readProgress(puzzle, progress)).toEqual(progress);
    expect(readProgress(puzzle, { ...progress, at: 80 })).toBeNull();
    expect(squaresOf(room, design.start)).toContain(76);
  });
});
