// @vitest-environment jsdom
import { cleanup, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { forgetIcons } from '../../kit/icons';
import { fakeIconFetch } from '../../test/icons';
import { pageFor } from '../../ui/pages';
import { newDesign, startOf, toPuzzle, type CipherDesign } from './design';
import { PICTURE_CHOICES } from './engine/rings';

beforeEach(() => {
  vi.stubGlobal('fetch', fakeIconFetch);
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  forgetIcons();
  localStorage.clear();
});

// A made-up message, never a game master's own: G O H O M E, G O G.
const design: CipherDesign = {
  ...newDesign(),
  words: { title: 'The hearth stone', intro: 'Letters scratched on the hearth.', success: 'The hearth stone lifts.' },
  message: 'Go home, Gog.',
  script: 'letters',
  method: 'one',
  setting: 4,
  check: 'filled',
  seed: 3,
};

async function open(change: Partial<CipherDesign> = {}) {
  const puzzle = JSON.parse(JSON.stringify(await toPuzzle({ ...design, ...change })));
  render(<>{(await pageFor({ page: 'play', kind: 'cipher', data: puzzle })).content}</>);
  await screen.findByRole('group', { name: 'The message' });
  return { user: userEvent.setup(), puzzle };
}

const box = (n: number) => screen.getByRole('textbox', { name: new RegExp(`^Letter ${n}:`) });
const status = () => screen.getByRole('status');
const ring = () => screen.getByRole('slider', { name: 'The inner ring' });

/** Writes a letter in a box. */
async function write(user: ReturnType<typeof userEvent.setup>, n: number, letter: string) {
  await user.click(box(n));
  await user.keyboard(letter);
}

describe('the wheel', () => {
  it('starts where the link says, and turns by the buttons and the arrow keys', async () => {
    const { user } = await open();
    const start = startOf(design);
    expect(ring()).toHaveAttribute('aria-valuenow', String(start));
    await user.click(screen.getByRole('button', { name: 'Turn clockwise' }));
    expect(ring()).toHaveAttribute('aria-valuenow', String((start + 1) % 26));
    await user.click(screen.getByRole('button', { name: 'Turn anticlockwise' }));
    await user.click(screen.getByRole('button', { name: 'Turn anticlockwise' }));
    expect(ring()).toHaveAttribute('aria-valuenow', String((start + 25) % 26));
    ring().focus();
    await user.keyboard('{ArrowRight}{ArrowRight}');
    expect(ring()).toHaveAttribute('aria-valuenow', String((start + 1) % 26));
    expect(screen.getByText(/The mark is under/)).toHaveTextContent(`The mark is under ${'ABCDEFGHIJKLMNOPQRSTUVWXYZ'[(start + 1) % 26]}`);
  });
});

describe('a message at one setting, checked when every box is filled', () => {
  it('fills every like symbol at once, and opens once every box is right', async () => {
    const { user } = await open();
    // G is the first, seventh and ninth letter: writing one writes all three.
    await write(user, 1, 'g');
    expect(box(1)).toHaveValue('G');
    expect(box(7)).toHaveValue('G');
    expect(box(9)).toHaveValue('G');
    expect(box(2)).toHaveValue('');
    // Typing moves on to the next box.
    expect(box(2)).toHaveFocus();
    await user.keyboard('o');
    expect(box(8)).toHaveValue('O');
    await user.keyboard('h');
    await write(user, 5, 'm');
    await user.keyboard('x');
    expect(await screen.findByText('Every box is filled, but that’s not it yet.', {}, { timeout: 3000 })).toBeInTheDocument();
    await write(user, 6, 'e');
    expect(await screen.findByText('The hearth stone lifts.', {}, { timeout: 3000 })).toBeInTheDocument();
    expect(box(1)).toHaveAttribute('readonly');
  });

  it('moves between boxes with the arrow keys, and back with Backspace', async () => {
    const { user } = await open();
    await write(user, 3, 'h');
    expect(box(4)).toHaveFocus();
    await user.keyboard('{Backspace}');
    expect(box(3)).toHaveFocus();
    expect(box(3)).toHaveValue('');
    await user.keyboard('{ArrowLeft}{ArrowLeft}');
    expect(box(1)).toHaveFocus();
  });

  it('keeps the wheel and the letters in the browser', async () => {
    const { user, puzzle } = await open();
    await user.click(screen.getByRole('button', { name: 'Turn clockwise' }));
    await write(user, 1, 'g');
    cleanup();
    render(<>{(await pageFor({ page: 'play', kind: 'cipher', data: puzzle })).content}</>);
    await screen.findByRole('group', { name: 'The message' });
    expect(box(9)).toHaveValue('G');
    expect(ring()).toHaveAttribute('aria-valuenow', String((startOf(design) + 1) % 26));
  });
});

describe('a message by a keyword, checked by an answer', () => {
  const keyword: Partial<CipherDesign> = { method: 'keyword', keyword: 'Ash', check: 'answer', password: 'Hearth', wrongLine: 'Sparks fly.' };

  it('has a box for each letter, as like symbols needn’t read alike', async () => {
    const { user } = await open(keyword);
    await write(user, 1, 'g');
    expect(box(7)).toHaveValue('');
  });

  it('says the game master’s line for a wrong answer, counts them, and fails the players at the last', async () => {
    const { user } = await open({ ...keyword, failAfter: 2, failLine: 'The hearth goes cold.' });
    const answer = screen.getByRole('textbox', { name: 'The answer' });
    await user.type(answer, 'Ember');
    await user.click(screen.getByRole('button', { name: 'Give the answer' }));
    expect(await screen.findByText('Sparks fly.', {}, { timeout: 3000 })).toBeInTheDocument();
    expect(screen.getByText('1 wrong answer, of 2')).toBeInTheDocument();
    // The same answer isn't given twice.
    expect(screen.getByRole('button', { name: 'Give the answer' })).toBeDisabled();
    await user.clear(answer);
    await user.type(answer, 'Ashes');
    await user.click(screen.getByRole('button', { name: 'Give the answer' }));
    expect(await screen.findByText('Sparks fly. The hearth goes cold.', {}, { timeout: 3000 })).toBeInTheDocument();
    expect(answer).toBeDisabled();
  });

  it('opens with the right answer, whatever its case and spacing', async () => {
    const { user } = await open(keyword);
    await user.type(screen.getByRole('textbox', { name: 'The answer' }), ' heARTH ');
    await user.click(screen.getByRole('button', { name: 'Give the answer' }));
    expect(await screen.findByText('The hearth stone lifts.', {}, { timeout: 3000 })).toBeInTheDocument();
  });
});

describe('reading for them', () => {
  it('reads at the wheel’s setting, as it turns', async () => {
    const { user } = await open({ reading: true, check: 'none' });
    const turns = (design.setting - startOf(design) + 26) % 26;
    for (let i = 0; i < turns; i++) await user.click(screen.getByRole('button', { name: 'Turn clockwise' }));
    expect(screen.getByText('GO HOME, GOG.')).toBeInTheDocument();
  });

  it('reads with the keyword the players give', async () => {
    const { user } = await open({ method: 'keyword', keyword: 'Ash', reading: true });
    expect(screen.queryByText('It reads:')).toBeNull();
    await user.type(screen.getByRole('textbox', { name: 'The keyword' }), 'ash');
    expect(screen.getByText('GO HOME, GOG.')).toBeInTheDocument();
  });

  it('isn’t there unless the game master turns it on', async () => {
    await open();
    expect(screen.queryByText('It reads:')).toBeNull();
    expect(status()).toBeEmptyDOMElement();
  });
});

describe('pictures', () => {
  it('shows a picture for each symbol, and names who made them', async () => {
    const pictures = [...PICTURE_CHOICES.slice(0, 24), 'stone-tower', 'fa:dragon'];
    await open({ script: 'pictures', pictures });
    expect(box(1)).toHaveAccessibleName(/^Letter 1: [a-z -]+$/);
    expect(await screen.findByText(/^Icons made by/)).toHaveTextContent(/from game-icons\.net \(CC BY 3\.0\), and from Font Awesome/);
  });
});

describe('without checking', () => {
  it('never says a word, however the boxes are filled', async () => {
    const { user } = await open({ check: 'none' });
    for (const [n, letter] of [[1, 'g'], [2, 'o'], [3, 'h'], [5, 'm'], [6, 'e']] as const) await write(user, n, letter);
    await new Promise((done) => setTimeout(done, 200));
    await waitFor(() => expect(status()).toBeEmptyDOMElement());
  });
});

describe('a cryptogram', () => {
  // Each letter is written as its own picture: G as the hourglass, O as the skeleton key, and so on.
  const pictures = PICTURE_CHOICES.slice(0, 26);
  const named = (letter: string) => pictures[letter.charCodeAt(0) - 65].replace(/-/g, ' ');
  const cryptogram: Partial<CipherDesign> = { method: 'cryptogram', script: 'pictures', pictures, given: 'O' };
  const forSymbol = (letter: string) => screen.getByRole('textbox', { name: new RegExp(`^The letter for ${named(letter)}`) });

  it('has no wheel, and a table of its symbols, the commonest first', async () => {
    await open(cryptogram);
    expect(screen.queryByRole('slider')).toBeNull();
    const table = screen.getByRole('group', { name: 'The symbols' });
    const rows = within(table).getAllByRole('listitem');
    expect(rows).toHaveLength(5);
    // G and O come three times each, and H, M and E once.
    expect(rows.map((row) => row.textContent)).toEqual(['×3', '×3', '×1', '×1', '×1']);
  });

  it('writes in the letters given away, which can’t be changed', async () => {
    const { user } = await open(cryptogram);
    expect(box(2)).toHaveValue('O');
    expect(box(2)).toHaveAccessibleName(`Letter 2: ${named('O')}, given`);
    expect(box(2)).toHaveAttribute('readonly');
    expect(forSymbol('O')).toHaveValue('O');
    await user.click(box(2));
    await user.keyboard('x');
    expect(box(8)).toHaveValue('O');
  });

  it('writes a letter for every symbol like it, from the table or the message, and marks one written twice', async () => {
    const { user } = await open(cryptogram);
    await user.type(forSymbol('G'), 'g');
    expect(box(1)).toHaveValue('G');
    expect(box(9)).toHaveValue('G');
    await write(user, 3, 'g');
    expect(forSymbol('H')).toHaveValue('G');
    expect(box(1)).toHaveAttribute('aria-invalid', 'true');
    expect(forSymbol('H')).toHaveAttribute('aria-invalid', 'true');
    expect(screen.getByText('G is written for more than one symbol.')).toBeInTheDocument();
    await write(user, 3, 'h');
    expect(box(1)).not.toHaveAttribute('aria-invalid');
    expect(screen.queryByText(/written for more than one symbol/)).toBeNull();
    await write(user, 5, 'm');
    await user.keyboard('e');
    expect(await screen.findByText('The hearth stone lifts.', {}, { timeout: 3000 })).toBeInTheDocument();
  });

  it('keeps the letters written, and the given ones, in the browser', async () => {
    const { user, puzzle } = await open(cryptogram);
    await user.type(forSymbol('M'), 'm');
    cleanup();
    render(<>{(await pageFor({ page: 'play', kind: 'cipher', data: puzzle })).content}</>);
    await screen.findByRole('group', { name: 'The message' });
    expect(box(5)).toHaveValue('M');
    expect(box(2)).toHaveValue('O');
  });
});
