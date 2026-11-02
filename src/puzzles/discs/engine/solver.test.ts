import { describe, expect, it } from 'vitest';
import { mulberry32 } from '../../../kit/rng';
import { answerKey, answerKeys, piecesOf, type Content } from './answer';
import { play, type Board } from './board';
import { FLOWER, LAYOUTS, positionCount, type Layout } from './layout';
import { scramble, solvedBoard } from './scramble';
import { exchange, solve } from './solver';

const ordered: Board = Array.from({ length: positionCount(FLOWER) }, (_, i) => i);
/** A layout's pieces: a pair for each goal contact, and filler for the rest. */
const contentFor = (layout: Layout): Content => ({
  pairs: layout.goals.map((_, i) => [{ text: `first ${i}` }, { text: `second ${i}` }] as const),
  filler: Array.from({ length: positionCount(layout) - 2 * layout.goals.length }, (_, i) => ({ text: `filler ${i}` })),
});

describe('exchange', () => {
  it('swaps any two pieces on the board, and leaves the rest where they were', () => {
    for (const [p, q] of [
      [0, 6], // the centre and the top disc, touching
      [7, 13], // the top and upper right discs, touching
      [8, 26], // the top and bottom discs, by way of the centre
      [2, 5], // two spokes of the centre, by way of another disc
      [9, 10], // two spokes of the top disc
    ]) {
      const board = exchange(FLOWER, p, q).reduce((board, move) => play(FLOWER, board, move), ordered);
      const expected = [...ordered];
      [expected[p], expected[q]] = [q, p];
      expect(board).toEqual(expected);
    }
  });
});

describe.each(LAYOUTS.map((layout) => [layout.name, layout] as const))('solve, on %s', (_, layout) => {
  it('solves every scramble, which is what makes any arrangement a fair start', () => {
    const content = contentFor(layout);
    const pieces = piecesOf(content);
    const keys = answerKeys(content, false);
    for (let seed = 0; seed < 40; seed++) {
      const random = mulberry32(seed);
      const start = scramble(layout, content, random);
      const target = solvedBoard(layout, content, random);
      const end = solve(layout, start, target).reduce((board, move) => play(layout, board, move), start);
      expect(end).toEqual(target);
      expect(keys).toContain(answerKey(layout, pieces, end));
    }
  });
});
