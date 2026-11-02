/**
 * Things kept in this browser between visits, as JSON. Storage can be blocked (in a private window,
 * say), so what's kept is only ever a convenience: reads give null and writes do nothing.
 */

export function load(key: string): unknown {
  try {
    const text = localStorage.getItem(key);
    return text === null ? null : JSON.parse(text);
  } catch {
    return null;
  }
}

export function store(key: string, value: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // As above.
  }
}
