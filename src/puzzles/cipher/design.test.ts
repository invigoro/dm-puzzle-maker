import { describe, expect, it } from 'vitest';
import { playerHash, readRoute } from '../../kit/route';
import { checkedOf, cipherOf, newDesign, problemsOf, readDesign, ringOfDesign, startOf, toPuzzle, type CipherDesign } from './design';
import { decipher } from './engine/cipher';
import { lettersOf, plainOf } from './engine/letters';
import { PICTURE_CHOICES, RUNES } from './engine/rings';
import { isAnswer, lineFor, readProgress, readPuzzle, type CipherPuzzle } from './puzzle';

// A made-up message, never a game master's own.
const design: CipherDesign = {
  ...newDesign(),
  words: { title: 'The miller’s note', intro: 'Scratched inside the millstone’s housing.', success: 'The note is clear.' },
  message: 'Meet me at the weir when the moon is full. Bring rope.',
  script: 'letters',
  method: 'keyword',
  keyword: 'Lantern',
  setting: 5,
  seed: 11,
};
const sent = async (change: Partial<CipherDesign> = {}) => readPuzzle(JSON.parse(JSON.stringify(await toPuzzle({ ...design, ...change }))))!;
/** A puzzle's message read back with the design's key, from the ring's places. */
const readBack = (puzzle: CipherPuzzle, change: Partial<CipherDesign> = {}) => decipher(puzzle.text, { method: 'keyword', keyword: 'Lantern', ...change } as never);

describe('a design', () => {
  it('starts with runes at one setting, and says what stops it being sent', () => {
    const fresh = newDesign();
    expect(fresh).toMatchObject({ script: 'runes', method: 'one', check: 'filled' });
    expect(fresh.setting).toBeGreaterThan(0);
    expect(problemsOf(fresh)).toEqual(['Write the message the players are to read.']);
    expect(problemsOf(design)).toEqual([]);
  });

  it('asks for every key, picture and answer it needs', () => {
    expect(problemsOf({ ...design, keyword: ' 42 ' })).toEqual(['Give the keyword.']);
    expect(problemsOf({ ...design, method: 'autokey', primer: '' })).toEqual(['Give the starting word.']);
    expect(problemsOf({ ...design, check: 'answer', password: '' })).toEqual(['Give the answer the players must find.']);
    expect(problemsOf({ ...design, method: 'turning', step: 'word', groups: true })).toEqual([
      'Turning after every word needs the spaces kept, so the players can see the words.',
    ]);
    const pictures = PICTURE_CHOICES.slice(0, 26);
    expect(problemsOf({ ...design, script: 'pictures', pictures: [...pictures.slice(0, 25), ''] })).toEqual(['Give every letter a picture of its own, or 🎲 fill the rest.']);
    expect(problemsOf({ ...design, script: 'pictures', pictures: [...pictures.slice(0, 25), pictures[0]] })).toHaveLength(1);
    expect(problemsOf({ ...design, script: 'pictures', pictures })).toEqual([]);
  });

  it('won’t send letters that read just as they are', () => {
    expect(problemsOf({ ...design, method: 'one', setting: 0 })).toEqual(['The message reads just as it is with this key: choose another.']);
    // Runes never read as the message does.
    expect(problemsOf({ ...design, method: 'one', setting: 0, script: 'runes' })).toEqual([]);
  });

  it('reads a design back, and fills in what’s missing or malformed', () => {
    expect(readDesign(JSON.parse(JSON.stringify(design)))).toEqual(design);
    const read = readDesign({ v: 1, message: 7, script: 'hieroglyphs', pictures: ['stone-tower', '../x'], method: 'rot13', setting: 26, check: 'maybe', failAfter: 4 })!;
    expect(read).toMatchObject({ message: '', script: 'runes', method: 'one', setting: 0, check: 'filled', failAfter: 0 });
    expect(read.pictures.slice(0, 2)).toEqual(['stone-tower', '']);
    expect(read.pictures).toHaveLength(26);
    expect(readDesign({ v: 2 })).toBeNull();
    expect(readDesign('nonsense')).toBeNull();
  });

  it('starts the players’ wheel from its seed, never at the setting that reads it', () => {
    for (let seed = 0; seed < 50; seed++) {
      expect(startOf({ ...design, method: 'one', seed })).not.toBe(design.setting);
      expect(startOf({ ...design, method: 'turning', seed })).not.toBe(design.setting);
    }
    expect(startOf(design)).toBe(startOf({ ...design }));
  });

  it('runs the letters on in groups of five, on asking', () => {
    expect(cipherOf({ ...design, groups: true })).toMatch(/^([A-Z]{5} )+[A-Z]{1,5}$/);
    expect(lettersOf(cipherOf({ ...design, groups: true }))).toBe(lettersOf(cipherOf(design)));
  });

  it('mixes the ring by a word', () => {
    expect(ringOfDesign({ ...design, mix: 'Dragon' }).join('')).toBe('DRAGONBCEFHIJKLMPQSTUVWXYZ');
    expect(ringOfDesign({ ...design, script: 'runes', mix: '' })).toEqual(RUNES);
  });
});

describe('a player link', () => {
  it('holds the message in cipher, the ring and where the wheel starts, which read back with the key', async () => {
    const puzzle = await sent();
    expect(puzzle).toMatchObject({ script: 'letters', method: 'keyword', check: 'filled', start: startOf(design) });
    expect(puzzle.ring.join('')).toBe('ABCDEFGHIJKLMNOPQRSTUVWXYZ');
    expect(readBack(puzzle)).toBe(plainOf(design.message));
  });

  it('never holds the message, the key, or the answer', async () => {
    for (const change of [{}, { method: 'autokey', primer: 'Weirdly' }, { method: 'one' }, { check: 'answer', password: 'Hempen rope' }] as Partial<CipherDesign>[]) {
      const link = JSON.stringify(await toPuzzle({ ...design, ...change }));
      for (const secret of ['MEET', 'WEIR', 'MOON', 'ROPE', 'Meet', 'LANTERN', 'Lantern', 'WEIRDLY', 'Weirdly', 'HEMPEN', 'Hempen', 'The note is clear', '"setting":', '"keyword":', '"primer":', '"password":']) {
        expect(link).not.toContain(secret);
      }
    }
  });

  it('checks the message’s letters, and opens the line with them alone', async () => {
    const puzzle = await sent();
    expect(await isAnswer(puzzle, lettersOf(design.message))).toBe(true);
    expect(await isAnswer(puzzle, 'MEETMEATTHEWEIR')).toBe(false);
    expect(await lineFor(puzzle, lettersOf(design.message))).toBe('The note is clear.');
    expect(puzzle.words.success).toBe('');
  });

  it('checks an answer, with its line for a wrong one and for failing', async () => {
    const puzzle = await sent({ check: 'answer', password: 'Hempen rope!', wrongLine: 'The weir floods.', failAfter: 3 });
    expect(puzzle).toMatchObject({ wrong: 'The weir floods.', failAfter: 3 });
    expect(checkedOf({ ...design, check: 'answer', password: 'Hempen rope!' })).toBe('HEMPENROPE');
    expect(await isAnswer(puzzle, 'HEMPENROPE')).toBe(true);
    expect(await isAnswer(puzzle, lettersOf(design.message))).toBe(false);
  });

  it('holds nothing to check when it isn’t checked', async () => {
    const puzzle = await sent({ check: 'none' });
    expect(puzzle.answer).toBeUndefined();
    expect(puzzle.sealed).toBeUndefined();
    expect(await isAnswer(puzzle, lettersOf(design.message))).toBe(false);
  });

  it('says when the wheel turns as it goes, and whether the page reads for them', async () => {
    expect(await sent({ method: 'turning', step: 'word', reading: true })).toMatchObject({ method: 'turning', step: 'word', reading: true });
    expect((await sent()).step).toBeUndefined();
    expect((await sent()).reading).toBeUndefined();
  });

  it('turns away a link that isn’t one', async () => {
    const good = JSON.parse(JSON.stringify(await toPuzzle(design)));
    const ring = good.ring as string[];
    for (const change of [
      { ring: ring.slice(1) },
      { ring: [...ring.slice(1), 'B'] },
      { ring: [...ring.slice(1), 'ᚠ'] },
      { script: 'runes' },
      { text: '1234' },
      { text: 'AB\u0007C' },
      { text: 'A'.repeat(401) },
      { method: 'turning' },
      { step: 'letter' },
      { start: 26 },
      { check: 'answer' },
      { sealed: undefined },
      { salt: '' },
      { v: 2 },
    ]) {
      expect(readPuzzle({ ...good, ...change })).toBeNull();
    }
    expect(readPuzzle({ ...good, script: 'pictures', ring: PICTURE_CHOICES.slice(0, 26) })?.ring).toHaveLength(26);
    expect(readPuzzle({ ...good, script: 'runes', ring: RUNES })).not.toBeNull();
  });

  it('fits in a Discord message, even with the longest message in pictures', async () => {
    const longest = { ...design, script: 'pictures' as const, pictures: PICTURE_CHOICES.slice(0, 26), message: 'Wheel and weir, '.repeat(19).slice(0, 300) };
    const hash = await playerHash('cipher', await toPuzzle(longest));
    expect(`https://daedalus.invigoro.me/${hash}`.length).toBeLessThan(2000);
    const route = await readRoute(hash, ['cipher']);
    expect(route.page === 'play' && readPuzzle(route.data)).toBeTruthy();
  });
});

describe('progress', () => {
  it('reads back what was kept, for this puzzle’s boxes, or nothing', async () => {
    const puzzle = await sent();
    const boxes = lettersOf(design.message).length;
    const kept = { turns: -3, written: Array.from({ length: boxes }, () => ''), wrong: 0, solved: false, failed: false, reading: 'LAN', answer: '' };
    expect(readProgress(puzzle, kept)).toEqual(kept);
    expect(readProgress(puzzle, { ...kept, written: ['A'] })).toBeNull();
    expect(readProgress(puzzle, { ...kept, written: kept.written.map(() => 'a') })).toBeNull();
    expect(readProgress(puzzle, { ...kept, turns: 1.5 })).toBeNull();
    // At one setting, there's a box for each symbol.
    const one = await sent({ method: 'one' });
    expect(readProgress(one, { ...kept, written: Array.from({ length: 26 }, () => '') })).not.toBeNull();
  });
});
