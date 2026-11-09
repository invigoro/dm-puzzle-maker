/**
 * A cryptogram: each letter of a message swapped for a symbol, always the same one, with no wheel
 * and no key to find. The players work it out from the shapes of words and which symbols come most
 * often.
 */
import { randomInt, type Random } from '../../../kit/rng';
import { indexOf, letterAt } from './letters';

/**
 * A scrambled alphabet: for each letter, A to Z, the place of the symbol it's written as. No letter
 * keeps its own place, as a newspaper's cryptogram never writes a letter as itself: Sattolo's
 * shuffle makes one long cycle, so it never can.
 */
export function scramble(random: Random): number[] {
  const order = Array.from({ length: 26 }, (_, place) => place);
  for (let i = order.length - 1; i > 0; i--) {
    const j = randomInt(random, i);
    [order[i], order[j]] = [order[j], order[i]];
  }
  return order;
}

/** A message with each letter written as its symbol's place (A for the first, Z for the last), and everything else as it is. */
export const substitute = (plain: string, places: readonly number[]) => plain.replace(/[A-Z]/g, (letter) => letterAt(places[indexOf(letter)]));

/** How often each symbol comes in a cryptogram, by its place: the commonest first, then in their order. */
export function counts(text: string): { place: number; count: number }[] {
  const found = new Map<number, number>();
  for (const char of text) if (char >= 'A' && char <= 'Z') found.set(indexOf(char), (found.get(indexOf(char)) ?? 0) + 1);
  return [...found].map(([place, count]) => ({ place, count })).sort((one, other) => other.count - one.count || one.place - other.place);
}
