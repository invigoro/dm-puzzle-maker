// @vitest-environment jsdom
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { forgetIcons } from '../../kit/icons';
import { fakeIconFetch } from '../../test/icons';
import { pageFor } from '../../ui/pages';
import { contentOf, newDesign, toPuzzle, type DiscsDesign } from './design';
import { answerKey, answerKeys } from './engine/answer';
import { play, type Move } from './engine/board';
import { FLOWER } from './engine/layout';
import { piecesIn, readPuzzle, type DiscsPuzzle } from './puzzle';

const design: DiscsDesign = {
  ...newDesign(),
  words: { title: 'The mill-wheel', intro: 'Six villages, as the river finds them.', success: 'The wheel turns, and the sluice opens.' },
  pairs: [
    [{ text: 'Ashen' }, { text: 'mark' }],
    [{ text: 'Gull' }, { text: 'ford' }],
    [{ text: 'Thistle' }, { text: 'down' }],
    [{ text: 'Copper' }, { text: 'vale' }],
    [{ text: 'Lantern' }, { text: 'wold' }],
    [{ text: 'Hob' }, { text: 'marsh' }],
  ],
  // One move from solved, so a test can find the move that solves it.
  mix: 1,
  seed: 5,
};

let puzzle: DiscsPuzzle;
beforeAll(async () => {
  puzzle = readPuzzle(JSON.parse(JSON.stringify(await toPuzzle(design))))!;
});

afterEach(() => {
  cleanup();
  localStorage.clear();
});

async function openPlayer() {
  const user = userEvent.setup();
  const page = await pageFor({ page: 'play', kind: 'discs', data: puzzle });
  render(<>{page.content}</>);
  return { user, title: page.title };
}

/** The move that solves the puzzle, found the way only the game master could: knowing the answer. */
function solvingMove(): Move {
  const keys = answerKeys(contentOf(design), false);
  const start = puzzle.pieces.map((_, piece) => piece);
  const moves: Move[] = [
    ...FLOWER.discs.flatMap((_, disc) => [1, -1].map((by): Move => ({ kind: 'turn', disc, by }))),
    ...FLOWER.contacts.map((_, contact): Move => ({ kind: 'swap', contact })),
  ];
  return moves.find((move) => keys.includes(answerKey(FLOWER, piecesIn(puzzle), play(FLOWER, start, move))))!;
}

describe('the players’ page', () => {
  it('shows the title and introduction above the board', async () => {
    const { title } = await openPlayer();
    expect(title).toBe('The mill-wheel');
    expect(screen.getByRole('heading', { level: 1, name: 'The mill-wheel' })).toBeInTheDocument();
    expect(screen.getByText('Six villages, as the river finds them.')).toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: /^Turn / })).toHaveLength(7);
  });

  it('says the game master’s line once the board is solved, checked against the fingerprints', async () => {
    const { user } = await openPlayer();
    expect(screen.getByRole('status')).toBeEmptyDOMElement();
    const move = solvingMove();
    if (move.kind === 'swap') {
      await user.click(screen.getAllByRole('button', { name: /^Swap / })[move.contact]);
    } else {
      const disc = screen.getByRole('button', { name: new RegExp(`^Turn ${FLOWER.discs[move.disc].name}:`) });
      if (move.by < 0) await user.keyboard('{Shift>}');
      await user.click(disc);
      if (move.by < 0) await user.keyboard('{/Shift}');
    }
    expect(await screen.findByText(design.words.success, {}, { timeout: 3000 })).toBeInTheDocument();
  });

  it('draws the pictures, and names who made them', async () => {
    vi.stubGlobal('fetch', fakeIconFetch);
    try {
      const pictured = await toPuzzle({ ...design, pairs: [[{ text: '', icon: 'stone-tower' }, design.pairs[0][1]], ...design.pairs.slice(1)] });
      render(<>{(await pageFor({ page: 'play', kind: 'discs', data: JSON.parse(JSON.stringify(pictured)) })).content}</>);
      expect(screen.getAllByRole('button', { name: /a picture of stone tower/ }).length).toBeGreaterThan(0);
      expect(await screen.findByText(/^Icons made by Lorc/)).toBeInTheDocument();
      await waitFor(() => expect(document.querySelectorAll('.board .icon')).toHaveLength(1));
    } finally {
      vi.unstubAllGlobals();
      forgetIcons();
    }
  });

  it('keeps a player’s board in the browser, for when they come back', async () => {
    const { user } = await openPlayer();
    await user.click(screen.getByRole('button', { name: /^Turn the bottom disc:/ }));
    expect(screen.getByText('1 move')).toBeInTheDocument();
    const turned = screen.getByRole('button', { name: /^Turn the bottom disc:/ }).getAttribute('aria-label');
    cleanup();
    await openPlayer();
    expect(screen.getByText('1 move')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^Turn the bottom disc:/ })).toHaveAttribute('aria-label', turned);
  });
});
