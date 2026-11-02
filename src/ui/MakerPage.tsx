import { useEffect, useRef, useState } from 'react';
import { makerHash } from '../kit/route';
import type { Words } from '../kit/words';
import type { MakerSide, PuzzleKind } from '../puzzles/types';
import { Send } from './Send';
import { Site } from './Site';
import { WordsFields } from './WordsFields';

interface MakerPageProps<Design extends { words: Words }> {
  kind: PuzzleKind;
  side: MakerSide<Design>;
  /** The puzzle as the link left it, or a new one. */
  design: Design;
}

/** The game master's page for a puzzle: its kind's own maker, then the words every puzzle has, and sending it. */
export function MakerPage<Design extends { words: Words }>({ kind, side, design: initial }: MakerPageProps<Design>) {
  const [design, setDesign] = useState(initial);
  const opened = useRef(initial);

  // The address keeps the design, so a bookmark or a reload brings it back. A new puzzle keeps its
  // short address until something's changed. replaceState doesn't count as following a link.
  useEffect(() => {
    if (design === opened.current) return;
    let current = true;
    makerHash(kind.id, design).then((hash) => {
      if (current) history.replaceState(null, '', hash);
    });
    return () => {
      current = false;
    };
  }, [kind.id, design]);

  return (
    <Site title={kind.name}>
      <side.Maker design={design} onChange={setDesign} />
      <WordsFields words={design.words} onChange={(words) => setDesign({ ...design, words })} />
      <Send kind={kind} side={side} design={design} />
    </Site>
  );
}
