import { useEffect, useMemo, useState, type MouseEvent } from 'react';
import { iconWords } from '../../kit/icons';
import { iconMask } from '../../ui/IconPicker';
import type { Moves, OnTrap, TrapKind } from './design';
import { around, squaresOf, type Area, type Room } from './engine/floor';
import { opened } from './engine/solver';
import type { FloorProgress } from './puzzle';

interface FloorGameProps {
  room: Room;
  start: Area;
  goal: Area;
  /** What stepping on each square shows: a count of the traps round it, or 9 and up for a trap of a kind. */
  values: readonly number[];
  kinds: readonly TrapKind[];
  onTrap: OnTrap;
  failAfter: number;
  failLine: string;
  moves: Moves;
  success: string;
  initial?: FloorProgress | null;
  onProgress?(progress: FloorProgress): void;
  /** For the game master: every trap drawn faintly. */
  showTraps?: boolean;
}

const kindName = (kind: TrapKind | undefined) => (kind?.icon ? iconWords(kind.icon) : 'hidden');

/** A trapped floor to cross by minesweeper's rules: each safe square, stood on, shows how many of the eight round it are trapped. */
export function FloorGame(props: FloorGameProps) {
  const { room, start, goal, values, kinds, onTrap, failAfter, failLine, moves, success, initial, onProgress, showTraps } = props;
  const starts = useMemo(() => squaresOf(room, start), [room, start]);
  const goals = useMemo(() => new Set(squaresOf(room, goal)), [room, goal]);
  const home = starts[Math.floor(starts.length / 2)];
  const [stepped, setStepped] = useState<readonly number[]>(initial?.stepped ?? []);
  const [marks, setMarks] = useState<ReadonlySet<number>>(new Set(initial?.marks ?? []));
  const [sprung, setSprung] = useState<readonly number[]>(initial?.sprung ?? []);
  const [at, setAt] = useState(initial?.at ?? home);
  const [marking, setMarking] = useState(false);
  const [said, setSaid] = useState('');

  useEffect(() => {
    onProgress?.({ stepped: [...stepped], marks: [...marks], sprung: [...sprung], at });
  }, [stepped, marks, sprung, at, onProgress]);

  // The start is known safe, and every square stood on; a square with no traps round it opens those round it.
  const known = useMemo(() => opened(room, values, [...starts, ...stepped]), [room, values, starts, stepped]);
  const tripped = new Set(sprung);
  const solved = [...goals].some((cell) => known.has(cell));
  const failed = onTrap === 'fail' && sprung.length >= failAfter;
  const over = solved || failed;

  function canStep(cell: number) {
    if (over || marks.has(cell) || tripped.has(cell)) return false;
    if (moves === 'single') return around(room, at).includes(cell);
    return !known.has(cell) && around(room, cell).some((next) => known.has(next));
  }

  function mark(cell: number) {
    if (over || known.has(cell) || tripped.has(cell)) return;
    const next = new Set(marks);
    if (next.has(cell)) next.delete(cell);
    else next.add(cell);
    setMarks(next);
  }

  function press(cell: number) {
    if (marking) return mark(cell);
    if (!canStep(cell)) return;
    if (values[cell] >= 9) {
      setSprung([...sprung, cell]);
      setSaid(kinds[values[cell] - 9]?.line || 'A trap springs!');
      if (onTrap === 'restart') {
        setStepped([]);
        setAt(home);
      }
      return;
    }
    setSaid('');
    if (!known.has(cell)) setStepped([...stepped, cell]);
    setAt(cell);
  }

  function rightClick(event: MouseEvent, cell: number) {
    event.preventDefault();
    mark(cell);
  }

  function startOver() {
    setStepped([]);
    setMarks(new Set());
    setSprung([]);
    setAt(home);
    setSaid('');
  }

  function labelOf(cell: number): string {
    const [x, y] = [cell % room.width, Math.floor(cell / room.width)];
    const value = values[cell];
    const what = tripped.has(cell)
      ? `a ${kindName(kinds[value - 9])} trap, sprung`
      : known.has(cell)
        ? value === 0
          ? 'no traps round it'
          : `${value} ${value === 1 ? 'trap' : 'traps'} round it`
        : marks.has(cell)
          ? 'marked as a trap'
          : 'not stepped on';
    const where = [goals.has(cell) && 'the goal', moves === 'single' && at === cell && 'where you stand'].filter(Boolean).join(', ');
    return `Row ${y + 1}, column ${x + 1}: ${what}${where ? `, ${where}` : ''}`;
  }

  const status = solved ? success || 'Across!' : failed ? failLine || 'One trap too many.' : said;

  return (
    <div className="game floor-game">
      <div className="floor" style={{ gridTemplateColumns: `repeat(${room.width}, minmax(0, 1fr))` }} role="group" aria-label="The floor">
        {values.map((value, cell) => {
          const open = known.has(cell);
          const trap = tripped.has(cell) || (showTraps && value >= 9);
          const kind = value >= 9 ? kinds[value - 9] : undefined;
          const classes = [
            'square',
            open && 'open',
            open && value > 0 && `n${value}`,
            tripped.has(cell) && 'sprung',
            showTraps && value >= 9 && !tripped.has(cell) && 'trap-shown',
            marks.has(cell) && 'marked',
            starts.includes(cell) && 'start',
            goals.has(cell) && 'goal',
            canStep(cell) && !marking && 'next',
          ].filter(Boolean);
          return (
            <button key={cell} type="button" className={classes.join(' ')} aria-label={labelOf(cell)} onClick={() => press(cell)} onContextMenu={(event) => rightClick(event, cell)}>
              {open && value > 0 && value < 9 && value}
              {trap && (kind?.icon ? <span className="icon-thumb" style={iconMask(kind.icon)} /> : '✸')}
              {!open && !trap && marks.has(cell) && '✗'}
              {moves === 'single' && at === cell && <span className="party" />}
            </button>
          );
        })}
      </div>
      <p className="hint">
        {moves === 'single' ? 'Step onto a square beside where you stand.' : 'Step onto any square beside one you’ve stood on.'} Each
        safe square shows how many of the eight round it are trapped. Mark a square you think is trapped with Mark traps, or a
        right-click.
      </p>
      <div className="game-actions">
        <button type="button" aria-pressed={marking} onClick={() => setMarking(!marking)}>
          {marking ? 'Marking traps' : 'Mark traps'}
        </button>
        <button type="button" onClick={startOver} disabled={stepped.length === 0 && sprung.length === 0 && marks.size === 0}>
          Start over
        </button>
        <span className="moves">
          {sprung.length === 1 ? '1 trap sprung' : `${sprung.length} traps sprung`}
          {onTrap === 'fail' ? `, of ${failAfter}` : ''}
        </span>
      </div>
      <p className={solved ? 'success' : 'success out'} role="status">
        {status}
      </p>
    </div>
  );
}
