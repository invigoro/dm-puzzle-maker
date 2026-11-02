/**
 * Which page a link opens, from the URL's fragment, which never reaches a server:
 *
 * - nothing: the home page
 * - "#discs": a new puzzle of that kind, in the maker
 * - "#m=…": a puzzle in the maker, answer and all, for the game master only
 * - "#p=…": a puzzle on the players' page, with only what they should see
 *
 * A puzzle is packed with its kind, as `{ v, kind, data }`, so the page knows whose code to load.
 */
import { pack, unpack } from './packing';

export const MAKER_PREFIX = '#m=';
export const PLAYER_PREFIX = '#p=';

/** Bumped if the wrapping around a puzzle changes incompatibly. Each kind versions its own data. */
const VERSION = 1;

export type Route =
  | { page: 'home' }
  /** A puzzle in the maker. `data` is the kind's own, still unchecked, or null for a new puzzle. */
  | { page: 'make'; kind: string; data: unknown }
  /** A puzzle on the players' page. `data` is the kind's own, still unchecked. */
  | { page: 'play'; kind: string; data: unknown }
  /** A link that doesn't hold a puzzle this site knows. */
  | { page: 'lost' };

const LOST: Route = { page: 'lost' };

/** The page a URL fragment opens, given the ids of the kinds of puzzle there are. */
export async function readRoute(hash: string, kinds: readonly string[]): Promise<Route> {
  if (hash === '' || hash === '#') return { page: 'home' };
  const prefix = [MAKER_PREFIX, PLAYER_PREFIX].find((prefix) => hash.startsWith(prefix));
  if (!prefix) {
    const kind = hash.slice(1);
    return kinds.includes(kind) ? { page: 'make', kind, data: null } : LOST;
  }
  const packed = await unpack(hash.slice(prefix.length));
  if (!packed || typeof packed !== 'object' || Array.isArray(packed)) return LOST;
  const { v, kind, data } = packed as Record<string, unknown>;
  if (v !== VERSION || typeof kind !== 'string' || !kinds.includes(kind) || data === undefined || data === null) return LOST;
  return { page: prefix === MAKER_PREFIX ? 'make' : 'play', kind, data };
}

/** The fragment that opens a new puzzle of a kind in the maker. */
export const newPuzzleHash = (kind: string) => `#${kind}`;

/** The fragment that opens a puzzle in the maker, answer and all: for the game master only. */
export async function makerHash(kind: string, design: unknown): Promise<string> {
  return MAKER_PREFIX + (await pack({ v: VERSION, kind, data: design }));
}

/** The fragment that opens a puzzle on the players' page. `puzzle` must hold only what they may see. */
export async function playerHash(kind: string, puzzle: unknown): Promise<string> {
  return PLAYER_PREFIX + (await pack({ v: VERSION, kind, data: puzzle }));
}
