import { useEffect, useState } from 'react';
import { Board, type Motion } from './Board';
import type { Piece } from './engine/answer';
import { play, reverse, type Board as Pieces, type Move } from './engine/board';
import type { Layout } from './engine/layout';

interface GameProps {
  layout: Layout;
  pieces: readonly Piece[];
  start: Pieces;
  /** Whether a board is solved. A promise, as a player link checks against fingerprints. */
  isSolved(board: Pieces): Promise<boolean>;
  /** Whether to point out where the answer starts. */
  mark: boolean;
  /** The game master's line for solving it. */
  success: string;
}

/** A puzzle to play: the board, with Undo, Start over and a count of moves, and the game master's line once it's solved. */
export function Game({ layout, pieces, start, isSolved, mark, success }: GameProps) {
  const [board, setBoard] = useState(start);
  const [moves, setMoves] = useState<readonly Move[]>([]);
  const [motion, setMotion] = useState<Motion | null>(null);
  const [solved, setSolved] = useState(false);
  // The line stays once it's said, even if a player carries on turning.
  const [said, setSaid] = useState(false);

  useEffect(() => {
    let current = true;
    isSolved(board).then((right) => {
      if (!current) return;
      setSolved(right);
      if (right) setSaid(true);
    });
    return () => {
      current = false;
    };
  }, [board, isSolved]);

  function move(next: Move) {
    setBoard((board) => play(layout, board, next));
    setMoves((moves) => [...moves, next]);
    setMotion({ move: next });
  }

  function undo() {
    const last = moves.at(-1);
    if (!last) return;
    setBoard(play(layout, board, reverse(last)));
    setMoves(moves.slice(0, -1));
    setMotion({ move: reverse(last) });
  }

  function startOver() {
    setBoard(start);
    setMoves([]);
    setMotion(null);
  }

  return (
    <div className="game">
      <Board layout={layout} pieces={pieces} board={board} motion={motion} onMove={move} mark={mark} solved={solved} />
      <p className="hint">
        Tap a disc to turn it clockwise (Shift-click turns it back), or drag it round either way. Tap where two discs
        meet to swap the halves there.
      </p>
      <div className="game-actions">
        <button type="button" onClick={undo} disabled={moves.length === 0}>
          Undo
        </button>
        <button type="button" onClick={startOver} disabled={moves.length === 0}>
          Start over
        </button>
        <span className="moves">{moves.length === 1 ? '1 move' : `${moves.length} moves`}</span>
      </div>
      <p className="success" role="status">
        {said ? success : ''}
      </p>
    </div>
  );
}
