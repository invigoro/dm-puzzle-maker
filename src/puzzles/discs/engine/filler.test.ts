import { describe, expect, it } from 'vitest';
import { mulberry32 } from '../../../kit/rng';
import { fillBlanks, PLACE_HALVES } from './filler';

const blanks = (n: number) => Array.from({ length: n }, () => '');

describe('PLACE_HALVES', () => {
  it('are short words in capitals, each once', () => {
    for (const half of PLACE_HALVES) expect(half).toMatch(/^[A-Z]{2,7}$/);
    expect(new Set(PLACE_HALVES).size).toBe(PLACE_HALVES.length);
    expect(PLACE_HALVES.length).toBeGreaterThan(100);
  });
});

describe('fillBlanks', () => {
  it('fills only the blanks, keeping what the game master wrote', () => {
    const filled = fillBlanks(['Moonrise', '', '  ', 'tide'], [], mulberry32(1));
    expect(filled[0]).toBe('Moonrise');
    expect(filled[3]).toBe('tide');
    for (const half of filled.slice(1, 3)) expect(PLACE_HALVES).toContain(half);
  });

  it('never repeats a half, or uses one already on the board, whatever its case', () => {
    const taken = ['frost', 'Wick', 'EMBER'];
    for (let seed = 0; seed < 50; seed++) {
      const filled = fillBlanks(['Raven', ...blanks(29)], taken, mulberry32(seed));
      expect(new Set(filled.map((half) => half.toUpperCase())).size).toBe(30);
      for (const used of ['FROST', 'WICK', 'EMBER']) expect(filled).not.toContain(used);
      expect(filled.filter((half) => half.toUpperCase() === 'RAVEN')).toEqual(['Raven']);
    }
  });

  it('changes only the blank that had a half, when the game master writes that half elsewhere', () => {
    const before = fillBlanks(blanks(30), [], mulberry32(8));
    const after = fillBlanks(blanks(30), [before[12].toLowerCase()], mulberry32(8));
    expect(after.filter((half, i) => half !== before[i])).toHaveLength(1);
    expect(after[12]).not.toBe(before[12]);
  });

  it('fills the same way for the same seed', () => {
    expect(fillBlanks(blanks(30), [], mulberry32(5))).toEqual(fillBlanks(blanks(30), [], mulberry32(5)));
    expect(fillBlanks(blanks(30), [], mulberry32(5))).not.toEqual(fillBlanks(blanks(30), [], mulberry32(6)));
  });
});
