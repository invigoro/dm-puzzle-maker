// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it } from 'vitest';
import { mulberry32 } from '../../kit/rng';
import { answerKey, answerKeys, piecesOf, type Content } from './engine/answer';
import { swap, turn, type Board } from './engine/board';
import { FLOWER } from './engine/layout';
import { solvedBoard } from './engine/scramble';
import { Game } from './Game';
import type { Progress } from './puzzle';

afterEach(cleanup);

const NAMES = ['FROST WICK', 'EMBER FALL', 'RAVEN SPIRE', 'SALT HAVEN', 'IRON DEEP', 'WILLOW MERE'];
const content: Content = {
  pairs: NAMES.map((name) => name.split(' ').map((text) => ({ text })) as [{ text: string }, { text: string }]),
  filler: Array.from({ length: 30 }, (_, i) => ({ text: `F${i}` })),
};
const pieces = piecesOf(content);
const keys = answerKeys(content, false);
const isSolved = async (board: Board) => keys.includes(answerKey(FLOWER, pieces, board));
const solved = solvedBoard(FLOWER, content, mulberry32(3));
const SUCCESS = 'The stone grinds round.';

function play(start: Board) {
  render(<Game layout={FLOWER} pieces={pieces} start={start} isSolved={isSolved} mark success={SUCCESS} />);
  return userEvent.setup();
}

/** A disc's button, and the pieces on it, clockwise from the top, as its label lists them. */
const disc = (name: string) => screen.getByRole('button', { name: new RegExp(`^Turn the ${name} disc:`) });
const piecesOn = (name: string) => disc(name).getAttribute('aria-label')!.split(': ')[1].split(', ');
const contacts = () => screen.getAllByRole('button', { name: /^Swap / });

describe('the game', () => {
  it('has every disc to turn and every contact to swap', () => {
    play(solved);
    expect(screen.getAllByRole('button', { name: /^Turn / })).toHaveLength(7);
    expect(contacts()).toHaveLength(12);
  });

  it('turns a disc clockwise when tapped, and back with Shift', async () => {
    const user = play(solved);
    const before = piecesOn('top');
    await user.click(disc('top'));
    expect(piecesOn('top')).toEqual([before[5], ...before.slice(0, 5)]);
    await user.keyboard('{Shift>}');
    await user.click(disc('top'));
    await user.keyboard('{/Shift}');
    expect(piecesOn('top')).toEqual(before);
  });

  it('stands each letter on its disc’s rim, its foot towards the rim end of its spoke', () => {
    play(solved);
    // Pieces are drawn in the order of their positions: the centre's spokes first, then the top disc's.
    const turnOf = (position: number) =>
      [...document.querySelectorAll('.pieces > g')[position].querySelectorAll('text')].map(
        (letter) => Number(letter.getAttribute('transform')!.match(/^rotate\((\S+) /)![1]) % 360,
      );
    // The centre's top spoke points up, so its letters stand on their heads; the top disc's bottom spoke points down.
    expect(new Set(turnOf(0))).toEqual(new Set([180]));
    expect(new Set(turnOf(9))).toEqual(new Set([0]));
    // The centre's upper-right spoke points at 60°, so its letters lean to stand on that rim.
    expect(new Set(turnOf(1))).toEqual(new Set([240]));
  });

  it('marks where the names are read: a channel down each spoke that meets there, and a ring round its stud', () => {
    play(solved);
    expect(disc('centre').querySelectorAll('.lane')).toHaveLength(6);
    expect(disc('top').querySelectorAll('.lane')).toHaveLength(1);
    const ringed = contacts().flatMap((contact, c) => (contact.querySelector('.ring') ? [c] : []));
    expect(ringed).toEqual([...FLOWER.goals].sort((x, y) => x - y));
  });

  it('swaps the halves where two discs meet', async () => {
    const user = play(solved);
    const [first] = contacts();
    const [, one, other] = first.getAttribute('aria-label')!.match(/^Swap (.+) and (.+)$/)!;
    await user.click(first);
    expect(contacts()[0]).toHaveAccessibleName(`Swap ${other} and ${one}`);
  });

  it('turns and swaps from the keyboard', async () => {
    const user = play(solved);
    const before = piecesOn('centre');
    disc('centre').focus();
    await user.keyboard('{ArrowRight}');
    expect(piecesOn('centre')).toEqual([before[5], ...before.slice(0, 5)]);
    await user.keyboard('{ArrowLeft}');
    expect(piecesOn('centre')).toEqual(before);
    const name = contacts()[3].getAttribute('aria-label');
    contacts()[3].focus();
    await user.keyboard('{Enter}');
    expect(contacts()[3].getAttribute('aria-label')).not.toBe(name);
  });

  it('undoes moves, counts them, and starts over', async () => {
    const user = play(solved);
    const before = piecesOn('bottom');
    expect(screen.getByRole('button', { name: 'Undo' })).toBeDisabled();
    await user.click(disc('bottom'));
    await user.click(contacts()[5]);
    expect(screen.getByText('2 moves')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Undo' }));
    expect(screen.getByText('1 move')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Start over' }));
    expect(screen.getByText('0 moves')).toBeInTheDocument();
    expect(piecesOn('bottom')).toEqual(before);
  });

  it('says the game master’s line when the pairs are spelled round the centre', async () => {
    // Solved, but with the first pair flipped, then the centre turned a spoke on.
    const user = play(turn(FLOWER, swap(FLOWER, solved, FLOWER.goals[0]), 0, 1));
    expect(screen.getByRole('status')).toBeEmptyDOMElement();
    await user.keyboard('{Shift>}');
    await user.click(disc('centre'));
    await user.keyboard('{/Shift}');
    // A pair counts either way round, so the flipped one counts too.
    expect(await screen.findByText(SUCCESS)).toBeInTheDocument();
  });

  it('carries on from where a player left off, and reports each move to keep', async () => {
    const kept: number[] = [];
    const start = turn(FLOWER, solved, 2, 1);
    render(
      <Game
        layout={FLOWER}
        pieces={pieces}
        start={solved}
        initial={{ board: start, moves: [{ kind: 'turn', disc: 2, by: 1 }] }}
        onProgress={(progress) => kept.push(progress.moves.length)}
        isSolved={isSolved}
        mark
        success={SUCCESS}
      />,
    );
    const user = userEvent.setup();
    expect(screen.getByText('1 move')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Undo' }));
    expect(await screen.findByText(SUCCESS)).toBeInTheDocument();
    expect(kept.at(-1)).toBe(0);
  });

  it('says it’s solved, when the game master gave no line for it', async () => {
    render(<Game layout={FLOWER} pieces={pieces} start={solved} isSolved={isSolved} mark success="" />);
    expect(await screen.findByText('Solved.')).toBeInTheDocument();
  });
});

describe('checking the answer when asked', () => {
  const WRONG = 'Darts fly from the walls.';
  const board = () => document.querySelector('svg.board')!;

  function playAsked(start: Board, props: Partial<Parameters<typeof Game>[0]> = {}) {
    const user = userEvent.setup();
    render(<Game layout={FLOWER} pieces={pieces} start={start} isSolved={isSolved} mark success={SUCCESS} checking="asked" wrongLine={WRONG} {...props} />);
    return user;
  }
  const check = () => screen.getByRole('button', { name: 'Check the answer' });

  it('doesn’t solve itself, even when the names are right, until the players check', async () => {
    const user = playAsked(solved);
    // Long enough for a check after every move to have come back.
    await new Promise((done) => setTimeout(done, 50));
    expect(screen.getByRole('status')).toBeEmptyDOMElement();
    expect(board()).not.toHaveClass('solved');
    await user.click(check());
    expect(await screen.findByText(SUCCESS)).toBeInTheDocument();
    expect(board()).toHaveClass('solved');
    expect(check()).toBeDisabled();
  });

  it('says the game master’s line for a wrong check, and counts it, once for each board', async () => {
    const user = playAsked(turn(FLOWER, solved, 2, 1));
    expect(screen.getByText('0 moves, 0 wrong checks')).toBeInTheDocument();
    await user.click(check());
    expect(await screen.findByText(WRONG)).toBeInTheDocument();
    expect(screen.getByText('0 moves, 1 wrong check')).toBeInTheDocument();
    // The same board would say the same again.
    expect(check()).toBeDisabled();
    await user.keyboard('{Shift>}');
    await user.click(disc('upper right'));
    await user.keyboard('{/Shift}');
    expect(screen.getByRole('status')).toBeEmptyDOMElement();
    await user.click(check());
    expect(await screen.findByText(SUCCESS)).toBeInTheDocument();
    expect(screen.getByText('1 move, 1 wrong check')).toBeInTheDocument();
  });

  it('says “That’s not it” for a wrong check, when the game master gave no line for it', async () => {
    const user = playAsked(turn(FLOWER, solved, 2, 1), { wrongLine: '' });
    await user.click(check());
    expect(await screen.findByText('That’s not it.')).toBeInTheDocument();
  });

  it('keeps the count of wrong checks, and a right one, with the board', async () => {
    const kept: Progress[] = [];
    const user = playAsked(turn(FLOWER, solved, 2, 1), { initial: { board: turn(FLOWER, solved, 2, 1), moves: [], wrong: 2 }, onProgress: (progress) => kept.push(progress) });
    expect(screen.getByText('0 moves, 2 wrong checks')).toBeInTheDocument();
    await user.click(check());
    await screen.findByText(WRONG);
    expect(kept.at(-1)).toMatchObject({ wrong: 3, solved: false });
    cleanup();
    playAsked(solved, { initial: { board: solved, moves: [], wrong: 3, solved: true } });
    expect(screen.getByText(SUCCESS)).toBeInTheDocument();
    expect(board()).toHaveClass('solved');
  });
});
