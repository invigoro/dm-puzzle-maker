/**
 * Records who made each icon, from the folders of https://github.com/game-icons/icons, where each
 * contributor's icons sit in a folder of their own. Run by hand, and its output committed, when the
 * icon package is updated:
 *
 *   npm run icon-authors
 *
 * It writes scripts/icon-authors.json: each folder's icon names, and the tree they came from.
 * build-icons.ts reads it to credit each icon to its author. SOURCES.md says more.
 */
import { writeFileSync } from 'node:fs';

const TREE = 'https://api.github.com/repos/game-icons/icons/git/trees/master?recursive=1';

const response = await fetch(TREE, { headers: { Accept: 'application/vnd.github+json' } });
if (!response.ok) throw new Error(`GitHub said ${response.status} for ${TREE}`);
const tree = (await response.json()) as { sha: string; truncated: boolean; tree: { path: string; type: string }[] };
if (tree.truncated) throw new Error('GitHub cut the tree short');

const folders: Record<string, string[]> = {};
for (const { path, type } of tree.tree) {
  const [folder, file, ...deeper] = path.split('/');
  if (type !== 'blob' || deeper.length > 0 || !file?.endsWith('.svg')) continue;
  (folders[folder] ??= []).push(file.slice(0, -'.svg'.length));
}
for (const names of Object.values(folders)) names.sort();

const output = { source: 'https://github.com/game-icons/icons', tree: tree.sha, fetched: new Date().toISOString().slice(0, 10), folders };
writeFileSync('scripts/icon-authors.json', JSON.stringify(output, null, 1) + '\n');
console.log(`${Object.values(folders).flat().length} icons in ${Object.keys(folders).length} folders, from tree ${tree.sha}`);
