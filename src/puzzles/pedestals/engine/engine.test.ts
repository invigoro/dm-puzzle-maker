import { describe, expect, it } from 'vitest';
import { mulberry32 } from '../../../kit/rng';
import { isFull, lift, nothingPlaced, onFloor, place, readPlaced, scatter } from './placing';
import { describe as say, howManyRight, isBlank, placeKey, sameThing, thingIn, wholeKey } from './things';

describe('things', () => {
  it('tells objects apart by their words, whatever the case, and their pictures', () => {
    expect(sameThing({ text: 'Olive branch' }, { text: ' olive BRANCH ' })).toBe(true);
    expect(sameThing({ text: 'Olive branch', icon: 'olive' }, { text: 'Olive branch' })).toBe(false);
    expect(placeKey(0, { text: 'Sword' })).not.toBe(placeKey(1, { text: 'Sword' }));
    expect(wholeKey([{ text: 'A' }, { text: 'B' }])).not.toBe(wholeKey([{ text: 'B' }, { text: 'A' }]));
  });

  it('reads a thing from untrusted data, its words cut to length and its picture only if it names one', () => {
    expect(thingIn({ text: 'Sword', icon: 'broadsword' }, 40)).toEqual({ text: 'Sword', icon: 'broadsword' });
    expect(thingIn({ text: 'x'.repeat(50), icon: '../../secret' }, 40)).toEqual({ text: 'x'.repeat(40) });
    expect(thingIn('junk', 40)).toEqual({ text: '' });
    expect(isBlank({ text: '  ' })).toBe(true);
    expect(isBlank({ text: '', icon: 'olive' })).toBe(false);
  });

  it('says a thing in words, or by its picture', () => {
    expect(say({ text: 'Sword', icon: 'broadsword' })).toBe('Sword');
    expect(say({ text: '', icon: 'battle-axe' })).toBe('a picture of battle axe');
  });

  it('says how many are right', () => {
    expect(howManyRight(0, 3)).toBe('None of the three is right.');
    expect(howManyRight(1, 3)).toBe('One of the three is right.');
    expect(howManyRight(2, 3)).toBe('Two of the three are right.');
  });
});

describe('placing', () => {
  it('sets an object on a pedestal, moving it off any other, and sends what was there back to the floor', () => {
    let placed = nothingPlaced(3);
    placed = place(placed, 4, 0);
    expect(placed).toEqual([4, null, null]);
    placed = place(placed, 4, 2);
    expect(placed).toEqual([null, null, 4]);
    placed = place(placed, 1, 2);
    expect(placed).toEqual([null, null, 1]);
    expect(onFloor(placed, 5)).toEqual([0, 2, 3, 4]);
    expect(lift(placed, 2)).toEqual([null, null, null]);
    expect(isFull(placed)).toBe(false);
    expect(isFull([0, 2, 1])).toBe(true);
  });

  it('reads placings back, turning away any that don’t fit', () => {
    expect(readPlaced([2, null, 0], 3, 5)).toEqual([2, null, 0]);
    for (const junk of [[2, null], [2, 2, null], [9, null, null], [1.5, null, null], 'all', null]) expect(readPlaced(junk, 3, 5)).toBeNull();
  });

  it('scatters the objects the same way for the same seed, never in the design’s own order', () => {
    expect(scatter(7, mulberry32(3))).toEqual(scatter(7, mulberry32(3)));
    expect([...scatter(7, mulberry32(3))].sort()).toEqual([0, 1, 2, 3, 4, 5, 6]);
    for (let seed = 0; seed < 50; seed++) expect(scatter(2, mulberry32(seed))).toEqual([1, 0]);
    expect(scatter(1, mulberry32(1))).toEqual([0]);
  });
});
