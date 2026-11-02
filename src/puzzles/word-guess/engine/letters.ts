/** The letters a word guess compares: capitals A to Z, with accents taken off, and the words they make. */

/** The words of a text, as their letters: "Open Sésame!" is ["OPEN", "SESAME"]. */
export function wordsIn(text: string): string[] {
  return text
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toUpperCase()
    .split(/\s+/)
    .map((word) => word.replace(/[^A-Z]/g, ''))
    .filter(Boolean);
}

/** A text's letters, run together: what a try is compared by. */
export const lettersIn = (text: string) => wordsIn(text).join('');

/** The order hints give letters in: each word's first letter, then the rest from the left. */
export function hintOrder(shape: readonly number[]): number[] {
  const starts = shape.map((_, word) => shape.slice(0, word).reduce((sum, length) => sum + length, 0));
  const total = shape.reduce((sum, length) => sum + length, 0);
  const rest = Array.from({ length: total }, (_, at) => at).filter((at) => !starts.includes(at));
  return [...starts, ...rest];
}
