// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { Route } from '../kit/route';
import { KINDS } from '../puzzles/registry';
import { pageFor } from './pages';

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

async function show(route: Route) {
  const page = await pageFor(route);
  render(<>{page.content}</>);
  return page;
}

describe('pageFor', () => {
  it('lists the kinds of puzzle on the home page, each opening a new one', async () => {
    expect((await show({ page: 'home' })).title).toBe('Daedalus');
    expect(screen.getByRole('heading', { level: 1, name: 'Daedalus' })).toBeInTheDocument();
    for (const kind of KINDS) expect(screen.getByRole('link', { name: new RegExp(kind.name) })).toHaveAttribute('href', `#${kind.id}`);
  });

  it('opens a new puzzle in its kind’s maker, in the site’s frame', async () => {
    expect((await show({ page: 'make', kind: 'discs', data: null })).title).toBe('Turning discs · Daedalus');
    expect(screen.getByRole('heading', { level: 1, name: 'Turning discs' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Daedalus' })).toHaveAttribute('href', '#');
    expect(screen.getByRole('link', { name: 'Source on GitHub' })).toBeInTheDocument();
  });

  it('opens the players’ page without loading the game master’s side or frame', async () => {
    const maker = vi.spyOn(KINDS.find((kind) => kind.id === 'discs')!, 'maker');
    expect((await show({ page: 'play', kind: 'discs', data: {} })).title).toBe('A puzzle');
    expect(maker).not.toHaveBeenCalled();
    expect(screen.getByRole('link', { name: 'Daedalus' })).toHaveAttribute('href', './');
    expect(screen.queryByRole('link', { name: 'Source on GitHub' })).toBeNull();
  });

  it('says so when a link holds nothing a kind can read', async () => {
    const routes: Route[] = [
      { page: 'lost' },
      { page: 'make', kind: 'discs', data: 'junk' },
      { page: 'play', kind: 'discs', data: [] },
      { page: 'play', kind: 'sliding-tiles', data: {} },
    ];
    for (const route of routes) {
      await show(route);
      expect(screen.getByText('This link doesn’t hold a puzzle. Ask whoever sent it for it again.')).toBeInTheDocument();
      cleanup();
    }
  });
});
