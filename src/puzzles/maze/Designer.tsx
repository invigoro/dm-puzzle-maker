import { useId, useMemo, useState } from 'react';
import { iconWords } from '../../kit/icons';
import { randomSeed } from '../../kit/rng';
import { IconCredit } from '../../ui/IconCredit';
import { iconMask, IconPicker } from '../../ui/IconPicker';
import type { MakerProps } from '../types';
import { LARGEST, mazeOf, MOST_EXITS, resized, SIZES, SMALLEST, waysThrough, type Light, type MazeDesign } from './design';
import type { Loops, Twist } from './engine/generate';
import { xyOf } from './engine/grid';
import { MOST_REACH, wayBetween } from './engine/paths';
import { EXAMPLE } from './example';
import { MazeBoard } from './MazeBoard';
import { MazeGame } from './MazeGame';
import { MOST_PICTURES, VIEWS, type OnHazard, type PictureKind } from './pictures';

/** What clicking the maze does while drawing it. */
type Tool = 'walls' | 'start' | 'exits' | 'pictures';

/** The picture a new landmark starts with, to change. */
const FIRST_PICTURE = 'fountain';

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
  // The picture whose icon is being chosen, by its place in the list.
  const [picking, setPicking] = useState<number | null>(null);
  // A size of the game master's own stays chosen, even while it's one of the named sizes.
  const [ownSize, setOwnSize] = useState(false);
  const set = (change: Partial<MazeDesign>) => onChange({ ...design, ...change });

  const maze = useMemo(() => mazeOf(design), [design]);
  const ways = useMemo(() => waysThrough(design), [design]);
  const way = useMemo(() => (showWay ? wayBetween(maze, design.start, design.exits[0].cell) : null), [showWay, maze, design.start, design.exits]);
  const named = SIZES.find((choice) => choice.size === design.width && choice.size === design.height)?.size ?? 0;
  const size = ownSize ? 0 : named;
  const trial = JSON.stringify([
    maze.walls,
    design.width,
    design.start,
    design.exits.map((exit) => exit.cell),
    design.light,
    design.reach,
    design.view,
    design.onHazard,
    design.pictures.map((picture) => [picture.cell, picture.kind]),
  ]);

  function onWall(wall: number) {
    set({ edits: design.edits.includes(wall) ? design.edits.filter((each) => each !== wall) : [...design.edits, wall] });
  }

  function onCell(cell: number) {
    const exit = design.exits.findIndex((each) => each.cell === cell);
    const picture = design.pictures.findIndex((each) => each.cell === cell);
    if (tool === 'pictures' && exit < 0 && cell !== design.start) {
      setPicking(null);
      if (picture >= 0) set({ pictures: design.pictures.filter((_, i) => i !== picture) });
      else if (design.pictures.length < MOST_PICTURES) set({ pictures: [...design.pictures, { cell, icon: FIRST_PICTURE, kind: 'landmark', line: '' }] });
    }
    // The way in and the ways out keep off pictures.
    if (picture >= 0) return;
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
              ['pictures', 'Adds or takes away a picture'],
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
          pictures={design.pictures}
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
        <h2>Pictures</h2>
        <p className="hint">
          Up to {MOST_PICTURES}: landmarks to steer by, and hazards to run into. Add one by choosing “Adds or takes away a picture” and
          clicking a cell. Each shows when its cell is in sight, but a hidden hazard only once they run into it.
        </p>
        {design.pictures.length > 0 && (
          <ol className="maze-pictures">
            {design.pictures.map((picture, i) => {
              const [x, y] = xyOf(maze, picture.cell);
              const change = (to: Partial<typeof picture>) => set({ pictures: design.pictures.map((each, j) => (j === i ? { ...each, ...to } : each)) });
              return (
                <li key={picture.cell}>
                  <button
                    type="button"
                    className="picture-button chosen"
                    aria-label={`Picture ${i + 1}`}
                    aria-expanded={picking === i}
                    title={iconWords(picture.icon)}
                    onClick={() => setPicking(picking === i ? null : i)}
                  >
                    <span className="icon-thumb" style={iconMask(picture.icon)} />
                  </button>
                  <select aria-label={`What picture ${i + 1} is`} value={picture.kind} onChange={(event) => change({ kind: event.target.value as PictureKind })}>
                    <option value="landmark">A landmark</option>
                    <option value="hazard">A hazard</option>
                    <option value="hidden">A hidden hazard</option>
                  </select>
                  <input
                    aria-label={`What reaching picture ${i + 1} says`}
                    value={picture.line}
                    maxLength={200}
                    placeholder={picture.kind === 'landmark' ? 'What reaching it says' : 'What running into it says'}
                    onChange={(event) => change({ line: event.target.value })}
                  />
                  <span className="hint place">
                    row {y + 1}, column {x + 1}
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      setPicking(null);
                      set({ pictures: design.pictures.filter((_, j) => j !== i) });
                    }}
                  >
                    Take away
                  </button>
                </li>
              );
            })}
          </ol>
        )}
        {picking !== null && design.pictures[picking] && (
          <IconPicker
            label={`Picture ${picking + 1}`}
            value={design.pictures[picking].icon}
            optional={false}
            onPick={(icon) => {
              if (icon) set({ pictures: design.pictures.map((each, j) => (j === picking ? { ...each, icon } : each)) });
              setPicking(null);
            }}
            onClose={() => setPicking(null)}
          />
        )}
        <div role="radiogroup" aria-label="When they run into a hazard">
          <p>When they run into a hazard, its line is said, and</p>
          {(
            [
              ['carry-on', 'they carry on, and you settle it at the table.'],
              ['back', 'they go back to the way in.'],
            ] as const
          ).map(([choice, name]) => (
            <label key={choice} className="check">
              <input type="radio" name={`${id}-hazard`} checked={design.onHazard === choice} onChange={() => set({ onHazard: choice as OnHazard })} />
              <span>{name}</span>
            </label>
          ))}
        </div>
        <p className="hint">The player link holds every picture, so a programmer could find the hidden hazards.</p>
        <IconCredit names={design.pictures.map((picture) => picture.icon)} />
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
        <div className="row">
          <label htmlFor={`${id}-view`}>Their view</label>
          <select id={`${id}-view`} value={design.view} onChange={(event) => set({ view: Number(event.target.value) })}>
            <option value={0}>The whole maze</option>
            {VIEWS.map((size) => (
              <option key={size} value={size}>
                {size} by {size} cells round them
              </option>
            ))}
          </select>
        </div>
        {design.view > 0 && (
          <p className="hint">
            The window slides as they move, and shows nothing past the maze’s edges, so only counting steps, and landmarks, tell them
            where they are.{design.light === 'lit' && ' Lit, though, the edges show where the window runs past them.'}
          </p>
        )}
        <p className="hint">The player link holds the whole maze, whatever the light, so a programmer could draw it.</p>
      </section>

      <section className="panel">
        <h2>Try it</h2>
        <p className="hint">As your players will see it. Walking it here changes nothing in the puzzle.</p>
        {ways[0] >= 0 ? (
          <MazeGame
            key={trial}
            maze={maze}
            start={design.start}
            exits={design.exits.map((exit, i) => (i === 0 ? { ...exit, line: design.words.success } : exit))}
            light={design.light}
            reach={design.reach}
            view={design.view}
            pictures={design.pictures}
            onHazard={design.onHazard}
          />
        ) : (
          <p className="hint">Open a way through to try it.</p>
        )}
      </section>
    </>
  );
}
