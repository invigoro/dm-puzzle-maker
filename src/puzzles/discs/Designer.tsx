import { useCallback, useId, useMemo, useRef, useState } from 'react';
import { iconWords } from '../../kit/icons';
import { randomSeed } from '../../kit/rng';
import { IconCredit } from '../../ui/IconCredit';
import { iconMask, IconPicker } from '../../ui/IconPicker';
import type { MakerProps } from '../types';
import { Board, type Motion } from './Board';
import {
  contentOf,
  fillerCount,
  fillerOf,
  inWords,
  layoutOfDesign,
  MOST_FILLER,
  MOST_PAIRS,
  pairCount,
  pairsOf,
  scrambleOf,
  solvedOf,
  startOf,
  STARTS,
  type DiscsDesign,
} from './design';
import { answerKey, answerKeys, isBlank, keyOf, lit, LONGEST_HALF, pairsInPlace, piecesOf, wordsOf, type Piece } from './engine/answer';
import { play, type Board as Pieces, type Move } from './engine/board';
import { LAYOUTS, type Layout, type LayoutId } from './engine/layout';
import { EXAMPLES } from './example';
import { Game } from './Game';

/** Past this many letters, a half's letters are set smaller to fit its spoke. */
const ROOMY = 7;

/** Where each layout's names are read, and what it suits. */
const ABOUT: Readonly<Record<LayoutId, string>> = {
  trefoil: 'where the three discs meet: a quick puzzle',
  flower: 'round the centre disc',
};

/** A half the game master is choosing a picture for. */
type Spot = { list: 'pairs'; pair: number; side: 0 | 1 } | { list: 'filler'; index: number };

const nameOf = (spot: Spot) => (spot.list === 'pairs' ? `name ${spot.pair + 1}, ${spot.side === 0 ? 'first' : 'second'} half` : `filler ${spot.index + 1}`);
const withIcon = (piece: Piece, icon: string | undefined): Piece => (icon ? { text: piece.text, icon } : { text: piece.text });
const sameSpot = (one: Spot | null, other: Spot) => JSON.stringify(one) === JSON.stringify(other);
const capital = (text: string) => text.charAt(0).toUpperCase() + text.slice(1);
/** "Names 4 to 6", or "Name 6": those a smaller layout keeps aside. */
const range = ([one, many]: [string, string], from: number, to: number) => (from === to ? `${one} ${from}` : `${many} ${from} to ${to}`);

/** The game master's part of the maker: the discs, the names, the filler and the start, and the board to try. */
export function Designer({ design, onChange }: MakerProps<DiscsDesign>) {
  const id = useId();
  const [showSolved, setShowSolved] = useState(false);
  const [picking, setPicking] = useState<Spot | null>(null);
  const set = (change: Partial<DiscsDesign>) => onChange({ ...design, ...change });

  const layout = layoutOfDesign(design);
  const pairs = pairsOf(design);
  const fillers = fillerCount(layout);

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
  const isSolved = useCallback(async (board: Pieces) => keys.includes(answerKey(layout, pieces, board)), [keys, layout, pieces]);
  const glowing = useMemo(
    () => (design.glow ? async (board: Pieces) => lit(layout, content, board, design.anyStart) : undefined),
    [design.glow, design.anyStart, layout, content],
  );
  // The board to try starts again whenever what's on it changes.
  const trial = JSON.stringify([layout.id, start, pieces.map(keyOf), design.anyStart]);

  const blank = pairs.every((pair) => pair.every(isBlank));
  const long = pieces.some((piece) => [...wordsOf(piece)].length > ROOMY);
  const example = EXAMPLES[layout.id];
  // What a smaller layout keeps aside, so the game master knows it's not lost.
  const namesAside = design.pairs.slice(pairs.length).some((pair) => !pair.every(isBlank));
  const fillerAside = design.filler.slice(fillers).some((piece) => !isBlank(piece));

  // Setting the start by hand begins from the board as it was, and each move on it moves the start.
  const [arranging, setArranging] = useState<Motion | null>(null);
  const inPlace = useMemo(() => (design.mix === 'hand' ? pairsInPlace(layout, content, start) : []), [design.mix, layout, content, start]);
  // A quick drag can turn a disc twice before the page draws again, so each move starts from the last.
  const latest = useRef(start);
  latest.current = start;
  const setStart = (board: Pieces) => {
    setArranging(null);
    set({ start: [...board] });
  };
  function arrange(move: Move) {
    latest.current = play(layout, latest.current, move);
    setArranging({ move });
    set({ start: [...latest.current] });
  }
  function chooseStart(value: string) {
    const mix = STARTS.find((start) => String(start) === value) ?? 'full';
    set(mix === 'hand' ? { mix, start: [...start] } : { mix, start: undefined });
  }
  /** A new layout keeps its scramble. A start set by hand was for the old board, so begins again from a scramble. */
  function chooseLayout(choice: Layout) {
    setPicking(null);
    setArranging(null);
    const next = { ...design, layout: choice.id };
    onChange(design.mix === 'hand' ? { ...next, start: [...scrambleOf(next)] } : next);
  }
  function startFromExample() {
    const named = example.pairs.map(([first, second]): [Piece, Piece] => [{ text: first }, { text: second }]);
    onChange({ ...design, words: example.words, pairs: [...named, ...design.pairs.slice(named.length)] });
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
        <h2>The discs</h2>
        <div className="layouts" role="radiogroup" aria-label="How many discs">
          {LAYOUTS.map((choice) => (
            <label key={choice.id} className={choice.id === layout.id ? 'layout-choice chosen' : 'layout-choice'}>
              <input type="radio" name={`${id}-layout`} checked={choice.id === layout.id} onChange={() => chooseLayout(choice)} />
              <LayoutDrawing layout={choice} />
              <span className="layout-words">
                <strong>{choice.name}</strong>
                <span className="hint">
                  {capital(inWords(pairCount(choice)))} names, read {ABOUT[choice.id]}, and {fillerCount(choice)} filler.
                </span>
              </span>
            </label>
          ))}
        </div>
      </section>

      <section className="panel">
        <h2>The names</h2>
        <p className="hint">
          {capital(inWords(pairs.length))} names, each in two halves, in order clockwise from where the arrow points. Each
          half reads down from its own disc’s hub, so a name counts with its halves either way round. A half can be words,
          a picture (🖼), or both.
        </p>
        <ol className="pairs">
          {pairs.map((_, i) => (
            <li key={i}>
              <span className="number">{i + 1}</span>
              {half({ list: 'pairs', pair: i, side: 0 }, `Name ${i + 1}, first half`)}
              <span aria-hidden="true">+</span>
              {half({ list: 'pairs', pair: i, side: 1 }, `Name ${i + 1}, second half`)}
            </li>
          ))}
        </ol>
        {picker('pairs')}
        {namesAside && (
          <p className="hint">
            {range(['Name', 'Names'], pairs.length + 1, MOST_PAIRS)} are kept aside, and come back with more discs.
          </p>
        )}
        <label className="check">
          <input type="checkbox" checked={design.anyStart} onChange={(event) => set({ anyStart: event.target.checked })} />
          <span>
            <strong>Any start:</strong> count the names in order from any of their contacts, not only from the arrow’s. The
            board then has no arrow.
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
            <button type="button" onClick={startFromExample}>
              Start from the example
            </button>{' '}
            <span className="hint">{inWords(example.pairs.length)} made-up towns, to see how it works</span>
          </p>
        )}
      </section>

      <section className="panel">
        <h2>Filler</h2>
        <p className="hint">
          The other {fillers} spokes. Blank boxes fill themselves with halves of place names, shown faintly. Write over any
          you’d rather choose: names that look right but aren’t make the best filler, and if some names have pictures,
          give some filler pictures too.
        </p>
        <div className="filler">
          {filled.map((piece, i) => (
            <span key={i}>{half({ list: 'filler', index: i }, `Filler ${i + 1}`, piece.text)}</span>
          ))}
        </div>
        {picker('filler')}
        {fillerAside && (
          <p className="hint">
            {range(['Filler', 'Filler'], fillers + 1, MOST_FILLER)} are kept aside, and come back with more discs.
          </p>
        )}
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
                (inPlace.length === 1 ? 'One name starts in its place.' : `${capital(inWords(inPlace.length))} names start in their places.`)}
            </p>
            <Board layout={layout} pieces={pieces} board={start} motion={arranging} onMove={arrange} mark={!design.anyStart} solved={false} />
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
            <Board layout={layout} pieces={pieces} board={solvedOf(design)} motion={null} onMove={() => {}} mark={!design.anyStart} solved />
          ) : (
            <Game
              key={trial}
              layout={layout}
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

/** A layout drawn small, for choosing it: its discs, and the contacts its names are read at. */
function LayoutDrawing({ layout }: { layout: Layout }) {
  const xs = layout.discs.flatMap((disc) => [disc.x - disc.r, disc.x + disc.r]);
  const ys = layout.discs.flatMap((disc) => [disc.y - disc.r, disc.y + disc.r]);
  const [left, top] = [Math.min(...xs) - 8, Math.min(...ys) - 8];
  return (
    <svg className="layout-drawing" viewBox={`${left} ${top} ${Math.max(...xs) + 8 - left} ${Math.max(...ys) + 8 - top}`} aria-hidden="true">
      {layout.discs.map((disc, d) => (
        <circle key={d} className={d === layout.hub ? 'disc hub' : 'disc'} cx={disc.x} cy={disc.y} r={disc.r - 5} />
      ))}
      {layout.goals.map((goal) => (
        <circle key={goal} className="goal" cx={layout.contacts[goal].x} cy={layout.contacts[goal].y} r={16} />
      ))}
    </svg>
  );
}
