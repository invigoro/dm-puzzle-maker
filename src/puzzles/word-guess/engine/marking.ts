/**
 * Marking a try as the familiar game does: each letter is in the right place, in the answer
 * elsewhere, or not in it. A letter the try has twice is marked elsewhere only as often as the
 * answer has it left over, once the letters in the right places are counted.
 */

export type Mark = 'right' | 'elsewhere' | 'absent';

/**
 * Marks a try from two things about the answer: whether each place holds the try's letter, and how
 * many of each letter the answer has. That's all a player link holds, as fingerprints, so the
 * players' page marks a try the same way the maker does, without the answer.
 */
export function markBy(guess: string, rightAt: readonly boolean[], countOf: (letter: string) => number): Mark[] {
  const letters = [...guess];
  const marks: Mark[] = letters.map((_, at) => (rightAt[at] ? 'right' : 'absent'));
  const left = new Map<string, number>();
  for (const letter of new Set(letters)) {
    const placed = letters.filter((other, at) => other === letter && rightAt[at]).length;
    left.set(letter, countOf(letter) - placed);
  }
  letters.forEach((letter, at) => {
    if (marks[at] === 'right' || (left.get(letter) ?? 0) <= 0) return;
    marks[at] = 'elsewhere';
    left.set(letter, left.get(letter)! - 1);
  });
  return marks;
}

/** Marks a try against the answer itself, as the game master's page can. */
export const mark = (guess: string, answer: string): Mark[] =>
  markBy(
    guess,
    [...guess].map((letter, at) => answer[at] === letter),
    (letter) => [...answer].filter((other) => other === letter).length,
  );

/** What a player knows of each letter so far: the best mark it's had in any try. */
export function bestMarks(tries: readonly { guess: string; marks: readonly Mark[] }[]): Map<string, Mark> {
  const rank: Record<Mark, number> = { absent: 0, elsewhere: 1, right: 2 };
  const best = new Map<string, Mark>();
  for (const { guess, marks } of tries) {
    [...guess].forEach((letter, at) => {
      const known = best.get(letter);
      if (!known || rank[marks[at]] > rank[known]) best.set(letter, marks[at]);
    });
  }
  return best;
}
