import { useId, useMemo, useState } from 'react';
import { iconWords } from '../../kit/icons';
import { randomSeed } from '../../kit/rng';
import { IconCredit } from '../../ui/IconCredit';
import { iconMask, IconPicker } from '../../ui/IconPicker';
import type { MakerProps } from '../types';
import { BrazierFloor } from './BrazierFloor';
import { aimOf, brazierCount, floorOf, goalOf, problemsOf, solutionOf, startOf, TOUCHES, type BraziersDesign, type Goal } from './design';
import { braziersOf, cellsOf, FEWEST_ROUND, LARGEST_SIDE, MOST_ROUND, SMALLEST_SIDE, type Reach, type Shape } from './engine/floor';
import { EXAMPLE } from './example';
import { BrazierGame, type Judge } from './Game';
import { LONGEST_LINE } from './puzzle';

const REACH_CHOICES: readonly { reach: Reach; says: string }[] = [
  { reach: 'beside', says: 'it and the four beside it' },
  { reach: 'corners', says: 'it and the four on its corners' },
  { reach: 'round', says: 'it and all eight round it' },
  { reach: 'lines', says: 'it and every one in its row and column' },
];

const GOAL_CHOICES: readonly { goal: Goal; says: string }[] = [
  { goal: 'out', says: 'Every brazier out' },
  { goal: 'lit', says: 'Every brazier burning' },
  { goal: 'pattern', says: 'A pattern you draw' },
];

const SIDES = Array.from({ length: LARGEST_SIDE - SMALLEST_SIDE + 1 }, (_, i) => SMALLEST_SIDE + i);
const ROUNDS = Array.from({ length: MOST_ROUND - FEWEST_ROUND + 1 }, (_, i) => FEWEST_ROUND + i);

/** A list of cells with one toggled. */
const toggled = (cells: readonly number[], cell: number) => (cells.includes(cell) ? cells.filter((each) => each !== cell) : [...cells, cell].sort((one, other) => one - other));

/** The game master's part of the maker: the floor, the goal, the start, touches and their limit, and a try of it. */
export function Designer({ design, onChange }: MakerProps<BraziersDesign>) {
  const id = useId();
  const [picking, setPicking] = useState(false);
  const set = (change: Partial<BraziersDesign>) => onChange({ ...design, ...change });
  /** A new shape or size: which cells are bare, burn in the goal, or burn at the start all start again, as cells are numbered by size. */
  const reshape = (change: Partial<BraziersDesign>) => set({ ...change, bare: [], pattern: [], drawn: [] });

  const floor = useMemo(() => floorOf(design), [design]);
  const braziers = useMemo(() => braziersOf(floor), [floor]);
  const goal = useMemo(() => goalOf(design), [design]);
  const start = useMemo(() => startOf(design), [design]);
  const problems = problemsOf(design);
  const solution = useMemo(() => (brazierCount(design) >= 2 ? solutionOf(design) : null), [design]);
  const fewest = solution?.fewest ?? 0;
  const limits = [...new Set([fewest, fewest + 2, fewest + 5, fewest + 10, fewest * 2, design.limit].filter((count) => count > 0))].sort((one, other) => one - other);
  const success = design.words.success.trim() || 'Solved.';
  // The goal's known here, so the try is judged against it, as a link would judge it.
  const judge = useMemo<Judge>(() => ({ isGoal: async (lit) => lit === goal, lineFor: async () => success }), [goal, success]);
  const startCells = cellsOf(start, braziers);
  const goalCells = cellsOf(goal, braziers);
  // The try starts again whenever the floor, the start or the goal changes, or the limit.
  const trial = JSON.stringify([floor, startCells, goalCells, design.goal, design.shown, design.icon, design.limit]);
  const empty = design.words.title.trim() === '' && design.bare.length === 0 && design.pattern.length === 0;

  return (
    <>
      <section className="panel">
        <h2>The floor</h2>
        <div role="radiogroup" aria-label="The floor’s shape" className="row">
          {(['grid', 'ring'] as const satisfies readonly Shape[]).map((shape) => (
            <label key={shape} className="check">
              <input type="radio" name={`${id}-shape`} checked={design.shape === shape} onChange={() => reshape({ shape })} />
              <span>{shape === 'grid' ? 'A grid of squares' : 'A ring round the room'}</span>
            </label>
          ))}
        </div>
        {design.shape === 'grid' ? (
          <>
            <div className="row">
              <label htmlFor={`${id}-width`}>Across</label>
              <select id={`${id}-width`} value={design.width} onChange={(event) => reshape({ width: Number(event.target.value) })}>
                {SIDES.map((side) => (
                  <option key={side}>{side}</option>
                ))}
              </select>
              <label htmlFor={`${id}-height`}>Down</label>
              <select id={`${id}-height`} value={design.height} onChange={(event) => reshape({ height: Number(event.target.value) })}>
                {SIDES.map((side) => (
                  <option key={side}>{side}</option>
                ))}
              </select>
            </div>
            <div role="radiogroup" aria-label="What a touch flips">
              <p>A touch flips</p>
              {REACH_CHOICES.map(({ reach, says }) => (
                <label key={reach} className="check">
                  <input type="radio" name={`${id}-reach`} checked={design.reach === reach} onChange={() => set({ reach })} />
                  <span>{says}</span>
                </label>
              ))}
            </div>
            <BrazierFloor floor={floor} burning={new Set()} icon={design.icon} label="The floor’s squares" withBare onCell={(cell) => set({ bare: toggled(design.bare, cell) })} />
            <p className="hint">
              Tap a square to leave it bare, and again to put its brazier back. {braziers.length} braziers.
            </p>
          </>
        ) : (
          <>
            <div className="row">
              <label htmlFor={`${id}-count`}>Braziers in the ring</label>
              <select id={`${id}-count`} value={design.count} onChange={(event) => reshape({ count: Number(event.target.value) })}>
                {ROUNDS.map((count) => (
                  <option key={count}>{count}</option>
                ))}
              </select>
            </div>
            <p className="hint">A touch flips a brazier and the two beside it.</p>
          </>
        )}
        <div className="row">
          <span>The picture</span>
          <button type="button" className="picture-button chosen" aria-label="The braziers’ picture" aria-expanded={picking} title={iconWords(design.icon)} onClick={() => setPicking(!picking)}>
            <span className="icon-thumb" style={iconMask(design.icon)} />
          </button>
          <span className="hint">{iconWords(design.icon)}: burning ones glow, and cold ones are dim.</span>
        </div>
        {picking && (
          <IconPicker
            label="The braziers’ picture"
            value={design.icon}
            optional={false}
            onPick={(icon) => {
              if (icon) set({ icon });
              setPicking(false);
            }}
            onClose={() => setPicking(false)}
          />
        )}
        {empty && (
          <p>
            <button type="button" onClick={() => onChange({ ...design, ...EXAMPLE })}>
              Start from the example
            </button>{' '}
            <span className="hint">a hall of 25 braziers to put out</span>
          </p>
        )}
      </section>

      <section className="panel">
        <h2>The goal</h2>
        <div role="radiogroup" aria-label="The goal">
          {GOAL_CHOICES.map(({ goal: choice, says }) => (
            <label key={choice} className="check">
              <input type="radio" name={`${id}-goal`} checked={design.goal === choice} onChange={() => set({ goal: choice })} />
              <span>{says}</span>
            </label>
          ))}
        </div>
        {design.goal === 'pattern' && (
          <>
            <BrazierFloor floor={floor} burning={new Set(design.pattern)} icon={design.icon} label="The goal’s braziers" onCell={(cell) => set({ pattern: toggled(design.pattern, cell) })} />
            <p className="hint">Tap a brazier to light it in the goal, and again to put it out.</p>
            <label className="check">
              <input type="checkbox" checked={design.shown} onChange={(event) => set({ shown: event.target.checked })} />
              <span>
                <strong>Show it beside the floor.</strong>{' '}
                {design.shown
                  ? 'The players see what they’re aiming for.'
                  : 'Hidden, the players must learn it in the game: painted on the door, sung in a song. The link holds only its fingerprint.'}
              </span>
            </label>
          </>
        )}
      </section>

      <section className="panel">
        <h2>The start</h2>
        <div role="radiogroup" aria-label="The start">
          <label className="check">
            <input type="radio" name={`${id}-starting`} checked={design.starting === 'touches'} onChange={() => set({ starting: 'touches' })} />
            <span>So many touches from the goal, so it can always be solved</span>
          </label>
          <label className="check">
            <input type="radio" name={`${id}-starting`} checked={design.starting === 'hand'} onChange={() => set({ starting: 'hand' })} />
            <span>Set by hand</span>
          </label>
        </div>
        {design.starting === 'touches' ? (
          <>
            <div className="row">
              <label htmlFor={`${id}-touches`}>Touches from the goal</label>
              <select id={`${id}-touches`} value={design.touches} onChange={(event) => set({ touches: Number(event.target.value) })}>
                {TOUCHES.map((touches) => (
                  <option key={touches} value={touches}>
                    {touches === 0 ? 'Any number' : touches}
                  </option>
                ))}
              </select>
              <button type="button" onClick={() => set({ seed: randomSeed() })}>
                🎲 Another start
              </button>
            </div>
            <BrazierFloor floor={floor} burning={new Set(startCells)} icon={design.icon} label={`The start: ${startCells.length} burning`} />
          </>
        ) : (
          <>
            <BrazierFloor floor={floor} burning={new Set(design.drawn)} icon={design.icon} label="The start’s braziers" onCell={(cell) => set({ drawn: toggled(design.drawn, cell) })} />
            <p className="hint">
              Tap a brazier to light it at the start, and again to put it out.{' '}
              <button type="button" onClick={() => set({ drawn: goalCells })}>
                Start from the goal
              </button>
            </p>
          </>
        )}
        {solution && (
          <p className="hint">
            It takes {solution.exact ? '' : 'no more than '}
            {solution.fewest === 1 ? '1 touch' : `${solution.fewest} touches`}
            {solution.exact ? ' at the least' : ''}.
          </p>
        )}
      </section>

      <section className="panel">
        <h2>Touches</h2>
        <div className="row">
          <label htmlFor={`${id}-limit`}>They fail</label>
          <select id={`${id}-limit`} value={design.limit} onChange={(event) => set({ limit: Number(event.target.value) })}>
            <option value={0}>Never</option>
            {limits.map((count) => (
              <option key={count} value={count}>
                After {count} touches
              </option>
            ))}
          </select>
        </div>
        <span className="hint">
          The page counts their touches. With a limit, Undo and Start over put the floor back, but never the count.
        </span>
        {design.limit > 0 && (
          <div className="field">
            <label htmlFor={`${id}-fail-line`}>Failing says</label>
            <input id={`${id}-fail-line`} value={design.failLine} maxLength={LONGEST_LINE} onChange={(event) => set({ failLine: event.target.value })} />
          </div>
        )}
      </section>

      <section className="panel">
        <h2>Try it</h2>
        <p className="hint">As your players will see it. Touching here changes nothing in the puzzle.</p>
        {problems.length === 0 ? (
          <BrazierGame
            key={trial}
            floor={floor}
            icon={design.icon}
            start={startCells}
            aim={aimOf(design)}
            pattern={aimOf(design) === 'shown' ? goalCells : undefined}
            limit={design.limit}
            failLine={design.failLine.trim()}
            judge={judge}
          />
        ) : (
          <p className="hint">{problems.join(' ')}</p>
        )}
        <IconCredit names={[design.icon]} />
      </section>
    </>
  );
}
