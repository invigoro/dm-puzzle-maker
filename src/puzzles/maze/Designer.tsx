import { useId, useMemo, useState } from 'react';
import { randomSeed } from '../../kit/rng';
import type { MakerProps } from '../types';
import { LARGEST, mazeOf, MOST_EXITS, resized, SIZES, SMALLEST, waysThrough, type Light, type MazeDesign } from './design';
import type { Loops, Twist } from './engine/generate';
import { MOST_REACH, wayBetween } from './engine/paths';
import { EXAMPLE } from './example';
import { MazeBoard } from './MazeBoard';
import { MazeGame } from './MazeGame';

/** What clicking the maze does while drawing it. */
type Tool = 'walls' | 'start' | 'exits';

const LIGHTS: readonly { light: Light; name: string; says: string }[] = [
  { light: 'lit', name: 'Lit', says: 'the whole maze shows.' },
  { light: 'lantern', name: 'Lantern', says: 'they see the cells near them, and the passages they’ve walked stay drawn, like a map.' },
  { light: 'dark', name: 'Dark', says: 'they see only the cells near them, and nothing stays drawn.' },
];

/** The game master's part of the maker: the maze, drawn by hand if they like, its ways in and out, its light, and a try of it. */
export function Designer({ design, onChange }: MakerProps<MazeDesign>) {
  const id = useId();
  const [tool, setTool] = useState<Tool>('walls');
  const [showWay, setShowWay] = useState(true);
  // A size of the game master's own stays chosen, even while it's one of the named sizes.
  const [ownSize, setOwnSize] = useState(false);
  const set = (change: Partial<MazeDesign>) => onChange({ ...design, ...change });

  const maze = useMemo(() => mazeOf(design), [design]);
  const ways = useMemo(() => waysThrough(design), [design]);
  const way = useMemo(() => (showWay ? wayBetween(maze, design.start, design.exits[0].cell) : null), [showWay, maze, design.start, design.exits]);
  const named = SIZES.find((choice) => choice.size === design.width && choice.size === design.height)?.size ?? 0;
  const size = ownSize ? 0 : named;
  const trial = JSON.stringify([maze.walls, design.width, design.start, design.exits.map((exit) => exit.cell), design.light, design.reach]);

  function onWall(wall: number) {
    set({ edits: design.edits.includes(wall) ? design.edits.filter((each) => each !== wall) : [...design.edits, wall] });
  }

  function onCell(cell: number) {
    const exit = design.exits.findIndex((each) => each.cell === cell);
    if (tool === 'start' && exit < 0) set({ start: cell });
    if (tool !== 'exits' || cell === design.start) return;
    if (exit >= 0 && design.exits.length > 1) set({ exits: design.exits.filter((_, i) => i !== exit) });
    else if (exit < 0 && design.exits.length < MOST_EXITS) set({ exits: [...design.exits, { cell, line: '' }] });
  }

  // What's typed into a size box, kept while it's on its way to a size that fits ("1" on the way to "12").
  const [drafts, setDrafts] = useState<Partial<Record<'width' | 'height', string>>>({});
  const sizeInput = (dimension: 'width' | 'height') => (
    <input
      type="number"
      min={SMALLEST}
      max={LARGEST}
      aria-label={dimension === 'width' ? 'Width' : 'Height'}
      value={drafts[dimension] ?? design[dimension]}
      onChange={(event) => {
        setDrafts({ ...drafts, [dimension]: event.target.value });
        const value = Number(event.target.value);
        if (Number.isInteger(value) && value >= SMALLEST && value <= LARGEST) {
          onChange(resized(design, dimension === 'width' ? value : design.width, dimension === 'height' ? value : design.height));
        }
      }}
      onBlur={() => setDrafts({})}
    />
  );

  return (
    <>
      <section className="panel">
        <h2>The maze</h2>
        <div className="row">
          <label htmlFor={`${id}-size`}>Size</label>
          <select
            id={`${id}-size`}
            value={size}
            onChange={(event) => {
              const chosen = Number(event.target.value);
              setOwnSize(chosen === 0);
              if (chosen > 0) onChange(resized(design, chosen, chosen));
            }}
          >
            {SIZES.map((choice) => (
              <option key={choice.size} value={choice.size}>
                {choice.name}, {choice.size} by {choice.size}
              </option>
            ))}
            <option value={0}>Your own</option>
          </select>
          {size === 0 && (
            <>
              {sizeInput('width')} by {sizeInput('height')}
            </>
          )}
        </div>
        <div className="row">
          <label htmlFor={`${id}-twist`}>Passages</label>
          <select id={`${id}-twist`} value={design.twist} onChange={(event) => set({ twist: event.target.value as Twist, edits: [] })}>
            <option value="winding">Long and winding</option>
            <option value="branching">Many short dead ends</option>
          </select>
          <label htmlFor={`${id}-loops`}>Loops</label>
          <select id={`${id}-loops`} value={design.loops} onChange={(event) => set({ loops: event.target.value as Loops, edits: [] })}>
            <option value="none">None: one way through</option>
            <option value="few">A few</option>
            <option value="many">Many</option>
          </select>
          <button type="button" onClick={() => set({ seed: randomSeed(), edits: [] })}>
            🎲 New maze
          </button>
        </div>
        {design.words.title.trim() === '' && (
          <p>
            <button type="button" onClick={() => onChange({ ...design, ...EXAMPLE, edits: [] })}>
              Start from the example
            </button>{' '}
            <span className="hint">cellars under an inn, with two ways out</span>
          </p>
        )}
      </section>

      <section className="panel">
        <h2>Draw it</h2>
        <div className="row" role="radiogroup" aria-label="Clicking the maze">
          {(
            [
              ['walls', 'Puts up or takes down walls'],
              ['start', 'Sets the way in'],
              ['exits', 'Adds or takes away a way out'],
            ] as const
          ).map(([choice, name]) => (
            <label key={choice} className="check">
              <input type="radio" name={`${id}-tool`} checked={tool === choice} onChange={() => setTool(choice)} />
              <span>{name}</span>
            </label>
          ))}
        </div>
        <MazeBoard
          maze={maze}
          start={design.start}
          exits={design.exits.map((exit) => exit.cell)}
          shown="all"
          path={way ?? undefined}
          onCell={tool === 'walls' ? undefined : onCell}
          onWall={tool === 'walls' ? onWall : undefined}
          label="The maze, to draw"
        />
        <p className="hint">
          {ways.map((steps, i) => (
            <span key={i}>
              {steps < 0
                ? `Way out ${i + 1} can’t be reached from the way in. `
                : `The way through to ${design.exits.length > 1 ? `way out ${i + 1}` : 'the way out'} is ${steps} steps. `}
            </span>
          ))}
        </p>
        <div className="row">
          <label className="check">
            <input type="checkbox" checked={showWay} onChange={(event) => setShowWay(event.target.checked)} />
            <span>Show the way through</span>
          </label>
          {design.edits.length > 0 && (
            <button type="button" onClick={() => set({ edits: [] })}>
              Undo my walls
            </button>
          )}
        </div>
      </section>

      <section className="panel">
        <h2>Ways out</h2>
        <p className="hint">
          Up to {MOST_EXITS}, each with its own line: one leads on, another to the minotaur. Add one by choosing “Adds or takes away
          a way out” and clicking a cell.
        </p>
        <ol className="exits">
          {design.exits.map((exit, i) => (
            <li key={exit.cell}>
              {i === 0 ? (
                <span className="hint">Says the line for solving it, under What the players read.</span>
              ) : (
                <>
                  <input
                    aria-label={`What way out ${i + 1} says`}
                    value={exit.line}
                    maxLength={200}
                    placeholder="What reaching it says"
                    onChange={(event) => set({ exits: design.exits.map((each, j) => (j === i ? { ...each, line: event.target.value } : each)) })}
                  />
                  <button type="button" onClick={() => set({ exits: design.exits.filter((_, j) => j !== i) })}>
                    Take away
                  </button>
                </>
              )}
            </li>
          ))}
        </ol>
      </section>

      <section className="panel">
        <h2>Light</h2>
        {LIGHTS.map(({ light, name, says }) => (
          <label key={light} className="check">
            <input type="radio" name={`${id}-light`} checked={design.light === light} onChange={() => set({ light })} />
            <span>
              <strong>{name}:</strong> {says}
            </span>
          </label>
        ))}
        {design.light !== 'lit' && (
          <div className="row">
            <label htmlFor={`${id}-reach`}>How far they see</label>
            <select id={`${id}-reach`} value={design.reach} onChange={(event) => set({ reach: Number(event.target.value) })}>
              {Array.from({ length: MOST_REACH + 1 }, (_, steps) => (
                <option key={steps} value={steps}>
                  {steps === 0 ? 'Only the walls beside them' : steps === 1 ? '1 cell' : `${steps} cells`}
                </option>
              ))}
            </select>
            <span className="hint">Counted along the passages, never through a wall: in a straight passage, that many ahead and behind.</span>
          </div>
        )}
        <p className="hint">The player link holds the whole maze, whatever the light, so a programmer could draw it.</p>
      </section>

      <section className="panel">
        <h2>Try it</h2>
        <p className="hint">As your players will see it. Walking it here changes nothing in the puzzle.</p>
        {ways[0] >= 0 ? (
          <MazeGame key={trial} maze={maze} start={design.start} exits={design.exits.map((exit, i) => (i === 0 ? { ...exit, line: design.words.success } : exit))} light={design.light} reach={design.reach} />
        ) : (
          <p className="hint">Open a way through to try it.</p>
        )}
      </section>
    </>
  );
}
