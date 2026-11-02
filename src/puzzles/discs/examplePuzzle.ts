/** A puzzle to try before making one, with made-up towns: never a game master's own. */
import { mulberry32 } from '../../kit/rng';
import { answerKeys, piecesOf, type Content, type Piece } from './engine/answer';
import type { Board } from './engine/board';
import { fillBlanks } from './engine/filler';
import { FLOWER, positionCount } from './engine/layout';
import { scramble } from './engine/scramble';

export const EXAMPLE = {
  title: 'The road-stone of the Vale',
  intro:
    'Six towns stand round the Vale. The stone names them from the north, sunwise: Frostwick, Emberfall, Ravenspire, Salthaven, Irondeep and Willowmere. Spell them round the centre disc, the first where its arrow points.',
  success: 'The stone grinds round, and a stair opens beneath it.',
  pairs: [
    ['FROST', 'WICK'],
    ['EMBER', 'FALL'],
    ['RAVEN', 'SPIRE'],
    ['SALT', 'HAVEN'],
    ['IRON', 'DEEP'],
    ['WILLOW', 'MERE'],
  ],
} as const;

export interface ExamplePuzzle {
  content: Content;
  pieces: Piece[];
  start: Board;
  /** The answer keys that count. */
  keys: string[];
}

/** The example with its filler and its start, the same for the same seed. */
export function examplePuzzle(seed: number): ExamplePuzzle {
  const random = mulberry32(seed);
  const halves = EXAMPLE.pairs.flat();
  const filler = fillBlanks(Array(positionCount(FLOWER) - halves.length).fill(''), halves, random);
  const content: Content = {
    pairs: EXAMPLE.pairs.map(([first, second]) => [{ text: first }, { text: second }] as const),
    filler: filler.map((text) => ({ text })),
  };
  return { content, pieces: piecesOf(content), start: scramble(FLOWER, content, random), keys: answerKeys(content, false) };
}
