import { describe, expect, it } from 'vitest';
import { angleOf, angleTo, direction, discOf, FLOWER, layoutById, layoutOf, LAYOUTS, positionCount, touch, TREFOIL } from './layout';

const discsAt = (contact: { a: number; b: number }) => [discOf(FLOWER, contact.a), discOf(FLOWER, contact.b)];

describe('the flower', () => {
  it('has seven discs of six spokes, touching at twelve contacts', () => {
    expect(FLOWER.discs).toHaveLength(7);
    expect(positionCount(FLOWER)).toBe(42);
    expect(FLOWER.contacts).toHaveLength(12);
  });

  it('has the centre touching all six others, and each of those its two neighbours', () => {
    const touching = (disc: number) => FLOWER.discs.map((_, other) => other).filter((other) => touch(FLOWER, disc, other));
    expect(touching(0)).toEqual([1, 2, 3, 4, 5, 6]);
    expect(touching(1)).toEqual([0, 2, 6]);
    expect(touching(4)).toEqual([0, 3, 5]);
  });

  it('meets each contact with a spoke of both discs, pointing straight at it', () => {
    for (const contact of FLOWER.contacts) {
      for (const end of [contact.a, contact.b]) {
        const disc = FLOWER.discs[discOf(FLOWER, end)];
        const along = direction(angleOf(FLOWER, end));
        expect(disc.x + disc.r * along.x).toBeCloseTo(contact.x);
        expect(disc.y + disc.r * along.y).toBeCloseTo(contact.y);
      }
    }
  });

  it('reads the answer round the centre, clockwise from the top', () => {
    expect(FLOWER.hub).toBe(0);
    expect(FLOWER.goals.map((goal) => discsAt(FLOWER.contacts[goal]))).toEqual([
      [0, 1],
      [0, 2],
      [0, 3],
      [0, 4],
      [0, 5],
      [0, 6],
    ]);
    const first = FLOWER.contacts[FLOWER.goals[0]];
    expect(first.x).toBeCloseTo(0);
    expect(first.y).toBeCloseTo(-100);
  });

  it('touches each outer disc at three spokes side by side, facing the centre', () => {
    const spokes = (disc: number) =>
      FLOWER.contacts
        .flatMap(({ a, b }) => [a, b])
        .filter((end) => discOf(FLOWER, end) === disc)
        .map((end) => angleOf(FLOWER, end))
        .sort((x, y) => x - y);
    expect(spokes(1)).toEqual([120, 180, 240]);
    expect(spokes(0)).toEqual([0, 60, 120, 180, 240, 300]);
  });
});

describe('three discs', () => {
  const discsOf = (contact: { a: number; b: number }) => [discOf(TREFOIL, contact.a), discOf(TREFOIL, contact.b)];

  it('has three discs of six spokes, each touching the other two', () => {
    expect(TREFOIL.discs).toHaveLength(3);
    expect(positionCount(TREFOIL)).toBe(18);
    expect(TREFOIL.contacts).toHaveLength(3);
    for (const [one, other] of [
      [0, 1],
      [1, 2],
      [0, 2],
    ]) {
      expect(touch(TREFOIL, one, other)).toBe(true);
    }
    expect(TREFOIL.hub).toBeNull();
  });

  it('turns its spokes half a step, so each contact meets a spoke of both discs', () => {
    expect(TREFOIL.phase).toBe(30);
    for (const contact of TREFOIL.contacts) {
      for (const end of [contact.a, contact.b]) {
        const disc = TREFOIL.discs[discOf(TREFOIL, end)];
        const along = direction(angleOf(TREFOIL, end));
        expect(disc.x + disc.r * along.x).toBeCloseTo(contact.x);
        expect(disc.y + disc.r * along.y).toBeCloseTo(contact.y);
      }
    }
  });

  it('reads the three names clockwise round the gap in the middle, from the top', () => {
    expect(TREFOIL.goals.map((goal) => discsOf(TREFOIL.contacts[goal]))).toEqual([
      [0, 1], // between the two upper discs
      [1, 2], // lower right
      [0, 2], // lower left
    ]);
    const first = TREFOIL.contacts[TREFOIL.goals[0]];
    expect(first.x).toBeCloseTo(0);
    expect(first.y).toBeLessThan(TREFOIL.mark.y);
  });
});

describe('layouts', () => {
  it('are found by their names in links, smallest first', () => {
    expect(LAYOUTS.map((layout) => layout.id)).toEqual(['trefoil', 'flower']);
    expect(layoutById('flower')).toBe(FLOWER);
    expect(layoutById('trefoil')).toBe(TREFOIL);
    expect(layoutById('nineteen')).toBeUndefined();
  });
});

describe('layoutOf', () => {
  const spec = { id: 'flower' as const, name: 'Test', spokes: 6, mark: { x: 0, y: 0 }, isGoal: () => true };

  it('turns down discs that touch between their spokes', () => {
    expect(() => layoutOf({ ...spec, discs: [...FLOWER.discs], spokes: 4 })).toThrow(/between its spokes/);
  });

  it('turns down a disc that doesn’t join the rest', () => {
    const apart = [...FLOWER.discs.slice(0, 2), { x: 900, y: 900, r: 100, name: 'a far disc' }];
    expect(() => layoutOf({ ...spec, discs: apart })).toThrow(/must join the rest/);
  });
});

describe('angles', () => {
  it('run clockwise from up, with y pointing down', () => {
    expect(angleTo({ x: 0, y: 0 }, { x: 0, y: -1 })).toBeCloseTo(0);
    expect(angleTo({ x: 0, y: 0 }, { x: 1, y: 0 })).toBeCloseTo(90);
    expect(angleTo({ x: 0, y: 0 }, { x: 0, y: 1 })).toBeCloseTo(180);
    expect(angleTo({ x: 0, y: 0 }, { x: -1, y: 0 })).toBeCloseTo(270);
    expect(direction(90).x).toBeCloseTo(1);
    expect(direction(90).y).toBeCloseTo(0);
  });
});
