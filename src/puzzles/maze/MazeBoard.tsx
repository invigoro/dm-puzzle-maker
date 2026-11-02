import type { PointerEvent } from 'react';
import { cellCount, cellsOf, wallCount, xyOf, type Maze } from './engine/grid';

/** A cell's size, in board units. */
const U = 20;

interface MazeBoardProps {
  maze: Maze;
  start: number;
  exits: readonly number[];
  /** Where the players' token stands, if there is one. */
  at?: number | null;
  /** The cells the players can see: all of them, or these. */
  shown: 'all' | ReadonlySet<number>;
  /** The cells lit right now, drawn brighter. */
  near?: ReadonlySet<number>;
  /** A path to draw through the maze, for the game master: cells in order. */
  path?: readonly number[];
  onCell?(cell: number): void;
  /** For drawing the maze by hand: a wall to put up or take down. */
  onWall?(wall: number): void;
  onPointerDown?(event: PointerEvent): void;
  onPointerUp?(event: PointerEvent): void;
  label: string;
}

const centre = (maze: Maze, cell: number) => {
  const [x, y] = xyOf(maze, cell);
  return [(x + 0.5) * U, (y + 0.5) * U] as const;
};

/** The two ends of a wall, in board units: across walls stand upright, down walls lie flat. */
function wallLine(maze: Maze, wall: number): [number, number, number, number] {
  const [one, other] = cellsOf(maze, wall);
  const [x, y] = xyOf(maze, one);
  return other === one + 1 ? [(x + 1) * U, y * U, (x + 1) * U, (y + 1) * U] : [x * U, (y + 1) * U, (x + 1) * U, (y + 1) * U];
}

/** A maze drawn from above: the cells the players can see, their walls, the ways in and out, and the token. */
export function MazeBoard({ maze, start, exits, at, shown, near, path, onCell, onWall, onPointerDown, onPointerUp, label }: MazeBoardProps) {
  const cells = cellCount(maze);
  const sees = (cell: number) => shown === 'all' || shown.has(cell);

  // Walls beside a seen cell are drawn, and the outside walls of seen cells at the edge.
  const lines: string[] = [];
  for (let wall = 0; wall < wallCount(maze); wall++) {
    if (!maze.walls[wall] || !cellsOf(maze, wall).some(sees)) continue;
    const [x1, y1, x2, y2] = wallLine(maze, wall);
    lines.push(`M${x1} ${y1}L${x2} ${y2}`);
  }
  for (let cell = 0; cell < cells; cell++) {
    if (!sees(cell)) continue;
    const [x, y] = xyOf(maze, cell);
    if (y === 0) lines.push(`M${x * U} 0H${(x + 1) * U}`);
    if (y === maze.height - 1) lines.push(`M${x * U} ${maze.height * U}H${(x + 1) * U}`);
    if (x === 0) lines.push(`M0 ${y * U}V${(y + 1) * U}`);
    if (x === maze.width - 1) lines.push(`M${maze.width * U} ${y * U}V${(y + 1) * U}`);
  }

  return (
    <svg
      className={onWall ? 'maze drawing' : 'maze'}
      viewBox={`-3 -3 ${maze.width * U + 6} ${maze.height * U + 6}`}
      role="group"
      aria-label={label}
      onPointerDown={onPointerDown}
      onPointerUp={onPointerUp}
    >
      {Array.from({ length: cells }, (_, cell) => {
        const [x, y] = xyOf(maze, cell);
        const kind = !sees(cell) ? 'cell fog' : near?.has(cell) ? 'cell near' : 'cell seen';
        return <rect key={cell} className={kind} x={x * U} y={y * U} width={U} height={U} onClick={onCell && (() => onCell(cell))} />;
      })}
      {path && path.length > 1 && <polyline className="path" points={path.map((cell) => centre(maze, cell).join(',')).join(' ')} />}
      {sees(start) && <circle className="way-in" cx={centre(maze, start)[0]} cy={centre(maze, start)[1]} r={U * 0.22} />}
      {exits.map((exit, i) =>
        sees(exit) ? (
          <g key={exit} className="way-out" transform={`translate(${centre(maze, exit).join(' ')})`}>
            <path d={`M${-U * 0.26} ${U * 0.34}V${-U * 0.1}A${U * 0.26} ${U * 0.26} 0 0 1 ${U * 0.26} ${-U * 0.1}V${U * 0.34}Z`} />
            {exits.length > 1 && (
              <text y={U * 0.16} fontSize={U * 0.38}>
                {i + 1}
              </text>
            )}
          </g>
        ) : null,
      )}
      <path className="walls" d={lines.join('')} />
      {onWall &&
        maze.walls.map((standing, wall) => {
          const [x1, y1, x2, y2] = wallLine(maze, wall);
          const [one, other] = cellsOf(maze, wall).map((cell) => xyOf(maze, cell));
          return (
            <g key={wall}>
              {!standing && <line className="gap" x1={x1} y1={y1} x2={x2} y2={y2} />}
              <line
                className="wall-hit"
                x1={x1}
                y1={y1}
                x2={x2}
                y2={y2}
                role="button"
                aria-label={`${standing ? 'Take down' : 'Put up'} the wall between row ${one[1] + 1} column ${one[0] + 1} and row ${other[1] + 1} column ${other[0] + 1}`}
                onClick={() => onWall(wall)}
              />
            </g>
          );
        })}
      {at !== null && at !== undefined && <circle className="token" cx={centre(maze, at)[0]} cy={centre(maze, at)[1]} r={U * 0.3} />}
    </svg>
  );
}
