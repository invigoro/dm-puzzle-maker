/**
 * A player's progress on a puzzle, kept in the browser as they go, so a reload or a week between
 * sessions loses nothing. It's kept under the puzzle's kind and its link's salt, so each link has a
 * place of its own.
 */
import { useCallback, useState } from 'react';
import { load, store } from './storage';

export const keptKey = (kind: string, salt: string) => `daedalus:${kind}:${salt}`;

/** What was kept for a link, read and checked by `read`, and a way to keep more. */
export function useKept<T>(kind: string, salt: string, read: (data: unknown) => T | null): [T | null, (value: T) => void] {
  const key = keptKey(kind, salt);
  const [kept] = useState(() => read(load(key)));
  const keep = useCallback((value: T) => store(key, value), [key]);
  return [kept, keep];
}
