// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { Words } from '../kit/words';
import type { MakerSide, PuzzleKind } from '../puzzles/types';
import { Send } from './Send';

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

/** A kind of puzzle that's only words, to send. */
interface Design {
  words: Words;
}
const side: MakerSide<Design> = {
  newDesign: () => ({ words: { title: '', intro: '', success: '' } }),
  readDesign: () => null,
  problemsOf: () => [],
  toPuzzle: async (design) => ({ words: design.words }),
  Maker: () => null,
};
const kind: PuzzleKind = {
  id: 'test',
  name: 'Test puzzle',
  blurb: '',
  maker: async () => side,
  player: async () => ({ readPuzzle: () => null, Player: () => null }),
};
const titled = (title: string): Design => ({ words: { title, intro: 'Find the door.', success: '' } });

async function open(design = titled('The cellars')) {
  const user = userEvent.setup();
  const view = render(<Send kind={kind} side={side} design={design} />);
  const link = ((await screen.findByRole('textbox', { name: 'Player link' })) as HTMLInputElement).value;
  return { user, link, view };
}

/** is.gd answering with this, as fetch would bring it. */
const isgd = (answer: unknown) => vi.stubGlobal('fetch', async () => new Response(JSON.stringify(answer)));
const button = (name: string) => screen.getByRole('button', { name });
const status = () => screen.getByRole('status');

describe('sending a puzzle', () => {
  it('copies the player link as Discord shows a link, by its title', async () => {
    const { user, link } = await open();
    await user.click(button('Copy as a Discord link'));
    expect(await navigator.clipboard.readText()).toBe(`[The cellars](${link})`);
    expect(status()).toHaveTextContent('Copied for Discord, where it shows as “The cellars”.');
  });

  it('names an untitled puzzle by its kind, for Discord', async () => {
    const { user, link } = await open(titled(''));
    await user.click(button('Copy as a Discord link'));
    expect(await navigator.clipboard.readText()).toBe(`[Test puzzle](${link})`);
  });

  it('shortens the player link with is.gd, copies it, and uses it for Discord too', async () => {
    isgd({ shorturl: 'https://is.gd/Ab3x9' });
    const { user } = await open();
    await user.click(button('Shorten with is.gd'));
    expect(screen.getByRole('textbox', { name: 'Short link' })).toHaveValue('https://is.gd/Ab3x9');
    expect(await navigator.clipboard.readText()).toBe('https://is.gd/Ab3x9');
    expect(status()).toHaveTextContent('Shortened, and copied the short link.');
    await user.click(button('Copy as a Discord link'));
    expect(await navigator.clipboard.readText()).toBe('[The cellars](https://is.gd/Ab3x9)');
    await user.click(button('Copy short link'));
    expect(status()).toHaveTextContent('Copied the short link.');
  });

  it('says why, when is.gd won’t shorten it', async () => {
    isgd({ errorcode: 1, errormessage: 'Please specify a valid URL to shorten.' });
    const { user } = await open();
    await user.click(button('Shorten with is.gd'));
    expect(status()).toHaveTextContent('Couldn’t shorten it. is.gd says: Please specify a valid URL to shorten.');
    expect(screen.queryByRole('textbox', { name: 'Short link' })).toBeNull();
  });

  it('lets a short link go when the puzzle changes, as it opens the puzzle as it was', async () => {
    isgd({ shorturl: 'https://is.gd/Ab3x9' });
    const { user, view } = await open();
    await user.click(button('Shorten with is.gd'));
    view.rerender(<Send kind={kind} side={side} design={titled('The vaults')} />);
    await screen.findByRole('textbox', { name: 'Player link' });
    expect(screen.queryByRole('textbox', { name: 'Short link' })).toBeNull();
    expect(button('Shorten with is.gd')).toBeEnabled();
  });
});
