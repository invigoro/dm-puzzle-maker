import { useCallback, useId, useMemo, useRef, useState } from 'react';
import { iconWords } from '../../kit/icons';
import { randomSeed } from '../../kit/rng';
import { IconCredit } from '../../ui/IconCredit';
import { iconMask, IconPicker } from '../../ui/IconPicker';
import type { MakerProps } from '../types';
import { Board, type Motion } from './Board';
import { contentOf, fillerOf, scrambleOf, solvedOf, startOf, STARTS, type DiscsDesign } from './design';
import { answerKey, answerKeys, keyOf, lit, LONGEST_HALF, pairsInPlace, piecesOf, wordsOf, type Piece } from './engine/answer';
import { play, type Board as Pieces, type Move } from './engine/board';
import { FLOWER } from './engine/layout';
import { EXAMPLE } from './example';
import { Game } from './Game';

/** Past this many letters, a half's letters are set smaller to fit its spoke. */
const ROOMY = 7;

/** A half the game master is choosing a picture for. */
type Spot = { list: 'pairs'; pair: number; side: 0 | 1 } | { list: 'filler'; index: number };

const nameOf = (spot: Spot) => (spot.list === 'pairs' ? `name ${spot.pair + 1}, ${spot.side === 0 ? 'first' : 'second'} half` : `filler ${spot.index + 1}`);
const withIcon = (piece: Piece, icon: string | undefined): Piece => (icon ? { text: piece.text, icon } : { text: piece.text });
const sameSpot = (one: Spot | null, other: Spot) => JSON.stringify(one) === JSON.stringify(other);

/** The game master's part of the maker: the names, the filler and the start, and the board to try. */
export function Designer({ design, onChange }: MakerProps<DiscsDesign>) {
  const id = useId();
  const [showSolved, setShowSolved] = useState(false);
  const [picking, setPicking] = useState<Spot | null>(null);
  const set = (change: Partial<DiscsDesign>) => onChange({ ...design, ...change });

  const pieceAt = (spot: Spot) => (spot.list === 'pairs' ? design.pairs[spot.pair][spot.side] : design.filler[spot.index]);
  function setPiece(spot: Spot, piece: Piece) {
    if (spot.list === 'filler') return set({ filler: design.filler.map((old, i) => (i === spot.index ? piece : old)) });
    set({
      pairs: design.pairs.map((halves, i): [Piece, Piece] => (i !== spot.pair ? halves : spot.side === 0 ? [piece, halves[1]] : [halves[0], piece])),
    });
  }

  const filled = useMemo(() => fillerOf(design), [design]);
  const content = useMemo(() => contentOf(design), [design]);
  const pieces = useMemo(() => piecesOf(content), [content]);
  const start = useMemo(() => startOf(design), [design]);
  const keys = useMemo(() => answerKeys(content, design.anyStart), [content, design.anyStart]);
  const isSolved = useCallback(async (board: Pieces) => keys.includes(answerKey(FLOWER, pieces, board)), [keys, pieces]);
  const glowing = useMemo(
    () => (design.glow ? async (board: Pieces) => lit(FLOWER, content, board, design.anyStart) : undefined),
    [design.glow, design.anyStart, content],
  );
  // The board to try starts again whenever what's on it changes.
  const trial = JSON.stringify([start, pieces.map(keyOf), design.anyStart]);

  const blank = design.pairs.every((pair) => pair.every((piece) => keyOf(piece) === ''));
  const long = pieces.some((piece) => [...wordsOf(piece)].length > ROOMY);

  // Setting the start by hand begins from the board as it was, and each move on it moves the start.
  const [arranging, setArranging] = useState<Motion | null>(null);
  const inPlace = useMemo(() => (design.mix === 'hand' ? pairsInPlace(FLOWER, content, start) : []), [design.mix, content, start]);
  // A quick drag can turn a disc twice before the page draws again, so each move starts from the last.
  const latest = useRef(start);
  latest.current = start;
  const setStart = (board: Pieces) => {
    setArranging(null);
    set({ start: [...board] });
  };
  function arrange(move: Move) {
    latest.current = play(FLOWER, latest.current, move);
    setArranging({ move });
    set({ start: [...latest.current] });
  }
  function chooseStart(value: string) {
    const mix = STARTS.find((start) => String(start) === value) ?? 'full';
    set(mix === 'hand' ? { mix, start: [...start] } : { mix, start: undefined });
  }

  /** A half's box, with the button for its picture. */
  function half(spot: Spot, label: string, placeholder?: string) {
    const piece = pieceAt(spot);
    return (
      <span className="half-field">
        <input
          className="half"
          aria-label={label}
          value={piece.text}
          placeholder={placeholder}
          maxLength={LONGEST_HALF}
          onChange={(event) => setPiece(spot, { ...piece, text: event.target.value })}
        />
        <button
          type="button"
          className={piece.icon ? 'picture-button chosen' : 'picture-button'}
          aria-label={`Picture for ${nameOf(spot)}`}
          aria-expanded={sameSpot(picking, spot)}
          title={piece.icon ? iconWords(piece.icon) : 'Add a picture'}
          onClick={() => setPicking(sameSpot(picking, spot) ? null : spot)}
        >
          {piece.icon ? <span className="icon-thumb" style={iconMask(piece.icon)} /> : <span aria-hidden="true">🖼</span>}
        </button>
      </span>
    );
  }

  function picker(list: Spot['list']) {
    if (picking?.list !== list) return null;
    const spot = picking;
    return (
      <IconPicker
        key={JSON.stringify(spot)}
        label={`Picture for ${nameOf(spot)}`}
        value={pieceAt(spot).icon}
        onPick={(icon) => {
          setPiece(spot, withIcon(pieceAt(spot), icon));
          setPicking(null);
        }}
        onClose={() => setPicking(null)}
      />
    );
  }

  return (
    <>
      <section className="panel">
        <h2>The names</h2>
        <p className="hint">
          Six names, each in two halves, in order clockwise from where the centre’s arrow points. Each half reads down from
          its own disc’s hub, so a name counts with its halves either way round. A half can be words, a picture (🖼), or
          both.
        </p>
        <ol className="pairs">
          {design.pairs.map((_, i) => (
            <li key={i}>
              <span className="number">{i + 1}</span>
              {half({ list: 'pairs', pair: i, side: 0 }, `Name ${i + 1}, first half`)}
              <span aria-hidden="true">+</span>
              {half({ list: 'pairs', pair: i, side: 1 }, `Name ${i + 1}, second half`)}
            </li>
          ))}
        </ol>
        {picker('pairs')}
        <label className="check">
          <input type="checkbox" checked={design.anyStart} onChange={(event) => set({ anyStart: event.target.checked })} />
          <span>
            <strong>Any start:</strong> count the six in order from any contact round the centre, not only from the
            arrow’s. The board then has no arrow.
          </span>
        </label>
        <label className="check">
          <input type="checkbox" checked={design.glow} onChange={(event) => set({ glow: event.target.checked })} />
          <span>
            <strong>Glow:</strong> light each name as it comes right. It makes the puzzle easier, and a determined player
            could test names one contact at a time.
          </span>
        </label>
        {blank && (
          <p>
            <button type="button" onClick={() => onChange({ ...design, words: EXAMPLE.words, pairs: EXAMPLE.pairs.map(([first, second]) => [{ text: first }, { text: second }]) })}>
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
          Write over any you’d rather choose: names that look right but aren’t make the best filler, and if some names
          have pictures, give some filler pictures too.
        </p>
        <div className="filler">{design.filler.map((_, i) => <span key={i}>{half({ list: 'filler', index: i }, `Filler ${i + 1}`, filled[i].text)}</span>)}</div>
        {picker('filler')}
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
          <select id={`${id}-mix`} value={String(design.mix)} onChange={(event) => chooseStart(event.target.value)}>
            {STARTS.map((mix) => (
              <option key={mix} value={String(mix)}>
                {mix === 'full' ? 'Every piece anywhere' : mix === 'hand' ? 'Set by hand' : `${mix} moves from solved`}
              </option>
            ))}
          </select>
          {design.mix !== 'hand' && (
            <>
              <button type="button" onClick={() => set({ seed: randomSeed() })}>
                🎲 New scramble
              </button>
              <span className="seed">Seed {design.seed}</span>
            </>
          )}
        </div>
        {design.mix === 'hand' && (
          <div className="arrange" role="group" aria-label="Set the start">
            <p className="hint">
              Turn and swap this board until it’s as your players should find it.{' '}
              {inPlace.length > 0 &&
                (inPlace.length === 1 ? 'One name starts in its place.' : `${inPlace.length} names start in their places.`)}
            </p>
            <Board layout={FLOWER} pieces={pieces} board={start} motion={arranging} onMove={arrange} mark={!design.anyStart} solved={false} />
            <div className="row">
              <button type="button" onClick={() => setStart(solvedOf(design))}>
                Start from solved
              </button>
              <button type="button" onClick={() => setStart(scrambleOf({ ...design, seed: randomSeed() }))}>
                🎲 Start from a scramble
              </button>
            </div>
          </div>
        )}
      </section>

      <section className="panel">
        <h2>Try it</h2>
        <p className="hint">The board as your players will first see it. Turning it here changes nothing in the puzzle.</p>
        {long && <p className="hint">Halves longer than {ROOMY} letters make every half’s letters smaller, to fit.</p>}
        <label className="check">
          <input type="checkbox" checked={showSolved} onChange={(event) => setShowSolved(event.target.checked)} />
          <span>Show it solved</span>
        </label>
        <div role="group" aria-label="Try it">
          {showSolved ? (
            <Board layout={FLOWER} pieces={pieces} board={solvedOf(design)} motion={null} onMove={() => {}} mark={!design.anyStart} solved />
          ) : (
            <Game
              key={trial}
              layout={FLOWER}
              pieces={pieces}
              start={start}
              isSolved={isSolved}
              glowing={glowing}
              mark={!design.anyStart}
              success={design.words.success}
            />
          )}
        </div>
        <IconCredit names={pieces.flatMap((piece) => (piece.icon ? [piece.icon] : []))} />
      </section>
    </>
  );
}
