import { useMemo } from 'react';
import { useKept } from '../../kit/kept';
import { IconCredit } from '../../ui/IconCredit';
import { isAnswer, isRightAt, lineFor, readProgress, type PedestalsPuzzle } from './puzzle';
import { Room, type Judge } from './Room';

/** The players' side: the room as the link holds it, judged by its fingerprints, and kept in this browser as they go. */
export function Play({ puzzle }: { puzzle: PedestalsPuzzle }) {
  const [initial, keep] = useKept('pedestals', puzzle.salt, (data) => readProgress(puzzle, data));
  const judge = useMemo<Judge>(
    () => ({
      isAnswer: (things) => isAnswer(puzzle, things),
      isRightAt: (pedestal, thing) => isRightAt(puzzle, pedestal, thing),
      lineFor: (things) => lineFor(puzzle, things),
    }),
    [puzzle],
  );
  return (
    <>
      <Room
        riddles={puzzle.riddles}
        objects={puzzle.objects}
        check={puzzle.check}
        tell={puzzle.tell ?? 'wrong'}
        wrongLine={puzzle.wrong}
        failAfter={puzzle.failAfter}
        failLine={puzzle.failLine}
        judge={judge}
        initial={initial}
        onProgress={keep}
      />
      <IconCredit names={[...puzzle.riddles, ...puzzle.objects].flatMap((thing) => (thing.icon ? [thing.icon] : []))} />
    </>
  );
}
