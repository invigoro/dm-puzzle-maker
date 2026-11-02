import { useId, useMemo, useState } from 'react';
import { iconWords } from '../../kit/icons';
import { randomSeed } from '../../kit/rng';
import { IconCredit } from '../../ui/IconCredit';
import { iconMask, IconPicker } from '../../ui/IconPicker';
import type { MakerProps } from '../types';
import { floorOf, LARGEST, MOST_KINDS, problemsOf, roomOf, SMALLEST, type FloorDesign, type Moves, type OnTrap } from './design';
import { SIDES, squaresOf, type Area, type Side } from './engine/floor';
import { keptClear, mostTraps } from './engine/place';
import { EXAMPLE } from './example';
import { FloorGame } from './FloorGame';

/** What clicking the plan does. */
type Tool = 'traps' | 'start' | 'goal';

const SIDE_NAMES: Record<Side, string> = { bottom: 'The bottom side', top: 'The top side', left: 'The left side', right: 'The right side' };
const SIZES = Array.from({ length: LARGEST - SMALLEST + 1 }, (_, i) => SMALLEST + i);

/** The game master's part of the maker: the room, its traps and what they do, and a try of it. */
export function Designer({ design, onChange }: MakerProps<FloorDesign>) {
  const id = useId();
  const [tool, setTool] = useState<Tool>('traps');
  const [showTraps, setShowTraps] = useState(false);
  const [atTable, setAtTable] = useState(false);
  const [picking, setPicking] = useState<number | null>(null);
  const [again, setAgain] = useState(0);
  const set = (change: Partial<FloorDesign>) => onChange({ ...design, ...change });

  const room = useMemo(() => roomOf(design), [design]);
  const floor = useMemo(() => floorOf(design), [design]);
  const problems = problemsOf(design, floor);
  const most = mostTraps(room, design.start, design.goal);
  const clear = keptClear(room, design.start, design.goal);
  const starts = new Set(squaresOf(room, design.start));
  const goals = new Set(squaresOf(room, design.goal));
  const count = floor.traps.filter(Boolean).length;
  const trial = JSON.stringify([floor.values, design.start, design.goal, design.moves, design.onTrap, design.failAfter, again]);

  /** A new room keeps its sides, but squares chosen for the start or goal, and traps placed by hand, start again. */
  function resize(width: number, height: number) {
    const fit = (area: Area): Area => ('cell' in area ? { cell: 0 } : area);
    onChange({ ...design, width, height, start: fit(design.start), goal: 'cell' in design.goal ? { cell: width * height - 1 } : design.goal, placed: null });
  }

  function areaChoice(which: 'start' | 'goal') {
    const area = design[which];
    return (
      <select
        id={`${id}-${which}`}
        value={'side' in area ? area.side : 'square'}
        onChange={(event) => {
          const value = event.target.value;
          if (value === 'square') {
            set({ [which]: { cell: which === 'start' ? (room.height - 1) * room.width : 0 } });
            setTool(which);
          } else set({ [which]: { side: value as Side } });
        }}
      >
        {SIDES.map((side) => (
          <option key={side} value={side}>
            {SIDE_NAMES[side]}
          </option>
        ))}
        <option value="square">A square</option>
      </select>
    );
  }

  function onSquare(cell: number) {
    if (tool === 'start' && 'cell' in design.start && !goals.has(cell)) return set({ start: { cell }, placed: design.placed?.filter((trap) => trap !== cell) ?? null });
    if (tool === 'goal' && 'cell' in design.goal && !starts.has(cell)) return set({ goal: { cell } });
    if (tool !== 'traps' || clear.has(cell)) return;
    // Placing by hand starts from the traps as they are.
    const traps = design.placed ?? floor.traps.flatMap((trap, square) => (trap ? [square] : []));
    set({ placed: traps.includes(cell) ? traps.filter((trap) => trap !== cell) : [...traps, cell] });
  }

  const play = (
    <FloorGame
      key={trial}
      room={room}
      start={design.start}
      goal={design.goal}
      values={floor.values}
      kinds={design.kinds}
      onTrap={design.onTrap}
      failAfter={design.failAfter}
      failLine={design.failLine}
      moves={design.moves}
      success={design.words.success}
      showTraps={showTraps && !atTable}
    />
  );

  return (
    <>
      <section className="panel">
        <h2>The room</h2>
        <div className="row">
          <label htmlFor={`${id}-width`}>Squares across</label>
          <select id={`${id}-width`} value={design.width} onChange={(event) => resize(Number(event.target.value), design.height)}>
            {SIZES.map((size) => (
              <option key={size} value={size}>
                {size}
              </option>
            ))}
          </select>
          <label htmlFor={`${id}-height`}>down</label>
          <select id={`${id}-height`} value={design.height} onChange={(event) => resize(design.width, Number(event.target.value))}>
            {SIZES.map((size) => (
              <option key={size} value={size}>
                {size}
              </option>
            ))}
          </select>
          <span className="hint">
            {design.width * 5} by {design.height * 5} feet, in 5-foot squares
          </span>
        </div>
        <div className="row">
          <label htmlFor={`${id}-start`}>They start on</label>
          {areaChoice('start')}
          <label htmlFor={`${id}-goal`}>and are going to</label>
          {areaChoice('goal')}
        </div>
        {design.words.title.trim() === '' && (
          <p>
            <button
              type="button"
              onClick={() =>
                onChange({ ...design, words: EXAMPLE.words, width: EXAMPLE.width, height: EXAMPLE.height, traps: EXAMPLE.traps, start: { side: 'bottom' }, goal: { cell: 3 }, placed: null })
              }
            >
              Start from the example
            </button>{' '}
            <span className="hint">a vault door across a trapped floor</span>
          </p>
        )}
      </section>

      <section className="panel">
        <h2>The traps</h2>
        <div className="row">
          <label htmlFor={`${id}-traps`}>How many</label>
          <input
            id={`${id}-traps`}
            type="number"
            min={0}
            max={most}
            value={design.placed ? count : Math.min(design.traps, most)}
            disabled={design.placed !== null}
            onChange={(event) => set({ traps: Math.max(0, Math.min(most, Math.round(Number(event.target.value)) || 0)) })}
          />
          <button type="button" onClick={() => set({ seed: randomSeed(), placed: null })}>
            🎲 Place them again
          </button>
          {design.placed && (
            <button type="button" onClick={() => set({ placed: null })}>
              Back to placing at random
            </button>
          )}
        </div>
        <label className="check">
          <input type="checkbox" checked={design.fair} onChange={(event) => set({ fair: event.target.checked })} />
          <span>
            <strong>Fair:</strong> the floor can always be crossed by reasoning from the counts, never by luck.
          </span>
        </label>
        <p className={problems.length > 0 ? 'warning' : 'hint'}>
          {problems[0] ??
            (floor.fair ? 'This floor can be crossed by reasoning alone.' : 'Somewhere on this floor, the party will have to guess.')}
        </p>
        <div className="row" role="radiogroup" aria-label="Clicking the plan">
          <label className="check">
            <input type="radio" name={`${id}-tool`} checked={tool === 'traps'} onChange={() => setTool('traps')} />
            <span>Places or takes away a trap</span>
          </label>
          {'cell' in design.start && (
            <label className="check">
              <input type="radio" name={`${id}-tool`} checked={tool === 'start'} onChange={() => setTool('start')} />
              <span>Sets the start</span>
            </label>
          )}
          {'cell' in design.goal && (
            <label className="check">
              <input type="radio" name={`${id}-tool`} checked={tool === 'goal'} onChange={() => setTool('goal')} />
              <span>Sets the goal</span>
            </label>
          )}
        </div>
        <div className="floor plan" style={{ gridTemplateColumns: `repeat(${room.width}, minmax(0, 1fr))` }} role="group" aria-label="The plan">
          {floor.values.map((value, cell) => {
            const kind = value >= 9 ? design.kinds[value - 9] : undefined;
            const classes = ['square', 'open', value >= 9 && 'sprung', value > 0 && value < 9 && `n${value}`, starts.has(cell) && 'start', goals.has(cell) && 'goal', clear.has(cell) && 'clear'];
            const [x, y] = [cell % room.width, Math.floor(cell / room.width)];
            return (
              <button
                key={cell}
                type="button"
                className={classes.filter(Boolean).join(' ')}
                aria-label={`Row ${y + 1}, column ${x + 1}: ${value >= 9 ? `a ${kind?.icon ? iconWords(kind.icon) : 'hidden'} trap` : `${value} round it`}`}
                onClick={() => onSquare(cell)}
              >
                {value >= 9 ? kind?.icon ? <span className="icon-thumb" style={iconMask(kind.icon)} /> : '✸' : value > 0 ? value : ''}
              </button>
            );
          })}
        </div>
        <p className="hint">
          {count} traps. The start and the squares beside it are kept clear, so the first step tells the party something.
        </p>
      </section>

      <section className="panel">
        <h2>Kinds of trap</h2>
        <p className="hint">Each trap is one of these, at random, with its picture and what it does.</p>
        <ol className="kinds-of-trap">
          {design.kinds.map((kind, i) => (
            <li key={i}>
              <button
                type="button"
                className={kind.icon ? 'picture-button chosen' : 'picture-button'}
                aria-label={`Picture for trap ${i + 1}`}
                aria-expanded={picking === i}
                title={kind.icon ? iconWords(kind.icon) : 'Add a picture'}
                onClick={() => setPicking(picking === i ? null : i)}
              >
                {kind.icon ? <span className="icon-thumb" style={iconMask(kind.icon)} /> : <span aria-hidden="true">🖼</span>}
              </button>
              <input
                aria-label={`What trap ${i + 1} does`}
                value={kind.line}
                maxLength={200}
                onChange={(event) => set({ kinds: design.kinds.map((each, j) => (j === i ? { ...each, line: event.target.value } : each)) })}
              />
              {design.kinds.length > 1 && (
                <button type="button" onClick={() => set({ kinds: design.kinds.filter((_, j) => j !== i) })}>
                  Take away
                </button>
              )}
            </li>
          ))}
        </ol>
        {picking !== null && design.kinds[picking] && (
          <IconPicker
            label={`Picture for trap ${picking + 1}`}
            value={design.kinds[picking].icon || undefined}
            onPick={(icon) => {
              set({ kinds: design.kinds.map((each, j) => (j === picking ? { ...each, icon: icon ?? '' } : each)) });
              setPicking(null);
            }}
            onClose={() => setPicking(null)}
          />
        )}
        {design.kinds.length < MOST_KINDS && (
          <p>
            <button type="button" onClick={() => set({ kinds: [...design.kinds, { icon: '', line: '' }] })}>
              Add a kind of trap
            </button>
          </p>
        )}
      </section>

      <section className="panel">
        <h2>When a trap springs</h2>
        {(
          [
            ['carry-on', 'They carry on', 'its line is said, and you settle the damage at the table.'],
            ['restart', 'Back to the start', 'the floor resets, and they set off again, knowing where that trap was.'],
            ['fail', 'They fail', `after so many traps, with a line for it.`],
          ] as [OnTrap, string, string][]
        ).map(([choice, name, says]) => (
          <label key={choice} className="check">
            <input type="radio" name={`${id}-on-trap`} checked={design.onTrap === choice} onChange={() => set({ onTrap: choice })} />
            <span>
              <strong>{name}:</strong> {says}
            </span>
          </label>
        ))}
        {design.onTrap === 'fail' && (
          <div className="row">
            <label htmlFor={`${id}-fail-after`}>After</label>
            <input
              id={`${id}-fail-after`}
              type="number"
              min={1}
              max={20}
              value={design.failAfter}
              onChange={(event) => set({ failAfter: Math.max(1, Math.min(20, Math.round(Number(event.target.value)) || 1)) })}
            />
            <label htmlFor={`${id}-fail-line`}>traps, say</label>
            <input id={`${id}-fail-line`} value={design.failLine} maxLength={200} onChange={(event) => set({ failLine: event.target.value })} />
          </div>
        )}
        <h2>How they move</h2>
        {(
          [
            ['spread', 'Spreading out', 'onto any square beside one they’ve stood on, as a party fans out.'],
            ['single', 'One at a time', 'only beside where they stand, as a token.'],
          ] as [Moves, string, string][]
        ).map(([choice, name, says]) => (
          <label key={choice} className="check">
            <input type="radio" name={`${id}-moves`} checked={design.moves === choice} onChange={() => set({ moves: choice })} />
            <span>
              <strong>{name}:</strong> {says}
            </span>
          </label>
        ))}
      </section>

      <section className="panel">
        <h2>Try it</h2>
        <p className="hint">
          As your players will see it. For a table that’s all in one room, play it here on your own screen, full size, and no link
          holds the floor at all.
        </p>
        <div className="row">
          <label className="check">
            <input type="checkbox" checked={showTraps} onChange={(event) => setShowTraps(event.target.checked)} />
            <span>Show the traps</span>
          </label>
          <button type="button" onClick={() => setAgain(again + 1)}>
            Start again
          </button>
          <button type="button" onClick={() => setAtTable(true)}>
            Play it full size
          </button>
        </div>
        {!atTable && play}
        <IconCredit names={design.kinds.map((kind) => kind.icon).filter(Boolean)} />
      </section>

      {atTable && (
        <div className="table-view" role="dialog" aria-modal="true" aria-label="The floor, for the table">
          <div className="table-inner">
            <header className="puzzle">
              <h2 className="puzzle-title">{design.words.title || 'The floor'}</h2>
              {design.words.intro && <p className="intro">{design.words.intro}</p>}
            </header>
            {play}
            <p>
              <button type="button" onClick={() => setAtTable(false)}>
                Close
              </button>
            </p>
          </div>
        </div>
      )}
    </>
  );
}
