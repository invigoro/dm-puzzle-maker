// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { forgetIcons } from '../../kit/icons';
import { fakeIconFetch } from '../../test/icons';
import { pageFor } from '../../ui/pages';
import { newDesign, toPuzzle, type BraziersDesign } from './design';

beforeEach(() => {
  vi.stubGlobal('fetch', fakeIconFetch);
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  forgetIcons();
  localStorage.clear();
});

// Three by three, with the middle and the four beside it burning: one touch on the middle puts them out.
const design: BraziersDesign = {
  ...newDesign(),
  words: { title: 'The cold hearths', intro: 'Put them out.', success: 'The hearths are cold.' },
  width: 3,
  height: 3,
  starting: 'hand',
  drawn: [1, 3, 4, 5, 7],
  icon: 'stone-tower',
};

async function open(change: Partial<BraziersDesign> = {}) {
  const puzzle = JSON.parse(JSON.stringify(await toPuzzle({ ...design, ...change })));
  render(<>{(await pageFor({ page: 'play', kind: 'braziers', data: puzzle })).content}</>);
  await screen.findByRole('group', { name: 'The braziers' });
  return { user: userEvent.setup(), puzzle };
}

const square = (row: number, column: number) => screen.getByRole('button', { name: new RegExp(`^Row ${row}, column ${column}:`) });
const status = () => screen.getByRole('status');

describe('a floor of braziers', () => {
  it('flips a brazier and those beside it, and settles once all are out', async () => {
    const { user } = await open();
    expect(square(1, 1)).toHaveAccessibleName('Row 1, column 1: cold');
    expect(square(2, 2)).toHaveAccessibleName('Row 2, column 2: burning');
    await user.click(square(1, 1));
    // The corner lights, and the two beside it go out.
    expect(square(1, 1)).toHaveAccessibleName(/: burning$/);
    expect(square(1, 2)).toHaveAccessibleName(/: cold$/);
    expect(square(2, 1)).toHaveAccessibleName(/: cold$/);
    expect(screen.getByText('1 touch')).toBeInTheDocument();
    await user.click(square(1, 1));
    await user.click(square(2, 2));
    expect(await screen.findByText('The hearths are cold.')).toBeInTheDocument();
    expect(screen.getByText('3 touches')).toBeInTheDocument();
    expect(square(2, 2)).toBeDisabled();
  });

  it('takes a touch back, or starts over, with the count', async () => {
    const { user } = await open();
    await user.click(square(1, 1));
    await user.click(square(3, 3));
    await user.click(screen.getByRole('button', { name: 'Undo' }));
    expect(square(3, 3)).toHaveAccessibleName(/: cold$/);
    expect(square(1, 1)).toHaveAccessibleName(/: burning$/);
    expect(screen.getByText('1 touch')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Start over' }));
    expect(square(1, 1)).toHaveAccessibleName(/: cold$/);
    expect(screen.getByText('0 touches')).toBeInTheDocument();
  });

  it('counts every touch against a limit, Undo and all, and fails the players at it', async () => {
    const { user } = await open({ limit: 3, failLine: 'The floor flares up.' });
    await user.click(square(1, 1));
    await user.click(screen.getByRole('button', { name: 'Undo' }));
    expect(screen.getByText('1 of 3 touches')).toBeInTheDocument();
    await user.click(square(1, 3));
    await user.click(square(3, 1));
    expect(await screen.findByText('The floor flares up.')).toBeInTheDocument();
    expect(screen.getByText('3 of 3 touches')).toBeInTheDocument();
    expect(square(2, 2)).toBeDisabled();
  });

  it('moves between braziers with the arrow keys, passing over bare squares', async () => {
    const { user } = await open({ bare: [1] });
    expect(screen.queryByRole('button', { name: /^Row 1, column 2:/ })).toBeNull();
    square(1, 1).focus();
    await user.keyboard('{ArrowRight}');
    expect(square(1, 3)).toHaveFocus();
    await user.keyboard('{ArrowDown}{ArrowLeft}');
    expect(square(2, 2)).toHaveFocus();
    await user.keyboard('{Enter}');
    expect(screen.getByText('1 touch')).toBeInTheDocument();
  });

  it('shows a pattern it’s to match beside the floor', async () => {
    await open({ goal: 'pattern', pattern: [0, 8], drawn: [] });
    expect(screen.getByRole('img', { name: 'The goal: burning at row 1, column 1; row 3, column 3' })).toBeInTheDocument();
    expect(screen.getByText(/^Make the floor match the goal\./)).toBeInTheDocument();
  });

  it('keeps the floor and the count in the browser', async () => {
    const { user, puzzle } = await open();
    await user.click(square(1, 1));
    cleanup();
    render(<>{(await pageFor({ page: 'play', kind: 'braziers', data: puzzle })).content}</>);
    await screen.findByRole('group', { name: 'The braziers' });
    expect(square(1, 1)).toHaveAccessibleName(/: burning$/);
    expect(screen.getByText('1 touch')).toBeInTheDocument();
  });

  it('names who made the picture', async () => {
    await open();
    expect(await screen.findByText(/^Icons made by Lorc/)).toBeInTheDocument();
  });
});

describe('a ring with a hidden goal', () => {
  // Six round the room; the goal, never shown, is the first and third burning, one touch on the fourth away.
  const ring: Partial<BraziersDesign> = { shape: 'ring', count: 6, goal: 'pattern', pattern: [0, 2], shown: false, drawn: [0, 3, 4] };
  const brazier = (n: number) => screen.getByRole('button', { name: new RegExp(`^Brazier ${n} of 6:`) });

  it('flips the two beside a brazier, says nothing of the goal, and opens when it’s reached', async () => {
    const { user } = await open(ring);
    expect(screen.queryByRole('img', { name: /^The goal/ })).toBeNull();
    await user.click(brazier(1));
    // The first goes out, and the second and sixth light.
    expect(brazier(1)).toHaveAccessibleName(/: cold$/);
    expect(brazier(2)).toHaveAccessibleName(/: burning$/);
    expect(brazier(6)).toHaveAccessibleName(/: burning$/);
    await user.click(screen.getByRole('button', { name: 'Undo' }));
    await user.click(brazier(4));
    expect(await screen.findByText('The hearths are cold.', {}, { timeout: 3000 })).toBeInTheDocument();
  });

  it('moves round the ring with the arrow keys', async () => {
    const { user } = await open(ring);
    brazier(6).focus();
    await user.keyboard('{ArrowRight}');
    expect(brazier(1)).toHaveFocus();
    await user.keyboard('{ArrowLeft}{ArrowLeft}');
    expect(brazier(5)).toHaveFocus();
    expect(status()).toBeEmptyDOMElement();
  });
});
