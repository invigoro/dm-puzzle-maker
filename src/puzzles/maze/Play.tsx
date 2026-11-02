import { useMemo } from 'react';
import { useKept } from '../../kit/kept';
import { IconCredit } from '../../ui/IconCredit';
import { MazeGame } from './MazeGame';
import { mazeIn, readProgress, type MazePuzzle } from './puzzle';

/** The players' side: the maze as the link holds it, kept in this browser as they go. */
export function Play({ puzzle }: { puzzle: MazePuzzle }) {
  const maze = useMemo(() => mazeIn(puzzle), [puzzle]);
  const [initial, keep] = useKept('maze', puzzle.salt, (data) => readProgress(puzzle, data));
  return (
    <>
      <MazeGame
        maze={maze}
        start={puzzle.start}
        exits={puzzle.exits}
        light={puzzle.light}
        reach={puzzle.reach}
        view={puzzle.view}
        pictures={puzzle.pictures}
        onHazard={puzzle.onHazard}
        initial={initial}
        onProgress={keep}
        autoFocus
      />
      <IconCredit names={puzzle.pictures.map((picture) => picture.icon)} />
    </>
  );
}
