/**
 * The pictures: icons from game-icons.net (https://github.com/game-icons/icons), as the Iconify
 * package @iconify-json/game-icons has them, each credited to its author as the set's license asks;
 * and Font Awesome's free solid icons, from @iconify-json/fa7-solid, credited to Font Awesome.
 */

/** The size every icon is drawn on, as game-icons are: a square of 512. */
export const SIZE = 512;

/** The set's contributors, by their folder in game-icons/icons, named as its license.txt names them. */
export const AUTHORS: Readonly<Record<string, { name: string; cc0?: boolean }>> = {
  andymeneely: { name: 'Andy Meneely' },
  aussiesim: { name: 'Aussiesim' },
  'carl-olsen': { name: 'Carl Olsen' },
  'caro-asercion': { name: 'Caro Asercion' },
  cathelineau: { name: 'Cathelineau' },
  catsu: { name: 'Catsu' },
  darkzaitzev: { name: 'DarkZaitzev' },
  delapouite: { name: 'Delapouite' },
  faithtoken: { name: 'Faithtoken' },
  felbrigg: { name: 'Felbrigg' },
  generalace135: { name: 'GeneralAce135' },
  guard13007: { name: 'Guard13007' },
  'heavenly-dog': { name: 'HeavenlyDog' },
  irongamer: { name: 'Irongamer' },
  'john-colburn': { name: 'John Colburn' },
  'john-redman': { name: 'John Redman' },
  'kier-heyl': { name: 'Kier Heyl' },
  lorc: { name: 'Lorc' },
  'lord-berandas': { name: 'Lord Berandas' },
  lucasms: { name: 'Lucas' },
  'pepijn-poolman': { name: 'Pepijn Poolman' },
  'pierre-leducq': { name: 'Pierre Leducq' },
  priorblue: { name: 'PriorBlue' },
  quoting: { name: 'Quoting' },
  rihlsul: { name: 'Rihlsul' },
  sbed: { name: 'Sbed' },
  seregacthtuf: { name: 'SeregaCthtuf' },
  skoll: { name: 'Skoll' },
  sparker: { name: 'Sparker' },
  spencerdub: { name: 'SpencerDub' },
  starseeker: { name: 'Starseeker' },
  'viscious-speed': { name: 'Viscious Speed', cc0: true },
  willdabeast: { name: 'Willdabeast' },
  zajkonur: { name: 'Zajkonur' },
  zeromancer: { name: 'Zeromancer', cc0: true },
};

/** An icon as the site serves it: an SVG of its own, drawn in the text's colour, its author written into it. */
export interface IconFile {
  /** As links name it: `stone-tower` from game-icons, or with its set's prefix, `fa:key`. */
  name: string;
  author: string;
  svg: string;
}

/** Where an icon's file goes in icons/: game-icons at the top, another set's in a folder of its own (`fa/key.svg`). */
export const fileOf = (name: string) => `${name.replace(':', '/')}.svg`;

/**
 * The icons to serve, each with its one author. An icon is left out when no folder has it, when
 * more than one does (so its author is uncertain), or when its folder isn't one of the named
 * contributors (`badges` and `various-artists` aren't people).
 */
export function iconFiles(
  icons: Readonly<Record<string, { body: string }>>,
  folders: Readonly<Record<string, readonly string[]>>,
  size = SIZE,
): { files: IconFile[]; skipped: string[] } {
  const foldersOf = new Map<string, string[]>();
  for (const [folder, names] of Object.entries(folders)) {
    for (const name of names) foldersOf.set(name, [...(foldersOf.get(name) ?? []), folder]);
  }
  const files: IconFile[] = [];
  const skipped: string[] = [];
  for (const [name, { body }] of Object.entries(icons).sort(([one], [other]) => one.localeCompare(other))) {
    const found = foldersOf.get(name) ?? [];
    const author = found.length === 1 ? AUTHORS[found[0]]?.name : undefined;
    if (!author) {
      skipped.push(name);
      continue;
    }
    files.push({ name, author, svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}" data-author="${author}">${body}</svg>` });
  }
  return { files, skipped };
}

/** An Iconify icon, with its own size when it isn't the set's. */
export interface SetIcon {
  body: string;
  width?: number;
  height?: number;
  hidden?: boolean;
}

/**
 * The icons of a set made by one maker, each named with the set's prefix (`fa:key`) and drawn on a
 * square of 512 as game-icons are, its shape scaled to fit and centred, so every picture is drawn
 * the same way. `note` goes before each file's drawing, as the set's own files carry it. Icons the
 * set hides, kept only for old names, are left out.
 */
export function setFiles(
  icons: Readonly<Record<string, SetIcon>>,
  { prefix, author, width = SIZE, height = width, note }: { prefix: string; author: string; width?: number; height?: number; note: string },
): IconFile[] {
  return Object.entries(icons)
    .filter(([, icon]) => !icon.hidden)
    .sort(([one], [other]) => one.localeCompare(other))
    .map(([name, icon]) => ({
      name: `${prefix}:${name}`,
      author,
      svg: `<!-- ${note} --><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${SIZE} ${SIZE}" data-author="${author}">${squared(icon.body, icon.width ?? width, icon.height ?? height)}</svg>`,
    }));
}

/** A drawing of some width and height, scaled to fit a square of 512 and centred on it. */
export function squared(body: string, width: number, height: number): string {
  const scale = SIZE / Math.max(width, height);
  const round = (value: number) => Math.round(value * 1000) / 1000;
  const [x, y] = [round((SIZE - width * scale) / 2), round((SIZE - height * scale) / 2)];
  const moves = [x !== 0 || y !== 0 ? `translate(${x} ${y})` : '', scale !== 1 ? `scale(${round(scale)})` : ''].filter(Boolean);
  return moves.length === 0 ? body : `<g transform="${moves.join(' ')}">${body}</g>`;
}

/** The picker's index of icons: their names, and each one's author as a number into `authors`. */
export function indexOf(files: readonly IconFile[], stamp: string) {
  const authors = [...new Set(files.map((file) => file.author))].sort();
  return { stamp, authors, names: files.map((file) => file.name), by: files.map((file) => authors.indexOf(file.author)) };
}
