import { describe, expect, it } from 'vitest';
import { pack } from './packing';
import { makerHash, newPuzzleHash, playerHash, readRoute } from './route';

const KINDS = ['discs', 'cipher-wheel'];

describe('readRoute', () => {
  it('opens the home page for an empty fragment', async () => {
    expect(await readRoute('', KINDS)).toEqual({ page: 'home' });
    expect(await readRoute('#', KINDS)).toEqual({ page: 'home' });
  });

  it('opens a new puzzle of a kind it knows', async () => {
    expect(await readRoute(newPuzzleHash('discs'), KINDS)).toEqual({ page: 'make', kind: 'discs', data: null });
    expect(await readRoute('#cipher-wheel', KINDS)).toEqual({ page: 'make', kind: 'cipher-wheel', data: null });
    expect(await readRoute('#sliding-tiles', KINDS)).toEqual({ page: 'lost' });
  });

  it('brings back a puzzle in the maker, and one on the players’ page', async () => {
    const design = { pairs: [['KARN', 'REST']] };
    expect(await readRoute(await makerHash('discs', design), KINDS)).toEqual({ page: 'make', kind: 'discs', data: design });
    const puzzle = { nodes: ['REST', 'KARN'] };
    expect(await readRoute(await playerHash('discs', puzzle), KINDS)).toEqual({ page: 'play', kind: 'discs', data: puzzle });
  });

  it('brings back a saved puzzle’s id with it, and only a maker link’s', async () => {
    expect(await readRoute(await makerHash('discs', { pairs: [] }, 'abc_123-x'), KINDS)).toEqual({ page: 'make', kind: 'discs', data: { pairs: [] }, id: 'abc_123-x' });
    expect(await readRoute(await makerHash('discs', { pairs: [] }, '../evil'), KINDS)).toEqual({ page: 'make', kind: 'discs', data: { pairs: [] } });
    expect(await readRoute('#p=' + (await pack({ v: 1, kind: 'discs', data: {}, id: 'abc' })), KINDS)).toEqual({ page: 'play', kind: 'discs', data: {} });
  });

  it('says a link is lost when it holds nothing this site knows', async () => {
    const lost = { page: 'lost' };
    expect(await readRoute('#p=not-packed-at-all', KINDS)).toEqual(lost);
    expect(await readRoute(await playerHash('sliding-tiles', {}), KINDS)).toEqual(lost);
    expect(await readRoute('#p=' + (await pack({ v: 2, kind: 'discs', data: {} })), KINDS)).toEqual(lost);
    expect(await readRoute('#p=' + (await pack({ v: 1, kind: 'discs' })), KINDS)).toEqual(lost);
    expect(await readRoute('#p=' + (await pack(['discs'])), KINDS)).toEqual(lost);
  });

  it('never spells out what a link holds', async () => {
    expect(await makerHash('discs', { pairs: [['KARN', 'REST']] })).not.toMatch(/KARN|REST/i);
  });
});
