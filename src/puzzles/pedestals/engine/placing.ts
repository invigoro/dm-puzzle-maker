/** Objects on the floor and on the pedestals: setting one down, taking one back, and scattering them. */
import { shuffled, type Random } from '../../../kit/rng';

/** Which object is on each pedestal, by its place on the floor, or null for none. An object is on one pedestal at most. */
export type Placed = (number | null)[];

export const nothingPlaced = (pedestals: number): Placed => Array.from({ length: pedestals }, () => null);

/** An object set on a pedestal: off any other it was on, and whatever was there goes back to the floor. */
export function place(placed: Placed, object: number, pedestal: number): Placed {
  return placed.map((on, at) => (at === pedestal ? object : on === object ? null : on));
}

/** A pedestal's object taken back to the floor. */
export const lift = (placed: Placed, pedestal: number): Placed => placed.map((on, at) => (at === pedestal ? null : on));

/** The objects on the floor, in their places there. */
export const onFloor = (placed: Placed, objects: number): number[] =>
  Array.from({ length: objects }, (_, object) => object).filter((object) => !placed.includes(object));

/** Whether every pedestal holds an object. */
export const isFull = (placed: Placed): placed is number[] => placed.every((on) => on !== null);

/** Placings from untrusted data, for so many pedestals and objects, or null if they aren't any. */
export function readPlaced(data: unknown, pedestals: number, objects: number): Placed | null {
  if (!Array.isArray(data) || data.length !== pedestals) return null;
  const fits = data.every((on) => on === null || (Number.isInteger(on) && on >= 0 && on < objects));
  const ons = data.filter((on) => on !== null);
  return fits && new Set(ons).size === ons.length ? (data as Placed) : null;
}

/**
 * The order objects lie in on the floor: each object's number in the design, scattered. It's never
 * the design's own order when there's another, as that puts the right objects first, in order.
 */
export function scatter(objects: number, random: Random): number[] {
  const order = Array.from({ length: objects }, (_, object) => object);
  let scattered = order;
  for (let i = 0; i < 20 && scattered.every((object, at) => object === at) && objects > 1; i++) scattered = shuffled(order, random);
  return scattered;
}
