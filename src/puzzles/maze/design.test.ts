import { describe, expect, it } from 'vitest';
import { playerHash } from '../../kit/route';
import { mazeOf, newDesign, problemsOf, readDesign, resized, toPuzzle, waysThrough, type MazeDesign } from './design';
import { wallCount } from './engine/grid';
import { mazeIn, readProgress, readPuzzle } from './puzzle';

const design: MazeDesign = { ...newDesign(), seed: 11, words: { title: 'The cellars', intro: 'Find the door.', success: 'The smugglers’ door.' } };

describe('a design', () => {
  it('starts with its way in at the top left and its way out at the bottom right, and a way between', () => {
    expect(design.start).toBe(0);
    expect(design.exits).toEqual([{ cell: 99, line: '' }]);
    expect(waysThrough(design)[0]).toBeGreaterThanOrEqual(18);
    expect(problemsOf(design)).toEqual([]);
  });

  it('makes the same maze for the same seed, with the game master’s walls flipped', () => {
    expect(mazeOf(design)).toEqual(mazeOf(design));
    const flipped = mazeOf({ ...design, edits: [3] });
    expect(flipped.walls[3]).toBe(!mazeOf(design).walls[3]);
  });

  it('can’t be sent when a way out can’t be reached', () => {
    // Put up every wall the seed took down.
    const shut = { ...design, edits: mazeOf(design).walls.flatMap((wall, i) => (wall ? [] : [i])) };
    expect(waysThrough(shut)).toEqual([-1]);
    expect(problemsOf(shut)).toEqual(['The first way out can’t be reached from the way in.']);
  });

  it('reads back, and puts right what doesn’t fit', () => {
    const exits = [
      { cell: 99, line: '' },
      { cell: 9, line: 'The kitchen.' },
    ];
    expect(readDesign(JSON.parse(JSON.stringify({ ...design, exits })))).toEqual({ ...design, exits });
    const read = readDesign({ ...design, width: 99, edits: [-1, 5, 5, 9999], exits: [{ cell: 0 }, { cell: 7 }, { cell: 7 }] })!;
    expect(read.width).toBe(10);
    expect(read.edits).toEqual([5]);
    // The way out can't be the way in, nor be there twice.
    expect(read.exits).toEqual([{ cell: 7, line: '' }]);
    expect(readDesign({ ...design, exits: [] })?.exits).toEqual([{ cell: 99, line: '' }]);
    for (const junk of [null, 'maze', [], { ...design, v: 2 }]) expect(readDesign(junk)).toBeNull();
  });

  it('sees as far as it did, when made before how far could be chosen', () => {
    const { reach: _, ...before } = design;
    expect(readDesign(before)?.reach).toBe(2);
    expect(readDesign({ ...before, light: 'dark' })?.reach).toBe(0);
    expect(readDesign({ ...design, light: 'dark', reach: 4 })?.reach).toBe(4);
  });

  it('starts again from the corners at a new size, as the walls are numbered by size', () => {
    const moved = resized({ ...design, edits: [1, 2], start: 5 }, 8, 6);
    expect(moved).toMatchObject({ width: 8, height: 6, edits: [], start: 0, exits: [{ cell: 47, line: '' }] });
  });
});

describe('a player link', () => {
  it('holds the maze, the way in, and each way out with its line', async () => {
    const puzzle = readPuzzle(JSON.parse(JSON.stringify(await toPuzzle({ ...design, exits: [...design.exits, { cell: 9, line: 'The kitchen.' }] }))))!;
    expect(mazeIn(puzzle)).toEqual(mazeOf(design));
    expect(puzzle.exits).toEqual([
      { cell: 99, line: 'The smugglers’ door.' },
      { cell: 9, line: 'The kitchen.' },
    ]);
    expect(puzzle.light).toBe('lantern');
    expect(puzzle.reach).toBe(2);
    expect(readPuzzle(JSON.parse(JSON.stringify(await toPuzzle({ ...design, light: 'dark', reach: 3 }))))?.reach).toBe(3);
  });

  it('opens a link made before how far they see could be chosen, seeing as far as it did', async () => {
    const { reach: _, ...before } = JSON.parse(JSON.stringify(await toPuzzle(design)));
    expect(readPuzzle(before)?.reach).toBe(2);
    expect(readPuzzle({ ...before, light: 'dark' })?.reach).toBe(0);
  });

  it('fits in a Discord message, even the largest', async () => {
    const largest = { ...resized(design, 30, 30), exits: [899, 29, 870, 450].map((cell) => ({ cell, line: 'A long line for this way out, as a game master might write.' })) };
    expect(`https://daedalus.invigoro.me/${await playerHash('maze', await toPuzzle(largest))}`.length).toBeLessThan(2000);
  });

  it('turns away what’s been tampered with', async () => {
    const puzzle = JSON.parse(JSON.stringify(await toPuzzle(design)));
    for (const junk of [{ ...puzzle, width: 3 }, { ...puzzle, walls: 'AAAA' }, { ...puzzle, exits: [] }, { ...puzzle, start: 100 }, { ...puzzle, light: 'dim' }, { ...puzzle, reach: 11 }, { ...puzzle, reach: 'far' }, { ...puzzle, salt: '' }]) {
      expect(readPuzzle(junk)).toBeNull();
    }
    expect(wallCount(puzzle)).toBe(180);
  });

  it('reads back a player’s progress, if it fits the maze', async () => {
    const puzzle = await toPuzzle(design);
    expect(readProgress(puzzle, { at: 3, steps: 3, visited: [0, 1, 2, 3], out: null })).toEqual({ at: 3, steps: 3, visited: [0, 1, 2, 3], out: null });
    for (const junk of [{ at: 100, steps: 0, visited: [], out: null }, { at: 0, steps: 0, visited: [], out: 1 }, null]) expect(readProgress(puzzle, junk)).toBeNull();
  });
});
