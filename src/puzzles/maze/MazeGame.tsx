import { useEffect, useMemo, useRef, useState, type KeyboardEvent, type PointerEvent } from 'react';
import type { Exit, Light } from './design';
import { canStep, DIRECTIONS, stepFrom, type Direction, type Maze } from './engine/grid';
import { lit } from './engine/paths';
import { MazeBoard } from './MazeBoard';
import type { MazeProgress } from './puzzle';

interface MazeGameProps {
  maze: Maze;
  start: number;
  exits: readonly Exit[];
  light: Light;
  initial?: MazeProgress | null;
  onProgress?(progress: MazeProgress): void;
  /** Whether it takes the keyboard when it opens: on the players' page, not in the maker. */
  autoFocus?: boolean;
}

const KEYS: Partial<Record<string, Direction>> = {
  ArrowUp: 'up',
  ArrowRight: 'right',
  ArrowDown: 'down',
  ArrowLeft: 'left',
  w: 'up',
  d: 'right',
  s: 'down',
  a: 'left',
};
/** How far a finger has to move, in pixels, for a swipe rather than a tap. */
const SWIPE = 24;

/** A maze to find the way out of: a token moved by keys, taps or swipes, in as much light as the game master allows. */
export function MazeGame({ maze, start, exits, light, initial, onProgress, autoFocus }: MazeGameProps) {
  const box = useRef<HTMLDivElement>(null);
  const [at, setAt] = useState(initial?.at ?? start);
  const [steps, setSteps] = useState(initial?.steps ?? 0);
  const [visited, setVisited] = useState<readonly number[]>(initial?.visited ?? [start]);
  const [out, setOut] = useState<number | null>(initial?.out ?? null);
  const swipe = useRef<{ x: number; y: number } | null>(null);
  // A swipe ends in a click on a cell, which shouldn't move the token again.
  const swiped = useRef(false);

  useEffect(() => {
    if (autoFocus) box.current?.focus();
  }, [autoFocus]);

  useEffect(() => {
    onProgress?.({ at, steps, visited: [...visited], out });
  }, [at, steps, visited, out, onProgress]);

  // A lantern's light stays on the walls it's shown, as a map the party makes as they go.
  const seen = useMemo(() => (light === 'lantern' ? new Set(visited.flatMap((cell) => lit(maze, cell))) : null), [light, maze, visited]);
  const shown = light === 'lit' ? 'all' : light === 'lantern' ? seen! : new Set([at]);
  const near = light === 'lantern' ? new Set(lit(maze, at)) : undefined;

  function move(direction: Direction) {
    if (out !== null || !canStep(maze, at, direction)) return;
    const next = stepFrom(maze, at, direction);
    setAt(next);
    setSteps(steps + 1);
    if (!visited.includes(next)) setVisited([...visited, next]);
    const exit = exits.findIndex((way) => way.cell === next);
    if (exit >= 0) setOut(exit);
  }

  function tap(cell: number) {
    if (swiped.current) {
      swiped.current = false;
      return;
    }
    const direction = DIRECTIONS.find((way) => stepFrom(maze, at, way) === cell);
    if (direction) move(direction);
  }

  function keyDown(event: KeyboardEvent) {
    const direction = KEYS[event.key];
    if (!direction || event.ctrlKey || event.metaKey || event.altKey) return;
    event.preventDefault();
    move(direction);
  }

  function pointerDown(event: PointerEvent) {
    swiped.current = false;
    swipe.current = { x: event.clientX, y: event.clientY };
  }

  function pointerUp(event: PointerEvent) {
    const from = swipe.current;
    swipe.current = null;
    if (!from) return;
    const [dx, dy] = [event.clientX - from.x, event.clientY - from.y];
    if (Math.max(Math.abs(dx), Math.abs(dy)) < SWIPE) return;
    swiped.current = true;
    move(Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : dy > 0 ? 'down' : 'up');
  }

  function startOver() {
    setAt(start);
    setSteps(0);
    setVisited([start]);
    setOut(null);
  }

  return (
    <div className="game maze-game" ref={box} tabIndex={0} onKeyDown={keyDown} aria-label="The maze. Move with the arrow keys.">
      <MazeBoard
        maze={maze}
        start={start}
        exits={exits.map((exit) => exit.cell)}
        at={at}
        shown={shown}
        near={near}
        onCell={tap}
        onPointerDown={pointerDown}
        onPointerUp={pointerUp}
        label="The maze"
      />
      <p className="hint">Move with the arrow keys, by tapping the next cell, or by swiping.</p>
      <div className="game-actions">
        <button type="button" onClick={startOver} disabled={steps === 0}>
          Start over
        </button>
        <span className="moves">{steps === 1 ? '1 step' : `${steps} steps`}</span>
      </div>
      <p className="success" role="status">
        {out !== null ? exits[out].line || 'You’ve found a way out.' : ''}
      </p>
    </div>
  );
}
