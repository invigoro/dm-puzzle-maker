import { describe, expect, it } from 'vitest';
import { playerHash, readRoute } from '../../kit/route';
import { aimOf, floorOf, goalOf, newDesign, problemsOf, readDesign, solutionOf, startOf, toPuzzle, type BraziersDesign } from './design';
import { allOf, braziersOf, cellsOf, flipsOf, maskOf } from './engine/floor';
import { isGoal, lineFor, readProgress, readPuzzle, type BraziersPuzzle } from './puzzle';

const design: BraziersDesign = {
  ...newDesign(),
  words: { title: 'The cold hearths', intro: 'Put them out.', success: 'The hearths are cold.' },
  seed: 21,
};
const sent = async (change: Partial<BraziersDesign> = {}) => readPuzzle(JSON.parse(JSON.stringify(await toPuzzle({ ...design, ...change }))))!;
/** A ring of six with a goal of two burning, and a start one touch away from it: brazier 3 (flipping 2, 3 and 4). */
const ringOfSix: Partial<BraziersDesign> = { shape: 'ring', count: 6, goal: 'pattern', pattern: [0, 2], starting: 'hand', drawn: [0, 3, 4] };

describe('a design', () => {
  it('starts as five by five, eight touches from all out, and can be sent', () => {
    expect(newDesign()).toMatchObject({ shape: 'grid', width: 5, height: 5, goal: 'out', starting: 'touches', touches: 8, icon: 'fire-bowl' });
    expect(problemsOf(newDesign())).toEqual([]);
  });

  it('starts so many touches from the goal, from its seed, never at the goal', () => {
    for (let seed = 0; seed < 20; seed++) {
      for (const touches of [3, 5, 8, 12, 0]) {
        const each = { ...design, seed, touches };
        expect(startOf(each)).not.toBe(goalOf(each));
        const solution = solutionOf(each)!;
        if (touches > 0) expect(solution.fewest).toBeLessThanOrEqual(touches);
      }
    }
    expect(startOf(design)).toBe(startOf({ ...design }));
  });

  it('has a goal of every brazier out, every one burning, or a pattern', () => {
    expect(goalOf(design)).toBe(0n);
    expect(goalOf({ ...design, goal: 'lit' })).toBe(allOf(25));
    expect(goalOf({ ...design, goal: 'pattern', pattern: [0, 24] })).toBe(maskOf([0, 24], braziersOf(floorOf(design))));
  });

  it('says when a start set by hand is the goal already, or can’t reach it', () => {
    expect(problemsOf({ ...design, starting: 'hand', drawn: [] })).toEqual(['The start is the goal already: light or put out a brazier or two.']);
    // Four by four, with a single brazier burning in its corner, can't be put out.
    expect(problemsOf({ ...design, width: 4, height: 4, starting: 'hand', drawn: [0] })).toEqual([
      'No touches take this start to the goal: change the start, or set it so many touches from the goal.',
    ]);
    // The middle of three by three and those beside it: one touch puts them out.
    const one = { ...design, width: 3, height: 3, starting: 'hand' as const, drawn: [1, 3, 4, 5, 7] };
    expect(solutionOf(one)).toMatchObject({ fewest: 1, exact: true });
    expect(problemsOf(one)).toEqual([]);
  });

  it('says when the limit is fewer than the touches it takes, or too few braziers are left', () => {
    const fewest = solutionOf(design)!.fewest;
    expect(problemsOf({ ...design, limit: fewest - 1 })).toEqual([`The limit is fewer than the ${fewest} touches it takes at the least.`]);
    expect(problemsOf({ ...design, limit: fewest })).toEqual([]);
    expect(problemsOf({ ...design, width: 3, height: 3, bare: [0, 1, 2, 3, 4, 5, 6, 7] })).toEqual(['Leave at least two braziers on the floor.']);
  });

  it('reads a design back, and fills in what’s missing or malformed', () => {
    expect(readDesign(JSON.parse(JSON.stringify(design)))).toEqual(design);
    const read = readDesign({ v: 1, shape: 'hexagon', width: 9, height: 2, bare: [3, 3, 99, -1, 'x'], reach: 'everywhere', icon: '../x', goal: 'all', touches: 7, limit: -2 })!;
    expect(read).toMatchObject({ shape: 'grid', width: 5, height: 5, bare: [3], reach: 'beside', icon: 'fire-bowl', goal: 'out', touches: 8, limit: 0 });
    expect(readDesign({ v: 1, shape: 'ring', count: 20 })?.count).toBe(8);
    expect(readDesign({ v: 2 })).toBeNull();
  });
});

describe('a player link', () => {
  it('holds the floor, the start, and a goal of all out, opened by putting them out', async () => {
    const puzzle = await sent();
    expect(puzzle).toMatchObject({ aim: 'out', icon: 'fire-bowl', limit: 0 });
    expect(puzzle.floor).toMatchObject({ shape: 'grid', width: 5, height: 5, reach: 'beside' });
    expect(puzzle.start).toEqual(cellsOf(startOf(design), braziersOf(puzzle.floor)));
    expect(puzzle.pattern).toBeUndefined();
    expect(puzzle.answer).toBeUndefined();
    expect(await isGoal(puzzle, 0n)).toBe(true);
    expect(await isGoal(puzzle, 1n)).toBe(false);
    expect(await lineFor(puzzle, 0n)).toBe('The hearths are cold.');
    expect(puzzle.words.success).toBe('');
  });

  it('shows a pattern it’s to match', async () => {
    const puzzle = await sent({ goal: 'pattern', pattern: [6, 12, 18] });
    expect(puzzle).toMatchObject({ aim: 'shown', pattern: [6, 12, 18] });
    expect(await isGoal(puzzle, maskOf([6, 12, 18], braziersOf(puzzle.floor)))).toBe(true);
  });

  it('never holds a hidden pattern, only its fingerprint, which opens the line', async () => {
    const hidden = { ...ringOfSix, shown: false };
    expect(aimOf({ ...design, ...hidden })).toBe('hidden');
    const link = JSON.stringify(await toPuzzle({ ...design, ...hidden }));
    expect(link).not.toContain('pattern');
    expect(link).not.toContain('The hearths are cold');
    const puzzle = readPuzzle(JSON.parse(link))!;
    expect(puzzle).toMatchObject({ aim: 'hidden', floor: { shape: 'ring', count: 6 }, start: [0, 3, 4] });
    const goal = maskOf([0, 2], braziersOf(puzzle.floor));
    expect(await isGoal(puzzle, goal)).toBe(true);
    expect(await isGoal(puzzle, 0n)).toBe(false);
    expect(await lineFor(puzzle, goal)).toBe('The hearths are cold.');
    expect(await lineFor(puzzle, 0n)).toBe('Solved.');
  });

  it('says the limit, and what failing says', async () => {
    expect(await sent({ limit: 20, failLine: ' The floor flares up. ' })).toMatchObject({ limit: 20, failLine: 'The floor flares up.' });
  });

  it('turns away a link that isn’t one', async () => {
    const good = JSON.parse(JSON.stringify(await toPuzzle({ ...design, bare: [12] })));
    expect(readPuzzle(good)).not.toBeNull();
    for (const change of [
      { start: [12] },
      { start: [25] },
      { start: [1, 1] },
      { pattern: [1] },
      { aim: 'hidden' },
      { aim: 'shown' },
      { answer: 'abc' },
      { icon: 'Fire Bowl' },
      { limit: -1 },
      { limit: 1000 },
      { salt: '' },
      { sealed: {} },
      { floor: { ...good.floor, width: 9 } },
      { floor: { ...good.floor, reach: 'everywhere' } },
      { floor: { shape: 'ring', count: 4 } },
      { floor: { ...good.floor, width: 3, height: 3, bare: [0, 1, 2, 3, 4, 5, 6, 7] } },
      { v: 2 },
    ]) {
      expect(readPuzzle({ ...good, ...change })).toBeNull();
    }
  });

  it('fits in a Discord message, even the largest floor with a hidden pattern', async () => {
    const largest = { ...design, width: 8, height: 8, goal: 'pattern' as const, pattern: Array.from({ length: 32 }, (_, i) => i * 2), shown: false, failLine: 'x'.repeat(200) };
    const hash = await playerHash('braziers', await toPuzzle(largest));
    expect(`https://daedalus.invigoro.me/${hash}`.length).toBeLessThan(2000);
    const route = await readRoute(hash, ['braziers']);
    expect(route.page === 'play' && readPuzzle(route.data)).toBeTruthy();
  });
});

describe('progress', () => {
  it('reads back what was kept, for this floor, or nothing', async () => {
    const puzzle: BraziersPuzzle = await sent({ bare: [12] });
    const kept = { lit: [0, 6], count: 3, touched: [0, 6, 0], solved: false, failed: false };
    expect(readProgress(puzzle, kept)).toEqual(kept);
    expect(readProgress(puzzle, { ...kept, lit: [12] })).toBeNull();
    expect(readProgress(puzzle, { ...kept, touched: [30] })).toBeNull();
    expect(readProgress(puzzle, { ...kept, count: -1 })).toBeNull();
    expect(flipsOf(puzzle.floor)).toHaveLength(24);
  });
});
