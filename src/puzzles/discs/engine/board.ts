import { positionCount, positionOf, type Layout } from './layout';

/** Which piece is on each spoke: `board[position]` is a piece's number, with positions as the layout numbers them. */
export type Board = readonly number[];

/** A disc turned by a number of spokes (clockwise, or anticlockwise when negative), or the two pieces at a contact swapped. */
export type Move = { kind: 'turn'; disc: number; by: number } | { kind: 'swap'; contact: number };

/** `n` modulo `m`, never negative. */
export const mod = (n: number, m: number) => ((n % m) + m) % m;

/** The board with a disc turned: each of its pieces moves `by` spokes on. */
export function turn(layout: Layout, board: Board, disc: number, by: number): Board {
  const next = [...board];
  for (let spoke = 0; spoke < layout.spokes; spoke++) {
    next[positionOf(layout, disc, mod(spoke + by, layout.spokes))] = board[positionOf(layout, disc, spoke)];
  }
  return next;
}

/** The board with the two pieces at a contact swapped, each onto the other's disc. */
export function swap(layout: Layout, board: Board, contact: number): Board {
  const { a, b } = layout.contacts[contact];
  const next = [...board];
  [next[a], next[b]] = [board[b], board[a]];
  return next;
}

export const play = (layout: Layout, board: Board, move: Move): Board =>
  move.kind === 'turn' ? turn(layout, board, move.disc, move.by) : swap(layout, board, move.contact);

/** The move that undoes a move. */
export const reverse = (move: Move): Move => (move.kind === 'turn' ? { ...move, by: -move.by } : move);

/** The most moves kept to undo, so a long session can't fill the browser's storage. */
export const LONGEST_HISTORY = 2000;

const whole = (value: unknown, below: number): value is number => Number.isInteger(value) && (value as number) >= 0 && (value as number) < below;

/** A board from untrusted data, as the browser kept it: every piece on the layout once. Null otherwise. */
export function readBoard(layout: Layout, data: unknown): Board | null {
  const count = positionCount(layout);
  if (!Array.isArray(data) || data.length !== count || !data.every((piece) => whole(piece, count))) return null;
  return new Set(data).size === count ? (data as number[]) : null;
}

/** Moves from untrusted data, the most recent kept if there are too many. Null if any doesn't make sense on the layout. */
export function readMoves(layout: Layout, data: unknown): Move[] | null {
  if (!Array.isArray(data)) return null;
  const moves = data.slice(-LONGEST_HISTORY).map((input): Move | null => {
    const move = input && typeof input === 'object' ? (input as Record<string, unknown>) : {};
    if (move.kind === 'turn' && whole(move.disc, layout.discs.length) && Number.isInteger(move.by) && Math.abs(move.by as number) < layout.spokes) {
      return { kind: 'turn', disc: move.disc, by: move.by as number };
    }
    if (move.kind === 'swap' && whole(move.contact, layout.contacts.length)) return { kind: 'swap', contact: move.contact };
    return null;
  });
  return moves.every((move) => move !== null) ? (moves as Move[]) : null;
}
