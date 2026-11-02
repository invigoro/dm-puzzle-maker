// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { forgetIcons } from '../../kit/icons';
import { fakeIconFetch } from '../../test/icons';
import { pageFor } from '../../ui/pages';
import { mazeOf, newDesign, toPuzzle, type MazeDesign } from './design';
import { DIRECTIONS, stepFrom, canStep, type Direction } from './engine/grid';
import { lit, wayBetween } from './engine/paths';

beforeEach(() => {
  vi.stubGlobal('fetch', fakeIconFetch);
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  forgetIcons();
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
/** The first steps of the way to the first way out. */
const firstSteps = (count: number) => keysFor(design, 35).split('}').slice(0, count).join('}') + '}';
/** A cell's column and row, on this maze of six by six. */
const placeOf = (cell: number) => [cell % 6, Math.floor(cell / 6)] as const;
/** Where the token is drawn: a cell's centre. */
const token = () => ['cx', 'cy'].map((side) => Number(document.querySelector('.maze .token')!.getAttribute(side)));

describe('pictures in the maze', () => {
  it('shows a landmark when its cell is in sight, and says its line on reaching it', async () => {
    const cell = toFirst[3];
    const { user } = await open({ light: 'lit', pictures: [{ cell, icon: 'stone-tower', kind: 'landmark', line: 'A cairn of stones.' }] });
    expect(screen.getByRole('img', { name: 'stone tower, a landmark' })).toBeInTheDocument();
    await user.keyboard(firstSteps(3));
    expect(screen.getByRole('status')).toHaveTextContent('A cairn of stones.');
    await user.keyboard(firstSteps(4).slice(firstSteps(3).length));
    expect(screen.getByRole('status')).toHaveTextContent(/^$/);
  });

  it('shows a landmark only when the light reaches it', async () => {
    await open({ light: 'dark', reach: 0, pictures: [{ cell: toFirst[3], icon: 'stone-tower', kind: 'landmark', line: '' }] });
    expect(screen.queryByRole('img')).toBeNull();
  });

  it('says a hazard’s line, and the party carries on from it', async () => {
    const { user } = await open({ light: 'lit', pictures: [{ cell: toFirst[2], icon: 'stone-tower', kind: 'hazard', line: '' }] });
    expect(screen.getByRole('img', { name: 'stone tower, a hazard' })).toBeInTheDocument();
    await user.keyboard(firstSteps(2));
    expect(screen.getByRole('status')).toHaveTextContent('A hazard!');
    expect(token()).toEqual([...placeOf(toFirst[2])].map((at) => (at + 0.5) * 20));
  });

  it('hides a hidden hazard until the party runs into it, then sends them back, when that’s what hazards do', async () => {
    const { user } = await open({ light: 'lit', onHazard: 'back', pictures: [{ cell: toFirst[4], icon: 'stone-tower', kind: 'hidden', line: 'Rats!' }] });
    expect(screen.queryByRole('img')).toBeNull();
    await user.keyboard(firstSteps(4));
    expect(screen.getByRole('status')).toHaveTextContent('Rats! Back to the way in.');
    expect(screen.getByRole('img', { name: 'stone tower, a hidden hazard' })).toBeInTheDocument();
    expect(token()).toEqual([10, 10]);
    expect(screen.getByText('4 steps')).toBeInTheDocument();
  });

  it('names who made the pictures', async () => {
    await open({ pictures: [{ cell: toFirst[4], icon: 'stone-tower', kind: 'hidden', line: '' }] });
    expect(await screen.findByText(/Lorc/)).toBeInTheDocument();
  });
});

describe('a window onto the maze', () => {
  it('shows only the cells round the party, the maze sliding under it as they go', async () => {
    const { user } = await open({ light: 'lit', view: 3 });
    const board = screen.getByRole('group', { name: 'The maze' });
    expect(board).toHaveAttribute('viewBox', '0 0 60 60');
    const slide = () => board.querySelector('.sliding')!.getAttribute('style');
    // At the top left, the window's middle cell is the maze's first.
    expect(slide()).toContain('translate(20px, 20px)');
    await user.keyboard(firstSteps(1));
    const [x, y] = placeOf(toFirst[1]);
    expect(slide()).toContain(`translate(${(1 - x) * 20}px, ${(1 - y) * 20}px)`);
  });
});

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
    await open({ light: 'dark', reach: 0 });
    expect(fog()).toBe(35);
  });

  it('shows as far as the light reaches, along the passages', async () => {
    await open({ light: 'dark', reach: 3 });
    expect(fog()).toBe(36 - lit(mazeOf(design), 0, 3).length);
    expect(document.querySelectorAll('.maze .cell.near')).toHaveLength(lit(mazeOf(design), 0, 3).length);
  });

  it('keeps nothing drawn in the dark, as the party walks', async () => {
    const { user } = await open({ light: 'dark', reach: 1 });
    await user.keyboard(keysFor(design, 35).split('}').slice(0, 4).join('}') + '}');
    const at = wayBetween(mazeOf(design), 0, 35)![4];
    expect(fog()).toBe(36 - lit(mazeOf(design), at, 1).length);
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
