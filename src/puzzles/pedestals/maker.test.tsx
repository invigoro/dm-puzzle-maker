// @vitest-environment jsdom
import { cleanup, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { forgetIcons } from '../../kit/icons';
import { readRoute } from '../../kit/route';
import { fakeIconFetch } from '../../test/icons';
import { pageFor } from '../../ui/pages';
import { readDesign } from './design';
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
  render(<>{(await pageFor({ page: 'make', kind: 'pedestals', data: null })).content}</>);
  return user;
}

const copyButton = () => screen.getByRole('button', { name: 'Copy player link' });
const linkReady = () => waitFor(() => expect(copyButton()).toBeEnabled(), { timeout: 3000 });
const designNow = async () => {
  await waitFor(() => expect(location.hash).toMatch(/^#m=/));
  const route = await readRoute(location.hash, ['pedestals']);
  return route.page === 'make' ? readDesign(route.data)! : null;
};
async function copiedPuzzle(user: ReturnType<typeof userEvent.setup>) {
  await linkReady();
  await user.click(copyButton());
  const route = await readRoute(new URL(await navigator.clipboard.readText()).hash, ['pedestals']);
  return readPuzzle(route.page === 'play' ? route.data : null);
}

describe('the pedestals maker', () => {
  it('won’t send pedestals until each has a riddle and its object', async () => {
    const user = await openMaker();
    expect(screen.getByText('Give every pedestal a riddle and its object, in words or a picture.')).toBeInTheDocument();
    expect(copyButton()).toBeDisabled();
    // Two pedestals: the third's Take away comes after the first two's.
    await user.click(screen.getAllByRole('button', { name: 'Take away' })[2]);
    expect(screen.queryByRole('textbox', { name: 'Riddle 3' })).toBeNull();
    await user.type(screen.getByRole('textbox', { name: 'Riddle 1' }), 'Place the greatest weapon.');
    await user.type(screen.getByRole('textbox', { name: 'Object for pedestal 1' }), 'Olive branch');
    await user.type(screen.getByRole('textbox', { name: 'Riddle 2' }), 'Place what a king bows to.');
    await user.type(screen.getByRole('textbox', { name: 'Object for pedestal 2' }), 'Hourglass');
    await linkReady();
  });

  it('starts from the example, tries it, and sends a link with every object', async () => {
    const user = await openMaker();
    await user.click(screen.getByRole('button', { name: 'Start from the example' }));
    expect(screen.getByRole('textbox', { name: 'Riddle 1' })).toHaveValue('Place the greatest weapon.');
    const trial = screen.getByRole('group', { name: 'The pedestals' });
    const floor = screen.getByRole('group', { name: 'The floor' });
    for (const [name, n] of [['Olive branch', 1], ['Hourglass', 2], ['Gold coins', 3]] as const) {
      await user.click(within(floor).getByRole('button', { name }));
      await user.click(within(trial).getByRole('button', { name: new RegExp(`^Pedestal ${n},`) }));
    }
    expect(await screen.findByText('The plinths sink into the floor, and the door grinds open.')).toBeInTheDocument();
    const puzzle = await copiedPuzzle(user);
    expect(puzzle?.riddles).toHaveLength(3);
    expect(puzzle?.objects).toHaveLength(7);
  });

  it('adds pedestals and objects, up to their limits, and gives a riddle a picture', async () => {
    const user = await openMaker();
    for (let i = 0; i < 5; i++) await user.click(screen.getByRole('button', { name: 'Add a pedestal' }));
    expect(screen.getByRole('textbox', { name: 'Riddle 8' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Add a pedestal' })).toBeNull();
    await user.click(screen.getByRole('button', { name: 'Add an object' }));
    expect(screen.getByRole('textbox', { name: 'Other object 4' })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Picture for riddle 2' }));
    await user.type(screen.getByRole('searchbox', { name: 'Search the pictures' }), 'tower');
    await user.click(await screen.findByRole('button', { name: 'stone tower' }));
    expect((await designNow())?.pedestals[1].riddle).toEqual({ text: '', icon: 'stone-tower' });
  });

  it('checks on asking, telling how many are right, and can fail the players', async () => {
    const user = await openMaker();
    await user.click(screen.getByRole('button', { name: 'Start from the example' }));
    expect(screen.queryByRole('textbox', { name: 'A wrong check says' })).toBeNull();
    await user.click(screen.getByRole('radio', { name: /^When they ask:/ }));
    await user.click(screen.getByRole('radio', { name: 'how many are right' }));
    await user.type(screen.getByRole('textbox', { name: 'A wrong check says' }), 'Darts fly.');
    await user.selectOptions(screen.getByRole('combobox', { name: 'They fail' }), 'After 3 wrong');
    expect(screen.getByRole('textbox', { name: 'Failing says' })).toBeInTheDocument();
    expect(within(screen.getByRole('group', { name: 'The pedestals' }).parentElement!).getByRole('button', { name: 'Check the answer' })).toBeDisabled();
    const puzzle = await copiedPuzzle(user);
    expect(puzzle).toMatchObject({ check: 'asked', tell: 'count', wrong: 'Darts fly.', failAfter: 3 });
    expect(puzzle?.places).toHaveLength(3);
  });

  it('says when an other object would be right too', async () => {
    const user = await openMaker();
    await user.click(screen.getByRole('button', { name: 'Start from the example' }));
    await user.click(screen.getByRole('button', { name: 'Picture for other object 1' }));
    await user.click(screen.getByRole('button', { name: 'No picture' }));
    await user.clear(screen.getByRole('textbox', { name: 'Other object 1' }));
    await user.type(screen.getByRole('textbox', { name: 'Other object 1' }), 'hourglass');
    // The example's hourglass has a picture, so the words alone are another object.
    expect(screen.queryByText(/would be right too/)).toBeNull();
    await user.click(screen.getByRole('button', { name: 'Picture for object for pedestal 2' }));
    await user.click(screen.getByRole('button', { name: 'No picture' }));
    expect(screen.getByText(/would be right too/)).toBeInTheDocument();
    expect(copyButton()).toBeDisabled();
  });
});
