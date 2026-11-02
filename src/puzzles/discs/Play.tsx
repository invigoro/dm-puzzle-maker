import { useCallback, useMemo, useState } from 'react';
import { load, store } from '../../kit/storage';
import type { Board, Move } from './engine/board';
import { FLOWER } from './engine/layout';
import { Game } from './Game';
import { isRight, piecesIn, progressKey, readProgress, type DiscsPuzzle } from './puzzle';

/** The players' side: the board as the link starts it, checked against its fingerprints, and kept in this browser as they go. */
export function Play({ puzzle }: { puzzle: DiscsPuzzle }) {
  const pieces = useMemo(() => piecesIn(puzzle), [puzzle]);
  // A player link lists its pieces where they start, so the start is each piece on its own spoke.
  const start = useMemo(() => pieces.map((_, piece) => piece), [pieces]);
  const isSolved = useCallback((board: Board) => isRight(puzzle, board), [puzzle]);
  const [initial] = useState(() => readProgress(load(progressKey(puzzle))));
  const keep = useCallback((board: Board, moves: readonly Move[]) => store(progressKey(puzzle), { board, moves }), [puzzle]);
  return (
    <Game
      layout={FLOWER}
      pieces={pieces}
      start={start}
      initial={initial}
      onProgress={keep}
      isSolved={isSolved}
      mark={puzzle.mark}
      success={puzzle.words.success}
    />
  );
}
