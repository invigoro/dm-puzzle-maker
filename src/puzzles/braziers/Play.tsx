import { useMemo } from 'react';
import { useKept } from '../../kit/kept';
import { IconCredit } from '../../ui/IconCredit';
import { BrazierGame, type Judge } from './Game';
import { isGoal, lineFor, readProgress, type BraziersPuzzle } from './puzzle';

/** The players' side: the floor as the link holds it, judged against its goal or the goal's fingerprint, and kept in this browser as they go. */
export function Play({ puzzle }: { puzzle: BraziersPuzzle }) {
  const [initial, keep] = useKept('braziers', puzzle.salt, (data) => readProgress(puzzle, data));
  const judge = useMemo<Judge>(() => ({ isGoal: (lit) => isGoal(puzzle, lit), lineFor: (lit) => lineFor(puzzle, lit) }), [puzzle]);
  return (
    <>
      <BrazierGame
        floor={puzzle.floor}
        icon={puzzle.icon}
        start={puzzle.start}
        aim={puzzle.aim}
        pattern={puzzle.pattern}
        limit={puzzle.limit}
        failLine={puzzle.failLine}
        judge={judge}
        initial={initial}
        onProgress={keep}
      />
      <IconCredit names={[puzzle.icon]} />
    </>
  );
}
