import { describe, expect, it } from 'vitest';
import { mulberry32 } from '../../../kit/rng';
import { generate, isInside, withEdits } from './generate';
import { canStep, cellAt, cellCount, cellsOf, openFrom, packWalls, stepFrom, unpackWalls, wallBetween, wallCount, walledIn } from './grid';
import { distances, LANTERN, lit, MOST_REACH, reachIn } from './paths';

describe('the grid', () => {
  const maze = walledIn(4, 3);

  it('numbers every inside wall once, across first, then down', () => {
    expect(wallCount(maze)).toBe(3 * 3 + 4 * 2);
    const seen = new Set<number>();
    for (let cell = 0; cell < cellCount(maze); cell++) {
      for (const next of [cell + 1, cell + 4]) {
        const wall = wallBetween(maze, cell, next);
        if (wall < 0) continue;
        expect(cellsOf(maze, wall)).toEqual([cell, next]);
        seen.add(wall);
      }
    }
    expect(seen.size).toBe(wallCount(maze));
    // The end of one row isn't beside the start of the next.
    expect(wallBetween(maze, 3, 4)).toBe(-1);
  });

  it('steps only where there’s no wall, and never off the edge', () => {
    expect(stepFrom(maze, 0, 'left')).toBe(-1);
    expect(canStep(maze, 0, 'right')).toBe(false);
    const opened = withEdits(maze, [wallBetween(maze, 0, 1)]);
    expect(canStep(opened, 0, 'right')).toBe(true);
    expect(canStep(opened, 1, 'left')).toBe(true);
    expect(canStep(opened, 0, 'up')).toBe(false);
    expect(openFrom(opened, 0)).toEqual([1]);
  });

  it('packs walls a bit each, and unpacks them only for a maze their size', () => {
    const walls = generate(20, 20, 'winding', 'few', mulberry32(3)).walls;
    const packed = packWalls(walls);
    expect(packed.length).toBeLessThan(130);
    expect(unpackWalls(packed, walls.length)).toEqual(walls);
    expect(unpackWalls(packed, walls.length + 40)).toBeNull();
    expect(unpackWalls('not walls!', walls.length)).toBeNull();
  });
});

describe('generate', () => {
  it.each(['winding', 'branching'] as const)('makes a %s maze with one way between any two cells', (twist) => {
    for (let seed = 0; seed < 20; seed++) {
      const maze = generate(9, 7, twist, 'none', mulberry32(seed));
      expect(distances(maze, cellAt(maze, 4, 3)).every((steps) => steps >= 0)).toBe(true);
      // A tree of 63 cells has 62 ways through its walls.
      expect(maze.walls.filter((wall) => !wall)).toHaveLength(cellCount(maze) - 1);
    }
  });

  it('makes the same maze for the same seed', () => {
    expect(generate(10, 10, 'branching', 'few', mulberry32(5))).toEqual(generate(10, 10, 'branching', 'few', mulberry32(5)));
    expect(generate(10, 10, 'branching', 'few', mulberry32(5))).not.toEqual(generate(10, 10, 'branching', 'few', mulberry32(6)));
  });

  it('opens loops on asking: more ways through than a tree has', () => {
    const tree = generate(12, 12, 'winding', 'none', mulberry32(1)).walls.filter((wall) => !wall).length;
    const few = generate(12, 12, 'winding', 'few', mulberry32(1)).walls.filter((wall) => !wall).length;
    const many = generate(12, 12, 'winding', 'many', mulberry32(1)).walls.filter((wall) => !wall).length;
    expect(few).toBeGreaterThan(tree);
    expect(many).toBeGreaterThan(few);
  });

  it('winds into longer corridors than it branches', () => {
    const deadEnds = (twist: 'winding' | 'branching') => {
      let ends = 0;
      for (let seed = 0; seed < 10; seed++) {
        const maze = generate(14, 14, twist, 'none', mulberry32(seed));
        for (let cell = 0; cell < cellCount(maze); cell++) if (openFrom(maze, cell).length === 1) ends++;
      }
      return ends;
    };
    expect(deadEnds('branching')).toBeGreaterThan(deadEnds('winding') * 1.5);
  });
});

describe('edits', () => {
  it('flip walls inside the grid, and only those', () => {
    const maze = walledIn(3, 3);
    expect(isInside(maze, 0)).toBe(true);
    expect(isInside(maze, wallCount(maze))).toBe(false);
    expect(withEdits(maze, [0, 0]).walls).toEqual(maze.walls);
    expect(withEdits(maze, [0, 99]).walls.filter((wall) => !wall)).toHaveLength(1);
  });
});

describe('the lantern', () => {
  it('lights the cells two steps along the passages, not through walls', () => {
    // A corridor along the top row, walled off from the row below.
    const corridor = withEdits(walledIn(5, 2), [0, 1, 2, 3]);
    expect(lit(corridor, 0).sort((x, y) => x - y)).toEqual([0, 1, 2]);
    expect(lit(corridor, 2).sort((x, y) => x - y)).toEqual([0, 1, 2, 3, 4]);
  });

  it('reaches as far as the game master says, from no light at all', () => {
    const corridor = withEdits(walledIn(5, 2), [0, 1, 2, 3]);
    expect(lit(corridor, 2, 0)).toEqual([2]);
    // One step ahead and one behind.
    expect(lit(corridor, 2, 1).sort((x, y) => x - y)).toEqual([1, 2, 3]);
    expect(lit(corridor, 0, MOST_REACH).sort((x, y) => x - y)).toEqual([0, 1, 2, 3, 4]);
  });

  it('reads how far it reaches, as mazes made before it could be chosen saw', () => {
    expect(reachIn(5, true)).toBe(5);
    expect(reachIn(0, false)).toBe(0);
    expect(reachIn(undefined, false)).toBe(LANTERN);
    expect(reachIn(undefined, true)).toBe(0);
    for (const junk of [-1, 1.5, MOST_REACH + 1, '2', null]) expect(reachIn(junk, false)).toBe(LANTERN);
  });
});
