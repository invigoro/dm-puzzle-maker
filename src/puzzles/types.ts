import type { ComponentType } from 'react';

/** The game master's side of a kind of puzzle. It holds the answer, so it loads only on the maker's page. */
export interface MakerSide<Design> {
  /** A puzzle to start from. */
  newDesign(): Design;
  /** A design from untrusted data, as a link or a file holds it, or null if it doesn't hold one. */
  readDesign(data: unknown): Design | null;
  /** What a player link holds: everything the players see, and a way to check their answer, but never the answer. */
  toPuzzle(design: Design): Promise<unknown>;
  Maker: ComponentType<MakerProps<Design>>;
}

export interface MakerProps<Design> {
  design: Design;
  onChange(design: Design): void;
}

/** The players' side of a kind of puzzle, loaded on its own, so their page holds nothing of the game master's. */
export interface PlayerSide<Puzzle> {
  /** A puzzle from a player link, which is untrusted, or null if it doesn't hold one. */
  readPuzzle(data: unknown): Puzzle | null;
  Player: ComponentType<{ puzzle: Puzzle }>;
}

/**
 * A kind of puzzle, as the registry lists it. Each kind's design and puzzle types are its own: the
 * pages hand a side only what that side's own `read` functions made, so the registry needn't know them.
 */
export interface PuzzleKind {
  /** Written into every link, so never renamed: lowercase letters and hyphens. */
  id: string;
  name: string;
  /** A line or two for the home page. */
  blurb: string;
  // `any`, as each kind's types are its own (see above).
  maker(): Promise<MakerSide<any>>;
  player(): Promise<PlayerSide<any>>;
}
