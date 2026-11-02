import { describe, expect, it } from 'vitest';
import { LONGEST, readWords, tidyWords } from './words';

const FALLBACK = { title: 'A puzzle', intro: '', success: 'Solved.' };

describe('readWords', () => {
  it('keeps words that are text and short enough', () => {
    const words = { title: 'The door', intro: 'Speak, friend.', success: 'It opens.' };
    expect(readWords(words, FALLBACK)).toEqual(words);
  });

  it('falls back for each that’s missing, not text, or too long', () => {
    expect(readWords({ title: 42, intro: 'x'.repeat(LONGEST.intro + 1), success: 'It opens.' }, FALLBACK)).toEqual({
      ...FALLBACK,
      success: 'It opens.',
    });
    for (const junk of [null, 'words', [], 7]) expect(readWords(junk, FALLBACK)).toEqual(FALLBACK);
  });
});

describe('tidyWords', () => {
  it('trims each end', () => {
    expect(tidyWords({ title: ' The door ', intro: '\nSpeak.\n', success: ' ' })).toEqual({ title: 'The door', intro: 'Speak.', success: '' });
  });
});
