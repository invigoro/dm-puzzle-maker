// @vitest-environment jsdom
import { cleanup, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { forgetIcons } from '../../kit/icons';
import { unpack } from '../../kit/packing';
import { readRoute } from '../../kit/route';
import { fakeIconFetch } from '../../test/icons';
import { pageFor } from '../../ui/pages';
import { readDesign } from './design';
import { readPuzzle } from './puzzle';

beforeEach(() => {
  vi.stubGlobal('fetch', fakeIconFetch);
});

afterEach(() => {
  cleanup();
  history.replaceState(null, '', '/');
  vi.unstubAllGlobals();
  forgetIcons();
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
    expect(screen.getByText('Give both halves of all six names words or a picture.')).toBeInTheDocument();
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
    expect(route.page === 'make' && readDesign(route.data)?.pairs[2]).toEqual([{ text: '' }, { text: 'mere' }]);
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

  it('gives a half a picture, puts it on the board with its maker named, and in the player link', async () => {
    const user = await openMaker();
    await user.click(screen.getByRole('button', { name: 'Start from the example' }));
    await user.click(screen.getByRole('button', { name: 'Picture for name 1, second half' }));
    const picker = screen.getByRole('group', { name: 'Picture for name 1, second half' });
    await user.type(within(picker).getByRole('searchbox', { name: 'Search the pictures' }), 'stone');
    await user.click(await within(picker).findByRole('button', { name: 'stone tower' }));
    expect(screen.queryByRole('group', { name: /^Picture for/ })).toBeNull();
    expect(screen.getByRole('button', { name: 'Picture for name 1, second half' })).toHaveAttribute('title', 'stone tower');
    expect(screen.getAllByRole('button', { name: /WICK with a picture of stone tower/ }).length).toBeGreaterThan(0);
    expect(await screen.findByText(/^Icons made by Lorc/)).toBeInTheDocument();
    await waitFor(() => expect(document.querySelector('.board .icon path')).not.toBeNull());

    await linkReady();
    await user.click(copyButton());
    const route = await readRoute(new URL(await navigator.clipboard.readText()).hash, ['discs']);
    expect(readPuzzle(route.page === 'play' ? route.data : null)?.icons?.filter(Boolean)).toEqual(['stone-tower']);
  });

  it('takes a picture away again', async () => {
    const user = await openMaker();
    await user.click(screen.getByRole('button', { name: 'Picture for filler 4' }));
    await user.type(screen.getByRole('searchbox', { name: 'Search the pictures' }), 'flag');
    await user.click(await screen.findByRole('button', { name: 'tower flag' }));
    expect(screen.getByRole('button', { name: 'Picture for filler 4' })).toHaveAttribute('title', 'tower flag');
    await user.click(screen.getByRole('button', { name: 'Picture for filler 4' }));
    await user.click(screen.getByRole('button', { name: 'No picture' }));
    expect(screen.getByRole('button', { name: 'Picture for filler 4' })).toHaveAttribute('title', 'Add a picture');
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
