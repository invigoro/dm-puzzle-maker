/** A cipher as the game master makes it, message and key and all, and what its player link holds. */
import { fingerprint, newSalt } from '../../kit/check';
import { isIconName } from '../../kit/icons';
import { mulberry32, randomInt, randomSeed } from '../../kit/rng';
import { seal } from '../../kit/seal';
import { readWords, tidyWords, type Words } from '../../kit/words';
import { encipher, METHODS, type Key, type Method, type Step } from './engine/cipher';
import { scramble, substitute } from './engine/cryptogram';
import { indexOf, inFives, letterAt, lettersOf, plainOf } from './engine/letters';
import { ringOf, SCRIPTS, symbolsOf, type Script } from './engine/rings';
import { LONGEST_LINE, LONGEST_MESSAGE, type CipherPuzzle, type Checking } from './puzzle';

/** The choices for failing: never (0), or after so many wrong answers. */
export const FAIL_AFTER: readonly number[] = [0, 1, 2, 3, 5];
/** The longest keyword, starting word, mixing word or answer. */
export const LONGEST_WORD = 40;

export interface CipherDesign {
  v: 1;
  words: Words;
  /** The message, in the game master's own words. */
  message: string;
  script: Script;
  /** A picture for each letter, A to Z, when the script is pictures: '' for one not chosen yet. */
  pictures: string[];
  /** The word the inner ring is mixed by, or '' for its symbols in order. */
  mix: string;
  method: Method;
  /** The outer letter the mark sits under, from 0 for A: at one setting, and where turning as it goes starts. */
  setting: number;
  step: Step;
  /** Autokey's starting word. */
  primer: string;
  keyword: string;
  /** Whether the letters run on in groups of five, rather than keeping their spaces and punctuation. */
  groups: boolean;
  check: Checking;
  /** What the players must answer, when checking by an answer: a password the message gives. */
  password: string;
  wrongLine: string;
  failAfter: number;
  failLine: string;
  /** Whether the page reads the message for them, at the wheel's setting or with a keyword they give. */
  reading: boolean;
  /** A cryptogram's letters given away from the start, each once, as a fragment of a translation. */
  given: string;
  /** The seed for where the mark sits when the players first see the wheel, or for a cryptogram's scrambled alphabet. */
  seed: number;
}

export const NEW_WORDS: Words = { title: '', intro: '', success: 'The cipher gives up its meaning.' };

export function newDesign(): CipherDesign {
  const seed = randomSeed();
  return {
    v: 1,
    words: NEW_WORDS,
    message: '',
    script: 'runes',
    pictures: Array.from({ length: 26 }, () => ''),
    mix: '',
    method: 'one',
    setting: 1 + randomInt(mulberry32(seed), 25),
    step: 'letter',
    primer: '',
    keyword: '',
    groups: false,
    check: 'filled',
    password: '',
    wrongLine: '',
    failAfter: 0,
    failLine: 'The wheel locks fast, and will turn no more.',
    reading: false,
    given: '',
    seed,
  };
}

const lineIn = (value: unknown, longest: number, fallback: string) => (typeof value === 'string' ? value.slice(0, longest) : fallback);
const wordIn = (value: unknown) => lineIn(value, LONGEST_WORD, '');
const placeIn = (value: unknown) => (Number.isInteger(value) && (value as number) >= 0 && (value as number) < 26 ? (value as number) : 0);

/** A design from untrusted data, each field checked, with a new design's for any that's missing or malformed. */
export function readDesign(data: unknown): CipherDesign | null {
  if (!data || typeof data !== 'object' || Array.isArray(data)) return null;
  const input = data as Record<string, unknown>;
  if (input.v !== 1) return null;
  const fresh = newDesign();
  const pictures = Array.isArray(input.pictures) ? input.pictures : [];
  return {
    v: 1,
    words: readWords(input.words, NEW_WORDS),
    message: lineIn(input.message, LONGEST_MESSAGE, ''),
    script: SCRIPTS.includes(input.script as Script) ? (input.script as Script) : fresh.script,
    pictures: Array.from({ length: 26 }, (_, letter) => (isIconName(pictures[letter]) ? (pictures[letter] as string) : '')),
    mix: wordIn(input.mix),
    method: METHODS.includes(input.method as Method) ? (input.method as Method) : 'one',
    setting: placeIn(input.setting),
    step: input.step === 'word' ? 'word' : 'letter',
    primer: wordIn(input.primer),
    keyword: wordIn(input.keyword),
    groups: input.groups === true,
    check: input.check === 'none' || input.check === 'answer' ? input.check : 'filled',
    password: wordIn(input.password),
    wrongLine: lineIn(input.wrongLine, LONGEST_LINE, ''),
    failAfter: FAIL_AFTER.includes(input.failAfter as number) ? (input.failAfter as number) : 0,
    failLine: lineIn(input.failLine, LONGEST_LINE, fresh.failLine),
    reading: input.reading === true,
    given: [...new Set(lettersOf(wordIn(input.given)))].join(''),
    seed: Number.isInteger(input.seed) && (input.seed as number) >= 0 && (input.seed as number) < 2 ** 32 ? (input.seed as number) : 1,
  };
}

/** The design's key: how the wheel's setting moves along the message. A cryptogram has no wheel, so none. */
export function keyOf(design: CipherDesign): Key | null {
  switch (design.method) {
    case 'one':
      return { method: 'one', setting: design.setting };
    case 'turning':
      return { method: 'turning', setting: design.setting, step: design.step };
    case 'autokey':
      return { method: 'autokey', primer: design.primer };
    case 'keyword':
      return { method: 'keyword', keyword: design.keyword };
    case 'cryptogram':
      return null;
  }
}

/**
 * A cryptogram's alphabet: the symbol each letter, A to Z, is written as. Letters and runes are
 * scrambled from the seed, no letter written as itself; a picture is the one the game master chose
 * for its letter.
 */
export function alphabetOf(design: CipherDesign): string[] {
  const symbols = symbolsOf(design.script, design.pictures);
  if (design.script === 'pictures') return [...symbols];
  return scramble(mulberry32(design.seed)).map((place) => symbols[place]);
}

/**
 * The symbols, as the player link lists them: the wheel's inner ring, from the place with the mark
 * on; or a cryptogram's, sorted, so their order says nothing of which letter each is.
 */
export const ringOfDesign = (design: CipherDesign) =>
  design.method === 'cryptogram' ? [...alphabetOf(design)].sort() : ringOf(symbolsOf(design.script, design.pictures), design.mix);

/** Where each letter's symbol is, A to Z, among a cryptogram's symbols as the link lists them. */
const placesOf = (design: CipherDesign) => {
  const ring = ringOfDesign(design);
  return alphabetOf(design).map((symbol) => ring.indexOf(symbol));
};

/** The message in cipher, as the player link holds it: its letters standing for the places of their symbols. */
export function cipherOf(design: CipherDesign): string {
  const key = keyOf(design);
  const plain = plainOf(design.message);
  const cipher = key ? encipher(plain, key) : substitute(plain, placesOf(design));
  return design.groups ? inFives(cipher) : cipher;
}

/** A cryptogram's letters given away that are in its message, each as its symbol's place then the letter ("QE": Q's symbol is E), in order. */
export function givenOf(design: CipherDesign): string[] {
  if (design.method !== 'cryptogram') return [];
  const places = placesOf(design);
  const letters = new Set(lettersOf(design.message));
  return [...lettersOf(design.given)].filter((letter) => letters.has(letter)).map((letter) => `${letterAt(places[indexOf(letter)])}${letter}`).sort();
}

/** The message in cipher as the players see it, for a ring of letters: each place's letter. */
const shownOf = (design: CipherDesign) => {
  const ring = ringOfDesign(design);
  return cipherOf(design).replace(/[A-Z]/g, (place) => ring[place.charCodeAt(0) - 65]);
};

/** Where the mark sits when the players first see the wheel: from the seed, and never at the setting that reads it. A cryptogram has no wheel. */
export function startOf(design: CipherDesign): number {
  if (design.method === 'cryptogram') return 0;
  const random = mulberry32(design.seed);
  const reads = design.method === 'one' || design.method === 'turning';
  return reads ? (design.setting + 1 + randomInt(random, 25)) % 26 : randomInt(random, 26);
}

/** What's checked, as letters run together: the message's, or the answer's. */
export const checkedOf = (design: CipherDesign) => lettersOf(design.check === 'answer' ? design.password : design.message);

export function problemsOf(design: CipherDesign): string[] {
  const problems: string[] = [];
  if (lettersOf(design.message) === '') problems.push('Write the message the players are to read.');
  if (design.script === 'pictures' && (design.pictures.some((picture) => picture === '') || new Set(design.pictures).size < 26)) {
    problems.push('Give every letter a picture of its own, or 🎲 fill the rest.');
  }
  if (design.method === 'autokey' && lettersOf(design.primer) === '') problems.push('Give the starting word.');
  if (design.method === 'keyword' && lettersOf(design.keyword) === '') problems.push('Give the keyword.');
  if (design.method === 'turning' && design.step === 'word' && design.groups) {
    problems.push('Turning after every word needs the spaces kept, so the players can see the words.');
  }
  if (design.check === 'answer' && lettersOf(design.password) === '') problems.push('Give the answer the players must find.');
  if (design.method === 'cryptogram' && lettersOf(design.message) !== '' && [...lettersOf(design.message)].every((letter) => design.given.includes(letter))) {
    problems.push('Every letter of the message is given away: leave some for the players to find.');
  }
  // Only once the rest is sound, as a key that's missing reads nothing at all.
  if (problems.length === 0 && design.script === 'letters' && lettersOf(shownOf(design)) === lettersOf(design.message)) {
    problems.push('The message reads just as it is with this key: choose another.');
  }
  return problems;
}

/**
 * What a player link holds: the message in cipher, the inner ring, how the wheel moves (not the
 * key), and where it starts; or a cryptogram's symbols, sorted, and the letters given away. Checking
 * adds a slow fingerprint of what's checked, and the line for solving it sealed with it.
 */
export async function toPuzzle(design: CipherDesign): Promise<CipherPuzzle> {
  const words = tidyWords(design.words);
  const salt = newSalt();
  const checked = checkedOf(design);
  const given = givenOf(design);
  return {
    v: 1,
    // The line for solving it is sealed with what's checked, below, so only solving it opens it.
    words: { ...words, success: '' },
    script: design.script,
    ring: ringOfDesign(design),
    text: cipherOf(design),
    method: design.method,
    ...(design.method === 'turning' ? { step: design.step } : {}),
    start: startOf(design),
    check: design.check,
    // A cryptogram has no wheel to read at.
    ...(design.reading && design.method !== 'cryptogram' ? { reading: true as const } : {}),
    ...(given.length > 0 ? { given } : {}),
    salt,
    ...(design.check !== 'none' ? { answer: await fingerprint(checked, salt), sealed: await seal(words.success || 'Solved.', checked, salt) } : {}),
    ...(design.check === 'answer' ? { wrong: design.wrongLine.trim(), failAfter: design.failAfter, failLine: design.failLine.trim() } : {}),
  };
}
