/** A cipher to start from: a made-up message, never a game master's own. */
import type { CipherDesign } from './design';

export const EXAMPLE: Pick<CipherDesign, 'words' | 'message' | 'script' | 'mix' | 'method' | 'setting' | 'groups' | 'check'> = {
  words: {
    title: 'The smuggler’s wheel',
    intro: 'Sewn into a drowned smuggler’s coat: a bronze wheel of runes, and a scrap of oilcloth covered in the same runes.',
    success: 'The runes give up their meaning, and the cove’s secret with them.',
  },
  message: 'The tide turns at midnight. Bring the lantern to the old mill, and come alone.',
  script: 'runes',
  mix: '',
  method: 'one',
  setting: 7,
  groups: false,
  check: 'filled',
};
