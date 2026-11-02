import { describe, expect, it } from 'vitest';
import { playerHash } from '../../kit/route';
import { floorOf, newDesign, objectsOf, problemsOf, readDesign, toPuzzle, type PedestalsDesign } from './design';
import { sameThing, wholeKey, type Thing } from './engine/things';
import { isAnswer, isRightAt, lineFor, readProgress, readPuzzle, type PedestalsPuzzle } from './puzzle';

// Made-up riddles, never a game master's own.
const design: PedestalsDesign = {
  ...newDesign(),
  words: { title: 'The miller’s shrine', intro: 'Three stones, three questions.', success: 'The millstone turns aside.' },
  pedestals: [
    { riddle: { text: 'Place what the river gives the wheel.' }, object: { text: 'Water jug', icon: 'water-flask' } },
    { riddle: { text: '', icon: 'wheat' }, object: { text: 'Sickle' } },
    { riddle: { text: 'Place the miller’s due.' }, object: { text: '', icon: 'two-coins' } },
  ],
  others: [{ text: 'Hammer' }, { text: '' }, { text: 'Rope', icon: 'rope-coil' }],
  seed: 7,
};
const right = design.pedestals.map((pedestal) => pedestal.object);
const sent = async (change: Partial<PedestalsDesign> = {}) => readPuzzle(JSON.parse(JSON.stringify(await toPuzzle({ ...design, ...change }))))!;
/** The objects a link lists, as they'd be set on the pedestals. */
const onPedestals = (puzzle: PedestalsPuzzle, things: Thing[]) => things.map((thing) => puzzle.objects.find((each) => sameThing(each, thing))!);

describe('a design', () => {
  it('starts with three blank pedestals, and says what stops it being sent', () => {
    expect(newDesign().pedestals).toHaveLength(3);
    expect(problemsOf(newDesign())).toEqual(['Give every pedestal a riddle and its object, in words or a picture.']);
    expect(problemsOf(design)).toEqual([]);
    expect(problemsOf({ ...design, others: [{ text: 'sickle ' }] })).toEqual([
      'An other object is the same as a pedestal’s, so it would be right too. Change it, or take it away.',
    ]);
  });

  it('scatters every object on the floor, the same way for the same seed, leaving out blank others', () => {
    expect(objectsOf(design)).toHaveLength(5);
    expect(floorOf(design)).toEqual(floorOf({ ...design }));
    expect(floorOf(design)).not.toEqual(objectsOf(design));
    expect([...floorOf(design)].sort((one, other) => JSON.stringify(one).localeCompare(JSON.stringify(other)))).toEqual(
      [...objectsOf(design)].sort((one, other) => JSON.stringify(one).localeCompare(JSON.stringify(other))),
    );
  });

  it('reads back, and puts right whatever’s malformed', () => {
    expect(readDesign(JSON.parse(JSON.stringify(design)))).toEqual(design);
    const many = Array.from({ length: 10 }, () => design.pedestals[0]);
    const read = readDesign({ ...design, pedestals: many, others: Array(20).fill({ text: 'Rope' }), check: 'sometimes', tell: 'all', failAfter: 4 })!;
    expect(read.pedestals).toHaveLength(8);
    expect(read.others).toHaveLength(12);
    expect(read).toMatchObject({ check: 'all', tell: 'wrong', failAfter: 0 });
    expect(readDesign({ ...design, pedestals: [] })?.pedestals).toEqual(newDesign().pedestals);
    for (const junk of [null, 'pedestals', [], { ...design, v: 2 }]) expect(readDesign(junk)).toBeNull();
  });
});

describe('a player link', () => {
  it('holds the riddles in order and the objects scattered, never which are right or where they go', async () => {
    const puzzle = await sent();
    expect(puzzle.riddles).toEqual(design.pedestals.map((pedestal) => pedestal.riddle));
    expect(puzzle.objects).toEqual(floorOf(design));
    // Each object is its words and picture, and nothing more.
    for (const object of puzzle.objects) expect(Object.keys(object).every((key) => key === 'text' || key === 'icon')).toBe(true);
    const text = JSON.stringify(puzzle);
    expect(text).not.toContain(wholeKey(right));
    expect(text).not.toContain('millstone');
    expect(puzzle.words.success).toBe('');
  });

  it('holds a quick fingerprint of each pedestal only when checking judges them one at a time', async () => {
    expect((await sent({ check: 'all' })).places).toBeUndefined();
    expect((await sent({ check: 'asked', tell: 'wrong' })).places).toBeUndefined();
    expect((await sent({ check: 'placed' })).places).toHaveLength(3);
    expect((await sent({ check: 'asked', tell: 'count' })).places).toHaveLength(3);
    expect((await sent({ check: 'asked', tell: 'which' })).tell).toBe('which');
  });

  it('knows the answer, and opens the line for solving it, only with the right objects in place', async () => {
    const puzzle = await sent({ check: 'placed' });
    const rightOnes = onPedestals(puzzle, right);
    expect(await isAnswer(puzzle, rightOnes)).toBe(true);
    expect(await lineFor(puzzle, rightOnes)).toBe('The millstone turns aside.');
    const swapped = [rightOnes[1], rightOnes[0], rightOnes[2]];
    expect(await isAnswer(puzzle, swapped)).toBe(false);
    expect(await isRightAt(puzzle, 2, rightOnes[2])).toBe(true);
    expect(await isRightAt(puzzle, 0, rightOnes[1])).toBe(false);
  });

  it('never fails the players when all are checked at once', async () => {
    expect((await sent({ check: 'all', failAfter: 2 })).failAfter).toBe(0);
    expect((await sent({ check: 'placed', failAfter: 2 })).failAfter).toBe(2);
  });

  it('turns away what’s been tampered with', async () => {
    const puzzle = JSON.parse(JSON.stringify(await toPuzzle({ ...design, check: 'placed' })));
    const broken = [
      { ...puzzle, v: 2 },
      { ...puzzle, riddles: [] },
      { ...puzzle, riddles: [{ text: '' }, ...puzzle.riddles.slice(1)] },
      { ...puzzle, objects: puzzle.objects.slice(0, 2) },
      { ...puzzle, objects: [{ text: 'x', icon: '../../secret' }, ...puzzle.objects.slice(1)] },
      { ...puzzle, check: 'never' },
      { ...puzzle, places: undefined },
      { ...puzzle, places: puzzle.places.slice(1) },
      { ...puzzle, salt: '' },
      { ...puzzle, sealed: null },
      { ...puzzle, failAfter: -1 },
      null,
    ];
    for (const junk of broken) expect(readPuzzle(junk)).toBeNull();
  });

  it('fits in a Discord message, even with every pedestal and object', async () => {
    const riddle = (i: number): Thing => ({ text: `Place what the ${i}th door keeps when its keeper sleeps.`, icon: 'stone-tower' });
    const largest: PedestalsDesign = {
      ...design,
      pedestals: Array.from({ length: 8 }, (_, i) => ({ riddle: riddle(i), object: { text: `Offering ${i}`, icon: 'two-coins' } })),
      others: Array.from({ length: 12 }, (_, i) => ({ text: `Decoy ${i}`, icon: 'broadsword' })),
      check: 'placed',
      wrongLine: 'A gout of flame from the plinth: 2d6 fire, DC 13 Dexterity save for half.',
    };
    const link = `https://daedalus.invigoro.me/${await playerHash('pedestals', await toPuzzle(largest))}`;
    expect(link.length).toBeLessThan(2000);
  });

  it('reads back a player’s progress, if it fits the room', async () => {
    const puzzle = await sent();
    const progress = { placed: [2, null, 0], wrong: 1, solved: false, failed: false };
    expect(readProgress(puzzle, JSON.parse(JSON.stringify(progress)))).toEqual(progress);
    for (const junk of [{ ...progress, placed: [2, 2, null] }, { ...progress, wrong: -1 }, { ...progress, placed: [9, null, null] }, null]) {
      expect(readProgress(puzzle, junk)).toBeNull();
    }
  });
});
