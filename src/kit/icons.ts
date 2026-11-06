/**
 * Pictures from game-icons.net and Font Awesome, served one file to an icon from icons/ (see
 * scripts/build-icons.ts), so a page loads only the ones it shows. Each file holds its author, to
 * credit as the icons' licenses ask.
 */
import { useEffect, useState } from 'react';

/** A set of pictures, and how its license asks for it to be credited. */
export interface IconSet {
  /** What its names start with in links (`fa:key`): none for game-icons.net, as links made before there were others have. */
  prefix: string;
  name: string;
  url: string;
  license: string;
  licenseUrl: string;
  /** Whether each icon's own maker is named, as game-icons.net asks, rather than only the set. */
  byMaker: boolean;
}

export const ICON_SETS: readonly IconSet[] = [
  {
    prefix: '',
    name: 'game-icons.net',
    url: 'https://game-icons.net/',
    license: 'CC BY 3.0',
    licenseUrl: 'https://creativecommons.org/licenses/by/3.0/',
    byMaker: true,
  },
  {
    prefix: 'fa',
    name: 'Font Awesome',
    url: 'https://fontawesome.com/',
    license: 'CC BY 4.0',
    licenseUrl: 'https://creativecommons.org/licenses/by/4.0/',
    byMaker: false,
  },
];

const PREFIXES = ICON_SETS.flatMap((set) => (set.prefix ? [set.prefix] : []));

/** An icon's name, as links and files spell it: `stone-tower`, or `fa:key` from another set. Anything else is never fetched. */
export const ICON_NAME = new RegExp(`^(?:(?:${PREFIXES.join('|')}):)?[a-z0-9]+(-[a-z0-9]+)*$`);
export const isIconName = (value: unknown): value is string => typeof value === 'string' && value.length <= 60 && ICON_NAME.test(value);

/** The set an icon's from, by its name's prefix. */
export const setOf = (name: string): IconSet => {
  const prefix = name.includes(':') ? name.slice(0, name.indexOf(':')) : '';
  return ICON_SETS.find((set) => set.prefix === prefix) ?? ICON_SETS[0];
};

/** An icon's name without its set's prefix: `fa:key` is `key`. */
const bare = (name: string) => name.slice(name.indexOf(':') + 1);

export interface Icon {
  /** The SVG's contents: paths drawn in `currentColor`, on a square of 512. */
  body: string;
  author: string;
}

/** Where the site's own files are, wherever it's served from. */
const fileUrl = (path: string) => new URL(path, document.baseURI).toString();

/** Where an icon's file is: game-icons at the top of icons/, another set's in a folder of its own (`fa/key.svg`). */
export const iconUrl = (name: string) => fileUrl(`icons/${name.replace(':', '/')}.svg`);

/** An icon's file read, or null if it isn't one. */
export function readIcon(text: string): Icon | null {
  const svg = new DOMParser().parseFromString(text, 'image/svg+xml').documentElement;
  if (svg.nodeName !== 'svg' || svg.querySelector('parsererror')) return null;
  return { body: svg.innerHTML, author: svg.getAttribute('data-author') ?? '' };
}

const loaded = new Map<string, Promise<Icon | null>>();

/** An icon, fetched once however often it's asked for. Null for one that isn't there. */
export function loadIcon(name: string): Promise<Icon | null> {
  if (!isIconName(name)) return Promise.resolve(null);
  let icon = loaded.get(name);
  if (!icon) {
    icon = fetch(iconUrl(name))
      .then((response) => (response.ok ? response.text() : null))
      .then((text) => (text === null ? null : readIcon(text)))
      .catch(() => null);
    loaded.set(name, icon);
  }
  return icon;
}

/** The icons named, as they load. */
export function useIcons(names: readonly string[]): ReadonlyMap<string, Icon> {
  const [icons, setIcons] = useState<ReadonlyMap<string, Icon>>(new Map());
  const wanted = [...new Set(names.filter(isIconName))].sort().join(' ');
  useEffect(() => {
    let current = true;
    const list = wanted === '' ? [] : wanted.split(' ');
    Promise.all(list.map(async (name) => [name, await loadIcon(name)] as const)).then((found) => {
      if (current) setIcons(new Map(found.filter((entry): entry is readonly [string, Icon] => entry[1] !== null)));
    });
    return () => {
      current = false;
    };
  }, [wanted]);
  return icons;
}

/** Every icon there is, for the picker: names, and each one's author. */
export interface IconIndex {
  names: string[];
  authors: string[];
  /** Each name's author, as a number into `authors`. */
  by: number[];
}

let index: Promise<IconIndex | null> | null = null;

export function loadIndex(): Promise<IconIndex | null> {
  index ??= fetch(fileUrl('icons/index.json'))
    .then((response) => (response.ok ? response.json() : null))
    .then((data) => (data && Array.isArray(data.names) && Array.isArray(data.authors) && Array.isArray(data.by) ? (data as IconIndex) : null))
    .catch(() => null);
  return index;
}

/**
 * Icons whose names hold every word searched for, from every set or one (by its prefix), best
 * first: a name that starts with the first word, then shorter names, then game-icons before others.
 */
export function searchIcons(index: IconIndex, search: string, { most = 60, set }: { most?: number; set?: string } = {}): string[] {
  const words = search.toLowerCase().split(/[^a-z0-9]+/).filter(Boolean);
  if (words.length === 0) return [];
  const found = index.names.filter((name) => (set === undefined || setOf(name).prefix === set) && words.every((word) => bare(name).includes(word)));
  const starts = (name: string) => (bare(name).startsWith(words[0]) || bare(name).includes(`-${words[0]}`) ? 0 : 1);
  const order = (name: string) => ICON_SETS.indexOf(setOf(name));
  return found
    .sort((one, other) => starts(one) - starts(other) || bare(one).length - bare(other).length || order(one) - order(other) || one.localeCompare(other))
    .slice(0, most);
}

/** An icon's name as words: "stone-tower" is "stone tower", and "fa:key" is "key". */
export const iconWords = (name: string) => bare(name).replace(/-/g, ' ');

/** Names in a list: "Lorc", "Lorc and Skoll", "Delapouite, Lorc and Skoll". */
export const listed = (names: readonly string[]) => (names.length < 2 ? names.join('') : `${names.slice(0, -1).join(', ')} and ${names.at(-1)}`);

/** Who to credit for the icons on show, set by set: each icon's maker, where the set asks for that. */
export interface Credit {
  set: IconSet;
  /** "Lorc and Delapouite", or nothing when the set is credited as a whole. */
  makers: string;
}

/** The credits for some icons, by name, as their licenses ask, in the sets' order. */
export function creditsFor(icons: ReadonlyMap<string, Icon>): Credit[] {
  return ICON_SETS.flatMap((set) => {
    const authors = [...icons].filter(([name]) => setOf(name) === set).map(([, icon]) => icon.author);
    if (authors.length === 0) return [];
    return [{ set, makers: set.byMaker ? listed([...new Set(authors)].filter(Boolean).sort()) : '' }];
  });
}

/** Forgets the icons loaded so far, for tests. */
export function forgetIcons() {
  loaded.clear();
  index = null;
}
