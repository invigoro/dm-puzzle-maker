import { useEffect, useMemo, useState } from 'react';
import { useKept } from '../../kit/kept';
import { IconCredit } from '../../ui/IconCredit';
import { FloorGame } from './FloorGame';
import { readProgress, valuesIn, type FloorPuzzle } from './puzzle';

/** The players' side: the floor unmasked from the link, and kept in this browser as they go. */
export function Play({ puzzle }: { puzzle: FloorPuzzle }) {
  // Undefined while it's unmasked, null if the link's squares don't make a floor.
  const [values, setValues] = useState<number[] | null | undefined>(undefined);
  const [initial, keep] = useKept('trapped-floor', puzzle.salt, (data) => readProgress(puzzle, data));
  const room = useMemo(() => ({ width: puzzle.width, height: puzzle.height }), [puzzle]);

  useEffect(() => {
    let current = true;
    valuesIn(puzzle).then((found) => current && setValues(found));
    return () => {
      current = false;
    };
  }, [puzzle]);

  if (values === undefined) return <p className="hint">Laying out the floor…</p>;
  if (values === null) return <p className="message">This floor didn’t come through whole. Ask whoever sent it for it again.</p>;
  return (
    <>
      <FloorGame
        room={room}
        start={puzzle.start}
        goal={puzzle.goal}
        values={values}
        kinds={puzzle.kinds}
        onTrap={puzzle.onTrap}
        failAfter={puzzle.failAfter}
        failLine={puzzle.failLine}
        moves={puzzle.moves}
        success={puzzle.words.success}
        initial={initial}
        onProgress={keep}
      />
      <IconCredit names={puzzle.kinds.map((kind) => kind.icon).filter(Boolean)} />
    </>
  );
}
