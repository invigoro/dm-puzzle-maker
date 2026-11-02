// @vitest-environment jsdom
import { cleanup, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it } from 'vitest';
import { unpack } from '../../kit/packing';
import { readRoute } from '../../kit/route';
import { pageFor } from '../../ui/pages';
import { readPuzzle } from './puzzle';

afterEach(() => {
  cleanup();
  history.replaceState(null, '', '/');
  localStorage.clear();
});

async function openMaker() {
  const user = userEvent.setup();
  render(<>{(await pageFor({ page: 'make', kind: 'word-guess', data: null })).content}</>);
  return user;
}

const copyButton = () => screen.getByRole('button', { name: 'Copy player link' });

describe('the word guess maker', () => {
  it('won’t send a word guess without an answer', async () => {
    await openMaker();
    expect(screen.getByText('Write an answer of two letters or more.')).toBeInTheDocument();
    expect(copyButton()).toBeDisabled();
  });

  it('says what the answer’s letters are, and lets the game master try it', async () => {
    const user = await openMaker();
    await user.type(screen.getByRole('textbox', { name: 'Answer' }), 'Open sesame');
    expect(screen.getByText('10 letters, in two words: 4, 6.')).toBeInTheDocument();
    const trial = screen.getByRole('group', { name: 'Letters' });
    for (const letter of 'OPENSESAME') await user.click(within(trial).getByRole('button', { name: new RegExp(`^${letter}`) }));
    await user.click(screen.getByRole('button', { name: 'Try it' }));
    expect(await screen.findByText('That’s it.')).toBeInTheDocument();
  });

  it('starts from the example, shows tiles on asking, and sends a link without the answer', async () => {
    const user = await openMaker();
    await user.click(screen.getByRole('button', { name: 'Start from the example' }));
    expect(screen.getByRole('textbox', { name: 'Answer' })).toHaveValue('Ironwood');
    await user.click(screen.getByRole('radio', { name: /^Tiles/ }));
    expect(screen.getByRole('img', { name: /^Tiles: / })).toBeInTheDocument();
    await waitFor(() => expect(copyButton()).toBeEnabled(), { timeout: 3000 });
    await user.click(copyButton());
    const link = await navigator.clipboard.readText();
    const route = await readRoute(new URL(link).hash, ['word-guess']);
    const puzzle = readPuzzle(route.page === 'play' ? route.data : null);
    expect(puzzle?.tiles).toHaveLength(8);
    const held = JSON.stringify(await unpack(new URL(link).hash.slice(3)));
    expect(held).not.toContain('IRONWOOD');
    expect(held).not.toContain('Ironwood');
  });
});
