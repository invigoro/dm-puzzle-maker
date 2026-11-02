import { useCallback, useId, useMemo, useState } from 'react';
import { randomSeed } from '../../kit/rng';
import type { MakerProps } from '../types';
import { Board } from './Board';
import { contentOf, fillerOf, MIXES, solvedOf, startOf, type DiscsDesign } from './design';
import { answerKey, answerKeys, keyOf, LONGEST_HALF, piecesOf } from './engine/answer';
import type { Board as Pieces } from './engine/board';
import { FLOWER } from './engine/layout';
import { EXAMPLE } from './example';
import { Game } from './Game';

/** Past this many letters, a half's letters are set smaller to fit its spoke. */
const ROOMY = 7;

/** The game master's part of the maker: the names, the filler and the start, and the board to try. */
export function Designer({ design, onChange }: MakerProps<DiscsDesign>) {
  const id = useId();
  const [showSolved, setShowSolved] = useState(false);
  const set = (change: Partial<DiscsDesign>) => onChange({ ...design, ...change });
  const setPair = (pair: number, side: 0 | 1, text: string) =>
    set({ pairs: design.pairs.map((halves, i) => (i === pair ? (side === 0 ? [text, halves[1]] : [halves[0], text]) : halves)) });

  const filled = useMemo(() => fillerOf(design), [design]);
  const content = useMemo(() => contentOf(design), [design]);
  const pieces = useMemo(() => piecesOf(content), [content]);
  const start = useMemo(() => startOf(design), [design]);
  const keys = useMemo(() => answerKeys(content, design.anyStart), [content, design.anyStart]);
  const isSolved = useCallback(async (board: Pieces) => keys.includes(answerKey(FLOWER, pieces, board)), [keys, pieces]);
  // The board to try starts again whenever what's on it changes.
  const trial = JSON.stringify([start, pieces.map(keyOf), design.anyStart]);

  const blank = design.pairs.every((pair) => pair.every((text) => text.trim() === ''));
  const long = pieces.some((piece) => [...keyOf(piece)].length > ROOMY);

  return (
    <>
      <section className="panel">
        <h2>The names</h2>
        <p className="hint">
          Six names, each in two halves, in order clockwise from where the centre’s arrow points. Each half reads down from
          its own disc’s hub, so a name counts with its halves either way round.
        </p>
        <ol className="pairs">
          {design.pairs.map(([first, second], i) => (
            <li key={i}>
              <span className="number">{i + 1}</span>
              <input
                className="half"
                aria-label={`Name ${i + 1}, first half`}
                value={first}
                maxLength={LONGEST_HALF}
                onChange={(event) => setPair(i, 0, event.target.value)}
              />
              <span aria-hidden="true">+</span>
              <input
                className="half"
                aria-label={`Name ${i + 1}, second half`}
                value={second}
                maxLength={LONGEST_HALF}
                onChange={(event) => setPair(i, 1, event.target.value)}
              />
            </li>
          ))}
        </ol>
        <label className="check">
          <input type="checkbox" checked={design.anyStart} onChange={(event) => set({ anyStart: event.target.checked })} />
          <span>
            <strong>Any start:</strong> count the six in order from any contact round the centre, not only from the
            arrow’s. The board then has no arrow.
          </span>
        </label>
        {blank && (
          <p>
            <button type="button" onClick={() => onChange({ ...design, words: EXAMPLE.words, pairs: EXAMPLE.pairs })}>
              Start from the example
            </button>{' '}
            <span className="hint">six made-up towns, to see how it works</span>
          </p>
        )}
      </section>

      <section className="panel">
        <h2>Filler</h2>
        <p className="hint">
          The other {design.filler.length} spokes. Blank boxes fill themselves with halves of place names, shown faintly.
          Write over any you’d rather choose: names that look right but aren’t make the best filler.
        </p>
        <div className="filler">
          {design.filler.map((text, i) => (
            <input
              key={i}
              className="half"
              aria-label={`Filler ${i + 1}`}
              value={text}
              placeholder={filled[i]}
              maxLength={LONGEST_HALF}
              onChange={(event) => set({ filler: design.filler.map((old, j) => (j === i ? event.target.value : old)) })}
            />
          ))}
        </div>
        <p>
          <button type="button" onClick={() => set({ fillSeed: randomSeed() })}>
            🎲 Other filler
          </button>
        </p>
      </section>

      <section className="panel">
        <h2>The start</h2>
        <div className="row">
          <label htmlFor={`${id}-mix`}>Scramble</label>
          <select
            id={`${id}-mix`}
            value={String(design.mix)}
            onChange={(event) => set({ mix: MIXES.find((mix) => String(mix) === event.target.value) ?? 'full' })}
          >
            {MIXES.map((mix) => (
              <option key={mix} value={String(mix)}>
                {mix === 'full' ? 'Every piece anywhere' : `${mix} moves from solved`}
              </option>
            ))}
          </select>
          <button type="button" onClick={() => set({ seed: randomSeed() })}>
            🎲 New scramble
          </button>
          <span className="seed">Seed {design.seed}</span>
        </div>
      </section>

      <section className="panel">
        <h2>Try it</h2>
        <p className="hint">The board as your players will first see it. Turning it here changes nothing in the puzzle.</p>
        {long && <p className="hint">Halves longer than {ROOMY} letters make every half’s letters smaller, to fit.</p>}
        <label className="check">
          <input type="checkbox" checked={showSolved} onChange={(event) => setShowSolved(event.target.checked)} />
          <span>Show it solved</span>
        </label>
        {showSolved ? (
          <Board layout={FLOWER} pieces={pieces} board={solvedOf(design)} motion={null} onMove={() => {}} mark={!design.anyStart} solved />
        ) : (
          <Game key={trial} layout={FLOWER} pieces={pieces} start={start} isSolved={isSolved} mark={!design.anyStart} success={design.words.success} />
        )}
      </section>
    </>
  );
}
