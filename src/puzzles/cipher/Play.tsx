import { useMemo } from 'react';
import { useKept } from '../../kit/kept';
import { IconCredit } from '../../ui/IconCredit';
import { isAnswer, lineFor, readProgress, type CipherPuzzle } from './puzzle';
import { Reader, type Judge } from './Reader';

/** The players' side: the message and the wheel as the link holds them, judged by its fingerprint, and kept in this browser as they go. */
export function Play({ puzzle }: { puzzle: CipherPuzzle }) {
  const [initial, keep] = useKept('cipher', puzzle.salt, (data) => readProgress(puzzle, data));
  const judge = useMemo<Judge>(() => ({ isAnswer: (letters) => isAnswer(puzzle, letters), lineFor: (letters) => lineFor(puzzle, letters) }), [puzzle]);
  return (
    <>
      <Reader
        script={puzzle.script}
        ring={puzzle.ring}
        text={puzzle.text}
        method={puzzle.method}
        step={puzzle.step}
        start={puzzle.start}
        check={puzzle.check}
        reading={puzzle.reading ?? false}
        given={puzzle.given}
        wrongLine={puzzle.wrong ?? ''}
        failAfter={puzzle.failAfter ?? 0}
        failLine={puzzle.failLine ?? ''}
        judge={judge}
        initial={initial}
        onProgress={keep}
      />
      {puzzle.script === 'pictures' && <IconCredit names={puzzle.ring} />}
    </>
  );
}
