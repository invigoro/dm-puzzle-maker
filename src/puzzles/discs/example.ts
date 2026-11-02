/** Puzzles to start from, one for each layout, with made-up towns: never a game master's own. */
import type { Words } from '../../kit/words';
import type { LayoutId } from './engine/layout';

export interface Example {
  words: Words;
  pairs: [string, string][];
}

export const EXAMPLES: Readonly<Record<LayoutId, Example>> = {
  flower: {
    words: {
      title: 'The road-stone of the Vale',
      intro:
        'Six towns stand round the Vale. The stone names them from the north, sunwise: Frostwick, Emberfall, Ravenspire, Salthaven, Irondeep and Willowmere. Spell them round the centre disc, the first where its arrow points.',
      success: 'The stone grinds round, and a stair opens beneath it.',
    },
    pairs: [
      ['Frost', 'wick'],
      ['Ember', 'fall'],
      ['Raven', 'spire'],
      ['Salt', 'haven'],
      ['Iron', 'deep'],
      ['Willow', 'mere'],
    ],
  },
  trefoil: {
    words: {
      title: 'The ferry-gate',
      intro:
        'Three towns share the crossing, named on the gate from the north, sunwise: Ashford, Gullhaven and Thornmere. Spell them where the discs meet, the first where the arrow points.',
      success: 'The gate swings open onto the landing.',
    },
    pairs: [
      ['Ash', 'ford'],
      ['Gull', 'haven'],
      ['Thorn', 'mere'],
    ],
  },
};
