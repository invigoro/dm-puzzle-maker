import type { KeyboardEvent } from 'react';
import { iconMask } from '../../ui/IconPicker';
import { braziersOf, cellCount, type Floor } from './engine/floor';

interface BrazierFloorProps {
  floor: Floor;
  /** The cells burning. */
  burning: ReadonlySet<number>;
  icon: string;
  /** What the floor is, for screen readers: "The braziers". */
  label: string;
  /** What touching a cell does; without it, the floor is only drawn, as a picture. */
  onCell?(cell: number): void;
  /** Whether bare squares can be touched too, to put their braziers back: for drawing the floor's shape. */
  withBare?: boolean;
  /** Reached: every brazier settles, and touches do nothing. */
  settled?: boolean;
  disabled?: boolean;
  /** A small drawing, such as of the goal: dots rather than pictures. */
  small?: boolean;
}

/** Where a ring's places stand, round a circle, the first at the top: as percentages of the floor. */
export function ringPlace(place: number, count: number) {
  const angle = (2 * Math.PI * place) / count;
  return { left: `${50 + 40 * Math.sin(angle)}%`, top: `${50 - 40 * Math.cos(angle)}%` };
}

/** Where a cell is, as screen readers hear it: "row 2, column 3", or "brazier 4 of 8". */
export function placeName(floor: Floor, cell: number) {
  return floor.shape === 'grid' ? `row ${Math.floor(cell / floor.width) + 1}, column ${(cell % floor.width) + 1}` : `brazier ${cell + 1} of ${floor.count}`;
}

/** The cell an arrow key goes to from another: the next with a brazier that way, or in a ring, the next round. */
function nextCell(floor: Floor, from: number, key: string, has: (cell: number) => boolean): number | null {
  if (floor.shape === 'ring') {
    const by = key === 'ArrowRight' || key === 'ArrowDown' ? 1 : key === 'ArrowLeft' || key === 'ArrowUp' ? -1 : 0;
    return by === 0 ? null : (from + by + floor.count) % floor.count;
  }
  const [dx, dy] = { ArrowUp: [0, -1], ArrowRight: [1, 0], ArrowDown: [0, 1], ArrowLeft: [-1, 0] }[key] ?? [0, 0];
  if (dx === 0 && dy === 0) return null;
  for (let [x, y] = [(from % floor.width) + dx, Math.floor(from / floor.width) + dy]; x >= 0 && x < floor.width && y >= 0 && y < floor.height; x += dx, y += dy) {
    if (has(y * floor.width + x)) return y * floor.width + x;
  }
  return null;
}

/** A floor of braziers, in a grid or a ring: each burning or cold, and touched by a tap, a click, or Enter. */
export function BrazierFloor({ floor, burning, icon, label, onCell, withBare = false, settled = false, disabled = false, small = false }: BrazierFloorProps) {
  const braziers = new Set(braziersOf(floor));
  const shown = (cell: number) => withBare || braziers.has(cell);
  const cells = Array.from({ length: cellCount(floor) }, (_, cell) => cell);
  const style = floor.shape === 'grid' ? { gridTemplateColumns: `repeat(${floor.width}, minmax(0, 1fr))` } : undefined;
  const classes = ['brazier-floor', floor.shape, small && 'small', settled && 'settled'].filter(Boolean).join(' ');

  function key(event: KeyboardEvent<HTMLDivElement>) {
    const from = Number((event.target as HTMLElement).dataset.cell);
    if (Number.isNaN(from)) return;
    const to = nextCell(floor, from, event.key, shown);
    if (to === null) return;
    event.preventDefault();
    event.currentTarget.querySelector<HTMLElement>(`[data-cell="${to}"]`)?.focus();
  }

  /** What stands in a cell: a brazier, burning or cold, or a bare square. */
  function inside(cell: number) {
    if (!braziers.has(cell)) return null;
    return small ? <span className="dot" /> : <span className="flame"><span className="icon-thumb" style={iconMask(icon)} /></span>;
  }

  const stateOf = (cell: number) => (!braziers.has(cell) ? 'bare' : burning.has(cell) ? 'burning' : 'cold');
  const placed = (cell: number) => (floor.shape === 'ring' ? ringPlace(cell, floor.count) : undefined);

  if (!onCell) {
    return (
      <div className={classes} style={style} role="img" aria-label={label}>
        {cells.map((cell) => (
          <span key={cell} className={`cell ${stateOf(cell)}`} style={placed(cell)}>
            {inside(cell)}
          </span>
        ))}
      </div>
    );
  }
  return (
    <div className={classes} style={style} role="group" aria-label={label} onKeyDown={key}>
      {cells.map((cell) =>
        shown(cell) ? (
          <button
            key={cell}
            type="button"
            className={`cell ${stateOf(cell)}`}
            style={placed(cell)}
            data-cell={cell}
            aria-label={`${placeName(floor, cell).replace(/^./, (first) => first.toUpperCase())}: ${stateOf(cell)}`}
            disabled={disabled || settled}
            onClick={() => onCell(cell)}
          >
            {inside(cell)}
          </button>
        ) : (
          <span key={cell} className="cell bare" style={placed(cell)} aria-hidden="true" />
        ),
      )}
    </div>
  );
}
