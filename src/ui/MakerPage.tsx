import { useState } from 'react';
import type { MakerSide, PuzzleKind } from '../puzzles/types';
import { Site } from './Site';

interface MakerPageProps<Design> {
  kind: PuzzleKind;
  side: MakerSide<Design>;
  /** The puzzle as the link left it, or a new one. */
  design: Design;
}

/** The game master's page for a puzzle: its kind's own maker, in the site's frame. */
export function MakerPage<Design>({ kind, side, design: initial }: MakerPageProps<Design>) {
  const [design, setDesign] = useState(initial);
  return (
    <Site title={kind.name}>
      <side.Maker design={design} onChange={setDesign} />
    </Site>
  );
}
