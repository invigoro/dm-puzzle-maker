/** What a player link holds for turning discs, read and checked on the players' side. */
import { fingerprint } from '../../kit/check';
import { isIconName } from '../../kit/icons';
import { readWords, type Words } from '../../kit/words';
import { answerKey, LONGEST_HALF, type Piece } from './engine/answer';
import { readBoard, readMoves, type Board, type Move } from './engine/board';
import { FLOWER, positionCount } from './engine/layout';

/**
 * A puzzle as players get it: the pieces as they start, spoke by spoke, and fingerprints of the
 * answers that count. Nothing says which pieces are halves of the answer, which go together, or in
 * what order.
 */
export interface DiscsPuzzle {
  v: 1;
  words: Words;
  layout: 'flower';
  /** Each spoke's piece at the start, in the layout's order of positions: its words. */
  pieces: string[];
  /** Each piece's picture, in the same order, '' for none. Only there when some piece has one. */
  icons?: string[];
  /** Whether the board points out where the answer starts: it does unless any start counts. */
  mark: boolean;
  salt: string;
  answers: string[];
}

const NO_WORDS: Words = { title: '', intro: '', success: '' };

const textIn = (value: unknown, longest: number): value is string => typeof value === 'string' && value.length <= longest;

/** A puzzle from a player link, checked, or null if the link doesn't hold one. */
export function readPuzzle(data: unknown): DiscsPuzzle | null {
  if (!data || typeof data !== 'object' || Array.isArray(data)) return null;
  const input = data as Record<string, unknown>;
  const { pieces, salt, answers } = input;
  if (input.v !== 1 || input.layout !== 'flower') return null;
  if (!Array.isArray(pieces) || pieces.length !== positionCount(FLOWER) || !pieces.every((piece) => textIn(piece, LONGEST_HALF))) return null;
  if (!textIn(salt, 64) || salt === '') return null;
  const most = FLOWER.goals.length;
  if (!Array.isArray(answers) || answers.length === 0 || answers.length > most || !answers.every((answer) => textIn(answer, 64))) return null;
  const { icons } = input;
  if (icons !== undefined && (!Array.isArray(icons) || icons.length !== pieces.length || !icons.every((icon) => icon === '' || isIconName(icon)))) return null;
  return {
    v: 1,
    words: readWords(input.words, NO_WORDS),
    layout: 'flower',
    pieces,
    ...(icons ? { icons } : {}),
    mark: input.mark !== false,
    salt,
    answers,
  };
}

/** The puzzle's pieces, numbered as its boards number them: by where each starts. */
export const piecesIn = (puzzle: DiscsPuzzle): Piece[] =>
  puzzle.pieces.map((text, i) => (puzzle.icons?.[i] ? { text, icon: puzzle.icons[i] } : { text }));

/** Whether a board is solved: the fingerprint of its answer key is one of the puzzle's. */
export async function isRight(puzzle: DiscsPuzzle, board: Board): Promise<boolean> {
  return puzzle.answers.includes(await fingerprint(answerKey(FLOWER, piecesIn(puzzle), board), puzzle.salt));
}

/** A player's board and the moves that made it, as the browser keeps them. */
export interface Progress {
  board: Board;
  moves: Move[];
}

/** Progress from untrusted data, or null if it isn't any. */
export function readProgress(data: unknown): Progress | null {
  const input = data && typeof data === 'object' ? (data as Record<string, unknown>) : {};
  const board = readBoard(FLOWER, input.board);
  const moves = readMoves(FLOWER, input.moves);
  return board && moves ? { board, moves } : null;
}

/** Where a player's progress on a puzzle is kept: each link has its own salt, so its own place. */
export const progressKey = (puzzle: DiscsPuzzle) => `daedalus:discs:${puzzle.salt}`;
