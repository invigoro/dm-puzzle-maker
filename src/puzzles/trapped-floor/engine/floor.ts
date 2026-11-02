/**
 * A room's floor of squares, numbered row by row from the top left, some of them trapped. As on a
 * D&D grid, a square's neighbours are the eight round it, diagonals and all.
 */

export type Side = 'top' | 'right' | 'bottom' | 'left';
/** Where the party starts, or where they're going: a whole side of the room, or one square. */
export type Area = { side: Side } | { cell: number };

export interface Room {
  width: number;
  height: number;
}

export const SIDES: readonly Side[] = ['bottom', 'top', 'left', 'right'];

/** An area from untrusted data, on a room of so many squares, or the fallback. */
export function areaIn(value: unknown, squares: number, fallback: Area): Area {
  const input = value && typeof value === 'object' ? (value as Record<string, unknown>) : {};
  if (SIDES.includes(input.side as Side)) return { side: input.side as Side };
  if (Number.isInteger(input.cell) && (input.cell as number) >= 0 && (input.cell as number) < squares) return { cell: input.cell as number };
  return fallback;
}

export const squareCount = (room: Room) => room.width * room.height;

/** The squares round a square, up to eight. */
export function around(room: Room, cell: number): number[] {
  const [x, y] = [cell % room.width, Math.floor(cell / room.width)];
  const found: number[] = [];
  for (let dy = -1; dy <= 1; dy++) {
    for (let dx = -1; dx <= 1; dx++) {
      const [nx, ny] = [x + dx, y + dy];
      if ((dx || dy) && nx >= 0 && ny >= 0 && nx < room.width && ny < room.height) found.push(ny * room.width + nx);
    }
  }
  return found;
}

/** The squares of an area: a side's whole row or column, or the one square. */
export function squaresOf(room: Room, area: Area): number[] {
  if ('cell' in area) return [area.cell];
  const { width, height } = room;
  if (area.side === 'top') return Array.from({ length: width }, (_, x) => x);
  if (area.side === 'bottom') return Array.from({ length: width }, (_, x) => (height - 1) * width + x);
  if (area.side === 'left') return Array.from({ length: height }, (_, y) => y * width);
  return Array.from({ length: height }, (_, y) => y * width + width - 1);
}

/** How many of the squares round a square are trapped. */
export const trapsAround = (room: Room, traps: readonly boolean[], cell: number) => around(room, cell).filter((next) => traps[next]).length;

/**
 * What stepping on each square shows: how many traps are round it (0 to 8), or, for a trap, 9 and
 * up, by which kind of trap it is.
 */
export function valuesOf(room: Room, traps: readonly boolean[], kinds: readonly number[]): number[] {
  return traps.map((trap, cell) => (trap ? 9 + kinds[cell] : trapsAround(room, traps, cell)));
}

/** The squares that can be reached from the start without stepping on a trap. */
export function reachable(room: Room, traps: readonly boolean[], start: Area): Set<number> {
  const found = new Set(squaresOf(room, start).filter((cell) => !traps[cell]));
  const queue = [...found];
  for (let i = 0; i < queue.length; i++) {
    for (const next of around(room, queue[i])) {
      if (!traps[next] && !found.has(next)) {
        found.add(next);
        queue.push(next);
      }
    }
  }
  return found;
}
