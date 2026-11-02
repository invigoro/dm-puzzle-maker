import { afterEach, describe, expect, it, vi } from 'vitest';
import { discordLink, shorten } from './share';

afterEach(() => {
  vi.unstubAllGlobals();
});

const LINK = 'https://daedalus.invigoro.me/#p=AbC-12_x';

/** is.gd answering with this, and what it was asked. */
function isgd(answer: unknown) {
  const asked: string[] = [];
  vi.stubGlobal('fetch', async (url: string) => {
    asked.push(url);
    return new Response(JSON.stringify(answer));
  });
  return asked;
}

describe('shortening', () => {
  it('asks is.gd for a short link, the whole player link fragment and all', async () => {
    const asked = isgd({ shorturl: 'https://is.gd/Ab3_x9' });
    expect(await shorten(LINK)).toEqual({ short: 'https://is.gd/Ab3_x9' });
    expect(asked).toEqual([`https://is.gd/create.php?format=json&url=${encodeURIComponent(LINK)}`]);
    expect(new URL(asked[0]).searchParams.get('url')).toBe(LINK);
  });

  it('says what is.gd says when it won’t', async () => {
    isgd({ errorcode: 1, errormessage: 'Please specify a valid URL to shorten.' });
    expect(await shorten(LINK)).toEqual({ problem: 'is.gd says: Please specify a valid URL to shorten.' });
  });

  it('takes nothing but an is.gd link back', async () => {
    isgd({ shorturl: 'https://elsewhere.example/x' });
    expect(await shorten(LINK)).toEqual({ problem: 'is.gd didn’t send back a short link.' });
  });

  it('says so when is.gd can’t be reached', async () => {
    vi.stubGlobal('fetch', async () => {
      throw new TypeError('Failed to fetch');
    });
    expect(await shorten(LINK)).toEqual({ problem: 'Couldn’t reach is.gd. Try again in a moment.' });
  });
});

describe('a Discord link', () => {
  it('shows by its title, with no brackets left in the title to break it', () => {
    expect(discordLink('The cellars', LINK)).toBe(`[The cellars](${LINK})`);
    expect(discordLink('[Sealed] door ', LINK)).toBe(`[Sealed door](${LINK})`);
  });
});
