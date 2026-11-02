// @vitest-environment jsdom
import { cleanup, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { forgetIcons } from '../../kit/icons';
import { fakeIconFetch } from '../../test/icons';
import { pageFor } from '../../ui/pages';
import { newDesign, toPuzzle, type PedestalsDesign } from './design';

beforeEach(() => {
  vi.stubGlobal('fetch', fakeIconFetch);
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  forgetIcons();
  localStorage.clear();
});

// Made-up riddles, never a game master's own.
const design: PedestalsDesign = {
  ...newDesign(),
  words: { title: 'The miller’s shrine', intro: 'Three stones, three questions.', success: 'The millstone turns aside.' },
  pedestals: [
    { riddle: { text: 'What the river gives the wheel' }, object: { text: 'Water jug' } },
    { riddle: { text: 'What cuts the grain' }, object: { text: 'Sickle' } },
    { riddle: { text: 'The miller’s due' }, object: { text: 'Coins' } },
  ],
  others: [{ text: 'Hammer' }, { text: 'Rope', icon: 'stone-tower' }],
  wrongLine: 'The floor shakes.',
  seed: 7,
};

async function open(change: Partial<PedestalsDesign> = {}) {
  const puzzle = JSON.parse(JSON.stringify(await toPuzzle({ ...design, ...change })));
  render(<>{(await pageFor({ page: 'play', kind: 'pedestals', data: puzzle })).content}</>);
  await screen.findByRole('group', { name: 'The pedestals' });
  return { user: userEvent.setup(), puzzle };
}

const pedestal = (n: number) => screen.getByRole('button', { name: new RegExp(`^Pedestal ${n},`) });
const object = (name: string) => within(screen.getByRole('group', { name: 'The floor' })).getByRole('button', { name });
const status = () => screen.getByRole('status');
const check = () => screen.getByRole('button', { name: 'Check the answer' });

/** Picks an object up from the floor, and sets it on a pedestal. */
async function setOn(user: ReturnType<typeof userEvent.setup>, name: string, n: number) {
  await user.click(object(name));
  await user.click(pedestal(n));
}

describe('pedestals checked when all are right', () => {
  it('shows each riddle, and opens once every pedestal holds its object, saying nothing before', async () => {
    const { user } = await open({ check: 'all' });
    expect(pedestal(1)).toHaveAccessibleName('Pedestal 1, “What the river gives the wheel”: empty');
    await setOn(user, 'Hammer', 1);
    expect(pedestal(1)).toHaveAccessibleName('Pedestal 1, “What the river gives the wheel”: holding Hammer');
    await setOn(user, 'Sickle', 2);
    await setOn(user, 'Coins', 3);
    await new Promise((done) => setTimeout(done, 100));
    expect(status()).toBeEmptyDOMElement();
    // The water jug takes the hammer's place, and the hammer goes back to the floor.
    await setOn(user, 'Water jug', 1);
    expect(object('Hammer')).toBeInTheDocument();
    expect(await screen.findByText('The millstone turns aside.', {}, { timeout: 3000 })).toBeInTheDocument();
    expect(pedestal(1)).toHaveClass('lit');
  });

  it('takes an object back, or all of them', async () => {
    const { user } = await open({ check: 'all' });
    await setOn(user, 'Hammer', 1);
    await setOn(user, 'Rope', 2);
    await user.click(pedestal(1));
    expect(pedestal(1)).toHaveAccessibleName(/: empty$/);
    await user.click(screen.getByRole('button', { name: 'Take them all back' }));
    expect(pedestal(2)).toHaveAccessibleName(/: empty$/);
    expect(object('Rope')).toBeInTheDocument();
  });

  it('names who made the pictures', async () => {
    await open();
    expect(await screen.findByText(/^Icons made by Lorc/)).toBeInTheDocument();
  });
});

describe('pedestals judged as each is placed', () => {
  it('says the game master’s line for a wrong object, which drops back, and keeps a right one', async () => {
    const { user } = await open({ check: 'placed' });
    await setOn(user, 'Hammer', 1);
    expect(await screen.findByText('The floor shakes.')).toBeInTheDocument();
    expect(pedestal(1)).toHaveAccessibleName(/: empty$/);
    expect(object('Hammer')).toBeInTheDocument();
    expect(screen.getByText('1 wrong placing')).toBeInTheDocument();
    await setOn(user, 'Water jug', 1);
    await waitFor(() => expect(pedestal(1)).toHaveAccessibleName(/holding Water jug$/));
    // A right one stays where it's set.
    await user.click(pedestal(1));
    expect(pedestal(1)).toHaveAccessibleName(/holding Water jug$/);
    await setOn(user, 'Sickle', 2);
    await waitFor(() => expect(pedestal(2)).toHaveAccessibleName(/holding Sickle$/));
    await setOn(user, 'Coins', 3);
    expect(await screen.findByText('The millstone turns aside.', {}, { timeout: 3000 })).toBeInTheDocument();
  });

  it('fails the players after so many wrong, and lets them place no more', async () => {
    const { user } = await open({ check: 'placed', failAfter: 2, failLine: 'The doors seal.' });
    await setOn(user, 'Hammer', 1);
    await screen.findByText('1 wrong placing, of 2');
    await setOn(user, 'Rope', 2);
    expect(await screen.findByText('The floor shakes. The doors seal.')).toBeInTheDocument();
    expect(screen.getByText('2 wrong placings, of 2')).toBeInTheDocument();
    expect(object('Sickle')).toBeDisabled();
  });
});

describe('pedestals checked when the players ask', () => {
  it('checks only when asked, once for each set of objects, and says how many are right', async () => {
    const { user } = await open({ check: 'asked', tell: 'count' });
    expect(check()).toBeDisabled();
    await setOn(user, 'Water jug', 1);
    await setOn(user, 'Hammer', 2);
    await setOn(user, 'Coins', 3);
    await user.click(check());
    expect(await screen.findByText('The floor shakes. Two of the three are right.', {}, { timeout: 3000 })).toBeInTheDocument();
    expect(screen.getByText('1 wrong check')).toBeInTheDocument();
    expect(check()).toBeDisabled();
    await setOn(user, 'Sickle', 2);
    expect(status()).toBeEmptyDOMElement();
    await user.click(check());
    expect(await screen.findByText('The millstone turns aside.', {}, { timeout: 3000 })).toBeInTheDocument();
  });

  it('lights the right ones, when a check says which', async () => {
    const { user } = await open({ check: 'asked', tell: 'which' });
    await setOn(user, 'Water jug', 1);
    await setOn(user, 'Hammer', 2);
    await setOn(user, 'Coins', 3);
    await user.click(check());
    expect(await screen.findByText('The floor shakes. The right ones glow.', {}, { timeout: 3000 })).toBeInTheDocument();
    expect(pedestal(1)).toHaveAccessibleName(/holding Water jug, right$/);
    expect(pedestal(2)).toHaveAccessibleName(/holding Hammer$/);
    // Moving the water jug takes its glow away.
    await user.click(pedestal(1));
    expect(pedestal(1)).not.toHaveClass('glow');
    expect(pedestal(3)).toHaveClass('glow');
  });

  it('says only that it’s wrong, when that’s all a check tells', async () => {
    const { user } = await open({ check: 'asked', tell: 'wrong', wrongLine: '' });
    await setOn(user, 'Hammer', 1);
    await setOn(user, 'Rope', 2);
    await setOn(user, 'Sickle', 3);
    await user.click(check());
    expect(await screen.findByText('That’s not it.', {}, { timeout: 3000 })).toBeInTheDocument();
  });
});

describe('progress', () => {
  it('keeps what’s on the pedestals, and the count, in the browser', async () => {
    const { user, puzzle } = await open({ check: 'placed' });
    await setOn(user, 'Hammer', 1);
    await setOn(user, 'Water jug', 1);
    await waitFor(() => expect(pedestal(1)).toHaveAccessibleName(/holding Water jug$/));
    cleanup();
    render(<>{(await pageFor({ page: 'play', kind: 'pedestals', data: puzzle })).content}</>);
    await screen.findByRole('group', { name: 'The pedestals' });
    expect(pedestal(1)).toHaveAccessibleName(/holding Water jug$/);
    expect(screen.getByText('1 wrong placing')).toBeInTheDocument();
  });
});
