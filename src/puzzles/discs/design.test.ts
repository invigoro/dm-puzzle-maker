import { describe, expect, it } from 'vitest';
import { playerHash } from '../../kit/route';
import { contentOf, FILLER, fillerOf, newDesign, PAIRS, problemsOf, readDesign, solvedOf, startOf, toPuzzle, type DiscsDesign } from './design';
import { isBlank, keyOf, piecesOf, wordsOf, type Piece } from './engine/answer';
import { FLOWER } from './engine/layout';
import { isRight, piecesIn, readPuzzle, type DiscsPuzzle } from './puzzle';

// Made-up towns, never a game master's own.
const NAMES: [string, string][] = [
  ['Ashen', 'brae'],
  ['Gull', 'ford'],
  ['Thistle', 'down'],
  ['Copper', 'vale'],
  ['Lantern', 'wold'],
  ['Hob', 'marsh'],
];
const pairsOf = (names: [string, string][]): [Piece, Piece][] => names.map(([first, second]) => [{ text: first }, { text: second }]);
const blank = (): Piece => ({ text: '' });
const design: DiscsDesign = {
  ...newDesign(),
  words: { title: 'The mill-wheel', intro: 'Six villages, as the river finds them.', success: 'The wheel turns, and the sluice opens.' },
  pairs: pairsOf(NAMES),
  fillSeed: 3,
  seed: 4,
};

/** A solved board in a player puzzle's numbering, the first name at goal contact `from`. */
function solvedIn(puzzle: DiscsPuzzle, pairs = design.pairs, from = 0, flip = false): number[] {
  const pieces = piecesIn(puzzle).map(keyOf);
  const board: number[] = [];
  pairs.forEach(([first, second], i) => {
    const { a, b } = FLOWER.contacts[FLOWER.goals[(from + i) % PAIRS]];
    [board[a], board[b]] = [first, second].map((piece) => pieces.indexOf(keyOf(piece)));
    if (flip && i === 0) [board[a], board[b]] = [board[b], board[a]];
  });
  const rest = puzzle.pieces.map((_, piece) => piece).filter((piece) => !board.includes(piece));
  return puzzle.pieces.map((_, position) => board[position] ?? rest.shift()!);
}

describe('a new design', () => {
  it('has six blank names and thirty blank filler, and can’t be sent yet', () => {
    const fresh = newDesign();
    expect(fresh.pairs).toEqual(Array.from({ length: PAIRS }, () => [blank(), blank()]));
    expect(fresh.filler).toHaveLength(FILLER);
    expect(problemsOf(fresh)).toEqual(['Give both halves of all six names words or a picture.']);
    expect(problemsOf({ ...design, pairs: pairsOf([...NAMES.slice(1), ['Hob', '  ']]) })).toHaveLength(1);
    expect(problemsOf(design)).toEqual([]);
  });

  it('takes a picture for a half, in place of words', () => {
    const pictured: DiscsDesign = { ...design, pairs: [[{ text: 'Ashen' }, { text: '', icon: 'stone-tower' }], ...design.pairs.slice(1)] };
    expect(problemsOf(pictured)).toEqual([]);
  });
});

describe('readDesign', () => {
  it('reads back a design, pictures and all', () => {
    expect(readDesign(JSON.parse(JSON.stringify(design)))).toEqual(design);
    const pictured: DiscsDesign = { ...design, filler: [{ text: 'Moon', icon: 'moon-orbit' }, ...design.filler.slice(1)] };
    expect(readDesign(JSON.parse(JSON.stringify(pictured)))).toEqual(pictured);
  });

  it('reads a link made before there were pictures, its halves as plain words', () => {
    const old = { ...design, pairs: NAMES, filler: design.filler.map(() => '') };
    expect(readDesign(JSON.parse(JSON.stringify(old)))).toEqual(design);
  });

  it('puts right whatever’s malformed, field by field', () => {
    const read = readDesign({
      v: 1,
      pairs: [['Ashen', 'x'.repeat(40)], 'junk', [{ text: 'Gull', icon: '../../secret' }]],
      filler: [7],
      mix: 3,
      anyStart: 'yes',
      seed: -1,
    })!;
    expect(read.pairs[0]).toEqual([{ text: 'Ashen' }, blank()]);
    expect(read.pairs[1]).toEqual([blank(), blank()]);
    expect(read.pairs[2]).toEqual([{ text: 'Gull' }, blank()]);
    expect(read.pairs).toHaveLength(PAIRS);
    expect(read.filler).toEqual(Array.from({ length: FILLER }, blank));
    expect(read.mix).toBe('full');
    expect(read.anyStart).toBe(false);
    expect(read.seed).toBe(1);
  });

  it('keeps a start set by hand, and falls back to a scramble without a board for it', () => {
    const board = solvedOf(design);
    const hand: DiscsDesign = { ...design, mix: 'hand', start: [...board] };
    expect(readDesign(JSON.parse(JSON.stringify(hand)))).toEqual(hand);
    expect(startOf(hand)).toEqual(board);
    const broken = readDesign({ ...hand, start: board.slice(1) })!;
    expect(broken.mix).toBe('full');
    expect(broken.start).toBeUndefined();
    // A board left over from setting it by hand counts for nothing once the start is a scramble.
    expect(readDesign({ ...hand, mix: 10 })).toEqual({ ...design, mix: 10 });
  });

  it('turns away what isn’t a design', () => {
    for (const junk of [null, 'design', [], { ...design, v: 2 }]) expect(readDesign(junk)).toBeNull();
  });
});

describe('the filler', () => {
  it('fills only its blanks, and never with a half of the answer', () => {
    const written = { ...design, filler: [{ text: 'Moonrise' }, { text: '', icon: 'moon-orbit' }, ...design.filler.slice(2)] };
    const filler = fillerOf(written);
    expect(filler[0]).toEqual({ text: 'Moonrise' });
    expect(filler[1]).toEqual({ text: '', icon: 'moon-orbit' });
    expect(filler.some(isBlank)).toBe(false);
    const answer = new Set(design.pairs.flat().map(wordsOf));
    expect(filler.filter((piece) => answer.has(wordsOf(piece)))).toEqual([]);
  });
});

describe('toPuzzle', () => {
  it('holds the words, the pieces as they start, and fingerprints, and nothing else', async () => {
    const puzzle = await toPuzzle(design);
    expect(Object.keys(puzzle).sort()).toEqual(['answers', 'layout', 'mark', 'pieces', 'salt', 'v', 'words']);
    const pieces = piecesOf(contentOf(design));
    expect(puzzle.pieces).toEqual(startOf(design).map((piece) => wordsOf(pieces[piece])));
    expect(puzzle.answers).toHaveLength(1);
    expect(puzzle.mark).toBe(true);
  });

  it('starts the players where the game master set the board by hand', async () => {
    const board = solvedOf(design);
    const puzzle = await toPuzzle({ ...design, mix: 'hand', start: [...board] });
    const pieces = piecesOf(contentOf(design));
    expect(puzzle.pieces).toEqual(board.map((piece) => wordsOf(pieces[piece])));
  });

  it('holds each piece’s picture, in the same order, when there are any', async () => {
    const pictured: DiscsDesign = { ...design, pairs: [[{ text: '', icon: 'stone-tower' }, { text: 'brae' }], ...design.pairs.slice(1)] };
    const puzzle = await toPuzzle(pictured);
    const pieces = piecesOf(contentOf(pictured));
    expect(puzzle.icons).toEqual(startOf(pictured).map((piece) => pieces[piece].icon ?? ''));
    expect(puzzle.icons!.filter(Boolean)).toEqual(['stone-tower']);
    expect(readPuzzle(JSON.parse(JSON.stringify(puzzle)))).toEqual(puzzle);
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
    const where = NAMES.flat().map((text) => puzzle.pieces.indexOf(wordsOf({ text })));
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
      // Six halves are pictures, and so are some filler, as a game master might have them.
      pairs: NAMES.map(([first, second], i) => [{ text: first.padEnd(7, 'e') }, i % 2 ? { text: '', icon: 'castle-ruins' } : { text: second.padEnd(7, 'e') }]),
      filler: design.filler.map((piece, i) => (i < 6 ? { text: '', icon: 'crossed-swords' } : piece)),
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
    expect(await isRight(puzzle, solvedIn(puzzle, design.pairs, 0, true))).toBe(true);
    expect(await isRight(puzzle, puzzle.pieces.map((_, piece) => piece))).toBe(false);
  });

  it('counts the names from another contact only with any start', async () => {
    const fixed = await toPuzzle(design);
    expect(await isRight(fixed, solvedIn(fixed, design.pairs, 2))).toBe(false);
    const any = await toPuzzle({ ...design, anyStart: true });
    expect(any.mark).toBe(false);
    expect(await isRight(any, solvedIn(any, design.pairs, 2))).toBe(true);
  });

  it('tells a picture from words, and one picture from another', async () => {
    // Filler with the same words as a half, but a picture too, can't stand in for it.
    const pairs: [Piece, Piece][] = [[{ text: '', icon: 'stone-tower' }, { text: 'brae' }], ...design.pairs.slice(1)];
    const pictured: DiscsDesign = { ...design, pairs, filler: [{ text: 'brae', icon: 'raven' }, { text: '', icon: 'castle' }, ...design.filler.slice(2)] };
    const puzzle = await toPuzzle(pictured);
    expect(await isRight(puzzle, solvedIn(puzzle, pairs))).toBe(true);
    const wrong = (swapped: Piece): [Piece, Piece][] => [[pairs[0][0], swapped], ...pairs.slice(1)];
    expect(await isRight(puzzle, solvedIn(puzzle, wrong({ text: 'brae', icon: 'raven' })))).toBe(false);
    const castle: [Piece, Piece][] = [[{ text: '', icon: 'castle' }, pairs[0][1]], ...pairs.slice(1)];
    expect(await isRight(puzzle, solvedIn(puzzle, castle))).toBe(false);
  });
});
