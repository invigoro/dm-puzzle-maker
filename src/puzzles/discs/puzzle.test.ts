import { describe, expect, it } from 'vitest';
import { newDesign, toPuzzle, type DiscsDesign } from './design';
import { turn } from './engine/board';
import { FLOWER } from './engine/layout';
import { progressKey, readProgress, readPuzzle } from './puzzle';

const design: DiscsDesign = {
  ...newDesign(),
  pairs: [
    [{ text: 'Ashen' }, { text: 'mark' }],
    [{ text: 'Gull' }, { text: 'ford' }],
    [{ text: 'Thistle' }, { text: 'down' }],
    [{ text: 'Copper' }, { text: 'vale' }],
    [{ text: 'Lantern' }, { text: 'wold' }],
    [{ text: 'Hob' }, { text: 'marsh' }],
  ],
};
const sent = async () => JSON.parse(JSON.stringify(await toPuzzle(design)));

describe('readPuzzle', () => {
  it('reads what a player link holds', async () => {
    const puzzle = await sent();
    expect(readPuzzle(puzzle)).toEqual(puzzle);
  });

  it('turns away a link that’s been tampered with or cut short', async () => {
    const puzzle = await sent();
    const broken = [
      { ...puzzle, v: 2 },
      { ...puzzle, layout: 'square' },
      // Forty-two pieces are seven discs' worth, not three's.
      { ...puzzle, layout: 'trefoil' },
      { ...puzzle, pieces: puzzle.pieces.slice(1) },
      { ...puzzle, pieces: ['X'.repeat(40), ...puzzle.pieces.slice(1)] },
      { ...puzzle, salt: '' },
      { ...puzzle, answers: [] },
      { ...puzzle, answers: Array(7).fill(puzzle.answers[0]) },
      { ...puzzle, icons: ['stone-tower'] },
      { ...puzzle, icons: puzzle.pieces.map(() => '../../index') },
      { ...puzzle, icons: 'stone-tower' },
      null,
      [],
      'puzzle',
    ];
    for (const junk of broken) expect(readPuzzle(junk)).toBeNull();
  });

  it('reads each piece’s picture, when there are any', async () => {
    const puzzle = await sent();
    const icons = puzzle.pieces.map((_: string, i: number) => (i === 3 ? 'stone-tower' : ''));
    expect(readPuzzle({ ...puzzle, icons })?.icons).toEqual(icons);
  });

  it('leaves out words that aren’t text', async () => {
    expect(readPuzzle({ ...(await sent()), words: { title: 7 } })!.words).toEqual({ title: '', intro: '', success: '' });
  });
});

describe('progress', () => {
  const board = turn(FLOWER, Array.from({ length: 42 }, (_, i) => i), 1, 1);

  it('reads back a board and its moves', () => {
    const progress = { board, moves: [{ kind: 'turn', disc: 1, by: 1 }] };
    expect(readProgress(FLOWER, JSON.parse(JSON.stringify(progress)))).toEqual(progress);
  });

  it('turns away anything else', () => {
    for (const junk of [null, {}, { board }, { board: board.slice(1), moves: [] }, { board, moves: [{ kind: 'fly' }] }]) {
      expect(readProgress(FLOWER, junk)).toBeNull();
    }
  });

  it('is kept apart for each link', async () => {
    expect(progressKey(await toPuzzle(design))).not.toBe(progressKey(await toPuzzle(design)));
  });
});
