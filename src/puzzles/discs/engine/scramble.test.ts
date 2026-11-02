import { describe, expect, it } from 'vitest';
import { mulberry32 } from '../../../kit/rng';
import { answerKey, answerKeys, holdsAPair, piecesOf, type Content } from './answer';
import { FLOWER } from './layout';
import { scramble, solvedBoard } from './scramble';

const content: Content = {
  pairs: Array.from({ length: 6 }, (_, i) => [{ text: `first ${i}` }, { text: `second ${i}` }] as const),
  filler: Array.from({ length: 30 }, (_, i) => ({ text: `filler ${i}` })),
};
const pieces = piecesOf(content);
const isSolved = (board: readonly number[]) => answerKeys(content, true).includes(answerKey(FLOWER, pieces, board));
const isArrangement = (board: readonly number[]) => [...board].sort((x, y) => x - y).join() === pieces.map((_, i) => i).join();

describe('solvedBoard', () => {
  it('puts every pair at its goal contact, and every piece somewhere', () => {
    const board = solvedBoard(FLOWER, content, mulberry32(4));
    expect(isArrangement(board)).toBe(true);
    expect(answerKeys(content, false)).toContain(answerKey(FLOWER, pieces, board));
  });

  it('turns down content that doesn’t fit the layout', () => {
    expect(() => solvedBoard(FLOWER, { ...content, filler: content.filler.slice(1) }, mulberry32(1))).toThrow(/42 pieces/);
    expect(() => solvedBoard(FLOWER, { ...content, pairs: content.pairs.slice(1) }, mulberry32(1))).toThrow(/6 pairs/);
  });
});

describe('scramble', () => {
  it('places every piece, the same way for the same seed', () => {
    const board = scramble(FLOWER, content, mulberry32(9));
    expect(isArrangement(board)).toBe(true);
    expect(scramble(FLOWER, content, mulberry32(9))).toEqual(board);
    expect(scramble(FLOWER, content, mulberry32(10))).not.toEqual(board);
  });

  it('never starts a full scramble with a pair at a goal contact', () => {
    for (let seed = 0; seed < 300; seed++) expect(holdsAPair(FLOWER, content, scramble(FLOWER, content, mulberry32(seed)))).toBe(false);
  });

  it('mixes a light scramble a few moves from solved, and never leaves it solved', () => {
    for (let seed = 0; seed < 100; seed++) {
      const board = scramble(FLOWER, content, mulberry32(seed), 3);
      expect(isArrangement(board)).toBe(true);
      expect(isSolved(board)).toBe(false);
    }
  });
});
