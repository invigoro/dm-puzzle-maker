/** The wheel's inner ring: its symbols, letters, runes or pictures, in order or mixed by a keyword. */
import { ALPHABET, indexOf, lettersOf } from './letters';

/** What the inner ring's symbols are. */
export type Script = 'letters' | 'runes' | 'pictures';
export const SCRIPTS: readonly Script[] = ['letters', 'runes', 'pictures'];

/**
 * The runes: the Elder Futhark's 24 in their own order, then two of the Anglo-Saxon (gar and ear),
 * to make 26. The font draws three of the Futhark's half height (kaunan, jera and ingwaz), so small
 * they'd pass for punctuation, so Anglo-Saxon runes of full height stand in their places (cen, gēr
 * and ior), each unlike the rest.
 */
export const RUNES: readonly string[] = [...'ᚠᚢᚦᚨᚱᚳᚷᚹᚺᚾᛁᛄᛇᛈᛉᛊᛏᛒᛖᛗᛚᛡᛞᛟᚸᛠ'];

/**
 * Pictures from game-icons.net that make a clear alphabet together, for 🎲 to fill a picture ring
 * from: each plain, and unlike the rest.
 */
export const PICTURE_CHOICES: readonly string[] = [
  'heraldic-sun',
  'feather',
  'star-formation',
  'flame',
  'water-drop',
  'anchor',
  'hourglass',
  'bow-arrow',
  'ring',
  'ankh',
  'horseshoe',
  'skeleton-key',
  'wolf-head',
  'owl',
  'raven',
  'cat',
  'oak-leaf',
  'acorn',
  'mushroom',
  'rose',
  'snowflake-1',
  'broadsword',
  'battle-axe',
  'imperial-crown',
  'two-coins',
  'eagle-emblem',
  'stag-head',
  'tooth',
  'sickle',
  'trident',
  'harp',
  'pentacle',
  'crossed-swords',
  'ringing-bell',
  'open-book',
  'jeweled-chalice',
  'sea-serpent',
  'ship-wheel',
  'all-seeing-eye',
  'big-wave',
  'pine-tree',
  'skull-crossed-bones',
];

/** The order a keyword mixes a ring in: its letters, each once, then the rest of the alphabet. DRAGON gives D R A G O N B C E F… */
export const mixOrder = (keyword: string): number[] => [...new Set([...lettersOf(keyword), ...ALPHABET])].map(indexOf);

/** The inner ring: 26 symbols, one for each letter A to Z, in that order, or mixed by a keyword. */
export const ringOf = (symbols: readonly string[], mix: string): string[] => mixOrder(mix).map((place) => symbols[place]);

/** The symbols for each letter, A to Z, in a script: a picture ring's are the game master's own. */
export const symbolsOf = (script: Script, pictures: readonly string[]): readonly string[] =>
  script === 'letters' ? [...ALPHABET] : script === 'runes' ? RUNES : pictures;
