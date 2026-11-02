import { describe, expect, it } from 'vitest';
import { iconFiles, indexOf } from './icons.ts';

const ICONS = {
  'stone-tower': { body: '<path fill="currentColor" d="M1 1h2"/>' },
  anvil: { body: '<path d="M2 2"/>' },
  'rank-3': { body: '<path d="M3 3"/>' },
  'lost-icon': { body: '<path d="M4 4"/>' },
};
const FOLDERS = { lorc: ['stone-tower', 'anvil'], delapouite: ['bridge'], badges: ['anvil', 'rank-3'] };

describe('iconFiles', () => {
  it('writes each icon with one named author as an SVG of its own, its author in it', () => {
    const { files } = iconFiles(ICONS, FOLDERS);
    expect(files).toEqual([
      {
        name: 'stone-tower',
        author: 'Lorc',
        svg: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" data-author="Lorc"><path fill="currentColor" d="M1 1h2"/></svg>',
      },
    ]);
  });

  it('leaves out icons whose author is uncertain, or not a person, or missing', () => {
    expect(iconFiles(ICONS, FOLDERS).skipped).toEqual(['anvil', 'lost-icon', 'rank-3']);
  });
});

describe('indexOf', () => {
  it('lists the names, and each author once', () => {
    const files = [
      { name: 'a', author: 'Lorc', svg: '' },
      { name: 'b', author: 'Delapouite', svg: '' },
      { name: 'c', author: 'Lorc', svg: '' },
    ];
    expect(indexOf(files, 'stamp')).toEqual({ stamp: 'stamp', authors: ['Delapouite', 'Lorc'], names: ['a', 'b', 'c'], by: [1, 0, 1] });
  });
});
