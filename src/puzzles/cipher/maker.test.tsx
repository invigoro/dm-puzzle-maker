// @vitest-environment jsdom
import { cleanup, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { forgetIcons } from '../../kit/icons';
import { readRoute } from '../../kit/route';
import { fakeIconFetch } from '../../test/icons';
import { pageFor } from '../../ui/pages';
import { readDesign } from './design';
import { decipher } from './engine/cipher';
import { plainOf } from './engine/letters';
import { RUNES } from './engine/rings';
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
  render(<>{(await pageFor({ page: 'make', kind: 'cipher', data: null })).content}</>);
  return user;
}

const copyButton = () => screen.getByRole('button', { name: 'Copy player link' });
const linkReady = () => waitFor(() => expect(copyButton()).toBeEnabled(), { timeout: 3000 });
const designNow = async () => {
  await waitFor(() => expect(location.hash).toMatch(/^#m=/));
  const route = await readRoute(location.hash, ['cipher']);
  return route.page === 'make' ? readDesign(route.data)! : null;
};
async function copiedPuzzle(user: ReturnType<typeof userEvent.setup>) {
  await linkReady();
  await user.click(copyButton());
  const route = await readRoute(new URL(await navigator.clipboard.readText()).hash, ['cipher']);
  return readPuzzle(route.page === 'play' ? route.data : null);
}
const message = () => screen.getByRole('textbox', { name: 'Message' });

describe('the cipher maker', () => {
  it('won’t send a cipher until it has a message', async () => {
    const user = await openMaker();
    expect(screen.getAllByText('Write the message the players are to read.').length).toBeGreaterThan(0);
    expect(copyButton()).toBeDisabled();
    await user.type(message(), 'Under the third stair.');
    await linkReady();
  });

  it('starts from the example, in runes, to try on the wheel, and sends it', async () => {
    const user = await openMaker();
    await user.click(screen.getByRole('button', { name: 'Start from the example' }));
    expect(message()).toHaveValue('The tide turns at midnight. Bring the lantern to the old mill, and come alone.');
    expect(screen.getByRole('slider', { name: 'The inner ring' })).toBeInTheDocument();
    const puzzle = await copiedPuzzle(user);
    expect(puzzle).toMatchObject({ script: 'runes', method: 'one', check: 'filled' });
    expect(puzzle?.ring).toEqual(RUNES);
    expect(decipher(puzzle!.text, { method: 'one', setting: 7 })).toBe(plainOf('The tide turns at midnight. Bring the lantern to the old mill, and come alone.'));
  });

  it('asks for a keyword, mixes the ring by a word, and runs the letters on in fives', async () => {
    const user = await openMaker();
    await user.type(message(), 'Under the third stair.');
    await user.click(screen.getByRole('radio', { name: /^Letters:/ }));
    await user.click(screen.getByRole('radio', { name: /^A keyword:/ }));
    expect(screen.getAllByText('Give the keyword.').length).toBeGreaterThan(0);
    await user.type(screen.getByRole('textbox', { name: 'Keyword' }), 'Cellar');
    await user.type(screen.getByRole('textbox', { name: 'Mix the inner ring by a word' }), 'Dragon');
    await user.click(screen.getByRole('checkbox', { name: /^Run the letters on in groups of five/ }));
    const puzzle = await copiedPuzzle(user);
    expect(puzzle?.ring.join('')).toBe('DRAGONBCEFHIJKLMPQSTUVWXYZ');
    expect(puzzle?.text).toMatch(/^[A-Z]{5} [A-Z]{5} [A-Z]{5} [A-Z]{3}$/);
    expect(await designNow()).toMatchObject({ method: 'keyword', keyword: 'Cellar', mix: 'Dragon', groups: true });
  });

  it('turns as it goes, from a letter, after every word', async () => {
    const user = await openMaker();
    await user.type(message(), 'Under the third stair.');
    await user.click(screen.getByRole('radio', { name: /^Turning as it goes:/ }));
    await user.selectOptions(screen.getByRole('combobox', { name: 'The mark starts under' }), 'K');
    await user.selectOptions(screen.getByRole('combobox', { name: 'It moves a letter on after every' }), 'word');
    const puzzle = await copiedPuzzle(user);
    expect(puzzle).toMatchObject({ method: 'turning', step: 'word' });
    expect(decipher(puzzle!.text, { method: 'turning', setting: 10, step: 'word' })).toBe('UNDER THE THIRD STAIR.');
  });

  it('gives each letter a picture, or 🎲 fills the rest', async () => {
    const user = await openMaker();
    await user.type(message(), 'Under the third stair.');
    await user.click(screen.getByRole('radio', { name: /^Pictures:/ }));
    expect(screen.getAllByText('Give every letter a picture of its own, or 🎲 fill the rest.').length).toBeGreaterThan(0);
    await user.click(screen.getByRole('button', { name: 'Picture for B' }));
    const picker = screen.getByRole('group', { name: 'Picture for B' });
    await user.type(within(picker).getByRole('searchbox', { name: 'Search the pictures' }), 'dragon');
    await user.click(await within(picker).findByRole('button', { name: 'dragon, Font Awesome' }));
    await user.click(screen.getByRole('button', { name: '🎲 Fill the rest' }));
    const design = await designNow();
    expect(design?.pictures[1]).toBe('fa:dragon');
    expect(new Set(design?.pictures).size).toBe(26);
    const puzzle = await copiedPuzzle(user);
    expect(puzzle?.script).toBe('pictures');
    expect(puzzle?.ring[1]).toBe('fa:dragon');
  });

  it('checks by an answer, with a line for a wrong one, and failing', async () => {
    const user = await openMaker();
    await user.type(message(), 'The word is ember.');
    await user.click(screen.getByRole('radio', { name: /^By an answer:/ }));
    expect(screen.getAllByText('Give the answer the players must find.').length).toBeGreaterThan(0);
    await user.type(screen.getByRole('textbox', { name: 'The answer' }), 'Ember');
    await user.type(screen.getByRole('textbox', { name: 'A wrong answer says' }), 'The lock bites.');
    await user.selectOptions(screen.getByRole('combobox', { name: 'They fail' }), 'After 3 wrong');
    expect(screen.getByRole('textbox', { name: 'Failing says' })).toBeInTheDocument();
    const puzzle = await copiedPuzzle(user);
    expect(puzzle).toMatchObject({ check: 'answer', wrong: 'The lock bites.', failAfter: 3 });
  });
});
