// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it } from 'vitest';
import { pageFor } from '../../ui/pages';
import { newDesign, toPuzzle, type FloorDesign } from './design';

afterEach(() => {
  cleanup();
  localStorage.clear();
});

// Five by five, from the bottom to the top, with traps at row 3, columns 2 and 4.
const design: FloorDesign = {
  ...newDesign(),
  width: 5,
  height: 5,
  start: { side: 'bottom' },
  goal: { side: 'top' },
  placed: [11, 13],
  fair: false,
  kinds: [{ icon: '', line: 'Darts from the walls!' }],
  failLine: 'The party falls back.',
  words: { title: 'The vault floor', intro: 'Mind the stones.', success: 'Across, and whole.' },
};

async function open(change: Partial<FloorDesign> = {}) {
  const puzzle = JSON.parse(JSON.stringify(await toPuzzle({ ...design, ...change })));
  render(<>{(await pageFor({ page: 'play', kind: 'trapped-floor', data: puzzle })).content}</>);
  await screen.findByRole('group', { name: 'The floor' });
  return { user: userEvent.setup(), puzzle };
}

const square = (row: number, column: number) => screen.getByRole('button', { name: new RegExp(`^Row ${row}, column ${column}:`) });
const status = () => screen.getByRole('status');

describe('the trapped floor', () => {
  it('shows the counts round the start, and lets the party step only beside where they’ve stood', async () => {
    const { user } = await open();
    expect(square(4, 3)).toHaveAccessibleName('Row 4, column 3: 2 traps round it');
    expect(square(4, 1)).toHaveAccessibleName('Row 4, column 1: 1 trap round it');
    await user.click(square(1, 1));
    expect(square(1, 1)).toHaveAccessibleName('Row 1, column 1: not stepped on, the goal');
  });

  it('crosses to the goal, opening the squares round one with no traps round it', async () => {
    const { user } = await open();
    await user.click(square(3, 1));
    expect(square(3, 1)).toHaveAccessibleName('Row 3, column 1: 1 trap round it');
    await user.click(square(2, 1));
    await user.click(square(1, 1));
    expect(square(1, 2)).toHaveAccessibleName('Row 1, column 2: no traps round it, the goal');
    expect(status()).toHaveTextContent('Across, and whole.');
  });

  it('says what a trap does, and lets the party carry on', async () => {
    const { user } = await open();
    await user.click(square(3, 2));
    expect(status()).toHaveTextContent('Darts from the walls!');
    expect(square(3, 2)).toHaveAccessibleName('Row 3, column 2: a hidden trap, sprung');
    expect(screen.getByText('1 trap sprung')).toBeInTheDocument();
    await user.click(square(3, 1));
    expect(square(3, 1)).toHaveAccessibleName('Row 3, column 1: 1 trap round it');
  });

  it('sends the party back to the start, when that’s what a trap does', async () => {
    const { user } = await open({ onTrap: 'restart' });
    await user.click(square(3, 1));
    await user.click(square(3, 2));
    expect(square(3, 1)).toHaveAccessibleName('Row 3, column 1: not stepped on');
    // They remember where the trap was.
    expect(square(3, 2)).toHaveAccessibleName('Row 3, column 2: a hidden trap, sprung');
  });

  it('fails the party after so many traps', async () => {
    const { user } = await open({ onTrap: 'fail', failAfter: 1 });
    await user.click(square(3, 2));
    expect(status()).toHaveTextContent('The party falls back.');
    await user.click(square(3, 1));
    expect(square(3, 1)).toHaveAccessibleName('Row 3, column 1: not stepped on');
  });

  it('marks a suspected trap, and won’t step on it', async () => {
    const { user } = await open();
    await user.click(screen.getByRole('button', { name: 'Mark traps' }));
    await user.click(square(3, 2));
    expect(square(3, 2)).toHaveAccessibleName('Row 3, column 2: marked as a trap');
    await user.click(screen.getByRole('button', { name: 'Marking traps' }));
    await user.click(square(3, 2));
    expect(screen.getByText('0 traps sprung')).toBeInTheDocument();
  });

  it('moves one square at a time, when the party moves as a token', async () => {
    const { user } = await open({ moves: 'single' });
    expect(square(5, 3)).toHaveAccessibleName('Row 5, column 3: no traps round it, where you stand');
    // Not beside where they stand.
    await user.click(square(3, 1));
    expect(square(3, 1)).toHaveAccessibleName('Row 3, column 1: not stepped on');
    await user.click(square(4, 3));
    await user.click(square(3, 3));
    expect(square(3, 3)).toHaveAccessibleName('Row 3, column 3: 2 traps round it, where you stand');
  });

  it('keeps the party’s progress in the browser', async () => {
    const { user, puzzle } = await open();
    await user.click(square(3, 1));
    cleanup();
    render(<>{(await pageFor({ page: 'play', kind: 'trapped-floor', data: puzzle })).content}</>);
    await screen.findByRole('group', { name: 'The floor' });
    expect(square(3, 1)).toHaveAccessibleName('Row 3, column 1: 1 trap round it');
  });
});
