import { randomInt, shuffled, type Random } from '../../../kit/rng';
import { answerKey, answerKeys, holdsAPair, piecesOf, type Content } from './answer';
import { play, reverse, type Board, type Move } from './board';
import { positionCount, type Layout } from './layout';

/** How a scramble mixes the pieces: every piece placed at random, or a number of random moves away from solved. */
export type Mix = 'full' | number;

/** How many full scrambles to try for one with no pair at a goal contact. One in twenty or so has one. */
const TRIES = 1000;

function check(layout: Layout, content: Content) {
  const pieces = piecesOf(content).length;
  if (content.pairs.length !== layout.goals.length || pieces !== positionCount(layout)) {
    throw new Error(`A puzzle on this layout takes ${layout.goals.length} pairs and ${positionCount(layout)} pieces in all`);
  }
}

/** A solved board: each pair at its goal contact, either way round, and the filler on the other spokes at random. */
export function solvedBoard(layout: Layout, content: Content, random: Random): Board {
  check(layout, content);
  const board: number[] = [];
  layout.goals.forEach((goal, pair) => {
    const { a, b } = layout.contacts[goal];
    const flip = random() < 0.5 ? 1 : 0;
    board[a] = 2 * pair + flip;
    board[b] = 2 * pair + 1 - flip;
  });
  const filler = shuffled(
    content.filler.map((_, i) => 2 * content.pairs.length + i),
    random,
  );
  for (let position = 0; position < positionCount(layout); position++) {
    if (board[position] === undefined) board[position] = filler.pop()!;
  }
  return board;
}

/** A move at random: a disc turned one spoke either way, or a swap. */
export function randomMove(layout: Layout, random: Random): Move {
  return random() < 0.5
    ? { kind: 'turn', disc: randomInt(random, layout.discs.length), by: random() < 0.5 ? 1 : -1 }
    : { kind: 'swap', contact: randomInt(random, layout.contacts.length) };
}

const same = (one: Move, other: Move) => JSON.stringify(one) === JSON.stringify(other);

/** Where a puzzle starts: its pieces mixed, the same way for the same seed, and never already solved. */
export function scramble(layout: Layout, content: Content, random: Random, mix: Mix = 'full'): Board {
  check(layout, content);
  const pieces = piecesOf(content);
  if (mix === 'full') {
    // Every arrangement can be solved, so any will do: one without a pair already in place is fairer.
    let board: Board = [];
    for (let i = 0; i < TRIES; i++) {
      board = shuffled(
        pieces.map((_, piece) => piece),
        random,
      );
      if (!holdsAPair(layout, content, board)) break;
    }
    return board;
  }
  const solved = new Set(answerKeys(content, true));
  let board = solvedBoard(layout, content, random);
  let last: Move | null = null;
  for (let moves = 0; moves < mix || solved.has(answerKey(layout, pieces, board)); moves++) {
    let move = randomMove(layout, random);
    while (last && same(move, reverse(last))) move = randomMove(layout, random);
    board = play(layout, board, move);
    last = move;
  }
  return board;
}
