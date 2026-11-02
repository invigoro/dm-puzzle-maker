import { shuffled, type Random } from '../../../kit/rng';
import { keyOf } from './answer';

/** Halves of place names, for filler: they read like the answer's own, so they hide it. */
export const PLACE_HALVES: readonly string[] = [
  'ALDER', 'AMBER', 'ANVIL', 'ASH', 'BARROW', 'BAY', 'BECK', 'BELL', 'BIRCH', 'BRACKEN', 'BRAMBLE', 'BRIAR', 'BROOK',
  'BURY', 'CAIRN', 'CASTLE', 'CHAPEL', 'CINDER', 'CLIFF', 'COLD', 'COMBE', 'COPPER', 'CRAG', 'CROFT', 'CROSS', 'CROW',
  'DALE', 'DEEP', 'DEN', 'DOWN', 'DUN', 'DUSK', 'EAST', 'EBON', 'ELM', 'EMBER', 'FALL', 'FALLOW', 'FELL', 'FEN', 'FERN',
  'FIELD', 'FIRTH', 'FLINT', 'FORD', 'FORGE', 'FROST', 'GALE', 'GARTH', 'GLEN', 'GLOOM', 'GOLD', 'GRANGE', 'GREY',
  'HALL', 'HAM', 'HARROW', 'HAVEN', 'HAWK', 'HEATH', 'HEDGE', 'HELM', 'HILL', 'HOLD', 'HOLLY', 'HOLM', 'HORN', 'HURST',
  'IRON', 'IVY', 'KEEP', 'KETTLE', 'KING', 'KNOLL', 'LAKE', 'LEA', 'LEY', 'LOCH', 'LONG', 'LOW', 'MARSH', 'MEAD',
  'MERE', 'MILL', 'MIST', 'MOOR', 'MOSS', 'MOUTH', 'NESS', 'NORTH', 'OAK', 'PEAK', 'PINE', 'POOL', 'PORT', 'QUAY',
  'RAVEN', 'REED', 'RIDGE', 'RIVER', 'ROOK', 'ROSE', 'RUSH', 'RYE', 'SALT', 'SHAW', 'SHIRE', 'SILVER', 'SLADE', 'SNOW',
  'SOUTH', 'SPIRE', 'STAG', 'STEAD', 'STONE', 'STORM', 'STOW', 'SUN', 'THORN', 'THORPE', 'TON', 'TOR', 'TOWER', 'VALE',
  'WALL', 'WATCH', 'WATER', 'WEALD', 'WELL', 'WEST', 'WICK', 'WILD', 'WILLOW', 'WIND', 'WINTER', 'WOLD', 'WOLF', 'WOOD',
  'WORTH', 'WYCH', 'WYRM', 'YARROW', 'YEW',
];

/**
 * The filler with its blanks filled from the place-name halves, at random. A half is never used
 * twice, nor one that's on the board already: in the answer (`taken`) or written into the filler.
 *
 * Each blank has a half of its own, and takes a spare only when its own is used elsewhere. So as
 * the game master writes, a half they happen to write changes only the blank that had it.
 */
export function fillBlanks(filler: readonly string[], taken: readonly string[], random: Random): string[] {
  const key = (text: string) => keyOf({ text });
  const used = new Set([...taken, ...filler].map(key));
  const halves = shuffled(PLACE_HALVES, random);
  const spares = halves.slice(filler.length).filter((half) => !used.has(half));
  return filler.map((text, i) => {
    if (key(text) !== '') return text;
    return used.has(halves[i]) ? (spares.shift() ?? '') : halves[i];
  });
}
