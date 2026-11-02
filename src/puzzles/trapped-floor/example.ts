/** A trapped floor to start from: never a game master's own. */
import type { Words } from '../../kit/words';

export const EXAMPLE: { words: Words; width: number; height: number; traps: number } = {
  words: {
    title: 'The vault floor',
    intro:
      'The floor before the vault door is a grid of old flagstones, and the last thief is still lying on one of them. Every safe stone is carved with the number of trapped stones round it.',
    success: 'You reach the vault door with every toe still your own.',
  },
  width: 8,
  height: 10,
  traps: 14,
};
