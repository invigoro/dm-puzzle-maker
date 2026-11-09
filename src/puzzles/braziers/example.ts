/** Braziers to start from: a made-up hall, never a game master's own. */
import type { BraziersDesign } from './design';

export const EXAMPLE: Pick<BraziersDesign, 'words' | 'shape' | 'width' | 'height' | 'bare' | 'reach' | 'goal' | 'starting' | 'touches'> = {
  words: {
    title: 'The hall of braziers',
    intro:
      'Iron braziers stand in rows across the hall floor, some burning, some cold. The bars across the far door won’t move while any still burns. Touch one, and it and those beside it flare up or gutter out.',
    success: 'The last flame gutters out, and the bars slide back into the walls.',
  },
  shape: 'grid',
  width: 5,
  height: 5,
  bare: [],
  reach: 'beside',
  goal: 'out',
  starting: 'touches',
  touches: 8,
};
