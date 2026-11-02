import { describe, expect, it } from 'vitest';
import { hintOrder, lettersIn, wordsIn } from './letters';
import { bestMarks, mark, markBy } from './marking';

describe('wordsIn', () => {
  it('reads words as capitals, accents off, anything but letters left out', () => {
    expect(wordsIn('  Open Sésame! ')).toEqual(['OPEN', 'SESAME']);
    expect(wordsIn("Fi'nwë 3rd")).toEqual(['FINWE', 'RD']);
    expect(lettersIn('Iron wood')).toBe('IRONWOOD');
    expect(wordsIn('?! 42')).toEqual([]);
  });
});

describe('hintOrder', () => {
  it('gives each word’s first letter, then the rest from the left', () => {
    expect(hintOrder([4, 6])).toEqual([0, 4, 1, 2, 3, 5, 6, 7, 8, 9]);
    expect(hintOrder([3])).toEqual([0, 1, 2]);
  });
});

describe('mark', () => {
  const marks = (guess: string, answer: string) => mark(guess, answer).map((one) => one[0]).join('');

  it('marks letters right, elsewhere, or absent', () => {
    expect(marks('CRANE', 'CRATE')).toBe('rrrar');
    expect(marks('TRACE', 'CRATE')).toBe('errer');
    expect(marks('ABCDE', 'VWXYZ')).toBe('aaaaa');
  });

  it('marks a repeated letter elsewhere only as often as the answer has it left', () => {
    // The answer has one E, in place at the end, so the first two Es aren't in it; the R is, elsewhere.
    expect(marks('EERIE', 'CRATE')).toBe('aaear');
    // One E elsewhere, and the second E absent.
    expect(marks('EEXXX', 'ABCDE')).toBe('eaaaa');
    // The answer has two Ls, neither where the try has them.
    expect(marks('LLAMA', 'HELLO')).toBe('eeaaa');
  });

  it('marks the same without the answer, from where letters are right and how many of each there are', () => {
    for (const [guess, answer] of [
      ['CRANE', 'CRATE'],
      ['EERIE', 'CRATE'],
      ['LLAMA', 'HELLO'],
      ['SPEED', 'ERASE'],
    ]) {
      const rightAt = [...guess].map((letter, at) => answer[at] === letter);
      const countOf = (letter: string) => [...answer].filter((other) => other === letter).length;
      expect(markBy(guess, rightAt, countOf)).toEqual(mark(guess, answer));
    }
  });
});

describe('bestMarks', () => {
  it('keeps the best each letter has had', () => {
    const best = bestMarks([
      { guess: 'TRACE', marks: mark('TRACE', 'CRATE') },
      { guess: 'CRANE', marks: mark('CRANE', 'CRATE') },
    ]);
    expect(best.get('C')).toBe('right');
    expect(best.get('T')).toBe('elsewhere');
    expect(best.get('N')).toBe('absent');
    expect(best.has('Z')).toBe(false);
  });
});
