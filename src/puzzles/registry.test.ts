import { describe, expect, it } from 'vitest';
import { KINDS, kindOf } from './registry';

describe('the registry', () => {
  it('gives every kind an id that is safe in a link and its own', () => {
    const ids = KINDS.map((kind) => kind.id);
    for (const id of ids) expect(id).toMatch(/^[a-z][a-z-]*$/);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('finds a kind by its id', () => {
    expect(kindOf('discs')?.name).toBe('Turning discs');
    expect(kindOf('sliding-tiles')).toBeUndefined();
  });

  describe.each(KINDS.map((kind) => [kind.id, kind] as const))('%s', (_, kind) => {
    it('reads back a new design, and turns away what isn’t one', async () => {
      const maker = await kind.maker();
      const design = maker.newDesign();
      expect(maker.readDesign(JSON.parse(JSON.stringify(design)))).toEqual(design);
      for (const junk of [null, 'design', 42, []]) expect(maker.readDesign(junk)).toBeNull();
    });

    it('says what a new design still needs, if anything', async () => {
      const maker = await kind.maker();
      expect(Array.isArray(maker.problemsOf(maker.newDesign()))).toBe(true);
    });

    it('makes a puzzle the players’ side reads, from a new design that can be sent as it is', async () => {
      const [maker, player] = await Promise.all([kind.maker(), kind.player()]);
      const design = maker.newDesign();
      // A design with problems can't be sent: the maker won't make its link. Each kind's own tests
      // cover its links fully.
      if (maker.problemsOf(design).length === 0) {
        expect(player.readPuzzle(JSON.parse(JSON.stringify(await maker.toPuzzle(design))))).not.toBeNull();
      }
      for (const junk of [null, 'puzzle', 42, []]) expect(player.readPuzzle(junk)).toBeNull();
    });
  });
});
