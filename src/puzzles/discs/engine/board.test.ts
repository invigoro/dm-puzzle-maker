import { describe, expect, it } from 'vitest';
import { mulberry32 } from '../../../kit/rng';
import { LONGEST_HISTORY, play, readBoard, readMoves, reverse, swap, turn, type Board } from './board';
import { FLOWER, positionCount, positionOf } from './layout';
import { randomMove } from './scramble';

const ordered: Board = Array.from({ length: positionCount(FLOWER) }, (_, i) => i);
const spokesOf = (board: Board, disc: number) => board.slice(positionOf(FLOWER, disc, 0), positionOf(FLOWER, disc, 6));

describe('turn', () => {
  it('moves each piece on the disc one spoke clockwise, and nothing else', () => {
    const turned = turn(FLOWER, ordered, 1, 1);
    expect(spokesOf(turned, 1)).toEqual([11, 6, 7, 8, 9, 10]);
    for (const disc of [0, 2, 3, 4, 5, 6]) expect(spokesOf(turned, disc)).toEqual(spokesOf(ordered, disc));
  });

  it('turns anticlockwise by a negative number, and all the way round by six', () => {
    expect(spokesOf(turn(FLOWER, ordered, 0, -1), 0)).toEqual([1, 2, 3, 4, 5, 0]);
    expect(turn(FLOWER, ordered, 3, 6)).toEqual(ordered);
    expect(turn(FLOWER, turn(FLOWER, ordered, 3, 2), 3, -2)).toEqual(ordered);
  });
});

describe('swap', () => {
  it('trades the two pieces at a contact, and nothing else', () => {
    const { a, b } = FLOWER.contacts[FLOWER.goals[0]];
    const swapped = swap(FLOWER, ordered, FLOWER.goals[0]);
    expect([swapped[a], swapped[b]]).toEqual([b, a]);
    expect(swapped.filter((piece, position) => piece !== ordered[position])).toHaveLength(2);
    expect(swap(FLOWER, swapped, FLOWER.goals[0])).toEqual(ordered);
  });
});

describe('readBoard', () => {
  it('takes a board with every piece on it once', () => {
    expect(readBoard(FLOWER, turn(FLOWER, ordered, 2, 1))).toEqual(turn(FLOWER, ordered, 2, 1));
  });

  it('turns down anything else', () => {
    const twice = [...ordered];
    twice[0] = 1;
    for (const junk of [null, 'board', ordered.slice(1), [...ordered, 42], twice, ordered.map((piece) => piece + 0.5)]) {
      expect(readBoard(FLOWER, junk)).toBeNull();
    }
  });
});

describe('readMoves', () => {
  it('takes moves that make sense on the layout', () => {
    const moves = [
      { kind: 'turn', disc: 6, by: -1 },
      { kind: 'swap', contact: 11 },
    ];
    expect(readMoves(FLOWER, moves)).toEqual(moves);
  });

  it('turns down moves that don’t', () => {
    for (const move of [{ kind: 'turn', disc: 7, by: 1 }, { kind: 'turn', disc: 0, by: 1.5 }, { kind: 'swap', contact: 12 }, { kind: 'jump' }, null]) {
      expect(readMoves(FLOWER, [move])).toBeNull();
    }
    expect(readMoves(FLOWER, 'moves')).toBeNull();
  });

  it('keeps only the most recent, when there are too many', () => {
    const moves = Array.from({ length: LONGEST_HISTORY + 5 }, (_, i) => ({ kind: 'swap', contact: i % 12 }));
    expect(readMoves(FLOWER, moves)).toEqual(moves.slice(5));
  });
});

describe('play and reverse', () => {
  it('undo any run of moves', () => {
    const random = mulberry32(11);
    const moves = Array.from({ length: 200 }, () => randomMove(FLOWER, random));
    const end = moves.reduce((board, move) => play(FLOWER, board, move), ordered);
    expect(end).not.toEqual(ordered);
    expect([...moves].reverse().reduce((board, move) => play(FLOWER, board, reverse(move)), end)).toEqual(ordered);
  });
});
