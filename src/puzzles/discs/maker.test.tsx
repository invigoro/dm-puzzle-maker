// @vitest-environment jsdom
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it } from 'vitest';
import { unpack } from '../../kit/packing';
import { readRoute } from '../../kit/route';
import { pageFor } from '../../ui/pages';
import { readDesign } from './design';
import { readPuzzle } from './puzzle';

afterEach(() => {
  cleanup();
  history.replaceState(null, '', '/');
});

async function openMaker() {
  const user = userEvent.setup();
  render(<>{(await pageFor({ page: 'make', kind: 'discs', data: null })).content}</>);
  return user;
}

const copyButton = () => screen.getByRole('button', { name: 'Copy player link' });
/** Waits for the player link, which is made a moment after the last change. */
const linkReady = () => waitFor(() => expect(copyButton()).toBeEnabled(), { timeout: 3000 });

describe('the turning discs maker', () => {
  it('won’t send a puzzle until all six names are written', async () => {
    await openMaker();
    expect(screen.getByText('Write both halves of all six names.')).toBeInTheDocument();
    expect(copyButton()).toBeDisabled();
  });

  it('starts from the example, words and all', async () => {
    const user = await openMaker();
    await user.click(screen.getByRole('button', { name: 'Start from the example' }));
    expect(screen.getByRole('textbox', { name: 'Name 1, first half' })).toHaveValue('Frost');
    expect(screen.getByRole('textbox', { name: 'Title' })).toHaveValue('The road-stone of the Vale');
    expect(screen.queryByRole('button', { name: 'Start from the example' })).toBeNull();
    await linkReady();
  });

  it('copies a player link that opens the players’ page, holding none of the names', async () => {
    const user = await openMaker();
    await user.click(screen.getByRole('button', { name: 'Start from the example' }));
    // The example's introduction names its towns; a game master's needn't.
    await user.clear(screen.getByRole('textbox', { name: 'Introduction' }));
    await linkReady();
    await user.click(copyButton());
    expect(await screen.findByText('Copied the player link.')).toBeInTheDocument();
    const link = await navigator.clipboard.readText();
    const route = await readRoute(new URL(link).hash, ['discs']);
    expect(route.page).toBe('play');
    expect(readPuzzle(route.page === 'play' ? route.data : null)).not.toBeNull();
    const held = JSON.stringify(await unpack(new URL(link).hash.slice(3)));
    for (const name of ['FROSTWICK', 'Frostwick', 'EMBERFALL', 'Emberfall', 'Frost', 'wick']) expect(held).not.toContain(name);
    expect(screen.getByText(/characters\.$/)).toBeInTheDocument();
  });

  it('keeps the design in the page’s address, answer and all', async () => {
    const user = await openMaker();
    await user.type(screen.getByRole('textbox', { name: 'Name 3, second half' }), 'mere');
    await waitFor(() => expect(location.hash).toMatch(/^#m=/));
    const route = await readRoute(location.hash, ['discs']);
    expect(route.page === 'make' && readDesign(route.data)?.pairs[2]).toEqual(['', 'mere']);
  });

  it('fills blank filler, and fills it differently on asking', async () => {
    const user = await openMaker();
    const placeholders = () => screen.getAllByRole('textbox', { name: /^Filler / }).map((box) => box.getAttribute('placeholder'));
    const before = placeholders();
    expect(before).toHaveLength(30);
    expect(before.every((half) => half)).toBe(true);
    await user.click(screen.getByRole('button', { name: /Other filler/ }));
    expect(placeholders()).not.toEqual(before);
  });

  it('shows the board solved, and takes the arrow away for any start', async () => {
    const user = await openMaker();
    await user.click(screen.getByRole('button', { name: 'Start from the example' }));
    expect(document.querySelector('.board .mark')).not.toBeNull();
    await user.click(screen.getByRole('checkbox', { name: 'Show it solved' }));
    expect(document.querySelector('.board.solved')).not.toBeNull();
    await user.click(screen.getByRole('checkbox', { name: /Any start/ }));
    expect(document.querySelector('.board .mark')).toBeNull();
  });
});
