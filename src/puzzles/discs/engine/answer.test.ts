import { describe, expect, it } from 'vitest';
import { mulberry32 } from '../../../kit/rng';
import { answerKey, answerKeys, glowKeys, glowKeysAt, holdsAPair, keyOf, lit, pairsInPlace, piecesOf, type Content } from './answer';
import { swap, turn } from './board';
import { FLOWER } from './layout';
import { solvedBoard } from './scramble';

const NAMES = ['FROST WICK', 'EMBER FALL', 'RAVEN SPIRE', 'SALT HAVEN', 'IRON DEEP', 'WILLOW MERE'];
const content: Content = {
  pairs: NAMES.map((name) => name.split(' ').map((text) => ({ text })) as [{ text: string }, { text: string }]),
  filler: Array.from({ length: 30 }, (_, i) => ({ text: `filler ${i}` })),
};
const pieces = piecesOf(content);
const solved = solvedBoard(FLOWER, content, mulberry32(1));
const key = (board: readonly number[]) => answerKey(FLOWER, pieces, board);

describe('keyOf', () => {
  it('reads a piece in capitals, with its spacing tidied', () => {
    expect(keyOf({ text: '  frost ' })).toBe('FROST');
    expect(keyOf({ text: 'St   Mary' })).toBe('ST MARY');
  });
});

describe('answer keys', () => {
  it('count the pairs in order from the mark', () => {
    expect(answerKeys(content, false)).toEqual([key(solved)]);
  });

  it('count a pair either way round', () => {
    const flipped = swap(FLOWER, solved, FLOWER.goals[2]);
    expect(flipped).not.toEqual(solved);
    expect(key(flipped)).toBe(key(solved));
  });

  it('don’t count the pairs in the wrong order, or filler moved off the answer', () => {
    expect(answerKeys(content, false)).not.toContain(key(turn(FLOWER, solved, 0, 1)));
    // Turning an outer disc takes its half away from the centre.
    expect(answerKeys(content, false)).not.toContain(key(turn(FLOWER, solved, 1, 1)));
  });

  it('count the pairs from any goal contact, with any start', () => {
    // Turning the centre and every outer disc's pieces round with it keeps the pairs together, one contact on.
    const keys = answerKeys(content, true);
    expect(keys).toHaveLength(6);
    expect(keys).toContain(key(solved));
    const moved = [...solved];
    FLOWER.goals.forEach((goal, i) => {
      const next = FLOWER.contacts[FLOWER.goals[(i + 1) % 6]];
      moved[next.a] = solved[FLOWER.contacts[goal].a];
      moved[next.b] = solved[FLOWER.contacts[goal].b];
    });
    expect(keys).toContain(key(moved));
    expect(answerKeys(content, false)).not.toContain(key(moved));
  });

  it('let pieces that look alike stand in for each other', () => {
    const lookalike: Content = { ...content, filler: [{ text: 'frost' }, ...content.filler.slice(1)] };
    const board = [...solved];
    const frost = board.indexOf(0);
    const other = board.indexOf(12);
    [board[frost], board[other]] = [board[other], board[frost]];
    expect(answerKeys(lookalike, false)).toContain(answerKey(FLOWER, piecesOf(lookalike), board));
  });
});

describe('lit', () => {
  it('lights each name where it counts: at its own contact, or with any start, at any', () => {
    expect(lit(FLOWER, content, solved, false)).toEqual([0, 1, 2, 3, 4, 5]);
    expect(lit(FLOWER, content, turn(FLOWER, solved, 1, 1), false)).toEqual([1, 2, 3, 4, 5]);
    // Every name moved one contact on keeps its pair, but only counts where it is with any start.
    const moved = [...solved];
    FLOWER.goals.forEach((goal, i) => {
      const next = FLOWER.contacts[FLOWER.goals[(i + 1) % 6]];
      moved[next.a] = solved[FLOWER.contacts[goal].a];
      moved[next.b] = solved[FLOWER.contacts[goal].b];
    });
    expect(lit(FLOWER, content, moved, false)).toEqual([]);
    expect(lit(FLOWER, content, moved, true)).toEqual([0, 1, 2, 3, 4, 5]);
  });

  it('checks a board by the same keys the link holds', () => {
    expect(glowKeysAt(FLOWER, pieces, solved, false)).toEqual(glowKeys(content, false));
    expect(new Set(glowKeysAt(FLOWER, pieces, solved, true))).toEqual(new Set(glowKeys(content, true)));
  });
});

describe('pairsInPlace', () => {
  it('finds the goal contacts holding the pair that belongs there', () => {
    expect(pairsInPlace(FLOWER, content, solved)).toEqual([0, 1, 2, 3, 4, 5]);
    // Turning the centre moves its halves away from their partners, all six.
    expect(pairsInPlace(FLOWER, content, turn(FLOWER, solved, 0, 1))).toEqual([]);
    // Turning the top disc moves only the first name's outer half away.
    expect(pairsInPlace(FLOWER, content, turn(FLOWER, solved, 1, 1))).toEqual([1, 2, 3, 4, 5]);
  });
});

describe('holdsAPair', () => {
  it('finds a pair at a goal contact, wherever it belongs', () => {
    expect(holdsAPair(FLOWER, content, solved)).toBe(true);
    expect(holdsAPair(FLOWER, content, turn(FLOWER, solved, 0, 1))).toBe(false);
  });
});
