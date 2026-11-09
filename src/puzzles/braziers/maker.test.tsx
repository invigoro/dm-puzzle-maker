// @vitest-environment jsdom
import { cleanup, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { forgetIcons } from '../../kit/icons';
import { readRoute } from '../../kit/route';
import { fakeIconFetch } from '../../test/icons';
import { pageFor } from '../../ui/pages';
import { readDesign } from './design';
import { braziersOf, flipsOf, maskOf } from './engine/floor';
import { solve } from './engine/solver';
import { readPuzzle } from './puzzle';

beforeEach(() => {
  vi.stubGlobal('fetch', fakeIconFetch);
});

afterEach(() => {
  cleanup();
  history.replaceState(null, '', '/');
  localStorage.clear();
  vi.unstubAllGlobals();
  forgetIcons();
});

async function openMaker() {
  const user = userEvent.setup();
  render(<>{(await pageFor({ page: 'make', kind: 'braziers', data: null })).content}</>);
  return user;
}

const copyButton = () => screen.getByRole('button', { name: 'Copy player link' });
const linkReady = () => waitFor(() => expect(copyButton()).toBeEnabled(), { timeout: 3000 });
const designNow = async () => {
  const route = await readRoute(location.hash, ['braziers']);
  return route.page === 'make' ? readDesign(route.data)! : null;
};
async function copiedPuzzle(user: ReturnType<typeof userEvent.setup>) {
  await linkReady();
  await user.click(copyButton());
  const route = await readRoute(new URL(await navigator.clipboard.readText()).hash, ['braziers']);
  return readPuzzle(route.page === 'play' ? route.data : null);
}

describe('the braziers maker', () => {
  it('starts from the example, says how few touches it takes, and sends a floor that can be solved', async () => {
    const user = await openMaker();
    await user.click(screen.getByRole('button', { name: 'Start from the example' }));
    expect(screen.getByText(/^It takes \d+ touches at the least\.$/)).toBeInTheDocument();
    expect(screen.getAllByRole('group', { name: 'The braziers' })).toHaveLength(1);
    const puzzle = await copiedPuzzle(user);
    expect(puzzle).toMatchObject({ aim: 'out', limit: 0, floor: { shape: 'grid', width: 5, height: 5 } });
    expect(puzzle?.words.title).toBe('The hall of braziers');
    const braziers = braziersOf(puzzle!.floor);
    expect(solve(flipsOf(puzzle!.floor), maskOf(puzzle!.start, braziers), 0n)?.fewest).toBeLessThanOrEqual(8);
  });

  it('sizes the grid, leaves squares bare, and sets what a touch flips', async () => {
    const user = await openMaker();
    await user.selectOptions(screen.getByRole('combobox', { name: 'Across' }), '4');
    await user.selectOptions(screen.getByRole('combobox', { name: 'Down' }), '3');
    const squares = screen.getByRole('group', { name: 'The floor’s squares' });
    await user.click(within(squares).getByRole('button', { name: 'Row 2, column 2: cold' }));
    expect(within(squares).getByRole('button', { name: 'Row 2, column 2: bare' })).toBeInTheDocument();
    expect(screen.getByText(/11 braziers\.$/)).toBeInTheDocument();
    await user.click(screen.getByRole('radio', { name: 'it and all eight round it' }));
    await waitFor(async () => expect(await designNow()).toMatchObject({ width: 4, height: 3, bare: [5], reach: 'round' }), { timeout: 3000 });
  });

  it('makes a ring with a hidden pattern, and sends only its fingerprint', async () => {
    const user = await openMaker();
    await user.click(screen.getByRole('radio', { name: 'A ring round the room' }));
    await user.selectOptions(screen.getByRole('combobox', { name: 'Braziers in the ring' }), '6');
    await user.click(screen.getByRole('radio', { name: 'A pattern you draw' }));
    const goal = screen.getByRole('group', { name: 'The goal’s braziers' });
    await user.click(within(goal).getByRole('button', { name: 'Brazier 1 of 6: cold' }));
    await user.click(within(goal).getByRole('button', { name: 'Brazier 3 of 6: cold' }));
    await user.click(screen.getByRole('checkbox', { name: /^Show it beside the floor/ }));
    const puzzle = await copiedPuzzle(user);
    expect(puzzle).toMatchObject({ aim: 'hidden', floor: { shape: 'ring', count: 6 } });
    expect(puzzle?.pattern).toBeUndefined();
    expect(puzzle?.answer).toBeTruthy();
    await waitFor(async () => expect((await designNow())?.pattern).toEqual([0, 2]), { timeout: 3000 });
  });

  it('sets the start by hand, and won’t send one that’s the goal already', async () => {
    const user = await openMaker();
    await user.click(screen.getByRole('radio', { name: 'Set by hand' }));
    expect(screen.getAllByText('The start is the goal already: light or put out a brazier or two.').length).toBeGreaterThan(0);
    expect(copyButton()).toBeDisabled();
    const start = screen.getByRole('group', { name: 'The start’s braziers' });
    for (const name of ['Row 2, column 3: cold', 'Row 3, column 2: cold', 'Row 3, column 3: cold', 'Row 3, column 4: cold', 'Row 4, column 3: cold']) {
      await user.click(within(start).getByRole('button', { name }));
    }
    expect(screen.getByText('It takes 1 touch at the least.')).toBeInTheDocument();
    const puzzle = await copiedPuzzle(user);
    expect(puzzle?.start).toEqual([7, 11, 12, 13, 17]);
  });

  it('limits the touches, from the fewest it takes, with a line for failing', async () => {
    const user = await openMaker();
    const limit = screen.getByRole('combobox', { name: 'They fail' });
    const choices = within(limit).getAllByRole('option').map((option) => option.textContent);
    expect(choices[0]).toBe('Never');
    await user.selectOptions(limit, choices[1]!);
    await user.clear(screen.getByRole('textbox', { name: 'Failing says' }));
    await user.type(screen.getByRole('textbox', { name: 'Failing says' }), 'The floor flares up.');
    const puzzle = await copiedPuzzle(user);
    expect(puzzle?.limit).toBe(Number(choices[1]!.match(/\d+/)![0]));
    expect(puzzle?.failLine).toBe('The floor flares up.');
  });

  it('gives the braziers another picture', async () => {
    const user = await openMaker();
    await user.click(screen.getByRole('button', { name: 'The braziers’ picture' }));
    const picker = screen.getByRole('group', { name: 'The braziers’ picture' });
    expect(within(picker).queryByRole('button', { name: 'No picture' })).toBeNull();
    // It opens on the picture there is: the fire bowl.
    const search = within(picker).getByRole('searchbox', { name: 'Search the pictures' });
    expect(search).toHaveValue('fire bowl');
    await user.clear(search);
    await user.type(search, 'tower');
    await user.click(await within(picker).findByRole('button', { name: 'stone tower' }));
    await waitFor(async () => expect((await designNow())?.icon).toBe('stone-tower'), { timeout: 3000 });
  });
});
