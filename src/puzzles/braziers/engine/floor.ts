/**
 * A floor of braziers: a grid with any squares left bare, or a ring round a room. Each brazier
 * burns or is cold, and touching one flips it and its neighbours.
 *
 * Braziers are numbered in order (a grid's in reading order, skipping bare squares), and which
 * burn is a bitmask over those numbers: bit i set is brazier i burning. Floors are at most 8 by 8,
 * so a mask is a bigint of up to 64 bits. Cells are what designs and links name: a grid square's
 * row × width + column, or a ring's place, so leaving a square bare renumbers nothing else.
 */

export type Shape = 'grid' | 'ring';
/** What a touch on a grid flips, besides the brazier touched: the four beside it, the four on its corners, all eight round it, or its whole row and column. */
export type Reach = 'beside' | 'corners' | 'round' | 'lines';
export const REACHES: readonly Reach[] = ['beside', 'corners', 'round', 'lines'];

export const SMALLEST_SIDE = 3;
export const LARGEST_SIDE = 8;
export const FEWEST_ROUND = 5;
export const MOST_ROUND = 16;

export interface Floor {
  shape: Shape;
  /** A grid's size, in squares. */
  width: number;
  height: number;
  /** A grid's squares with no brazier. */
  bare: readonly number[];
  /** How many braziers stand in a ring. */
  count: number;
  reach: Reach;
}

/** How many cells a floor has: a grid's squares, bare or not, or a ring's places. */
export const cellCount = (floor: Floor) => (floor.shape === 'grid' ? floor.width * floor.height : floor.count);

/** The cells with a brazier, in order: brazier i stands in cell `braziersOf(floor)[i]`. */
export function braziersOf(floor: Floor): number[] {
  const bare = new Set(floor.shape === 'grid' ? floor.bare : []);
  return Array.from({ length: cellCount(floor) }, (_, cell) => cell).filter((cell) => !bare.has(cell));
}

const OFFSETS: Record<Exclude<Reach, 'lines'>, readonly (readonly [number, number])[]> = {
  beside: [
    [0, -1],
    [1, 0],
    [0, 1],
    [-1, 0],
  ],
  corners: [
    [-1, -1],
    [1, -1],
    [1, 1],
    [-1, 1],
  ],
  round: [
    [-1, -1],
    [0, -1],
    [1, -1],
    [1, 0],
    [1, 1],
    [0, 1],
    [-1, 1],
    [-1, 0],
  ],
};

/** The cells a touch on a cell flips: the cell itself, and its neighbours with braziers. */
function flippedBy(floor: Floor, cell: number, has: (cell: number) => boolean): number[] {
  if (floor.shape === 'ring') {
    const { count } = floor;
    return [...new Set([cell, (cell + 1) % count, (cell + count - 1) % count])];
  }
  const { width, height } = floor;
  const [x, y] = [cell % width, Math.floor(cell / width)];
  const near =
    floor.reach === 'lines'
      ? [...Array.from({ length: width }, (_, column) => y * width + column), ...Array.from({ length: height }, (_, row) => row * width + x)]
      : OFFSETS[floor.reach].filter(([dx, dy]) => x + dx >= 0 && x + dx < width && y + dy >= 0 && y + dy < height).map(([dx, dy]) => (y + dy) * width + x + dx);
  return [...new Set([cell, ...near])].filter(has);
}

/** Each brazier's touch, as the mask of the braziers it flips, itself among them. */
export function flipsOf(floor: Floor): bigint[] {
  const braziers = braziersOf(floor);
  const numbers = new Map(braziers.map((cell, brazier) => [cell, brazier]));
  return braziers.map((cell) => flippedBy(floor, cell, (each) => numbers.has(each)).reduce((mask, each) => mask | bit(numbers.get(each)!), 0n));
}

/** The mask with brazier i alone. */
export const bit = (brazier: number) => 1n << BigInt(brazier);

/** Every brazier burning. */
export const allOf = (count: number) => (1n << BigInt(count)) - 1n;

/** How many braziers a mask holds. */
export function countOf(mask: bigint): number {
  let count = 0;
  for (let rest = mask; rest > 0n; rest &= rest - 1n) count++;
  return count;
}

/** The mask of braziers burning, from the cells that burn. Cells without a brazier are passed over. */
export function maskOf(cells: Iterable<number>, braziers: readonly number[]): bigint {
  const numbers = new Map(braziers.map((cell, brazier) => [cell, brazier]));
  let mask = 0n;
  for (const cell of cells) if (numbers.has(cell)) mask |= bit(numbers.get(cell)!);
  return mask;
}

/** The cells that burn, in order, from a mask. */
export const cellsOf = (mask: bigint, braziers: readonly number[]) => braziers.filter((_, brazier) => (mask & bit(brazier)) !== 0n);

/** A mask as text, a 1 or 0 for each brazier in order: what a goal is fingerprinted and sealed by. */
export const keyOf = (mask: bigint, count: number) => Array.from({ length: count }, (_, brazier) => ((mask & bit(brazier)) !== 0n ? '1' : '0')).join('');
