// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it } from 'vitest';
import { pageFor } from '../../ui/pages';
import { mazeOf, newDesign, toPuzzle, type MazeDesign } from './design';
import { DIRECTIONS, stepFrom, canStep, type Direction } from './engine/grid';
import { wayBetween } from './engine/paths';

afterEach(() => {
  cleanup();
  localStorage.clear();
});

const base: MazeDesign = {
  ...newDesign(),
  width: 6,
  height: 6,
  seed: 4,
  start: 0,
  exits: [{ cell: 35, line: '' }],
  words: { title: 'The cellars', intro: 'Find the door.', success: 'The smugglers’ door.' },
};
// A second way out that the way to the first doesn't pass, nor passes the first on the way to it.
const toFirst = wayBetween(mazeOf(base), 0, 35)!;
const second = Array.from({ length: 36 }, (_, cell) => cell).find(
  (cell) => cell !== 0 && !toFirst.includes(cell) && !wayBetween(mazeOf(base), 0, cell)!.includes(35),
)!;
const design: MazeDesign = { ...base, exits: [...base.exits, { cell: second, line: 'The kitchen, and an angry cook.' }] };

const ARROWS: Record<Direction, string> = { up: '{ArrowUp}', right: '{ArrowRight}', down: '{ArrowDown}', left: '{ArrowLeft}' };

/** The arrow keys that walk the shortest way from one cell to another. */
function keysFor(made: MazeDesign, to: number): string {
  const maze = mazeOf(made);
  const way = wayBetween(maze, made.start, to)!;
  return way
    .slice(1)
    .map((cell, i) => ARROWS[DIRECTIONS.find((direction) => stepFrom(maze, way[i], direction) === cell)!])
    .join('');
}

async function open(change: Partial<MazeDesign> = {}) {
  const puzzle = JSON.parse(JSON.stringify(await toPuzzle({ ...design, ...change })));
  render(<>{(await pageFor({ page: 'play', kind: 'maze', data: puzzle })).content}</>);
  return { user: userEvent.setup(), puzzle };
}

const fog = () => document.querySelectorAll('.maze .cell.fog').length;

describe('the maze', () => {
  it('walks the way out with the arrow keys, and says its line', async () => {
    const { user } = await open();
    const keys = keysFor(design, 35);
    await user.keyboard(keys);
    expect(screen.getByRole('status')).toHaveTextContent('The smugglers’ door.');
    expect(screen.getByText(`${keys.split('}').length - 1} steps`)).toBeInTheDocument();
  });

  it('says another way out’s own line', async () => {
    const { user } = await open();
    await user.keyboard(keysFor(design, second));
    expect(screen.getByRole('status')).toHaveTextContent('The kitchen, and an angry cook.');
  });

  it('won’t walk through walls', async () => {
    const { user } = await open();
    const maze = mazeOf(design);
    const blocked = DIRECTIONS.find((direction) => !canStep(maze, 0, direction))!;
    await user.keyboard(ARROWS[blocked]);
    expect(screen.getByText('0 steps')).toBeInTheDocument();
  });

  it('shows only what the light allows', async () => {
    await open({ light: 'lit' });
    expect(fog()).toBe(0);
    cleanup();
    await open({ light: 'lantern' });
    expect(fog()).toBeGreaterThan(20);
    cleanup();
    await open({ light: 'dark' });
    expect(fog()).toBe(35);
  });

  it('keeps the lantern’s map as the party walks', async () => {
    const { user } = await open({ light: 'lantern' });
    const before = fog();
    await user.keyboard(keysFor(design, 35).split('}').slice(0, 4).join('}') + '}');
    expect(fog()).toBeLessThan(before);
  });

  it('keeps where the party is in the browser', async () => {
    const { user, puzzle } = await open();
    await user.keyboard(keysFor(design, 35).split('}').slice(0, 3).join('}') + '}');
    expect(screen.getByText('3 steps')).toBeInTheDocument();
    cleanup();
    render(<>{(await pageFor({ page: 'play', kind: 'maze', data: puzzle })).content}</>);
    expect(screen.getByText('3 steps')).toBeInTheDocument();
  });
});
