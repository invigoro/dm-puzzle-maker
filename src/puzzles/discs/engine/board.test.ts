import { describe, expect, it } from 'vitest';
import { mulberry32 } from '../../../kit/rng';
import { play, reverse, swap, turn, type Board } from './board';
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

describe('play and reverse', () => {
  it('undo any run of moves', () => {
    const random = mulberry32(11);
    const moves = Array.from({ length: 200 }, () => randomMove(FLOWER, random));
    const end = moves.reduce((board, move) => play(FLOWER, board, move), ordered);
    expect(end).not.toEqual(ordered);
    expect([...moves].reverse().reduce((board, move) => play(FLOWER, board, reverse(move)), end)).toEqual(ordered);
  });
});
