/** A stand-in for the site's icon files, for page tests: three icons, one of them Font Awesome's, and their index. */
import type { IconIndex } from '../kit/icons';

const AUTHORS: Record<string, string> = { 'stone-tower': 'Lorc', 'tower-flag': 'Delapouite', 'fa:dragon': 'Font Awesome' };
const NAMES = Object.keys(AUTHORS);
const MAKERS = [...new Set(Object.values(AUTHORS))].sort();
export const TEST_INDEX: IconIndex = { names: NAMES, authors: MAKERS, by: NAMES.map((name) => MAKERS.indexOf(AUTHORS[name])) };

/** Answers for icons/index.json and icons/<name>.svg (or icons/<set>/<name>.svg), as the site's files would. */
export async function fakeIconFetch(url: string | URL | Request): Promise<Response> {
  const path = String(url instanceof Request ? url.url : url);
  if (path.endsWith('/icons/index.json')) return new Response(JSON.stringify(TEST_INDEX));
  const [, set, bare] = path.match(/\/icons\/(?:([a-z0-9]+)\/)?([a-z0-9-]+)\.svg$/) ?? [];
  const name = set ? `${set}:${bare}` : bare;
  if (name && AUTHORS[name]) {
    return new Response(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" data-author="${AUTHORS[name]}"><path fill="currentColor" d="M0 0h512v512z"/></svg>`);
  }
  return new Response('Not found', { status: 404 });
}
