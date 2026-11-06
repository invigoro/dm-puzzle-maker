// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { creditsFor, forgetIcons, ICON_SETS, iconUrl, iconWords, isIconName, listed, loadIcon, loadIndex, readIcon, searchIcons, setOf, type IconIndex } from './icons';

afterEach(() => {
  forgetIcons();
  vi.unstubAllGlobals();
});

const SVG = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" data-author="Lorc"><path fill="currentColor" d="M1 1h2"/></svg>';

describe('isIconName', () => {
  it('takes names as the icon sets spell them, and nothing that could go elsewhere', () => {
    for (const name of ['stone-tower', 'd10', '3d-meeple', 'fa:key', 'fa:hat-wizard']) expect(isIconName(name)).toBe(true);
    for (const name of ['../index', 'Stone-Tower', 'stone tower', 'tower-', '', 'a/b', 'xx:key', 'fa:', 'fa:../key', 'fa:fa:key', ':key', 7, null]) {
      expect(isIconName(name)).toBe(false);
    }
  });
});

describe('sets', () => {
  it('knows an icon’s set by its name’s prefix, and game-icons by none, as older links have', () => {
    expect(setOf('stone-tower').name).toBe('game-icons.net');
    expect(setOf('fa:key').name).toBe('Font Awesome');
    expect(ICON_SETS.map((set) => set.prefix)).toEqual(['', 'fa']);
  });

  it('finds each set’s files in a place of their own', () => {
    expect(iconUrl('stone-tower')).toMatch(/\/icons\/stone-tower\.svg$/);
    expect(iconUrl('fa:key')).toMatch(/\/icons\/fa\/key\.svg$/);
  });

  it('says an icon’s name in words, without its set', () => {
    expect(iconWords('stone-tower')).toBe('stone tower');
    expect(iconWords('fa:hat-wizard')).toBe('hat wizard');
  });
});

describe('readIcon', () => {
  it('reads an icon’s paths and its author', () => {
    const icon = readIcon(SVG)!;
    expect(icon.author).toBe('Lorc');
    expect(icon.body).toContain('d="M1 1h2"');
  });

  it('reads a file with a note before its drawing, as Font Awesome’s have', () => {
    const icon = readIcon('<!-- Font Awesome Free --><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" data-author="Font Awesome"><g transform="scale(0.8)"><path d="M1 1"/></g></svg>')!;
    expect(icon.author).toBe('Font Awesome');
    expect(icon.body).toMatch(/^<g [^>]*transform="scale\(0.8\)"><path d="M1 1"\/><\/g>$/);
  });

  it('gives null for what isn’t an SVG', () => {
    expect(readIcon('<html><body>Not found</body></html>')).toBeNull();
    expect(readIcon('not even markup')).toBeNull();
  });
});

describe('loadIcon', () => {
  it('fetches each icon once, and never one with a name that isn’t an icon’s', async () => {
    const fetch = vi.fn(async () => new Response(SVG));
    vi.stubGlobal('fetch', fetch);
    expect((await loadIcon('stone-tower'))?.author).toBe('Lorc');
    await loadIcon('stone-tower');
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(String((fetch.mock.calls[0] as unknown[])[0])).toMatch(/\/icons\/stone-tower\.svg$/);
    await loadIcon('fa:key');
    expect(String((fetch.mock.calls[1] as unknown[])[0])).toMatch(/\/icons\/fa\/key\.svg$/);
    expect(await loadIcon('../secrets')).toBeNull();
    expect(fetch).toHaveBeenCalledTimes(2);
  });

  it('gives null for an icon that isn’t there', async () => {
    vi.stubGlobal('fetch', async () => new Response('Not found', { status: 404 }));
    expect(await loadIcon('no-such-icon')).toBeNull();
  });
});

describe('the index', () => {
  const INDEX: IconIndex = {
    names: ['stone-tower', 'tower-flag', 'watchtower', 'bridge', 'stone-bridge', 'fa:tower-cell', 'fa:bridge', 'fa:font-awesome'],
    authors: ['Delapouite', 'Font Awesome', 'Lorc'],
    by: [2, 0, 2, 0, 0, 1, 1, 1],
  };

  it('loads, and turns away what isn’t one', async () => {
    vi.stubGlobal('fetch', async () => new Response(JSON.stringify(INDEX)));
    expect(await loadIndex()).toEqual(INDEX);
    forgetIcons();
    vi.stubGlobal('fetch', async () => new Response('{}'));
    expect(await loadIndex()).toBeNull();
  });

  it('finds icons with every word searched for, those starting with it first, from every set', () => {
    // A word that starts a name, or a part of one, ranks first; then shorter names, then game-icons first.
    expect(searchIcons(INDEX, 'tower')).toEqual(['tower-flag', 'fa:tower-cell', 'stone-tower', 'watchtower']);
    expect(searchIcons(INDEX, 'bridge')).toEqual(['bridge', 'fa:bridge', 'stone-bridge']);
    expect(searchIcons(INDEX, 'Stone  Bridge')).toEqual(['stone-bridge']);
    expect(searchIcons(INDEX, '  ')).toEqual([]);
    expect(searchIcons(INDEX, 'tower', { most: 1 })).toHaveLength(1);
  });

  it('searches one set, and never matches a set’s prefix as a word', () => {
    expect(searchIcons(INDEX, 'bridge', { set: 'fa' })).toEqual(['fa:bridge']);
    expect(searchIcons(INDEX, 'bridge', { set: '' })).toEqual(['bridge', 'stone-bridge']);
    expect(searchIcons(INDEX, 'fa')).toEqual([]);
    expect(searchIcons(INDEX, 'awesome')).toEqual(['fa:font-awesome']);
  });
});

describe('credits', () => {
  const icon = (author: string) => ({ body: '', author });

  it('lists names as a sentence does', () => {
    expect(listed([])).toBe('');
    expect(listed(['Lorc'])).toBe('Lorc');
    expect(listed(['Delapouite', 'Lorc', 'Skoll'])).toBe('Delapouite, Lorc and Skoll');
  });

  it('names each game-icons maker once, and Font Awesome as a whole, as their licenses ask', () => {
    expect(creditsFor(new Map())).toEqual([]);
    const credits = creditsFor(
      new Map([
        ['fa:key', icon('Font Awesome')],
        ['stone-tower', icon('Lorc')],
        ['anvil', icon('Lorc')],
        ['tower-flag', icon('Delapouite')],
      ]),
    );
    expect(credits.map(({ set, makers }) => [set.name, makers])).toEqual([
      ['game-icons.net', 'Delapouite and Lorc'],
      ['Font Awesome', ''],
    ]);
  });
});
