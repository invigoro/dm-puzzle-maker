import { describe, expect, it } from 'vitest';
import { decipher, encipher, type Key } from './cipher';
import { inFives, lettersOf, plainOf } from './letters';
import { mixOrder, PICTURE_CHOICES, RUNES, ringOf, symbolsOf } from './rings';

describe('letters', () => {
  it('makes a message plain: capitals, no accents, its lines run into one', () => {
    expect(plainOf('  Meet at the mill.\nGo — Sésame!  ')).toBe('MEET AT THE MILL. GO — SESAME!');
    expect(plainOf('Straße')).toBe('STRASSE');
    expect(lettersOf('Meet at the mill. Go!')).toBe('MEETATTHEMILLGO');
  });

  it('runs the letters on in groups of five', () => {
    expect(inFives('Meet at the mill!')).toBe('MEETA TTHEM ILL');
    expect(inFives('...')).toBe('');
  });
});

describe('the rings', () => {
  it('has 26 runes, each once', () => {
    expect(RUNES).toHaveLength(26);
    expect(new Set(RUNES).size).toBe(26);
  });

  it('mixes a ring by a keyword: its letters once each, then the rest in order', () => {
    expect(ringOf(symbolsOf('letters', []), 'Dragon').join('')).toBe('DRAGONBCEFHIJKLMPQSTUVWXYZ');
    expect(ringOf(symbolsOf('letters', []), 'ADDER').join('')).toBe('ADERBCFGHIJKLMNOPQSTUVWXYZ');
    expect(mixOrder('')).toEqual(Array.from({ length: 26 }, (_, i) => i));
    // Runes and pictures are mixed the same way, each standing for its letter.
    expect(ringOf(RUNES, 'BA').slice(0, 3)).toEqual([RUNES[1], RUNES[0], RUNES[2]]);
  });

  it('has more than enough pictures for 🎲 to fill a ring, each once', () => {
    expect(PICTURE_CHOICES.length).toBeGreaterThan(26);
    expect(new Set(PICTURE_CHOICES).size).toBe(PICTURE_CHOICES.length);
  });
});

describe('the cipher', () => {
  const ONE: Key = { method: 'one', setting: 3 };

  it('writes each letter as the symbol under it, with the mark under the setting’s letter', () => {
    // With the mark under D, A is written as the inner ring's 24th symbol (X, on a ring in order).
    expect(encipher('ATTACK AT DAWN!', ONE)).toBe('XQQXZH XQ AXTK!');
    expect(encipher('ATTACK', { method: 'one', setting: 0 })).toBe('ATTACK');
  });

  it('turns a letter on after every letter, or every word', () => {
    expect(encipher('AAAA', { method: 'turning', setting: 0, step: 'letter' })).toBe('AZYX');
    expect(encipher('AB AB  — AB', { method: 'turning', setting: 1, step: 'word' })).toBe('ZA YZ  — XY');
  });

  it('reads a keyword’s letters round and round, skipping what isn’t a letter', () => {
    expect(encipher('ATTACK', { method: 'keyword', keyword: 'key' })).toBe('QPVQYM');
    expect(encipher('AT TACK.', { method: 'keyword', keyword: 'K-E-Y' })).toBe('QP VQYM.');
  });

  it('reads autokey’s starting word, then the message’s own letters', () => {
    expect(encipher('ATTACK', { method: 'autokey', primer: 'Salt' })).toBe('ITIHCR');
  });

  it('reads every cipher back', () => {
    const message = plainOf('The tide turns at midnight. Bring the lantern to the old mill, and come alone!');
    const keys: Key[] = [
      ONE,
      { method: 'turning', setting: 7, step: 'letter' },
      { method: 'turning', setting: 20, step: 'word' },
      { method: 'autokey', primer: 'SALT' },
      { method: 'keyword', keyword: 'LANTERN' },
    ];
    for (const key of keys) {
      const cipher = encipher(message, key);
      expect(cipher).not.toBe(message);
      expect(decipher(cipher, key)).toBe(message);
    }
  });
});
