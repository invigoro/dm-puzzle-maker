import type { Board } from './board';
import type { Layout } from './layout';

/** The longest a piece's text may be. Past about seven letters, the board sets a piece's letters smaller to fit. */
export const LONGEST_HALF = 16;

/** What a spoke holds: half a name. (Not `Node`, which is the DOM's.) */
export interface Piece {
  text: string;
}

/** A puzzle's pieces: each pair's two halves, in order from the mark, and the filler. */
export interface Content {
  pairs: readonly (readonly [Piece, Piece])[];
  filler: readonly Piece[];
}

/** Every piece, numbered as boards number them: each pair's two halves in turn, then the filler. */
export const piecesOf = (content: Content): Piece[] => [...content.pairs.flat(), ...content.filler];

/** How a piece reads and compares: its words in capitals, spacing tidied, so pieces that look alike count alike. */
export const keyOf = (piece: Piece) => piece.text.trim().replace(/\s+/g, ' ').toUpperCase();

/** A pair as it's compared: its two keys, sorted, so it counts either way round. */
const pairKey = (one: Piece, other: Piece) => [keyOf(one), keyOf(other)].sort();

/** The pairs at the goal contacts, in order: what the answer is read from. */
function goalPairs(layout: Layout, pieces: readonly Piece[], board: Board): string[][] {
  return layout.goals.map((goal) => {
    const { a, b } = layout.contacts[goal];
    return pairKey(pieces[board[a]], pieces[board[b]]);
  });
}

/** A board's answer key: the pairs at its goal contacts, in order from the mark. */
export const answerKey = (layout: Layout, pieces: readonly Piece[], board: Board) => JSON.stringify(goalPairs(layout, pieces, board));

/** The answer keys that count: the pairs in order from the mark, or, with any start, in order from any goal contact. */
export function answerKeys(content: Content, anyStart: boolean): string[] {
  const pairs = content.pairs.map(([one, other]) => pairKey(one, other));
  const starts = anyStart ? pairs.map((_, start) => start) : [0];
  return [...new Set(starts.map((start) => JSON.stringify([...pairs.slice(start), ...pairs.slice(0, start)])))];
}

/** Whether any goal contact holds one of the answer's pairs, wherever it belongs. A full scramble starts with none. */
export function holdsAPair(layout: Layout, content: Content, board: Board): boolean {
  const pairs = new Set(content.pairs.map(([one, other]) => JSON.stringify(pairKey(one, other))));
  return goalPairs(layout, piecesOf(content), board).some((pair) => pairs.has(JSON.stringify(pair)));
}
