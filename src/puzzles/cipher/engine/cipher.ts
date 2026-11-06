/**
 * Putting a message in cipher with the wheel, and back. The outer ring holds the alphabet, fixed;
 * the inner ring holds the cipher's 26 symbols, and turns. The first symbol on the inner ring has a
 * mark, and the wheel's setting is the outer letter the mark sits under: at A, each symbol sits
 * under the letter of its own place. With the mark under M, a letter P is written as the inner
 * symbol under it, the one at place P − M; and read back as P = place + M.
 *
 * How the setting moves along the message is the cipher's key:
 * - **one setting:** the same for every letter, as a Caesar wheel's
 * - **turning as it goes:** a letter on after every letter, or every word
 * - **autokey:** the letters of a starting word, then the message's own letters, each read
 * - **a keyword:** the keyword's letters, round and round, as Vigenère's cipher has
 */
import { indexOf, isLetter, letterAt, lettersOf } from './letters';

export type Method = 'one' | 'turning' | 'autokey' | 'keyword';
/** When the wheel turns as it goes: after every letter, or every word. */
export type Step = 'letter' | 'word';

export type Key =
  | { method: 'one'; setting: number }
  | { method: 'turning'; setting: number; step: Step }
  | { method: 'autokey'; primer: string }
  | { method: 'keyword'; keyword: string };

export const METHODS: readonly Method[] = ['one', 'turning', 'autokey', 'keyword'];

/**
 * The wheel's setting for a message's letter: which outer letter the mark sits under, from 0 for
 * A. `letter` and `word` count the letters and words before it, and `plain` holds the message's
 * letters so far, which autokey reads its key from.
 */
function settingAt(key: Key, letter: number, word: number, plain: readonly number[]): number {
  switch (key.method) {
    case 'one':
      return key.setting;
    case 'turning':
      return key.setting + (key.step === 'letter' ? letter : word);
    case 'autokey': {
      const primer = lettersOf(key.primer);
      if (primer.length === 0) return 0;
      return letter < primer.length ? indexOf(primer[letter]) : plain[letter - primer.length];
    }
    case 'keyword': {
      const keyword = lettersOf(key.keyword);
      return keyword.length === 0 ? 0 : indexOf(keyword[letter % keyword.length]);
    }
  }
}

/**
 * Goes along a text a letter at a time, each with the wheel's setting for it, and makes each
 * letter anew. Words are what spaces part, so a word with no letters ("—") counts for none.
 */
function along(text: string, key: Key, make: (letter: number, setting: number) => { out: number; plain: number }): string {
  const out: string[] = [];
  const plain: number[] = [];
  let word = 0;
  let inWord = false;
  for (const char of text) {
    if (isLetter(char)) {
      const made = make(indexOf(char), settingAt(key, plain.length, word, plain));
      plain.push(made.plain);
      out.push(letterAt(made.out));
      inWord = true;
    } else {
      out.push(char);
      if (char === ' ' && inWord) {
        word++;
        inWord = false;
      }
    }
  }
  return out.join('');
}

/**
 * A message in cipher. It must already be plain (see `plainOf`): each letter becomes the place, on
 * the inner ring, of the symbol written for it, as a letter (A for the first place, Z for the
 * last), and everything else stays.
 */
export const encipher = (plain: string, key: Key) => along(plain, key, (letter, setting) => ({ out: letter - setting, plain: letter }));

/** A message read back from its cipher: each inner ring's place becomes the letter it sits under. */
export const decipher = (cipher: string, key: Key) =>
  along(cipher, key, (place, setting) => {
    const letter = (((place + setting) % 26) + 26) % 26;
    return { out: letter, plain: letter };
  });
