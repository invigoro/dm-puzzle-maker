/**
 * Turning discs, the game master's side. Phase 1 brings the board and Phase 2 this page for making
 * a puzzle on it; until then, a design holds nothing.
 */
import type { MakerProps } from '../types';
import type { DiscsPuzzle } from './player';

export type DiscsDesign = Record<string, never>;

export const newDesign = (): DiscsDesign => ({});

export const readDesign = (data: unknown): DiscsDesign | null =>
  data !== null && typeof data === 'object' && !Array.isArray(data) ? {} : null;

export const toPuzzle = async (_design: DiscsDesign): Promise<DiscsPuzzle> => ({});

export function Maker(_props: MakerProps<DiscsDesign>) {
  return (
    <p className="message">
      Turning discs are on their way. The board comes first, and then this page, for making a puzzle on it and sending it
      to your players.
    </p>
  );
}
