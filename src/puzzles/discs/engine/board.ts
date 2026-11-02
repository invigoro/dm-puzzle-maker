import { positionOf, type Layout } from './layout';

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
