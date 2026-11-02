/**
 * Where the discs sit, and where they touch. Positions number every spoke on the board, disc by
 * disc, each disc's spokes clockwise from the one pointing up. Board units have y pointing down, as
 * SVG's do, and angles are in degrees clockwise from up.
 */

export interface Point {
  x: number;
  y: number;
}

export interface Disc extends Point {
  r: number;
  /** What the disc is called, for screen readers: "the top disc". */
  name: string;
}

export interface Contact extends Point {
  /** The two positions that meet here: a spoke of the lower-numbered disc, then one of the other. */
  a: number;
  b: number;
}

export interface Layout {
  discs: readonly Disc[];
  /** How many spokes each disc has, evenly spaced, the first pointing up. */
  spokes: number;
  contacts: readonly Contact[];
  /** The disc the answer is read round. */
  hub: number;
  /** The contacts whose pairs spell the answer, in order from the mark: round the hub, clockwise from its first spoke. */
  goals: readonly number[];
}

/** How far from touching two discs can be and still count as touching, in board units. */
const TOUCHING = 1e-6;

export const positionOf = (layout: Layout, disc: number, spoke: number) => disc * layout.spokes + spoke;
export const discOf = (layout: Layout, position: number) => Math.floor(position / layout.spokes);
export const spokeOf = (layout: Layout, position: number) => position % layout.spokes;
export const positionCount = (layout: Layout) => layout.discs.length * layout.spokes;
/** The angle of a position's spoke. */
export const angleOf = (layout: Layout, position: number) => (spokeOf(layout, position) * 360) / layout.spokes;

/** An angle's direction, as a unit vector in board units. */
export function direction(angle: number): Point {
  const radians = (angle * Math.PI) / 180;
  return { x: Math.sin(radians), y: -Math.cos(radians) };
}

/** The angle from one point to another, from 0 up to 360. */
export function angleTo(from: Point, to: Point): number {
  const angle = (Math.atan2(to.x - from.x, from.y - to.y) * 180) / Math.PI;
  return (angle + 360) % 360;
}

/** Whether two discs meet at a contact. */
export const touch = (layout: Layout, one: number, other: number) =>
  layout.contacts.some((contact) => {
    const discs = [discOf(layout, contact.a), discOf(layout, contact.b)];
    return discs.includes(one) && discs.includes(other) && one !== other;
  });

/**
 * A layout from its discs. Two discs touch where they're as far apart as their radii add up to, and
 * each must meet the other at one of its spokes, or no piece could ever reach the contact.
 */
export function layoutOf(discs: Disc[], spokes: number, hub: number): Layout {
  const step = 360 / spokes;
  const spokeAt = (disc: number, angle: number) => {
    const steps = Math.round(angle / step);
    if (Math.abs(angle - steps * step) > 1e-6) throw new Error(`${discs[disc].name} is touched between its spokes`);
    return steps % spokes;
  };
  const contacts: Contact[] = [];
  discs.forEach((one, i) =>
    discs.forEach((other, j) => {
      if (j <= i || Math.abs(Math.hypot(other.x - one.x, other.y - one.y) - one.r - other.r) > TOUCHING) return;
      const angle = angleTo(one, other);
      const towards = direction(angle);
      contacts.push({
        a: i * spokes + spokeAt(i, angle),
        b: j * spokes + spokeAt(j, (angle + 180) % 360),
        x: one.x + one.r * towards.x,
        y: one.y + one.r * towards.y,
      });
    }),
  );
  const hubSpoke = (contact: Contact) => [contact.a, contact.b].find((end) => Math.floor(end / spokes) === hub)! % spokes;
  const goals = contacts
    .map((contact, index) => ({ contact, index }))
    .filter(({ contact }) => [contact.a, contact.b].some((end) => Math.floor(end / spokes) === hub))
    .sort((one, other) => hubSpoke(one.contact) - hubSpoke(other.contact))
    .map(({ index }) => index);
  return { discs, spokes, contacts, hub, goals };
}

const AROUND = ['top', 'upper right', 'lower right', 'bottom', 'lower left', 'upper left'];

/** Seven discs of six spokes: one in the centre, and six round it, each touching the centre and its two neighbours. */
export const FLOWER: Layout = layoutOf(
  [
    { x: 0, y: 0, r: 100, name: 'the centre disc' },
    ...AROUND.map((name, k) => {
      const at = direction(60 * k);
      return { x: 200 * at.x, y: 200 * at.y, r: 100, name: `the ${name} disc` };
    }),
  ],
  6,
  0,
);
