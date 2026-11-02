/**
 * Writes the pictures to public/icons/, which isn't committed: an SVG for each icon, credited to its
 * author, and index.json for the picker. It runs before `npm run dev` and `npm run build`, and does
 * nothing when the icons are already up to date.
 *
 * The icons come from the @iconify-json/game-icons package, and their authors from
 * scripts/icon-authors.json (see icon-authors.ts). SOURCES.md says more.
 */
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { iconFiles, indexOf } from './icons.ts';

const PACKAGE = 'node_modules/@iconify-json/game-icons';
const OUTPUT = 'public/icons';

const read = (path: string) => JSON.parse(readFileSync(path, 'utf8'));
const { version } = read(join(PACKAGE, 'package.json')) as { version: string };
const { icons, width = 512 } = read(join(PACKAGE, 'icons.json')) as { icons: Record<string, { body: string }>; width?: number };
const { tree, folders } = read('scripts/icon-authors.json') as { tree: string; folders: Record<string, string[]> };
const stamp = `${version} ${tree}`;

const index = join(OUTPUT, 'index.json');
if (existsSync(index) && read(index).stamp === stamp) {
  console.log(`Icons are up to date (${stamp}).`);
} else {
  const { files, skipped } = iconFiles(icons, folders, width);
  rmSync(OUTPUT, { recursive: true, force: true });
  mkdirSync(OUTPUT, { recursive: true });
  for (const { name, svg } of files) writeFileSync(join(OUTPUT, `${name}.svg`), svg);
  writeFileSync(index, JSON.stringify(indexOf(files, stamp)));
  console.log(`Wrote ${files.length} icons to ${OUTPUT}, leaving out ${skipped.length} whose author is uncertain.`);
}
