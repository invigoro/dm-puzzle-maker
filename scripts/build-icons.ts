/**
 * Writes the pictures to public/icons/, which isn't committed: an SVG for each icon, credited to its
 * author, and index.json for the picker. It runs before `npm run dev` and `npm run build`, and does
 * nothing when the icons are already up to date.
 *
 * - game-icons.net's come from the @iconify-json/game-icons package, and their authors from
 *   scripts/icon-authors.json (see icon-authors.ts). They're written at the top, as `anvil.svg`.
 * - Font Awesome's free solid icons come from @iconify-json/fa7-solid, all credited to Font Awesome,
 *   and are written to fa/, as `fa/key.svg`.
 *
 * SOURCES.md says more.
 */
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileOf, iconFiles, indexOf, setFiles, type SetIcon } from './icons.ts';

const GAME_ICONS = 'node_modules/@iconify-json/game-icons';
const FONT_AWESOME = 'node_modules/@iconify-json/fa7-solid';
const OUTPUT = 'public/icons';

const read = (path: string) => JSON.parse(readFileSync(path, 'utf8'));
const versionOf = (path: string) => (read(join(path, 'package.json')) as { version: string }).version;
const { tree, folders } = read('scripts/icon-authors.json') as { tree: string; folders: Record<string, string[]> };
const fontAwesome = read(join(FONT_AWESOME, 'info.json')) as { version: string };
const stamp = `${versionOf(GAME_ICONS)} ${tree}, fa7-solid ${versionOf(FONT_AWESOME)}`;

const index = join(OUTPUT, 'index.json');
if (existsSync(index) && read(index).stamp === stamp) {
  console.log(`Icons are up to date (${stamp}).`);
} else {
  const games = read(join(GAME_ICONS, 'icons.json')) as { icons: Record<string, { body: string }>; width?: number };
  const { files, skipped } = iconFiles(games.icons, folders, games.width);
  const awesome = read(join(FONT_AWESOME, 'icons.json')) as { icons: Record<string, SetIcon>; width?: number; height?: number };
  const note = `Font Awesome Free ${fontAwesome.version} by @fontawesome - https://fontawesome.com License - https://fontawesome.com/license/free (Icons: CC BY 4.0) Copyright Fonticons, Inc.`;
  const more = setFiles(awesome.icons, { prefix: 'fa', author: 'Font Awesome', width: awesome.width, height: awesome.height, note });
  rmSync(OUTPUT, { recursive: true, force: true });
  for (const { name, svg } of [...files, ...more]) {
    const path = join(OUTPUT, fileOf(name));
    mkdirSync(dirname(path), { recursive: true });
    writeFileSync(path, svg);
  }
  writeFileSync(index, JSON.stringify(indexOf([...files, ...more], stamp)));
  console.log(`Wrote ${files.length} icons from game-icons.net to ${OUTPUT}, leaving out ${skipped.length} whose author is uncertain, and ${more.length} from Font Awesome.`);
}
