// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest';
import { exportFile, forgetPuzzle, importPuzzles, merge, MOST_SAVED, readExport, readSaved, savedPuzzles, savePuzzle, type Saved } from './saved';

afterEach(() => localStorage.clear());

const entry = (id: string, saved: number, title = id): Saved => ({ id, kind: 'discs', title, saved, design: { v: 1, title } });

describe('saved puzzles', () => {
  it('are kept newest first, each once however often it’s saved', () => {
    savePuzzle(entry('vale', 1));
    savePuzzle(entry('mill', 2));
    savePuzzle(entry('vale', 3, 'The Vale, renamed'));
    expect(savedPuzzles().map((saved) => [saved.id, saved.title])).toEqual([
      ['vale', 'The Vale, renamed'],
      ['mill', 'mill'],
    ]);
  });

  it('can be forgotten', () => {
    savePuzzle(entry('vale', 1));
    savePuzzle(entry('mill', 2));
    forgetPuzzle('vale');
    expect(savedPuzzles().map((saved) => saved.id)).toEqual(['mill']);
  });

  it('keep the newest when there are too many', () => {
    for (let i = 0; i < MOST_SAVED + 3; i++) savePuzzle(entry(`p${i}`, i));
    const kept = savedPuzzles();
    expect(kept).toHaveLength(MOST_SAVED);
    expect(kept.at(-1)!.id).toBe('p3');
  });

  it('leave out whatever isn’t a saved puzzle', () => {
    expect(readSaved([entry('ok', 1), { ...entry('bad id!', 1) }, { ...entry('nokind', 1), kind: 7 }, { ...entry('nodesign', 1), design: null }, 'junk'])).toEqual([
      entry('ok', 1),
    ]);
    expect(readSaved('junk')).toEqual([]);
  });
});

describe('merge', () => {
  it('keeps the newer of a puzzle in both', () => {
    expect(merge([entry('vale', 5, 'here')], [entry('vale', 3, 'there'), entry('mill', 4)]).map((saved) => saved.title)).toEqual(['here', 'mill']);
    expect(merge([entry('vale', 1, 'here')], [entry('vale', 3, 'there')]).map((saved) => saved.title)).toEqual(['there']);
  });
});

describe('files', () => {
  it('come back as they went', () => {
    const puzzles = [entry('vale', 2), entry('mill', 1)];
    expect(readExport(exportFile(puzzles))).toEqual(puzzles);
  });

  it('are turned away when they aren’t Daedalus’s', () => {
    expect(readExport('{"puzzles": []}')).toBeNull();
    expect(readExport('not json')).toBeNull();
  });

  it('add only the puzzles that are new or newer, and say how many', () => {
    savePuzzle(entry('vale', 5));
    savePuzzle(entry('mill', 5));
    expect(importPuzzles([entry('vale', 1), entry('mill', 9), entry('tower', 2)])).toBe(2);
    expect(savedPuzzles().map((saved) => [saved.id, saved.saved])).toEqual([
      ['mill', 9],
      ['vale', 5],
      ['tower', 2],
    ]);
  });
});
