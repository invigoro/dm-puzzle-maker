import { describe, expect, it } from 'vitest';
import { angleOf, angleTo, direction, discOf, FLOWER, layoutOf, positionCount, touch } from './layout';

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

describe('layoutOf', () => {
  it('turns down discs that touch between their spokes', () => {
    expect(() => layoutOf([...FLOWER.discs], 4, 0)).toThrow(/between its spokes/);
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
