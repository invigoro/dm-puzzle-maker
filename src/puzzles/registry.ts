import type { PuzzleKind } from './types';

/** Every kind of puzzle, in the order the home page lists them. Each side loads only on its own page. */
export const KINDS: readonly PuzzleKind[] = [
  {
    id: 'discs',
    name: 'Turning discs',
    blurb:
      'Seven touching discs of word-halves or pictures. The players turn the discs and swap halves where they meet, until the names around the centre are spelled out in order.',
    maker: () => import('./discs/maker'),
    player: () => import('./discs/player'),
  },
];

/** The kind of puzzle with this id, if there is one. */
export const kindOf = (id: string): PuzzleKind | undefined => KINDS.find((kind) => kind.id === id);
