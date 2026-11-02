/** A stand-in for the site's icon files, for page tests: two icons and their index. */
import type { IconIndex } from '../kit/icons';

export const TEST_INDEX: IconIndex = { names: ['stone-tower', 'tower-flag'], authors: ['Delapouite', 'Lorc'], by: [1, 0] };
const AUTHORS: Record<string, string> = { 'stone-tower': 'Lorc', 'tower-flag': 'Delapouite' };

/** Answers for icons/index.json and icons/<name>.svg, as the site's files would. */
export async function fakeIconFetch(url: string | URL | Request): Promise<Response> {
  const path = String(url instanceof Request ? url.url : url);
  if (path.endsWith('/icons/index.json')) return new Response(JSON.stringify(TEST_INDEX));
  const name = path.match(/\/icons\/([a-z0-9-]+)\.svg$/)?.[1];
  if (name && AUTHORS[name]) {
    return new Response(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" data-author="${AUTHORS[name]}"><path fill="currentColor" d="M0 0h512v512z"/></svg>`);
  }
  return new Response('Not found', { status: 404 });
}
