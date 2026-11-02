import { describe, expect, it } from 'vitest';
import { playerHash } from '../../kit/route';
import { contentOf, FILLER, fillerOf, newDesign, PAIRS, problemsOf, readDesign, startOf, toPuzzle, type DiscsDesign } from './design';
import { keyOf, piecesOf } from './engine/answer';
import { FLOWER } from './engine/layout';
import { isRight, readPuzzle, type DiscsPuzzle } from './puzzle';

// Made-up towns, never a game master's own.
const NAMES: [string, string][] = [
  ['Ashen', 'brae'],
  ['Gull', 'ford'],
  ['Thistle', 'down'],
  ['Copper', 'vale'],
  ['Lantern', 'wold'],
  ['Hob', 'marsh'],
];
const design: DiscsDesign = {
  ...newDesign(),
  words: { title: 'The mill-wheel', intro: 'Six villages, as the river finds them.', success: 'The wheel turns, and the sluice opens.' },
  pairs: NAMES,
  fillSeed: 3,
  seed: 4,
};

/** A solved board in a player puzzle's numbering, the first name at goal contact `from`. */
function solvedIn(puzzle: DiscsPuzzle, from = 0, flip = false): number[] {
  const board: number[] = [];
  NAMES.forEach(([first, second], i) => {
    const { a, b } = FLOWER.contacts[FLOWER.goals[(from + i) % PAIRS]];
    [board[a], board[b]] = [first, second].map((text) => puzzle.pieces.indexOf(keyOf({ text })));
    if (flip && i === 0) [board[a], board[b]] = [board[b], board[a]];
  });
  const rest = puzzle.pieces.map((_, piece) => piece).filter((piece) => !board.includes(piece));
  return puzzle.pieces.map((_, position) => board[position] ?? rest.shift()!);
}

describe('a new design', () => {
  it('has six blank names and thirty blank filler, and can’t be sent yet', () => {
    const fresh = newDesign();
    expect(fresh.pairs).toEqual(Array.from({ length: PAIRS }, () => ['', '']));
    expect(fresh.filler).toHaveLength(FILLER);
    expect(problemsOf(fresh)).toEqual(['Write both halves of all six names.']);
    expect(problemsOf({ ...design, pairs: [...NAMES.slice(1), ['Hob', '  ']] })).toHaveLength(1);
    expect(problemsOf(design)).toEqual([]);
  });
});

describe('readDesign', () => {
  it('reads back a design', () => {
    expect(readDesign(JSON.parse(JSON.stringify(design)))).toEqual(design);
  });

  it('puts right whatever’s malformed, field by field', () => {
    const read = readDesign({ v: 1, pairs: [['Ashen', 'x'.repeat(40)], 'junk'], filler: [7], mix: 3, anyStart: 'yes', seed: -1 })!;
    expect(read.pairs[0]).toEqual(['Ashen', '']);
    expect(read.pairs[1]).toEqual(['', '']);
    expect(read.pairs).toHaveLength(PAIRS);
    expect(read.filler).toEqual(Array.from({ length: FILLER }, () => ''));
    expect(read.mix).toBe('full');
    expect(read.anyStart).toBe(false);
    expect(read.seed).toBe(1);
  });

  it('turns away what isn’t a design', () => {
    for (const junk of [null, 'design', [], { ...design, v: 2 }]) expect(readDesign(junk)).toBeNull();
  });
});

describe('the filler', () => {
  it('fills only its blanks, and never with a half of the answer', () => {
    const written = { ...design, filler: ['Moonrise', ...design.filler.slice(1)] };
    const filler = fillerOf(written);
    expect(filler[0]).toBe('Moonrise');
    expect(filler.every((text) => text !== '')).toBe(true);
    const answer = new Set(NAMES.flat().map((text) => keyOf({ text })));
    expect(filler.filter((text) => answer.has(keyOf({ text })))).toEqual([]);
  });
});

describe('toPuzzle', () => {
  it('holds the words, the pieces as they start, and fingerprints, and nothing else', async () => {
    const puzzle = await toPuzzle(design);
    expect(Object.keys(puzzle).sort()).toEqual(['answers', 'layout', 'mark', 'pieces', 'salt', 'v', 'words']);
    const pieces = piecesOf(contentOf(design));
    expect(puzzle.pieces).toEqual(startOf(design).map((piece) => keyOf(pieces[piece])));
    expect(puzzle.answers).toHaveLength(1);
    expect(puzzle.mark).toBe(true);
  });

  it('never gives the answer away: not the names, nor which halves go together, nor their order', async () => {
    const held = JSON.stringify(await toPuzzle(design));
    for (const [first, second] of NAMES) {
      for (const name of [first + second, `${first} ${second}`, (first + second).toUpperCase(), `${first} ${second}`.toUpperCase()]) {
        expect(held).not.toContain(name);
      }
    }
    // Halves are in capitals, so the case the game master wrote them in can't say which comes first.
    expect(held).not.toMatch(/"(Ashen|brae|Gull|ford)"/);
    // The answer's halves are listed where they start, not in the names' order.
    const puzzle = await toPuzzle(design);
    const where = NAMES.flat().map((text) => puzzle.pieces.indexOf(keyOf({ text })));
    expect(where.every((position) => position >= 0)).toBe(true);
    expect(where).not.toEqual([...where].sort((x, y) => x - y));
  });

  it('makes a link short enough for a Discord message', async () => {
    const long: DiscsDesign = {
      ...design,
      words: {
        title: 'The road-stone at the crossing of the ways',
        // Varied, as a real one would be: repeated words would compress too well to be a fair test.
        intro:
          'Carved round the rim of the old stone: six towns of the realm, read from the north as the sun goes, each in two halves. Turn the wheels until every name is whole and in its place, and the way below opens to those who remember the land. Mind the false names among them.',
        success: 'The stone grinds round, and a stair opens beneath it into the dark.',
      },
      pairs: NAMES.map(([first, second]) => [first.padEnd(7, 'e'), second.padEnd(7, 'e')]),
      anyStart: true,
    };
    const puzzle = await toPuzzle(long);
    expect(puzzle.answers).toHaveLength(PAIRS);
    expect(`https://daedalus.invigoro.me/${await playerHash('discs', puzzle)}`.length).toBeLessThan(2000);
  });
});

describe('checking a board against the fingerprints', () => {
  it('knows the answer when it sees it, with a pair either way round', async () => {
    const puzzle = readPuzzle(JSON.parse(JSON.stringify(await toPuzzle(design))))!;
    expect(await isRight(puzzle, solvedIn(puzzle))).toBe(true);
    expect(await isRight(puzzle, solvedIn(puzzle, 0, true))).toBe(true);
    expect(await isRight(puzzle, puzzle.pieces.map((_, piece) => piece))).toBe(false);
  });

  it('counts the names from another contact only with any start', async () => {
    const fixed = await toPuzzle(design);
    expect(await isRight(fixed, solvedIn(fixed, 2))).toBe(false);
    const any = await toPuzzle({ ...design, anyStart: true });
    expect(any.mark).toBe(false);
    expect(await isRight(any, solvedIn(any, 2))).toBe(true);
  });
});
