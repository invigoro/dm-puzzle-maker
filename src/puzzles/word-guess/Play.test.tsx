// @vitest-environment jsdom
import { cleanup, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it } from 'vitest';
import { pageFor } from '../../ui/pages';
import { newDesign, toPuzzle, type GuessDesign } from './design';

afterEach(() => {
  cleanup();
  localStorage.clear();
});

const design: GuessDesign = {
  ...newDesign(),
  words: { title: 'The smith’s door', intro: 'Name the tree.', success: 'The door swings open.' },
  answer: 'Iron wood',
  tries: 3,
  out: 'The door falls silent.',
  seed: 7,
};

async function open(change: Partial<GuessDesign> = {}) {
  const puzzle = JSON.parse(JSON.stringify(await toPuzzle({ ...design, ...change })));
  const page = await pageFor({ page: 'play', kind: 'word-guess', data: puzzle });
  render(<>{page.content}</>);
  return { user: userEvent.setup(), puzzle };
}

const tryRow = (n: number) => screen.findByRole('img', { name: new RegExp(`^Try ${n}:`) });
const status = () => screen.getByRole('status');

describe('the word guess', () => {
  it('marks each try letter by letter, and says the line once it’s right', async () => {
    const { user } = await open();
    expect(screen.getByRole('heading', { level: 1, name: 'The smith’s door' })).toBeInTheDocument();
    expect(screen.getByText('3 tries left')).toBeInTheDocument();
    // The game takes the keyboard when it opens.
    await user.keyboard('woodiron{Enter}');
    expect(await tryRow(1)).toHaveAccessibleName(
      'Try 1: W elsewhere, O elsewhere, O right, D elsewhere, I elsewhere, R elsewhere, O right, N elsewhere',
    );
    expect(screen.getByText('2 tries left')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'W, elsewhere' })).toBeInTheDocument();
    await user.keyboard('ironwood{Enter}');
    await waitFor(() => expect(status()).toHaveTextContent('The door swings open.'));
    expect(screen.queryByRole('button', { name: 'Try it' })).toBeNull();
  });

  it('takes letters from the on-screen keyboard, and takes them back', async () => {
    const { user } = await open();
    for (const letter of 'IRONWOOX') await user.click(screen.getByRole('button', { name: letter }));
    expect(screen.getByRole('button', { name: 'Try it' })).toBeEnabled();
    await user.click(screen.getByRole('button', { name: '⌫ Back' }));
    expect(screen.getByRole('button', { name: 'Try it' })).toBeDisabled();
    await user.click(screen.getByRole('button', { name: 'D' }));
    await user.click(screen.getByRole('button', { name: 'Try it' }));
    await waitFor(() => expect(status()).toHaveTextContent('The door swings open.'));
  });

  it('says the line for running out, and takes no more tries', async () => {
    const { user } = await open({ tries: 1 });
    expect(screen.getByText('Last try')).toBeInTheDocument();
    await user.keyboard('woodiron{Enter}');
    await waitFor(() => expect(status()).toHaveTextContent('The door falls silent.'));
    expect(screen.queryByRole('group', { name: 'Letters' })).toBeNull();
  });

  it('says only whether a try is right, when that’s all the link holds', async () => {
    const { user } = await open({ marking: 'whole' });
    await user.keyboard('woodiron{Enter}');
    expect(await tryRow(1)).toHaveAccessibleName('Try 1: WOODIRON, not it');
  });

  it('gives tiles to arrange, each used once', async () => {
    const { user } = await open({ letters: 'tiles' });
    const tray = screen.getByRole('group', { name: 'Tiles' });
    expect(within(tray).getAllByRole('button')).toHaveLength(8);
    // Typing takes the first free tile with that letter.
    await user.keyboard('ironwoo');
    expect(within(tray).getAllByRole('button', { name: 'O' }).filter((tile) => !(tile as HTMLButtonElement).disabled)).toHaveLength(0);
    await user.click(within(tray).getByRole('button', { name: 'D' }));
    await user.click(screen.getByRole('button', { name: 'Try it' }));
    await waitFor(() => expect(status()).toHaveTextContent('The door swings open.'));
  });

  it('gives hints a letter at a time, as many as allowed', async () => {
    const { user } = await open({ hints: 2 });
    await user.click(screen.getByRole('button', { name: 'Take a hint (2 left)' }));
    expect(screen.getByRole('img', { name: /^Hints:/ })).toHaveAccessibleName('Hints: I, blank, blank, blank, blank, blank, blank, blank');
    await user.click(screen.getByRole('button', { name: 'Take a hint (1 left)' }));
    expect(screen.getByRole('img', { name: /^Hints:/ })).toHaveAccessibleName('Hints: I, blank, blank, blank, W, blank, blank, blank');
    expect(screen.queryByRole('button', { name: /Take a hint/ })).toBeNull();
  });

  it('keeps the tries made in the browser, so a reload gives no more', async () => {
    const { user, puzzle } = await open();
    await user.keyboard('woodiron{Enter}');
    await tryRow(1);
    cleanup();
    const page = await pageFor({ page: 'play', kind: 'word-guess', data: puzzle });
    render(<>{page.content}</>);
    expect(await tryRow(1)).toBeInTheDocument();
    expect(screen.getByText('2 tries left')).toBeInTheDocument();
  });
});
