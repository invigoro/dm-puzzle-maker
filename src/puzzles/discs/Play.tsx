import { useCallback, useMemo, useState } from 'react';
import { load, store } from '../../kit/storage';
import { IconCredit } from '../../ui/IconCredit';
import type { Board } from './engine/board';
import { Game } from './Game';
import { glowing, isRight, layoutIn, piecesIn, progressKey, readProgress, type DiscsPuzzle, type Progress } from './puzzle';

/** The players' side: the board as the link starts it, checked against its fingerprints, and kept in this browser as they go. */
export function Play({ puzzle }: { puzzle: DiscsPuzzle }) {
  const layout = layoutIn(puzzle);
  const pieces = useMemo(() => piecesIn(puzzle), [puzzle]);
  // A player link lists its pieces where they start, so the start is each piece on its own spoke.
  const start = useMemo(() => pieces.map((_, piece) => piece), [pieces]);
  const isSolved = useCallback((board: Board) => isRight(puzzle, board), [puzzle]);
  const [initial] = useState(() => readProgress(layout, load(progressKey(puzzle))));
  const keep = useCallback((progress: Progress) => store(progressKey(puzzle), progress), [puzzle]);
  // Each contact's fingerprint is made once, however often the board comes back to it.
  // Names never glow when the players check by asking, whatever a link says.
  const glow = useMemo(() => {
    const seen = new Map<string, Promise<string>>();
    return puzzle.glows && !puzzle.check ? (board: Board) => glowing(puzzle, board, seen) : undefined;
  }, [puzzle]);
  return (
    <>
      <Game
        layout={layout}
        pieces={pieces}
        start={start}
        initial={initial}
        onProgress={keep}
        glowing={glow}
        isSolved={isSolved}
        mark={puzzle.mark}
        success={puzzle.words.success}
        checking={puzzle.check ?? 'auto'}
        wrongLine={puzzle.wrong}
      />
      <IconCredit names={puzzle.icons?.filter(Boolean) ?? []} />
    </>
  );
}
