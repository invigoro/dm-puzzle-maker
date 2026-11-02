// @vitest-environment jsdom
import { cleanup, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it } from 'vitest';
import { readRoute } from '../../kit/route';
import { pageFor } from '../../ui/pages';
import { readDesign } from './design';
import { readPuzzle } from './puzzle';

afterEach(() => {
  cleanup();
  history.replaceState(null, '', '/');
  localStorage.clear();
});

async function openMaker() {
  const user = userEvent.setup();
  render(<>{(await pageFor({ page: 'make', kind: 'maze', data: null })).content}</>);
  return user;
}

const drawing = () => screen.getByRole('group', { name: 'The maze, to draw' });
const cells = () => drawing().querySelectorAll('rect.cell');
const designNow = async () => {
  await waitFor(() => expect(location.hash).toMatch(/^#m=/));
  const route = await readRoute(location.hash, ['maze']);
  return route.page === 'make' ? readDesign(route.data)! : null;
};

describe('the maze maker', () => {
  it('makes a maze of the chosen size, with the way through', async () => {
    const user = await openMaker();
    expect(cells()).toHaveLength(100);
    await user.selectOptions(screen.getByRole('combobox', { name: 'Size' }), 'Small, 8 by 8');
    expect(cells()).toHaveLength(64);
    expect(screen.getByText(/^The way through to the way out is \d+ steps\./)).toBeInTheDocument();
    await user.selectOptions(screen.getByRole('combobox', { name: 'Size' }), 'Your own');
    await user.clear(screen.getByRole('spinbutton', { name: 'Width' }));
    await user.type(screen.getByRole('spinbutton', { name: 'Width' }), '12');
    expect(cells()).toHaveLength(96);
  });

  it('puts up and takes down walls by hand, and undoes them', async () => {
    const user = await openMaker();
    const wall = within(drawing()).getAllByRole('button', { name: /^(Take down|Put up) the wall between row 1 column 1 and row 1 column 2$/ })[0];
    const was = wall.getAttribute('aria-label')!;
    await user.click(wall);
    const now = within(drawing()).getByRole('button', { name: /the wall between row 1 column 1 and row 1 column 2$/ }).getAttribute('aria-label');
    expect(now).not.toBe(was);
    expect((await designNow())?.edits).toHaveLength(1);
    await user.click(screen.getByRole('button', { name: 'Undo my walls' }));
    expect((await designNow())?.edits).toEqual([]);
  });

  it('moves the way in, and adds and takes away ways out', async () => {
    const user = await openMaker();
    await user.click(screen.getByRole('radio', { name: 'Sets the way in' }));
    await user.click(cells()[11]);
    expect((await designNow())?.start).toBe(11);
    await user.click(screen.getByRole('radio', { name: 'Adds or takes away a way out' }));
    await user.click(cells()[9]);
    expect(screen.getByRole('textbox', { name: 'What way out 2 says' })).toBeInTheDocument();
    await user.click(cells()[9]);
    expect(screen.queryByRole('textbox', { name: 'What way out 2 says' })).toBeNull();
  });

  it('starts from the example, and sends a link with its ways out', async () => {
    const user = await openMaker();
    await user.click(screen.getByRole('button', { name: 'Start from the example' }));
    expect(cells()).toHaveLength(196);
    // By its text, not its role: naming the drawing's 364 wall buttons on every try is slow enough to time out in CI.
    const copy = () => screen.getByText('Copy player link');
    await waitFor(() => expect(copy()).toBeEnabled(), { timeout: 3000 });
    await user.click(copy());
    const route = await readRoute(new URL(await navigator.clipboard.readText()).hash, ['maze']);
    const puzzle = readPuzzle(route.page === 'play' ? route.data : null);
    expect(puzzle?.exits).toHaveLength(2);
    expect(puzzle?.light).toBe('lantern');
  });

  it('lets the light reach as far as the game master says, except when it’s lit', async () => {
    const user = await openMaker();
    await user.selectOptions(screen.getByRole('combobox', { name: 'How far they see' }), '4 cells');
    expect((await designNow())?.reach).toBe(4);
    await user.click(screen.getByRole('radio', { name: /^Dark:/ }));
    expect(screen.getByRole('combobox', { name: 'How far they see' })).toHaveValue('4');
    await user.click(screen.getByRole('radio', { name: /^Lit:/ }));
    expect(screen.queryByRole('combobox', { name: 'How far they see' })).toBeNull();
  });
});
