import { describe, expect, it } from 'vitest';
import { mulberry32 } from '../../../kit/rng';
import { answerKey, answerKeys, piecesOf, type Content } from './answer';
import { play, type Board } from './board';
import { FLOWER, positionCount } from './layout';
import { scramble, solvedBoard } from './scramble';
import { exchange, solve } from './solver';

const ordered: Board = Array.from({ length: positionCount(FLOWER) }, (_, i) => i);
const content: Content = {
  pairs: Array.from({ length: 6 }, (_, i) => [{ text: `first ${i}` }, { text: `second ${i}` }] as const),
  filler: Array.from({ length: 30 }, (_, i) => ({ text: `filler ${i}` })),
};

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

describe('solve', () => {
  it('solves every scramble, which is what makes any arrangement a fair start', () => {
    const pieces = piecesOf(content);
    const keys = answerKeys(content, false);
    for (let seed = 0; seed < 40; seed++) {
      const random = mulberry32(seed);
      const start = scramble(FLOWER, content, random);
      const target = solvedBoard(FLOWER, content, random);
      const end = solve(FLOWER, start, target).reduce((board, move) => play(FLOWER, board, move), start);
      expect(end).toEqual(target);
      expect(keys).toContain(answerKey(FLOWER, pieces, end));
    }
  });
});
