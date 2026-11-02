import { mod, play, reverse, type Board, type Move } from './board';
import { discOf, positionOf, spokeOf, touch, type Layout } from './layout';

/** The fewest spokes to turn by, either way, to go `by` spokes round. */
const shortest = (layout: Layout, by: number) => {
  const turns = mod(by, layout.spokes);
  return turns > layout.spokes / 2 ? turns - layout.spokes : turns;
};

/**
 * Moves that exchange the pieces at two positions and leave every other piece where it was. Pieces
 * on touching discs: turn each disc to bring its piece to their contact, swap, and turn them back.
 * Otherwise, by way of a third disc that touches both: (p q) = (p m)(m q)(p m).
 */
export function exchange(layout: Layout, p: number, q: number): Move[] {
  const [discP, discQ] = [discOf(layout, p), discOf(layout, q)];
  const contact = discP === discQ ? -1 : layout.contacts.findIndex(({ a, b }) => [discOf(layout, a), discOf(layout, b)].sort().join() === [discP, discQ].sort().join());
  if (contact >= 0) {
    const { a, b } = layout.contacts[contact];
    const [atP, atQ] = discOf(layout, a) === discP ? [a, b] : [b, a];
    const turns: Move[] = [
      { kind: 'turn' as const, disc: discP, by: shortest(layout, spokeOf(layout, atP) - spokeOf(layout, p)) },
      { kind: 'turn' as const, disc: discQ, by: shortest(layout, spokeOf(layout, atQ) - spokeOf(layout, q)) },
    ].filter((move) => move.by !== 0);
    return [...turns, { kind: 'swap', contact }, ...[...turns].reverse().map(reverse)];
  }
  const middle = layout.discs.findIndex((_, m) => m !== discP && m !== discQ && touch(layout, discP, m) && touch(layout, discQ, m));
  if (middle < 0) throw new Error('No disc touches both');
  const m = positionOf(layout, middle, 0);
  return [...exchange(layout, p, m), ...exchange(layout, m, q), ...exchange(layout, p, m)];
}

/** Moves that bring a board to a target, a position at a time, without disturbing those already in place. */
export function solve(layout: Layout, board: Board, target: Board): Move[] {
  const moves: Move[] = [];
  let current = board;
  for (let position = 0; position < target.length; position++) {
    if (current[position] === target[position]) continue;
    for (const move of exchange(layout, current.indexOf(target[position]), position)) {
      moves.push(move);
      current = play(layout, current, move);
    }
  }
  return moves;
}
