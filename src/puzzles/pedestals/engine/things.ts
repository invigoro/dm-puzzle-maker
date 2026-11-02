/** Riddles and objects: each words, a picture, or both. And the keys a right answer makes, to fingerprint. */
import { iconWords, isIconName } from '../../../kit/icons';

/** A riddle or an object: its words, its picture from the icon set, or both. */
export interface Thing {
  text: string;
  icon?: string;
}

/** The most letters a riddle has, and an object. */
export const LONGEST_RIDDLE = 120;
export const LONGEST_OBJECT = 40;

export const isBlank = (thing: Thing) => thing.text.trim() === '' && !thing.icon;

/** A thing from untrusted data: words cut to length, and a picture only if it names one. */
export function thingIn(value: unknown, longest: number): Thing {
  const input = value && typeof value === 'object' ? (value as Record<string, unknown>) : {};
  const text = typeof input.text === 'string' ? input.text.slice(0, longest) : '';
  return isIconName(input.icon) ? { text, icon: input.icon } : { text };
}

/** A thing as a link holds it: its words trimmed, and its picture only if it has one. */
export const tidyThing = (thing: Thing): Thing => (thing.icon ? { text: thing.text.trim(), icon: thing.icon } : { text: thing.text.trim() });

/** What tells one object from another: its words, whatever their case, and its picture. Two objects alike are the same object. */
export const thingKey = (thing: Thing) => JSON.stringify([thing.text.trim().toLowerCase(), thing.icon ?? '']);

export const sameThing = (one: Thing, other: Thing) => thingKey(one) === thingKey(other);

/** The key of an object on a pedestal, numbered from 0. */
export const placeKey = (pedestal: number, thing: Thing) => `${pedestal}:${thingKey(thing)}`;

/** The key of an object on every pedestal, in order: the answer's, when they're the right ones. */
export const wholeKey = (things: readonly Thing[]) => things.map((thing, pedestal) => placeKey(pedestal, thing)).join('\n');

/** A thing in words, for screen readers and the page: its words, or its picture's name. */
export const describe = (thing: Thing) => thing.text.trim() || (thing.icon ? `a picture of ${iconWords(thing.icon)}` : 'nothing');

/** A number in words, as the page says how many are right: "two". */
const inWords = (n: number) => ['none', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight'][n] ?? String(n);
const capital = (text: string) => text[0].toUpperCase() + text.slice(1);

/** How many pedestals hold the right object, as a wrong check says it: "One of the three is right." */
export function howManyRight(right: number, of: number): string {
  if (right === 0) return `None of the ${inWords(of)} is right.`;
  return `${capital(inWords(right))} of the ${inWords(of)} ${right === 1 ? 'is' : 'are'} right.`;
}
