import { describe, expect, it } from 'vitest';
import { playerHash } from '../../kit/route';
import { lettersOf, newDesign, problemsOf, readDesign, shapeOf, tilesOf, toPuzzle, type GuessDesign } from './design';
import { mark } from './engine/marking';
import { check, lineFor, readProgress, readPuzzle } from './puzzle';

// A made-up answer, never a game master's own.
const design: GuessDesign = {
  ...newDesign(),
  words: { title: 'The smith’s door', intro: 'Name the tree.', success: 'The door swings open.' },
  answer: 'Iron wood',
  seed: 7,
};

describe('a design', () => {
  it('can’t be sent without an answer of two letters or more, nor one too long', () => {
    expect(problemsOf(newDesign())).toEqual(['Write an answer of two letters or more.']);
    expect(problemsOf({ ...design, answer: 'A!' })).toHaveLength(1);
    expect(problemsOf({ ...design, answer: 'x'.repeat(31) })).toEqual(['Keep the answer to 30 letters.']);
    expect(problemsOf(design)).toEqual([]);
  });

  it('reads back, and puts right whatever’s malformed', () => {
    expect(readDesign(JSON.parse(JSON.stringify(design)))).toEqual(design);
    const read = readDesign({ v: 1, answer: 7, letters: 'pictures', tries: 4, marking: 'colours', hints: 99, seed: -3 })!;
    expect(read.answer).toBe('');
    expect(read.letters).toBe('any');
    expect(read.tries).toBe(6);
    expect(read.marking).toBe('letters');
    expect(read.hints).toBe(0);
    for (const junk of [null, 'design', [], { ...design, v: 2 }]) expect(readDesign(junk)).toBeNull();
  });

  it('shows the words’ lengths, or one run of letters with the breaks hidden', () => {
    expect(lettersOf(design)).toBe('IRONWOOD');
    expect(shapeOf(design)).toEqual([4, 4]);
    expect(shapeOf({ ...design, breaks: false })).toEqual([8]);
    // Tiles always show where the words break.
    expect(shapeOf({ ...design, breaks: false, letters: 'tiles' })).toEqual([4, 4]);
  });

  it('shuffles tiles the same way for the same seed, and never into the answer', () => {
    for (let seed = 0; seed < 50; seed++) {
      const tiles = tilesOf({ ...design, seed });
      expect([...tiles].sort().join('')).toBe([...'IRONWOOD'].sort().join(''));
      expect(tiles).not.toBe('IRONWOOD');
    }
    expect(tilesOf(design)).toBe(tilesOf(design));
  });
});

describe('a player link', () => {
  it('never holds the answer, nor the line for solving it', async () => {
    for (const marking of ['letters', 'whole'] as const) {
      const held = JSON.stringify(await toPuzzle({ ...design, marking }));
      for (const plain of ['IRONWOOD', 'IRON', 'WOOD', 'Iron wood', 'swings open']) expect(held).not.toContain(plain);
    }
  });

  it('holds letter marks only when the game master marks letter by letter', async () => {
    expect((await toPuzzle({ ...design, marking: 'whole' })).marks).toBeUndefined();
    const marked = await toPuzzle(design);
    expect(marked.marks?.places).toHaveLength(8);
    // I, R, N, W, D once, O three times: six letters, each with its count.
    expect(marked.marks?.counts).toHaveLength(6);
  });

  it('holds the tiles, when there are tiles, and only the hints allowed', async () => {
    const puzzle = await toPuzzle({ ...design, letters: 'tiles', hints: 2 });
    expect(puzzle.tiles).toBe(tilesOf(design));
    expect(puzzle.hints).toEqual([
      [0, 'I'],
      [4, 'W'],
    ]);
  });

  it('reads back as it went, and turns away what’s been tampered with', async () => {
    const puzzle = JSON.parse(JSON.stringify(await toPuzzle({ ...design, letters: 'tiles', hints: 1 })));
    expect(readPuzzle(puzzle)).toEqual(puzzle);
    for (const junk of [
      { ...puzzle, shape: [] },
      { ...puzzle, shape: [40] },
      { ...puzzle, tiles: 'IRON' },
      { ...puzzle, tiles: 'ironwood' },
      { ...puzzle, hints: [[9, 'X']] },
      { ...puzzle, sealed: null },
      { ...puzzle, tries: -1 },
      null,
    ]) {
      expect(readPuzzle(junk)).toBeNull();
    }
  });

  it('fits in a Discord message', async () => {
    const long = { ...design, answer: 'The ironwood of the northern shore', hints: 5, letters: 'tiles' as const };
    expect(`https://daedalus.invigoro.me/${await playerHash('word-guess', await toPuzzle(long))}`.length).toBeLessThan(2000);
  });
});

describe('checking a try', () => {
  it('knows the answer, and opens the line for solving it with it', async () => {
    const puzzle = await toPuzzle(design);
    expect(await check(puzzle, 'IRONWOOD')).toEqual({ right: true, marks: Array(8).fill('right') });
    expect(await lineFor(puzzle, 'IRONWOOD')).toBe('The door swings open.');
  });

  it('marks letter by letter from the fingerprints, as the maker marks from the answer', async () => {
    const puzzle = await toPuzzle(design);
    for (const guess of ['WOODIRON', 'OOOOOOOO', 'NORTHERN', 'IRONWORD']) {
      expect(await check(puzzle, guess)).toEqual({ right: false, marks: mark(guess, 'IRONWOOD') });
    }
  });

  it('says only right or wrong, when that’s all it should', async () => {
    const puzzle = await toPuzzle({ ...design, marking: 'whole' });
    expect(await check(puzzle, 'WOODIRON')).toEqual({ right: false, marks: null });
  });
});

describe('progress', () => {
  it('reads back tries of the right length, no more than the puzzle allows', async () => {
    const puzzle = await toPuzzle({ ...design, tries: 3, hints: 1 });
    expect(readProgress(puzzle, { tries: ['WOODIRON'], hints: 1 })).toEqual({ tries: ['WOODIRON'], hints: 1 });
    for (const junk of [
      { tries: ['WOOD'], hints: 0 },
      { tries: ['A', 'B', 'C', 'D'].map((letter) => letter.repeat(8)), hints: 0 },
      { tries: [], hints: 2 },
      null,
    ]) {
      expect(readProgress(puzzle, junk)).toBeNull();
    }
  });
});
