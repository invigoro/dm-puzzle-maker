// @vitest-environment jsdom
import { cleanup, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { forgetIcons } from '../../kit/icons';
import { readRoute } from '../../kit/route';
import { fakeIconFetch } from '../../test/icons';
import { pageFor } from '../../ui/pages';
import { readDesign } from './design';
import { readPuzzle, valuesIn } from './puzzle';

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
  render(<>{(await pageFor({ page: 'make', kind: 'trapped-floor', data: null })).content}</>);
  return user;
}

const plan = () => screen.getByRole('group', { name: 'The plan' });
const trapsOnPlan = () => within(plan()).getAllByRole('button', { name: / trap$/ });
const designNow = async () => {
  const route = await readRoute(location.hash, ['trapped-floor']);
  return route.page === 'make' ? readDesign(route.data)! : null;
};

describe('the trapped floor maker', () => {
  it('lays out a fair floor of twelve traps', async () => {
    await openMaker();
    expect(trapsOnPlan()).toHaveLength(12);
    expect(screen.getByText('This floor can be crossed by reasoning alone.')).toBeInTheDocument();
  });

  it('places traps by hand, and goes back to random', async () => {
    const user = await openMaker();
    const clearSquare = within(plan()).getAllByRole('button', { name: /^Row [2-6], column \d: \d round it$/ })[0];
    await user.click(clearSquare);
    expect(trapsOnPlan()).toHaveLength(13);
    await waitFor(async () => expect((await designNow())?.placed).toHaveLength(13), { timeout: 3000 });
    await user.click(screen.getByRole('button', { name: 'Back to placing at random' }));
    expect(trapsOnPlan()).toHaveLength(12);
  });

  it('adds a kind of trap, with a picture', async () => {
    const user = await openMaker();
    await user.click(screen.getByRole('button', { name: 'Add a kind of trap' }));
    expect(screen.getByRole('textbox', { name: 'What trap 4 does' })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Picture for trap 4' }));
    await user.type(screen.getByRole('searchbox', { name: 'Search the pictures' }), 'tower');
    await user.click(await screen.findByRole('button', { name: 'stone tower' }));
    expect(screen.getByRole('button', { name: 'Picture for trap 4' })).toHaveAttribute('title', 'stone tower');
  });

  it('plays it full size, for a table in one room', async () => {
    const user = await openMaker();
    await user.click(screen.getByRole('button', { name: 'Play it full size' }));
    const table = screen.getByRole('dialog', { name: 'The floor, for the table' });
    expect(within(table).getByRole('group', { name: 'The floor' })).toBeInTheDocument();
    await user.click(within(table).getByRole('button', { name: 'Close' }));
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('starts from the example, with its goal a square, and sends a link that unmasks to the floor', async () => {
    const user = await openMaker();
    await user.click(screen.getByRole('button', { name: 'Start from the example' }));
    await waitFor(async () => expect((await designNow())?.goal).toEqual({ cell: 3 }), { timeout: 3000 });
    await waitFor(() => expect(screen.getByRole('button', { name: 'Copy player link' })).toBeEnabled(), { timeout: 3000 });
    await user.click(screen.getByRole('button', { name: 'Copy player link' }));
    const route = await readRoute(new URL(await navigator.clipboard.readText()).hash, ['trapped-floor']);
    const puzzle = readPuzzle(route.page === 'play' ? route.data : null)!;
    expect((await valuesIn(puzzle))?.filter((value) => value >= 9)).toHaveLength(14);
  });
});
