import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { PICTURE_CHOICES } from '../src/puzzles/cipher/engine/rings.ts';
import { fileOf, iconFiles, indexOf, setFiles, squared } from './icons.ts';

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

describe('setFiles', () => {
  it('names each icon with its set’s prefix, credits the set, and fits it to a square of 512', () => {
    const files = setFiles(
      { key: { body: '<path d="M1 1"/>' }, 'old-key': { body: '<path/>', hidden: true }, axe: { body: '<path d="M2 2"/>', width: 320 } },
      { prefix: 'fa', author: 'Font Awesome', width: 640, note: 'Font Awesome Free' },
    );
    expect(files.map((file) => file.name)).toEqual(['fa:axe', 'fa:key']);
    expect(files[1]).toEqual({
      name: 'fa:key',
      author: 'Font Awesome',
      svg: '<!-- Font Awesome Free --><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" data-author="Font Awesome"><g transform="scale(0.8)"><path d="M1 1"/></g></svg>',
    });
    // An icon narrower than the rest is centred.
    expect(files[0].svg).toContain('<g transform="translate(128 0) scale(0.8)">');
  });
});

describe('squared', () => {
  it('leaves a drawing on a square of 512 as it is, and fits and centres any other', () => {
    expect(squared('<path/>', 512, 512)).toBe('<path/>');
    expect(squared('<path/>', 24, 24)).toBe('<g transform="scale(21.333)"><path/></g>');
    expect(squared('<path/>', 448, 512)).toBe('<g transform="translate(32 0)"><path/></g>');
    expect(squared('<path/>', 640, 512)).toBe('<g transform="translate(0 51.2) scale(0.8)"><path/></g>');
  });
});

describe('fileOf', () => {
  it('puts game-icons at the top, and another set’s in a folder of its own', () => {
    expect(fileOf('stone-tower')).toBe('stone-tower.svg');
    expect(fileOf('fa:key')).toBe('fa/key.svg');
  });
});

describe('the pictures puzzles choose from', () => {
  it('are all served, each with its one author', () => {
    const { icons } = JSON.parse(readFileSync('node_modules/@iconify-json/game-icons/icons.json', 'utf8'));
    const { folders } = JSON.parse(readFileSync('scripts/icon-authors.json', 'utf8'));
    const served = new Set(iconFiles(icons, folders).files.map((file) => file.name));
    expect(PICTURE_CHOICES.filter((name) => !served.has(name))).toEqual([]);
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
