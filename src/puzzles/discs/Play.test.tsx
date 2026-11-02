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
import { layoutIn, piecesIn, readPuzzle, type DiscsPuzzle } from './puzzle';

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

async function openPlayer(link = puzzle) {
  const user = userEvent.setup();
  const page = await pageFor({ page: 'play', kind: 'discs', data: link });
  render(<>{page.content}</>);
  return { user, title: page.title };
}

/** The move that solves a puzzle, found the way only the game master could: knowing the answer. */
function solvingMove(made: DiscsDesign, link: DiscsPuzzle): Move {
  const layout = layoutIn(link);
  const keys = answerKeys(contentOf(made), false);
  const start = link.pieces.map((_, piece) => piece);
  const moves: Move[] = [
    ...layout.discs.flatMap((_, disc) => [1, -1].map((by): Move => ({ kind: 'turn', disc, by }))),
    ...layout.contacts.map((_, contact): Move => ({ kind: 'swap', contact })),
  ];
  return moves.find((move) => keys.includes(answerKey(layout, piecesIn(link), play(layout, start, move))))!;
}

/** Makes the move that solves a puzzle, as a player would: a tap, a Shift-click, or a tap on a contact. */
async function solve(user: ReturnType<typeof userEvent.setup>, made: DiscsDesign, link: DiscsPuzzle) {
  const move = solvingMove(made, link);
  if (move.kind === 'swap') return user.click(screen.getAllByRole('button', { name: /^Swap / })[move.contact]);
  const disc = screen.getByRole('button', { name: new RegExp(`^Turn ${layoutIn(link).discs[move.disc].name}:`) });
  if (move.by < 0) await user.keyboard('{Shift>}');
  await user.click(disc);
  if (move.by < 0) await user.keyboard('{/Shift}');
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
    await solve(user, design, puzzle);
    expect(await screen.findByText(design.words.success, {}, { timeout: 3000 })).toBeInTheDocument();
  });

  it('plays three discs, and says the line when they’re solved', async () => {
    const three: DiscsDesign = { ...design, layout: 'trefoil', words: { ...design.words, title: 'The ferry-gate' } };
    const link = readPuzzle(JSON.parse(JSON.stringify(await toPuzzle(three))))!;
    const { user, title } = await openPlayer(link);
    expect(title).toBe('The ferry-gate');
    expect(screen.getAllByRole('button', { name: /^Turn / })).toHaveLength(3);
    expect(screen.getAllByRole('button', { name: /^Swap / })).toHaveLength(3);
    await solve(user, three, link);
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

  it('lights the names already in their places, when the game master lets names glow', async () => {
    const glowing = await toPuzzle({ ...design, glow: true });
    render(<>{(await pageFor({ page: 'play', kind: 'discs', data: JSON.parse(JSON.stringify(glowing)) })).content}</>);
    // This puzzle's one move from solved leaves some names in place (as its seed has it; turning the centre would leave none).
    await waitFor(() => expect(document.querySelectorAll('.board .piece.lit').length).toBeGreaterThanOrEqual(2), { timeout: 3000 });
    expect(document.querySelectorAll('.board .piece.lit').length).toBeLessThan(12);
    expect(document.querySelector('.board.solved')).toBeNull();
  });

  it('checks the board only when the players ask, and keeps the count of wrong checks', async () => {
    const asked: DiscsDesign = { ...design, glow: true, check: 'asked', wrongLine: 'The sluice gate slams: 1d6 bludgeoning.' };
    const link = readPuzzle(JSON.parse(JSON.stringify(await toPuzzle(asked))))!;
    const { user } = await openPlayer(link);
    const check = () => screen.getByRole('button', { name: 'Check the answer' });
    await user.click(check());
    expect(await screen.findByText(asked.wrongLine, {}, { timeout: 3000 })).toBeInTheDocument();
    expect(screen.getByText('0 moves, 1 wrong check')).toBeInTheDocument();
    // No names glow, though the game master asked for it, as they'd give the answer away.
    expect(document.querySelectorAll('.board .piece.lit')).toHaveLength(0);
    await solve(user, asked, link);
    expect(screen.getByRole('status')).toBeEmptyDOMElement();
    await user.click(check());
    expect(await screen.findByText(design.words.success, {}, { timeout: 3000 })).toBeInTheDocument();
    cleanup();
    await openPlayer(link);
    expect(screen.getByText('1 move, 1 wrong check')).toBeInTheDocument();
    expect(screen.getByText(design.words.success)).toBeInTheDocument();
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
