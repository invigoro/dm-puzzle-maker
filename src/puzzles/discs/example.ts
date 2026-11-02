/** A puzzle to start from, with made-up towns: never a game master's own. */
import type { Words } from '../../kit/words';

export const EXAMPLE: { words: Words; pairs: [string, string][] } = {
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
};
