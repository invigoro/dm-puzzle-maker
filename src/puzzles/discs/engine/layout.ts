/**
 * Where the discs sit, and where they touch. Positions number every spoke on the board, disc by
 * disc, each disc's spokes clockwise from its first. Board units have y pointing down, as SVG's
 * do, and angles are in degrees clockwise from up.
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

/** The layouts there are, as links name them. */
export type LayoutId = 'flower' | 'trefoil';

export interface Layout {
  id: LayoutId;
  /** What the maker calls it: "Seven discs". */
  name: string;
  discs: readonly Disc[];
  /** How many spokes each disc has, evenly spaced. */
  spokes: number;
  /** Where each disc's first spoke points, as an angle. */
  phase: number;
  contacts: readonly Contact[];
  /** The disc the answer is read round, if there is one. Its face is set apart. */
  hub: number | null;
  /** Where the arrow stands that points at the first goal contact. */
  mark: Point;
  /** The contacts whose pairs spell the answer, in order: clockwise round the mark, from the top. */
  goals: readonly number[];
}

/** How far from touching two discs can be and still count as touching, in board units. */
const TOUCHING = 1e-6;

export const positionOf = (layout: Layout, disc: number, spoke: number) => disc * layout.spokes + spoke;
export const discOf = (layout: Layout, position: number) => Math.floor(position / layout.spokes);
export const spokeOf = (layout: Layout, position: number) => position % layout.spokes;
export const positionCount = (layout: Layout) => layout.discs.length * layout.spokes;
/** The angle of a position's spoke. */
export const angleOf = (layout: Layout, position: number) => layout.phase + (spokeOf(layout, position) * 360) / layout.spokes;

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

interface LayoutSpec {
  id: LayoutId;
  name: string;
  discs: Disc[];
  spokes: number;
  phase?: number;
  hub?: number;
  mark: Point;
  /** Whether the contact between two discs is one the answer is read at. */
  isGoal(one: number, other: number): boolean;
}

/**
 * A layout from its discs. Two discs touch where they're as far apart as their radii add up to, and
 * each must meet the other at one of its spokes, or no piece could ever reach the contact. Every
 * disc must join the rest through contacts, or its pieces could never leave it. Together, those make
 * every arrangement of the pieces one that can be solved.
 */
export function layoutOf({ id, name, discs, spokes, phase = 0, hub, mark, isGoal }: LayoutSpec): Layout {
  const step = 360 / spokes;
  const spokeAt = (disc: number, angle: number) => {
    const steps = Math.round((angle - phase) / step);
    if (Math.abs(angle - phase - steps * step) > 1e-6) throw new Error(`${discs[disc].name} is touched between its spokes`);
    return ((steps % spokes) + spokes) % spokes;
  };
  const contacts: Contact[] = [];
  const joined: [number, number][] = [];
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
      joined.push([i, j]);
    }),
  );
  const reached = new Set([0]);
  for (let grew = true; grew; ) {
    grew = false;
    for (const [one, other] of joined) {
      if (reached.has(one) !== reached.has(other)) {
        reached.add(one).add(other);
        grew = true;
      }
    }
  }
  if (reached.size < discs.length) throw new Error(`Every disc of ${name} must join the rest`);
  // A contact a hair left of straight up is at the top, not the end of the round.
  const clockwise = (point: Point) => {
    const angle = angleTo(mark, point);
    return angle > 360 - 1e-6 ? 0 : angle;
  };
  const goals = contacts
    .map((contact, index) => ({ contact, index }))
    .filter((_, index) => isGoal(...joined[index]))
    .sort((one, other) => clockwise(one.contact) - clockwise(other.contact))
    .map(({ index }) => index);
  return { id, name, discs, spokes, phase, contacts, hub: hub ?? null, mark, goals };
}

const AROUND = ['top', 'upper right', 'lower right', 'bottom', 'lower left', 'upper left'];

/** Seven discs of six spokes: one in the centre, and six round it, each touching the centre and its two neighbours. */
export const FLOWER: Layout = layoutOf({
  id: 'flower',
  name: 'Seven discs',
  discs: [
    { x: 0, y: 0, r: 100, name: 'the centre disc' },
    ...AROUND.map((name, k) => {
      const at = direction(60 * k);
      return { x: 200 * at.x, y: 200 * at.y, r: 100, name: `the ${name} disc` };
    }),
  ],
  spokes: 6,
  hub: 0,
  mark: { x: 0, y: 0 },
  // The names are read round the centre.
  isGoal: (one, other) => one === 0 || other === 0,
});

/**
 * Three discs of six spokes touching in a triangle, two above and one below, as in the Defiled
 * Temple. The triangle's sides run at 30° off the upright, so the spokes are turned half a step to
 * meet them. The names are read at all three contacts, round the gap in the middle.
 */
export const TREFOIL: Layout = layoutOf({
  id: 'trefoil',
  name: 'Three discs',
  discs: (
    [
      [300, 'upper left'],
      [60, 'upper right'],
      [180, 'bottom'],
    ] as const
  ).map(([angle, name]) => {
    // Touching discs of radius 100 sit 200 apart, so 200/√3 from the triangle's middle.
    const at = direction(angle);
    return { x: (200 / Math.sqrt(3)) * at.x, y: (200 / Math.sqrt(3)) * at.y, r: 100, name: `the ${name} disc` };
  }),
  spokes: 6,
  phase: 30,
  mark: { x: 0, y: 0 },
  isGoal: () => true,
});

/** The layouts there are, smallest first, as the maker offers them. */
export const LAYOUTS: readonly Layout[] = [TREFOIL, FLOWER];

/** The layout a link names, if it's one there is. */
export const layoutById = (id: unknown): Layout | undefined => LAYOUTS.find((layout) => layout.id === id);
