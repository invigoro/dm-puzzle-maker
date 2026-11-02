/** Pictures in a maze's cells, and the window the players can see it through: read alike by the maker and the players' page. */
import { iconWords, isIconName } from '../../kit/icons';

/** What a picture in a cell is: a landmark to steer by, a hazard, or a hazard unseen until the party runs into it. */
export type PictureKind = 'landmark' | 'hazard' | 'hidden';

export interface Picture {
  cell: number;
  icon: string;
  kind: PictureKind;
  /** What reaching it says. */
  line: string;
}

/** What running into a hazard does, besides saying its line: nothing more, or the party goes back to the way in. */
export type OnHazard = 'carry-on' | 'back';

export const MOST_PICTURES = 20;
/** How many cells across a window round the party can be. A view of 0 is the whole maze. */
export const VIEWS: readonly number[] = [3, 5, 7, 9, 11];

const KINDS: readonly PictureKind[] = ['landmark', 'hazard', 'hidden'];

/**
 * Pictures from untrusted data: each on a cell of the maze that isn't taken (by the way in or a way
 * out), one to a cell, with a picture from the icon set. Anything else is left out.
 */
export function readPictures(data: unknown, cells: number, taken: readonly number[]): Picture[] {
  if (!Array.isArray(data)) return [];
  const used = new Set(taken);
  const pictures: Picture[] = [];
  for (const each of data) {
    const input = each && typeof each === 'object' ? (each as Record<string, unknown>) : {};
    const { cell, icon, kind, line } = input;
    if (!Number.isInteger(cell) || (cell as number) < 0 || (cell as number) >= cells || used.has(cell as number)) continue;
    if (!isIconName(icon) || !KINDS.includes(kind as PictureKind)) continue;
    used.add(cell as number);
    pictures.push({ cell: cell as number, icon, kind: kind as PictureKind, line: typeof line === 'string' ? line.slice(0, 200) : '' });
  }
  return pictures.slice(0, MOST_PICTURES);
}

export const viewIn = (value: unknown): number => (VIEWS.includes(value as number) ? (value as number) : 0);

export const onHazardIn = (value: unknown): OnHazard => (value === 'back' ? 'back' : 'carry-on');

/** A picture's name, for screen readers: "fountain, a landmark". */
export const pictureName = (picture: Picture) =>
  `${iconWords(picture.icon)}, ${picture.kind === 'landmark' ? 'a landmark' : picture.kind === 'hazard' ? 'a hazard' : 'a hidden hazard'}`;
