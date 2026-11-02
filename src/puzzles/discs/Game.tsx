import { useEffect, useRef, useState } from 'react';
import { Board, type Motion } from './Board';
import type { Checking } from './design';
import type { Piece } from './engine/answer';
import { play, reverse, type Board as Pieces, type Move } from './engine/board';
import type { Layout } from './engine/layout';
import type { Progress } from './puzzle';

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
  /** Whether the board is checked after every move, or only when the players ask. */
  checking?: Checking;
  /** What a wrong check says, when the players check by asking. */
  wrongLine?: string;
  /** Where a player left off, to carry on from; Start over still goes back to `start`. */
  initial?: Progress | null;
  /** Told of the board, its moves and its checks whenever they change, to keep them. */
  onProgress?(progress: Progress): void;
  /** Which goal contacts glow on a board, when names glow as they come right. */
  glowing?(board: Pieces): Promise<number[]>;
}

/**
 * A puzzle to play: the board, with Undo, Start over and a count of moves, and the game master's
 * line once it's solved. It's checked after every move, or only when the players ask, counting the
 * checks that are wrong.
 */
export function Game({ layout, pieces, start, isSolved, mark, success, checking = 'auto', wrongLine = '', initial, onProgress, glowing }: GameProps) {
  const asked = checking === 'asked';
  const [board, setBoard] = useState(initial?.board ?? start);
  const [moves, setMoves] = useState<readonly Move[]>(initial?.moves ?? []);
  const [motion, setMotion] = useState<Motion | null>(null);
  const [solved, setSolved] = useState(asked && initial?.solved === true);
  const [lit, setLit] = useState<readonly number[]>([]);
  // The line stays once it's said, even if a player carries on turning.
  const [said, setSaid] = useState(asked && initial?.solved === true);
  /** When checking on asking: how many checks have been wrong, and what the last check of this board found. */
  const [wrong, setWrong] = useState(initial?.wrong ?? 0);
  const [found, setFound] = useState<'right' | 'wrong' | 'checking' | null>(asked && initial?.solved ? 'right' : null);
  // The board now, for a check that finishes after another move.
  const now = useRef(board);
  useEffect(() => {
    now.current = board;
  }, [board]);

  useEffect(() => {
    if (!glowing) return setLit([]);
    let current = true;
    glowing(board).then((goals) => current && setLit(goals));
    return () => {
      current = false;
    };
  }, [board, glowing]);

  useEffect(() => {
    if (asked) return;
    let current = true;
    isSolved(board).then((right) => {
      if (!current) return;
      setSolved(right);
      if (right) setSaid(true);
    });
    return () => {
      current = false;
    };
  }, [asked, board, isSolved]);

  useEffect(() => {
    onProgress?.({ board, moves: [...moves], ...(asked ? { wrong, solved: said } : {}) });
  }, [asked, board, moves, wrong, said, onProgress]);

  /** A new board, when checking on asking, is unchecked, and not lit as solved until a check says so. */
  function unchecked() {
    if (!asked) return;
    setFound(null);
    setSolved(false);
  }

  function move(next: Move) {
    setBoard((board) => play(layout, board, next));
    setMoves((moves) => [...moves, next]);
    setMotion({ move: next });
    unchecked();
  }

  function undo() {
    const last = moves.at(-1);
    if (!last) return;
    setBoard(play(layout, board, reverse(last)));
    setMoves(moves.slice(0, -1));
    setMotion({ move: reverse(last) });
    unchecked();
  }

  function startOver() {
    setBoard(start);
    setMoves([]);
    setMotion(null);
    unchecked();
  }

  async function check() {
    const checked = board;
    setFound('checking');
    const right = await isSolved(checked);
    // A move while it was checking makes a new board, to check afresh.
    if (now.current !== checked) return;
    setFound(right ? 'right' : 'wrong');
    if (right) {
      setSolved(true);
      setSaid(true);
    } else {
      setWrong((wrong) => wrong + 1);
    }
  }

  return (
    <div className="game">
      <Board layout={layout} pieces={pieces} board={board} motion={motion} onMove={move} mark={mark} solved={solved} lit={lit} />
      <p className="hint">
        Tap a disc to turn it clockwise (Shift-click turns it back), or drag it round either way. Tap where two discs
        meet to swap the halves there.{asked && ' When you think the names are right, check the answer.'}
      </p>
      <div className="game-actions">
        <button type="button" onClick={undo} disabled={moves.length === 0}>
          Undo
        </button>
        <button type="button" onClick={startOver} disabled={moves.length === 0}>
          Start over
        </button>
        {asked && (
          // A board is checked once: checking it again would say the same.
          <button type="button" className="primary" onClick={check} disabled={found !== null || said}>
            Check the answer
          </button>
        )}
        <span className="moves">
          {moves.length === 1 ? '1 move' : `${moves.length} moves`}
          {asked && `, ${wrong === 1 ? '1 wrong check' : `${wrong} wrong checks`}`}
        </span>
      </div>
      <p className={found === 'wrong' && !said ? 'success wrong' : 'success'} role="status">
        {said ? success || 'Solved.' : found === 'wrong' ? wrongLine || 'That’s not it.' : ''}
      </p>
    </div>
  );
}
