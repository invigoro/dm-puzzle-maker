/**
 * Turning discs, the game master's side. Phase 2 brings the page for making a puzzle; until then,
 * a design holds nothing, and the page has the example to try.
 */
import type { MakerProps } from '../types';
import { Example } from './Example';
import type { DiscsPuzzle } from './player';

export type DiscsDesign = Record<string, never>;

export const newDesign = (): DiscsDesign => ({});

export const readDesign = (data: unknown): DiscsDesign | null =>
  data !== null && typeof data === 'object' && !Array.isArray(data) ? {} : null;

export const toPuzzle = async (_design: DiscsDesign): Promise<DiscsPuzzle> => ({});

export function Maker(_props: MakerProps<DiscsDesign>) {
  return (
    <>
      <p className="lede">
        Making a puzzle of your own, and sending it to your players, comes next. Until then, here’s one to try.
      </p>
      <Example />
    </>
  );
}
