/**
 * The game master's puzzles, kept in this browser as they're made, to find again from the home
 * page, and exported to a file and imported again to move them between browsers. Each holds its
 * design untouched: its kind reads and checks it when it's opened.
 */
import { newSalt } from './check';
import { isPuzzleId } from './route';
import { load, store } from './storage';

export interface Saved {
  id: string;
  /** The kind of puzzle, as the registry names it. */
  kind: string;
  title: string;
  /** When it was last changed, in milliseconds since 1970. */
  saved: number;
  design: unknown;
}

const KEY = 'daedalus:puzzles';
/** The most puzzles kept, the oldest going first, so storage can't fill up. */
export const MOST_SAVED = 200;

/** A fresh id for a puzzle. */
export const newId = newSalt;

/** Saved puzzles from untrusted data, newest first, leaving out any that aren't. */
export function readSaved(data: unknown): Saved[] {
  if (!Array.isArray(data)) return [];
  const saved = data.flatMap((input): Saved[] => {
    const entry = input && typeof input === 'object' ? (input as Record<string, unknown>) : {};
    const { id, kind, title, saved, design } = entry;
    if (!isPuzzleId(id) || typeof kind !== 'string' || !/^[a-z][a-z-]*$/.test(kind)) return [];
    if (typeof saved !== 'number' || !Number.isFinite(saved) || !design || typeof design !== 'object') return [];
    return [{ id, kind, title: typeof title === 'string' ? title.slice(0, 100) : '', saved, design }];
  });
  return saved.sort((one, other) => other.saved - one.saved);
}

export const savedPuzzles = (): Saved[] => readSaved(load(KEY));

/** Two lists of puzzles as one, keeping the newer of any puzzle in both. */
export function merge(current: readonly Saved[], incoming: readonly Saved[]): Saved[] {
  const byId = new Map(current.map((entry) => [entry.id, entry]));
  for (const entry of incoming) {
    const kept = byId.get(entry.id);
    if (!kept || kept.saved < entry.saved) byId.set(entry.id, entry);
  }
  return readSaved([...byId.values()]).slice(0, MOST_SAVED);
}

export function savePuzzle(entry: Saved): void {
  store(KEY, merge(savedPuzzles(), [entry]));
}

export function forgetPuzzle(id: string): void {
  store(
    KEY,
    savedPuzzles().filter((entry) => entry.id !== id),
  );
}

/** Puzzles as a file, to keep or to move to another browser. */
export const exportFile = (saved: readonly Saved[]) => JSON.stringify({ daedalus: 1, puzzles: saved }, null, 1);

/** The puzzles a file holds, or null if it isn't one of Daedalus's. */
export function readExport(text: string): Saved[] | null {
  try {
    const data = JSON.parse(text);
    return data && data.daedalus === 1 ? readSaved(data.puzzles) : null;
  } catch {
    return null;
  }
}

/** Adds a file's puzzles to those kept, and says how many were new or newer. */
export function importPuzzles(saved: readonly Saved[]): number {
  const before = savedPuzzles();
  const after = merge(before, saved);
  store(KEY, after);
  const kept = new Map(before.map((entry) => [entry.id, entry.saved]));
  return after.filter((entry) => kept.get(entry.id) !== entry.saved).length;
}
