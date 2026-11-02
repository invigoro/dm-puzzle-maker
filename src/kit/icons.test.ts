// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { creditFor, forgetIcons, isIconName, loadIcon, loadIndex, readIcon, searchIcons, type IconIndex } from './icons';

afterEach(() => {
  forgetIcons();
  vi.unstubAllGlobals();
});

const SVG = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" data-author="Lorc"><path fill="currentColor" d="M1 1h2"/></svg>';

describe('isIconName', () => {
  it('takes names as the icon set spells them, and nothing that could go elsewhere', () => {
    for (const name of ['stone-tower', 'd10', '3d-meeple']) expect(isIconName(name)).toBe(true);
    for (const name of ['../index', 'Stone-Tower', 'stone tower', 'tower-', '', 'a/b', 7, null]) expect(isIconName(name)).toBe(false);
  });
});

describe('readIcon', () => {
  it('reads an icon’s paths and its author', () => {
    const icon = readIcon(SVG)!;
    expect(icon.author).toBe('Lorc');
    expect(icon.body).toContain('d="M1 1h2"');
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
    expect(await loadIcon('../secrets')).toBeNull();
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it('gives null for an icon that isn’t there', async () => {
    vi.stubGlobal('fetch', async () => new Response('Not found', { status: 404 }));
    expect(await loadIcon('no-such-icon')).toBeNull();
  });
});

describe('the index', () => {
  const INDEX: IconIndex = { names: ['stone-tower', 'tower-flag', 'watchtower', 'bridge', 'stone-bridge'], authors: ['Delapouite', 'Lorc'], by: [1, 0, 1, 0, 0] };

  it('loads, and turns away what isn’t one', async () => {
    vi.stubGlobal('fetch', async () => new Response(JSON.stringify(INDEX)));
    expect(await loadIndex()).toEqual(INDEX);
    forgetIcons();
    vi.stubGlobal('fetch', async () => new Response('{}'));
    expect(await loadIndex()).toBeNull();
  });

  it('finds icons with every word searched for, those starting with it first', () => {
    // A word that starts a name, or a part of one, ranks first; then shorter names.
    expect(searchIcons(INDEX, 'tower')).toEqual(['tower-flag', 'stone-tower', 'watchtower']);
    expect(searchIcons(INDEX, 'Stone  Bridge')).toEqual(['stone-bridge']);
    expect(searchIcons(INDEX, '  ')).toEqual([]);
    expect(searchIcons(INDEX, 'tower', 1)).toHaveLength(1);
  });
});

describe('creditFor', () => {
  it('names each author once, as the icons’ license asks', () => {
    expect(creditFor([])).toBe('');
    expect(creditFor(['Lorc', 'Lorc'])).toBe('Icons made by Lorc');
    expect(creditFor(['Lorc', 'Delapouite', 'Skoll'])).toBe('Icons made by Delapouite, Lorc and Skoll');
  });
});
