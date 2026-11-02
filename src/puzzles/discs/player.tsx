/** Turning discs, the players' side. Phase 1 brings the board; until then, a puzzle holds nothing. */

export type DiscsPuzzle = Record<string, never>;

export const readPuzzle = (data: unknown): DiscsPuzzle | null =>
  data !== null && typeof data === 'object' && !Array.isArray(data) ? {} : null;

export function Player(_props: { puzzle: DiscsPuzzle }) {
  return <p className="message">This puzzle isn’t ready to play yet. Ask whoever sent it for it again soon.</p>;
}
