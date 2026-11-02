/** A maze to start from: never a game master's own. */
import type { MazeDesign } from './design';

export const EXAMPLE: Omit<MazeDesign, 'v' | 'seed' | 'edits'> = {
  words: {
    title: 'The cellars under the inn',
    intro: 'Somewhere past the barrels is the smugglers’ door. Your lantern shows a few yards ahead, and no more.',
    success: 'Cold air, and the smell of the sea: the smugglers’ door.',
  },
  width: 14,
  height: 14,
  twist: 'winding',
  loops: 'few',
  start: 0,
  exits: [
    { cell: 14 * 14 - 1, line: '' },
    { cell: 13, line: 'Steps up into the inn’s kitchen, where the cook is not pleased to see you.' },
  ],
  light: 'lantern',
  reach: 2,
  view: 0,
  pictures: [
    { cell: 14 * 6 + 6, icon: 'barrel', kind: 'landmark', line: 'Barrels of the landlord’s best, stacked to the ceiling.' },
    { cell: 14 * 4 + 10, icon: 'spider-web', kind: 'hazard', line: 'Webs across the passage, and something moving in them.' },
    { cell: 14 * 10 + 3, icon: 'rat', kind: 'hidden', line: 'Rats! A swarm pours over your boots: 1d4 piercing.' },
  ],
  onHazard: 'carry-on',
};
