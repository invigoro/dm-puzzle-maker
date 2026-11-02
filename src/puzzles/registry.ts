import type { PuzzleKind } from './types';

/** Every kind of puzzle, in the order the home page lists them. Each side loads only on its own page. */
export const KINDS: readonly PuzzleKind[] = [
  {
    id: 'discs',
    name: 'Turning discs',
    blurb:
      'Three or seven touching discs of word-halves or pictures. The players turn the discs and swap halves where they meet, until the names are spelled out in order.',
    maker: () => import('./discs/maker'),
    player: () => import('./discs/player'),
  },
  {
    id: 'word-guess',
    name: 'Word guess',
    blurb:
      'A word or phrase to guess in a set number of tries, each try showing which letters are right: a password at a door, a name, a riddle’s answer.',
    maker: () => import('./word-guess/maker'),
    player: () => import('./word-guess/player'),
  },
  {
    id: 'maze',
    name: 'Maze',
    blurb: 'A maze to find the way out of, lit, by lantern light, or in the dark. Made at random or drawn by hand, with a line for each way out.',
    maker: () => import('./maze/maker'),
    player: () => import('./maze/player'),
  },
  {
    id: 'trapped-floor',
    name: 'Trapped floor',
    blurb:
      'A room’s floor of squares, some trapped, to cross by minesweeper’s rules: each safe square, stood on, shows how many of the eight round it are trapped.',
    maker: () => import('./trapped-floor/maker'),
    player: () => import('./trapped-floor/player'),
  },
];

/** The kind of puzzle with this id, if there is one. */
export const kindOf = (id: string): PuzzleKind | undefined => KINDS.find((kind) => kind.id === id);
