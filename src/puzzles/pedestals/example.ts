/** Pedestals to start from: made-up riddles, never a game master's own. */
import type { PedestalsDesign } from './design';

export const EXAMPLE: Pick<PedestalsDesign, 'words' | 'pedestals' | 'others'> = {
  words: {
    title: 'The hall of offerings',
    intro: 'Three plinths stand before a sealed door, each with words cut in its face. Offerings lie in the dust about the hall.',
    success: 'The plinths sink into the floor, and the door grinds open.',
  },
  pedestals: [
    { riddle: { text: 'Place the greatest weapon.' }, object: { text: 'Olive branch', icon: 'olive' } },
    { riddle: { text: 'Place what even a king must bow to.' }, object: { text: 'Hourglass', icon: 'hourglass' } },
    { riddle: { text: 'Place the key that opens every door.' }, object: { text: 'Gold coins', icon: 'two-coins' } },
  ],
  others: [
    { text: 'Sword', icon: 'broadsword' },
    { text: 'War axe', icon: 'battle-axe' },
    { text: 'Crown', icon: 'imperial-crown' },
    { text: 'Iron key', icon: 'skeleton-key' },
  ],
};
