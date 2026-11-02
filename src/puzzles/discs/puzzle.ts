/** What a player link holds for turning discs, read and checked on the players' side. */
import { fingerprint } from '../../kit/check';
import { isIconName } from '../../kit/icons';
import { keptKey } from '../../kit/kept';
import { readWords, type Words } from '../../kit/words';
import { answerKey, glowKeysAt, LONGEST_HALF, type Piece } from './engine/answer';
import { readBoard, readMoves, type Board, type Move } from './engine/board';
import { FLOWER, layoutById, positionCount, type Layout, type LayoutId } from './engine/layout';

/**
 * A puzzle as players get it: the pieces as they start, spoke by spoke, and fingerprints of the
 * answers that count. Nothing says which pieces are halves of the answer, which go together, or in
 * what order.
 */
export interface DiscsPuzzle {
  v: 1;
  words: Words;
  layout: LayoutId;
  /** Each spoke's piece at the start, in the layout's order of positions: its words. */
  pieces: string[];
  /** Each piece's picture, in the same order, '' for none. Only there when some piece has one. */
  icons?: string[];
  /** Whether the board points out where the answer starts: it does unless any start counts. */
  mark: boolean;
  salt: string;
  answers: string[];
  /** Fingerprints of each name where it glows, when the game master lets names glow as they come right. */
  glows?: string[];
  /** Only there when the board is checked when the players ask, not after every move: then what a wrong check says. */
  check?: 'asked';
  wrong?: string;
}

/** The longest line a wrong check says. */
export const LONGEST_WRONG = 200;

const NO_WORDS: Words = { title: '', intro: '', success: '' };

const textIn = (value: unknown, longest: number): value is string => typeof value === 'string' && value.length <= longest;

/** A puzzle from a player link, checked, or null if the link doesn't hold one. */
export function readPuzzle(data: unknown): DiscsPuzzle | null {
  if (!data || typeof data !== 'object' || Array.isArray(data)) return null;
  const input = data as Record<string, unknown>;
  const { pieces, salt, answers } = input;
  const layout = layoutById(input.layout);
  if (input.v !== 1 || !layout) return null;
  if (!Array.isArray(pieces) || pieces.length !== positionCount(layout) || !pieces.every((piece) => textIn(piece, LONGEST_HALF))) return null;
  if (!textIn(salt, 64) || salt === '') return null;
  const most = layout.goals.length;
  if (!Array.isArray(answers) || answers.length === 0 || answers.length > most || !answers.every((answer) => textIn(answer, 64))) return null;
  const { icons, glows } = input;
  if (icons !== undefined && (!Array.isArray(icons) || icons.length !== pieces.length || !icons.every((icon) => icon === '' || isIconName(icon)))) return null;
  if (glows !== undefined && (!Array.isArray(glows) || glows.length > most || !glows.every((glow) => textIn(glow, 64)))) return null;
  // Links made before checking by asking check after every move.
  const { check, wrong } = input;
  if (check !== undefined && check !== 'asked') return null;
  if (wrong !== undefined && !textIn(wrong, LONGEST_WRONG)) return null;
  return {
    v: 1,
    words: readWords(input.words, NO_WORDS),
    layout: layout.id,
    pieces,
    ...(icons ? { icons } : {}),
    mark: input.mark !== false,
    salt,
    answers,
    ...(glows ? { glows } : {}),
    ...(check === 'asked' ? { check, wrong: typeof wrong === 'string' ? wrong : '' } : {}),
  };
}

/** The puzzle's layout. */
export const layoutIn = (puzzle: DiscsPuzzle): Layout => layoutById(puzzle.layout) ?? FLOWER;

/** The puzzle's pieces, numbered as its boards number them: by where each starts. */
export const piecesIn = (puzzle: DiscsPuzzle): Piece[] =>
  puzzle.pieces.map((text, i) => (puzzle.icons?.[i] ? { text, icon: puzzle.icons[i] } : { text }));

/** Whether a board is solved: the fingerprint of its answer key is one of the puzzle's. */
export async function isRight(puzzle: DiscsPuzzle, board: Board): Promise<boolean> {
  return puzzle.answers.includes(await fingerprint(answerKey(layoutIn(puzzle), piecesIn(puzzle), board), puzzle.salt));
}

/**
 * Which goal contacts glow on a board: those whose fingerprint is one of the puzzle's glows. Most
 * moves leave most contacts as they were, so each key's fingerprint is made once, in `seen`.
 */
export async function glowing(puzzle: DiscsPuzzle, board: Board, seen = new Map<string, Promise<string>>()): Promise<number[]> {
  if (!puzzle.glows) return [];
  const glows = new Set(puzzle.glows);
  const keys = glowKeysAt(layoutIn(puzzle), piecesIn(puzzle), board, !puzzle.mark);
  const fingerprints = await Promise.all(
    keys.map((key) => {
      if (!seen.has(key)) seen.set(key, fingerprint(key, puzzle.salt));
      return seen.get(key)!;
    }),
  );
  return fingerprints.flatMap((made, goal) => (glows.has(made) ? [goal] : []));
}

/** A player's board and the moves that made it, as the browser keeps them. */
export interface Progress {
  board: Board;
  moves: Move[];
  /** When the board is checked on asking: how many checks were wrong, and whether one has been right. */
  wrong?: number;
  solved?: boolean;
}

/** Progress from untrusted data, on a layout, or null if it isn't any. */
export function readProgress(layout: Layout, data: unknown): Progress | null {
  const input = data && typeof data === 'object' ? (data as Record<string, unknown>) : {};
  const board = readBoard(layout, input.board);
  const moves = readMoves(layout, input.moves);
  if (!board || !moves) return null;
  const { wrong } = input;
  return {
    board,
    moves,
    ...(Number.isInteger(wrong) && (wrong as number) >= 0 ? { wrong: wrong as number } : {}),
    ...(input.solved === true ? { solved: true } : {}),
  };
}

/** Where a player's progress on a puzzle is kept: each link has its own salt, so its own place. */
export const progressKey = (puzzle: DiscsPuzzle) => keptKey('discs', puzzle.salt);
