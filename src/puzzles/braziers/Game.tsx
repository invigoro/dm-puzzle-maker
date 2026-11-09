import { useEffect, useMemo, useRef, useState } from 'react';
import { BrazierFloor, placeName } from './BrazierFloor';
import { braziersOf, cellsOf, flipsOf, maskOf, type Floor } from './engine/floor';
import type { Aim, BraziersProgress } from './puzzle';

/** How the game judges the floor: against the goal, in the maker or as a link shows it, or by a hidden goal's fingerprint. */
export interface Judge {
  /** Whether the braziers burning, as a mask, are the goal. */
  isGoal(lit: bigint): Promise<boolean>;
  /** The line for solving it, opened with the goal. */
  lineFor(lit: bigint): Promise<string>;
}

interface BrazierGameProps {
  floor: Floor;
  icon: string;
  /** The cells burning at the start. */
  start: readonly number[];
  aim: Aim;
  /** The cells burning in a goal that's shown. */
  pattern?: readonly number[];
  /** After how many touches the players fail: 0 for never. */
  limit: number;
  failLine: string;
  judge: Judge;
  initial?: BraziersProgress | null;
  onProgress?(progress: BraziersProgress): void;
}

/** What a touch flips, besides the brazier touched, said plainly. */
const REACH_SAID = { beside: 'the four beside it', corners: 'the four on its corners', round: 'all eight round it', lines: 'every one in its row and column' };
const AIM_SAID: Record<Aim, string> = { out: 'Put every brazier out.', lit: 'Light every brazier.', shown: 'Make the floor match the goal.', hidden: '' };

/** A floor of braziers to touch until it reaches the goal: each touch flips a brazier and its neighbours. */
export function BrazierGame({ floor, icon, start, aim, pattern, limit, failLine, judge, initial, onProgress }: BrazierGameProps) {
  const braziers = useMemo(() => braziersOf(floor), [floor]);
  const flips = useMemo(() => flipsOf(floor), [floor]);
  const numbers = useMemo(() => new Map(braziers.map((cell, brazier) => [cell, brazier])), [braziers]);
  const startMask = useMemo(() => maskOf(start, braziers), [start, braziers]);
  const [lit, setLit] = useState(() => (initial ? maskOf(initial.lit, braziers) : startMask));
  const [count, setCount] = useState(initial?.count ?? 0);
  const [touched, setTouched] = useState<readonly number[]>(initial?.touched ?? []);
  const [solved, setSolved] = useState(initial?.solved ?? false);
  const [failed, setFailed] = useState(initial?.failed ?? false);
  const [line, setLine] = useState('');
  /** The latest check of the floor, so an older one that answers late is passed over. */
  const latest = useRef(0);
  const done = solved || failed;
  // With a limit, no touch goes past it, even while the last is checked.
  const spent = limit > 0 && count >= limit;

  useEffect(() => {
    onProgress?.({ lit: cellsOf(lit, braziers), count, touched: [...touched], solved, failed });
  }, [lit, count, touched, solved, failed, braziers, onProgress]);

  // Solved before, so the line's opened again: once, for where they left off.
  useEffect(() => {
    if (initial?.solved) judge.lineFor(lit).then(setLine);
  }, []);

  function touch(cell: number) {
    const brazier = numbers.get(cell);
    if (done || spent || brazier === undefined) return;
    const next = lit ^ flips[brazier];
    const made = count + 1;
    setLit(next);
    setTouched([...touched, cell]);
    setCount(made);
    const ticket = ++latest.current;
    judge.isGoal(next).then((reached) => {
      if (ticket !== latest.current) return;
      if (reached) {
        setSolved(true);
        judge.lineFor(next).then(setLine);
      } else if (limit > 0 && made >= limit) setFailed(true);
    });
  }

  /** Takes back the last touch: the floor, and the count unless touches are limited. */
  function undo() {
    if (done || touched.length === 0) return;
    latest.current++;
    setLit(lit ^ flips[numbers.get(touched.at(-1)!)!]);
    setTouched(touched.slice(0, -1));
    if (limit === 0) setCount(count - 1);
  }

  /** Puts the floor back as it started: the count too, unless touches are limited. */
  function startOver() {
    latest.current++;
    setLit(startMask);
    setTouched([]);
    if (limit === 0) setCount(0);
  }

  const burning = new Set(cellsOf(lit, braziers));
  const reach = floor.shape === 'ring' ? 'the two beside it' : REACH_SAID[floor.reach];
  const goalCells = new Set(pattern ?? []);
  const goalName = `The goal: ${goalCells.size === 0 ? 'every brazier out' : `burning at ${[...goalCells].map((cell) => placeName(floor, cell)).join('; ')}`}`;

  return (
    <div className="game braziers-game">
      <div className="braziers-floors">
        <BrazierFloor floor={floor} burning={burning} icon={icon} label="The braziers" onCell={touch} settled={solved} disabled={failed || spent} />
        {aim === 'shown' && (
          <figure className="brazier-goal">
            <BrazierFloor floor={floor} burning={goalCells} icon={icon} label={goalName} small />
            <figcaption>The goal</figcaption>
          </figure>
        )}
      </div>
      <p className="hint">
        {AIM_SAID[aim]} Touching a brazier flips it and {reach}: a burning one goes out, and a cold one lights.
      </p>
      <div className="game-actions">
        <button type="button" onClick={undo} disabled={done || touched.length === 0}>
          Undo
        </button>
        <button type="button" onClick={startOver} disabled={done || touched.length === 0}>
          Start over
        </button>
        <span className="moves">{limit > 0 ? `${count} of ${limit} touches` : count === 1 ? '1 touch' : `${count} touches`}</span>
      </div>
      <p className={failed ? 'success wrong' : 'success'} role="status">
        {solved ? line : failed ? failLine || 'That was the last chance.' : ''}
      </p>
    </div>
  );
}
