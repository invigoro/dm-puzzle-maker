import { useCallback } from 'react';
import { useKept } from '../../kit/kept';
import { GuessGame } from './GuessGame';
import { check, lineFor, readProgress, type GuessPuzzle } from './puzzle';

/** The players' side: tries checked against the link's fingerprints, and kept in this browser as they go. */
export function Play({ puzzle }: { puzzle: GuessPuzzle }) {
  const [initial, keep] = useKept('word-guess', puzzle.salt, (data) => readProgress(puzzle, data));
  const checkTry = useCallback((guess: string) => check(puzzle, guess), [puzzle]);
  const line = useCallback((guess: string) => lineFor(puzzle, guess), [puzzle]);
  return (
    <GuessGame
      shape={puzzle.shape}
      tiles={puzzle.tiles}
      tries={puzzle.tries}
      check={checkTry}
      lineFor={line}
      out={puzzle.out}
      hints={puzzle.hints}
      initial={initial}
      onProgress={keep}
      autoFocus
    />
  );
}
