import { useId, useMemo, useState } from 'react';
import { iconWords } from '../../kit/icons';
import { randomSeed } from '../../kit/rng';
import { IconCredit } from '../../ui/IconCredit';
import { iconMask, IconPicker } from '../../ui/IconPicker';
import type { MakerProps } from '../types';
import { FAIL_AFTER, failAfterOf, floorOf, problemsOf, type PedestalsDesign } from './design';
import { isBlank, LONGEST_OBJECT, LONGEST_RIDDLE, sameThing, type Thing } from './engine/things';
import { EXAMPLE } from './example';
import { judgesEach, LONGEST_LINE, MOST_OTHERS, MOST_PEDESTALS, type Checking, type Telling } from './puzzle';
import { Room, type Judge } from './Room';

/** Where a riddle or an object is in the design: a pedestal's riddle or object, or an other object. */
type Spot = { list: 'riddle' | 'object' | 'other'; index: number };

const blank = (): Thing => ({ text: '' });
const sameSpot = (one: Spot | null, other: Spot) => one !== null && one.list === other.list && one.index === other.index;

const CHECKS: readonly { check: Checking; name: string; says: string }[] = [
  { check: 'all', name: 'When all are right', says: 'the pedestals open the moment each holds its object, with nothing said before. Trying costs nothing.' },
  { check: 'placed', name: 'As each is placed', says: 'a right object settles and stays; a wrong one says your line, and drops back to the floor.' },
  { check: 'asked', name: 'When they ask', says: 'once every pedestal holds something, they press Check the answer. A wrong check says your line.' },
];

const TELLS: readonly { tell: Telling; says: string }[] = [
  { tell: 'wrong', says: 'only that it’s wrong' },
  { tell: 'count', says: 'how many are right' },
  { tell: 'which', says: 'which are right: those pedestals glow' },
];

/** The game master's part of the maker: the pedestals, their riddles and objects, the others, how it's checked, and a try of it. */
export function Designer({ design, onChange }: MakerProps<PedestalsDesign>) {
  const id = useId();
  const [picking, setPicking] = useState<Spot | null>(null);
  const set = (change: Partial<PedestalsDesign>) => onChange({ ...design, ...change });

  const thingAt = (spot: Spot): Thing =>
    spot.list === 'other' ? design.others[spot.index] : design.pedestals[spot.index][spot.list === 'riddle' ? 'riddle' : 'object'];
  function setThing(spot: Spot, thing: Thing) {
    if (spot.list === 'other') return set({ others: design.others.map((each, i) => (i === spot.index ? thing : each)) });
    const part = spot.list === 'riddle' ? 'riddle' : 'object';
    set({ pedestals: design.pedestals.map((each, i) => (i === spot.index ? { ...each, [part]: thing } : each)) });
  }

  /** A riddle or an object: its picture, from the icon set, and its words. */
  function thingField(spot: Spot, label: string, longest: number, placeholder: string) {
    const thing = thingAt(spot);
    return (
      <span className={`half-field thing-field ${spot.list}`}>
        <input aria-label={label} value={thing.text} maxLength={longest} placeholder={placeholder} onChange={(event) => setThing(spot, { ...thing, text: event.target.value })} />
        <button
          type="button"
          className={thing.icon ? 'picture-button chosen' : 'picture-button'}
          aria-label={`Picture for ${label.toLowerCase()}`}
          aria-expanded={sameSpot(picking, spot)}
          title={thing.icon ? iconWords(thing.icon) : 'Add a picture'}
          onClick={() => setPicking(sameSpot(picking, spot) ? null : spot)}
        >
          {thing.icon ? <span className="icon-thumb" style={iconMask(thing.icon)} /> : <span aria-hidden="true">🖼</span>}
        </button>
      </span>
    );
  }

  /** The picker, under the list whose picture it chooses. */
  function picker(lists: Spot['list'][]) {
    if (!picking || !lists.includes(picking.list)) return null;
    const label = picking.list === 'riddle' ? `riddle ${picking.index + 1}` : picking.list === 'object' ? `object for pedestal ${picking.index + 1}` : `other object ${picking.index + 1}`;
    const spot = picking;
    return (
      <IconPicker
        label={`Picture for ${label}`}
        value={thingAt(spot).icon}
        onPick={(icon) => {
          const { icon: _, ...words } = thingAt(spot);
          setThing(spot, icon ? { ...words, icon } : words);
          setPicking(null);
        }}
        onClose={() => setPicking(null)}
      />
    );
  }

  const floor = useMemo(() => floorOf(design), [design]);
  const problems = problemsOf(design);
  const right = design.pedestals.map((pedestal) => pedestal.object);
  const success = design.words.success.trim() || 'Solved.';
  // The answer's known here, so the try is judged against it, as a link's fingerprints would judge it.
  const judge = useMemo<Judge>(
    () => ({
      isAnswer: async (things) => things.every((thing, pedestal) => sameThing(thing, right[pedestal])),
      isRightAt: async (pedestal, thing) => sameThing(thing, right[pedestal]),
      lineFor: async () => success,
    }),
    // `right` is made from the pedestals.
    [design.pedestals, success],
  );
  // The room to try starts again whenever what's in it changes, or how it's checked.
  const trial = JSON.stringify([design.pedestals, floor, design.check, design.tell, failAfterOf(design)]);
  const empty = design.words.title.trim() === '' && design.pedestals.every((pedestal) => isBlank(pedestal.riddle) && isBlank(pedestal.object));

  return (
    <>
      <section className="panel">
        <h2>The pedestals</h2>
        <p className="hint">
          Up to {MOST_PEDESTALS}, each with its riddle and the one object that’s right for it. Each can be words, a picture, or both.
        </p>
        <ol className="pedestal-rows">
          {design.pedestals.map((_, i) => (
            <li key={i}>
              {thingField({ list: 'riddle', index: i }, `Riddle ${i + 1}`, LONGEST_RIDDLE, 'Place the greatest weapon.')}
              {thingField({ list: 'object', index: i }, `Object for pedestal ${i + 1}`, LONGEST_OBJECT, 'Olive branch')}
              {design.pedestals.length > 1 && (
                <button
                  type="button"
                  onClick={() => {
                    setPicking(null);
                    set({ pedestals: design.pedestals.filter((_, j) => j !== i) });
                  }}
                >
                  Take away
                </button>
              )}
            </li>
          ))}
        </ol>
        {picker(['riddle', 'object'])}
        <p>
          {design.pedestals.length < MOST_PEDESTALS && (
            <button type="button" onClick={() => set({ pedestals: [...design.pedestals, { riddle: blank(), object: blank() }] })}>
              Add a pedestal
            </button>
          )}{' '}
          {empty && (
            <>
              <button type="button" onClick={() => onChange({ ...design, ...EXAMPLE })}>
                Start from the example
              </button>{' '}
              <span className="hint">three made-up riddles, and objects to choose among</span>
            </>
          )}
        </p>
      </section>

      <section className="panel">
        <h2>Other objects</h2>
        <p className="hint">
          Up to {MOST_OTHERS} more, right for no pedestal. The best look as if they might be: a sword and a war axe beside the olive
          branch. Blank ones are left out.
        </p>
        <ol className="pedestal-rows">
          {design.others.map((_, i) => (
            <li key={i}>
              {thingField({ list: 'other', index: i }, `Other object ${i + 1}`, LONGEST_OBJECT, 'Sword')}
              <button
                type="button"
                onClick={() => {
                  setPicking(null);
                  set({ others: design.others.filter((_, j) => j !== i) });
                }}
              >
                Take away
              </button>
            </li>
          ))}
        </ol>
        {picker(['other'])}
        <p>
          {design.others.length < MOST_OTHERS && (
            <button type="button" onClick={() => set({ others: [...design.others, blank()] })}>
              Add an object
            </button>
          )}{' '}
          <button type="button" onClick={() => set({ seed: randomSeed() })}>
            🎲 Scatter them again
          </button>
        </p>
        <p className="hint">The objects lie on the floor in an order from a seed, so the right ones don’t come first.</p>
      </section>

      <section className="panel">
        <h2>Checking</h2>
        <div role="radiogroup" aria-label="Checking the answer">
          {CHECKS.map(({ check, name, says }) => (
            <label key={check} className="check">
              <input type="radio" name={`${id}-check`} checked={design.check === check} onChange={() => set({ check })} />
              <span>
                <strong>{name}:</strong> {says}
              </span>
            </label>
          ))}
        </div>
        {design.check === 'asked' && (
          <div role="radiogroup" aria-label="What a wrong check tells them">
            <p>A wrong check tells them</p>
            {TELLS.map(({ tell, says }) => (
              <label key={tell} className="check">
                <input type="radio" name={`${id}-tell`} checked={design.tell === tell} onChange={() => set({ tell })} />
                <span>{says}</span>
              </label>
            ))}
          </div>
        )}
        {design.check !== 'all' && (
          <>
            <div className="field">
              <label htmlFor={`${id}-wrong`}>{design.check === 'placed' ? 'A wrong object says' : 'A wrong check says'}</label>
              <input
                id={`${id}-wrong`}
                value={design.wrongLine}
                maxLength={LONGEST_LINE}
                placeholder="A gout of flame from the plinth: 2d6 fire."
                onChange={(event) => set({ wrongLine: event.target.value })}
              />
              <span className="hint">Left blank, it says “That’s not it.” The page counts them, and keeps the count in the players’ browser.</span>
            </div>
            <div className="row">
              <label htmlFor={`${id}-fail`}>They fail</label>
              <select id={`${id}-fail`} value={design.failAfter} onChange={(event) => set({ failAfter: Number(event.target.value) })}>
                {FAIL_AFTER.map((count) => (
                  <option key={count} value={count}>
                    {count === 0 ? 'Never' : count === 1 ? 'At the first wrong one' : `After ${count} wrong`}
                  </option>
                ))}
              </select>
            </div>
            {design.failAfter > 0 && (
              <div className="field">
                <label htmlFor={`${id}-fail-line`}>Failing says</label>
                <input id={`${id}-fail-line`} value={design.failLine} maxLength={LONGEST_LINE} onChange={(event) => set({ failLine: event.target.value })} />
              </div>
            )}
          </>
        )}
        {judgesEach(design.check, design.check === 'asked' ? design.tell : undefined) && (
          <p className="hint">Judging pedestals one at a time puts a quick fingerprint of each in the player link, so a programmer could find them.</p>
        )}
      </section>

      <section className="panel">
        <h2>Try it</h2>
        <p className="hint">As your players will see it. Placing objects here changes nothing in the puzzle.</p>
        {problems.length === 0 ? (
          <Room
            key={trial}
            riddles={design.pedestals.map((pedestal) => pedestal.riddle)}
            objects={floor}
            check={design.check}
            tell={design.tell}
            wrongLine={design.wrongLine.trim()}
            failAfter={failAfterOf(design)}
            failLine={design.failLine.trim()}
            judge={judge}
          />
        ) : (
          <p className="hint">Give every pedestal a riddle and its object to try it.</p>
        )}
        <IconCredit names={[...design.pedestals.flatMap((pedestal) => [pedestal.riddle, pedestal.object]), ...design.others].flatMap((thing) => (thing.icon ? [thing.icon] : []))} />
      </section>
    </>
  );
}
