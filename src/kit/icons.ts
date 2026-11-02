/**
 * Pictures from game-icons.net, served one file to an icon from icons/ (see scripts/build-icons.ts),
 * so a page loads only the ones it shows. Each file holds its author, to credit as the icons'
 * license asks.
 */
import { useEffect, useState } from 'react';

/** An icon's name, as links and files spell it. Anything else is never fetched. */
export const ICON_NAME = /^[a-z0-9]+(-[a-z0-9]+)*$/;
export const isIconName = (value: unknown): value is string => typeof value === 'string' && value.length <= 60 && ICON_NAME.test(value);

export interface Icon {
  /** The SVG's contents: paths drawn in `currentColor`, on a square of 512. */
  body: string;
  author: string;
}

/** Where the site's own files are, wherever it's served from. */
const fileUrl = (path: string) => new URL(path, document.baseURI).toString();

/** Where an icon's file is. */
export const iconUrl = (name: string) => fileUrl(`icons/${name}.svg`);

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

/** Icons whose names hold every word searched for, best first: a name that starts with the first word, then shorter names. */
export function searchIcons(index: IconIndex, search: string, most = 60): string[] {
  const words = search.toLowerCase().split(/[^a-z0-9]+/).filter(Boolean);
  if (words.length === 0) return [];
  const found = index.names.filter((name) => words.every((word) => name.includes(word)));
  const starts = (name: string) => (name.startsWith(words[0]) || name.includes(`-${words[0]}`) ? 0 : 1);
  return found.sort((one, other) => starts(one) - starts(other) || one.length - other.length || one.localeCompare(other)).slice(0, most);
}

/** An icon's name as words: "stone-tower" is "stone tower". */
export const iconWords = (name: string) => name.replace(/-/g, ' ');

/** The line crediting the icons' authors, as their license asks: "Icons made by Lorc and Delapouite". */
export function creditFor(authors: Iterable<string>): string {
  const names = [...new Set(authors)].filter(Boolean).sort();
  if (names.length === 0) return '';
  const list = names.length === 1 ? names[0] : `${names.slice(0, -1).join(', ')} and ${names.at(-1)}`;
  return `Icons made by ${list}`;
}

/** Forgets the icons loaded so far, for tests. */
export function forgetIcons() {
  loaded.clear();
  index = null;
}
