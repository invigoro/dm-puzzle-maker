import { useCallback, useMemo, useState } from 'react';
import { randomSeed } from '../../kit/rng';
import { answerKey } from './engine/answer';
import type { Board } from './engine/board';
import { FLOWER } from './engine/layout';
import { EXAMPLE, examplePuzzle } from './examplePuzzle';
import { Game } from './Game';

/** The example puzzle to play, with a fresh scramble on asking. */
export function Example({ seed: initial }: { seed?: number }) {
  const [seed, setSeed] = useState(() => initial ?? randomSeed());
  const { pieces, start, keys } = useMemo(() => examplePuzzle(seed), [seed]);
  const isSolved = useCallback(async (board: Board) => keys.includes(answerKey(FLOWER, pieces, board)), [keys, pieces]);
  return (
    <section className="puzzle">
      <h2 className="puzzle-title">{EXAMPLE.title}</h2>
      <p className="intro">{EXAMPLE.intro}</p>
      <Game key={seed} layout={FLOWER} pieces={pieces} start={start} isSolved={isSolved} mark success={EXAMPLE.success} />
      <p className="reroll">
        <button type="button" onClick={() => setSeed(randomSeed())}>
          🎲 New scramble
        </button>
        <span className="seed">Seed {seed}</span>
      </p>
    </section>
  );
}
