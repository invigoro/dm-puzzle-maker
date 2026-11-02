import { describe, expect, it } from 'vitest';
import { mulberry32 } from '../../../kit/rng';
import type { Piece } from './answer';
import { fillBlanks, PLACE_HALVES } from './filler';

const blanks = (n: number): Piece[] => Array.from({ length: n }, () => ({ text: '' }));
const texts = (pieces: Piece[]) => pieces.map((piece) => piece.text);

describe('PLACE_HALVES', () => {
  it('are short words in capitals, each once', () => {
    for (const half of PLACE_HALVES) expect(half).toMatch(/^[A-Z]{2,7}$/);
    expect(new Set(PLACE_HALVES).size).toBe(PLACE_HALVES.length);
    expect(PLACE_HALVES.length).toBeGreaterThan(100);
  });
});

describe('fillBlanks', () => {
  it('fills only the blanks, keeping what the game master wrote or pictured', () => {
    const filled = fillBlanks([{ text: 'Moonrise' }, { text: '' }, { text: '  ' }, { text: '', icon: 'stone-tower' }], [], mulberry32(1));
    expect(filled[0]).toEqual({ text: 'Moonrise' });
    expect(filled[3]).toEqual({ text: '', icon: 'stone-tower' });
    for (const half of texts(filled.slice(1, 3))) expect(PLACE_HALVES).toContain(half);
  });

  it('never repeats a half, or uses one already on the board, whatever its case', () => {
    const taken = [{ text: 'frost' }, { text: 'Wick' }, { text: 'EMBER', icon: 'flame' }];
    for (let seed = 0; seed < 50; seed++) {
      const filled = texts(fillBlanks([{ text: 'Raven' }, ...blanks(29)], taken, mulberry32(seed)));
      expect(new Set(filled.map((half) => half.toUpperCase())).size).toBe(30);
      for (const used of ['FROST', 'WICK', 'EMBER']) expect(filled).not.toContain(used);
      expect(filled.filter((half) => half.toUpperCase() === 'RAVEN')).toEqual(['Raven']);
    }
  });

  it('changes only the blank that had a half, when the game master writes that half elsewhere', () => {
    const before = texts(fillBlanks(blanks(30), [], mulberry32(8)));
    const after = texts(fillBlanks(blanks(30), [{ text: before[12].toLowerCase() }], mulberry32(8)));
    expect(after.filter((half, i) => half !== before[i])).toHaveLength(1);
    expect(after[12]).not.toBe(before[12]);
  });

  it('fills the same way for the same seed', () => {
    expect(fillBlanks(blanks(30), [], mulberry32(5))).toEqual(fillBlanks(blanks(30), [], mulberry32(5)));
    expect(fillBlanks(blanks(30), [], mulberry32(5))).not.toEqual(fillBlanks(blanks(30), [], mulberry32(6)));
  });
});
