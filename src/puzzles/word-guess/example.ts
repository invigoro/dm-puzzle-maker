/** A word guess to start from: never a game master's own. */
import type { Words } from '../../kit/words';

export const EXAMPLE: { words: Words; answer: string; out: string } = {
  words: {
    title: 'The smith’s door',
    intro: 'Carved over the door: “Name the tree my hammer’s haft was cut from.” The door will hear six answers, then fall silent.',
    success: 'The door swings open on oiled hinges.',
  },
  answer: 'Ironwood',
  out: 'The carving darkens, and the door falls silent.',
};
