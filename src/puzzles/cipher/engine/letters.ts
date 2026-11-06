/** The letters a cipher works on: capitals A to Z, with accents taken off. Everything else stays as it is. */

export const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';

export const isLetter = (char: string) => char.length === 1 && char >= 'A' && char <= 'Z';

/** A letter's place in the alphabet: A is 0. */
export const indexOf = (letter: string) => letter.charCodeAt(0) - 65;

/** The letter at a place in the alphabet, counting round: 26 is A again, and -1 is Z. */
export const letterAt = (index: number) => ALPHABET[((index % 26) + 26) % 26];

/** A message as it's put in cipher: in capitals, accents taken off, and its lines run into one: "Meet at the mill.\nGo" is "MEET AT THE MILL. GO". */
export const plainOf = (text: string) =>
  text
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toUpperCase()
    .replace(/\s+/g, ' ')
    .trim();

/** A text's letters alone, run together: what an answer is compared by. */
export const lettersOf = (text: string) => plainOf(text).replace(/[^A-Z]/g, '');

/** A text's letters alone, in groups of five: "MEETA TTHEM ILL". */
export const inFives = (text: string) => lettersOf(text).match(/.{1,5}/g)?.join(' ') ?? '';
