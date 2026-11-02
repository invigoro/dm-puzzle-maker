import { useEffect, useState, type DragEvent } from 'react';
import { iconMask } from '../../ui/IconPicker';
import { isFull, lift, nothingPlaced, onFloor, place, type Placed } from './engine/placing';
import { describe, howManyRight, type Thing } from './engine/things';
import type { Checking, PedestalsProgress, Telling } from './puzzle';

/** How the room judges the players' objects: against the answer, in the maker, or a link's fingerprints. */
export interface Judge {
  /** Whether these objects, one on each pedestal in order, are the answer. */
  isAnswer(things: readonly Thing[]): Promise<boolean>;
  /** Whether an object is the right one for a pedestal. */
  isRightAt(pedestal: number, thing: Thing): Promise<boolean>;
  /** The line for solving it, opened with the answer. */
  lineFor(things: readonly Thing[]): Promise<string>;
}

interface RoomProps {
  riddles: readonly Thing[];
  /** Every object, in its place on the floor. */
  objects: readonly Thing[];
  check: Checking;
  tell: Telling;
  wrongLine: string;
  /** After how many wrong placings or checks the players fail: 0 for never. */
  failAfter: number;
  failLine: string;
  judge: Judge;
  initial?: PedestalsProgress | null;
  onProgress?(progress: PedestalsProgress): void;
}

/** A riddle or an object as the room shows it: its picture, its words, or both. */
function ThingView({ thing, className }: { thing: Thing; className: string }) {
  return (
    <span className={`thing ${className}`}>
      {thing.icon && <span className="icon-thumb" style={iconMask(thing.icon)} />}
      {thing.text.trim() && <span className="words">{thing.text.trim()}</span>}
    </span>
  );
}

/** What's dragged: an object from the floor, or one from a pedestal. */
const dragged = (event: DragEvent) => event.dataTransfer.getData('text/plain').match(/^(floor|pedestal):(\d+)$/);

/**
 * A room of pedestals, each with its riddle, and objects on the floor to set on them, by taps, drags
 * or keys. It's judged when all are right, as each object is set down, or when the players ask.
 */
export function Room({ riddles, objects, check, tell, wrongLine, failAfter, failLine, judge, initial, onProgress }: RoomProps) {
  const [placed, setPlaced] = useState<Placed>(initial?.placed ?? nothingPlaced(riddles.length));
  /** The object picked up from the floor, to set down, and the pedestal whose object is being dragged away. */
  const [holding, setHolding] = useState<number | null>(null);
  const [lifting, setLifting] = useState<number | null>(null);
  const [wrong, setWrong] = useState(initial?.wrong ?? 0);
  const [solved, setSolved] = useState(initial?.solved ?? false);
  const [failed, setFailed] = useState(initial?.failed ?? false);
  /** The line for solving it, once opened; what the last wrong placing or check said. */
  const [line, setLine] = useState('');
  const [said, setSaid] = useState('');
  /** The pedestals the last check found right, when a check says which. */
  const [glowing, setGlowing] = useState<ReadonlySet<number>>(new Set());
  /** The placings last checked, so the same ones aren't checked twice. */
  const [checked, setChecked] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const done = solved || failed;
  const thingsOn = (on: readonly number[]) => on.map((object) => objects[object]);

  useEffect(() => {
    onProgress?.({ placed, wrong, solved, failed });
  }, [placed, wrong, solved, failed, onProgress]);

  // Solved before, so the line's opened again from what's on the pedestals: once, for where they left off.
  useEffect(() => {
    if (initial?.solved && isFull(initial.placed)) judge.lineFor(initial.placed.map((object) => objects[object])).then(setLine);
  }, []);

  // When all are right, it's solved: nothing's said before.
  useEffect(() => {
    if (check !== 'all' || solved || !isFull(placed)) return;
    let current = true;
    const things = placed.map((object) => objects[object]);
    judge.isAnswer(things).then((right) => current && right && solve(things));
    return () => {
      current = false;
    };
    // `solve` only sets state, so isn't among them.
  }, [check, placed, solved, judge, objects]);

  function solve(things: readonly Thing[]) {
    setSolved(true);
    setHolding(null);
    setSaid('');
    judge.lineFor(things).then(setLine);
  }

  function missed(message: string) {
    const count = wrong + 1;
    setWrong(count);
    setSaid(message);
    if (failAfter > 0 && count >= failAfter) {
      setFailed(true);
      setHolding(null);
    }
  }

  /** New placings: a check of the old ones no longer stands for the pedestals that changed. */
  function moved(next: Placed) {
    setGlowing(new Set([...glowing].filter((pedestal) => next[pedestal] === placed[pedestal])));
    setPlaced(next);
    setSaid('');
  }

  async function setOn(object: number, pedestal: number) {
    setHolding(null);
    if (done || busy || placed[pedestal] === object) return;
    if (check !== 'placed') return moved(place(placed, object, pedestal));
    // Judged as it's set down: a right object stays, and a wrong one drops back to the floor.
    if (placed[pedestal] !== null) return;
    setBusy(true);
    const right = await judge.isRightAt(pedestal, objects[object]);
    setBusy(false);
    if (!right) return missed(wrongLine || 'That’s not it.');
    const next = place(placed, object, pedestal);
    moved(next);
    if (isFull(next)) solve(thingsOn(next));
  }

  function takeBack(pedestal: number) {
    // A right object, judged as it's set down, stays.
    if (done || busy || check === 'placed' || placed[pedestal] === null) return;
    moved(lift(placed, pedestal));
  }

  function onPedestal(pedestal: number) {
    if (holding !== null) setOn(holding, pedestal);
    else takeBack(pedestal);
  }

  async function checkAnswer() {
    if (!isFull(placed) || done || busy) return;
    const things = thingsOn(placed);
    setChecked(JSON.stringify(placed));
    setHolding(null);
    setBusy(true);
    if (await judge.isAnswer(things)) {
      setBusy(false);
      return solve(things);
    }
    let told = '';
    if (tell !== 'wrong') {
      const right = (await Promise.all(things.map((thing, pedestal) => judge.isRightAt(pedestal, thing)))).flatMap((is, pedestal) => (is ? [pedestal] : []));
      if (tell === 'count') told = howManyRight(right.length, riddles.length);
      else {
        setGlowing(new Set(right));
        told = right.length > 0 ? 'The right ones glow.' : howManyRight(0, riddles.length);
      }
    }
    setBusy(false);
    missed([wrongLine || 'That’s not it.', told].filter(Boolean).join(' '));
  }

  /** A pedestal's object picked up to drag: it's the object that's seen moving, not the pedestal, and it fades where it stood. */
  function dragFrom(event: DragEvent<HTMLElement>, pedestal: number) {
    event.dataTransfer.setData('text/plain', `pedestal:${pedestal}`);
    const offering = event.currentTarget.querySelector<HTMLElement>('.offering');
    if (offering) {
      // Held where the pointer took it, by its nearest edge when the pointer took the plinth, or by its middle when there's no knowing.
      const box = offering.getBoundingClientRect();
      const within = (at: number, from: number, size: number) => (Number.isFinite(at) ? Math.min(Math.max(at - from, 0), size) : size / 2);
      event.dataTransfer.setDragImage(offering, within(event.clientX, box.left, box.width), within(event.clientY, box.top, box.height));
    }
    // A frame later, once the browser has its picture of the object as it was.
    requestAnimationFrame(() => setLifting(pedestal));
  }

  function drop(event: DragEvent, pedestal: number) {
    event.preventDefault();
    const [, from, at] = dragged(event) ?? [];
    if (from === 'floor') setOn(Number(at), pedestal);
    else if (from === 'pedestal' && placed[Number(at)] !== null) setOn(placed[Number(at)]!, pedestal);
  }

  function dropOnFloor(event: DragEvent) {
    event.preventDefault();
    const [, from, at] = dragged(event) ?? [];
    if (from === 'pedestal') takeBack(Number(at));
  }

  const lying = new Set(onFloor(placed, objects.length));
  const canCheck = check === 'asked' && isFull(placed) && JSON.stringify(placed) !== checked && !done && !busy;
  const noun = check === 'placed' ? 'placing' : 'check';

  return (
    <div className="game pedestals-room">
      <div className={holding !== null ? 'pedestals holding' : 'pedestals'} role="group" aria-label="The pedestals">
        {riddles.map((riddle, pedestal) => {
          const on = placed[pedestal];
          return (
            <button
              key={pedestal}
              type="button"
              className={['pedestal', glowing.has(pedestal) && 'glow', solved && 'lit', lifting === pedestal && 'lifting'].filter(Boolean).join(' ')}
              aria-label={`Pedestal ${pedestal + 1}, “${describe(riddle)}”: ${on === null ? 'empty' : `holding ${describe(objects[on])}`}${glowing.has(pedestal) ? ', right' : ''}`}
              draggable={on !== null && !done && check !== 'placed'}
              onDragStart={(event) => dragFrom(event, pedestal)}
              onDragEnd={() => setLifting(null)}
              onDragOver={(event) => event.preventDefault()}
              onDrop={(event) => drop(event, pedestal)}
              onClick={() => onPedestal(pedestal)}
            >
              <span className="top">{on === null ? <span className="empty" /> : <ThingView thing={objects[on]} className="offering" />}</span>
              <span className="plinth">
                <ThingView thing={riddle} className="plaque" />
              </span>
            </button>
          );
        })}
      </div>
      <div className="room-floor" role="group" aria-label="The floor" onDragOver={(event) => event.preventDefault()} onDrop={dropOnFloor}>
        {objects.map((thing, object) =>
          lying.has(object) ? (
            <button
              key={object}
              type="button"
              className="offering"
              aria-label={describe(thing)}
              aria-pressed={holding === object}
              disabled={done}
              draggable={!done}
              onDragStart={(event) => {
                event.dataTransfer.setData('text/plain', `floor:${object}`);
                setHolding(object);
              }}
              onClick={() => setHolding(holding === object ? null : object)}
            >
              <ThingView thing={thing} className="on-floor" />
            </button>
          ) : (
            // Where it lay, so the rest stay put.
            <span key={object} className="offering gone" aria-hidden="true" />
          ),
        )}
      </div>
      <p className="hint">
        Tap an object, then the pedestal to set it on, or drag it there.{' '}
        {check === 'placed'
          ? 'Each is judged as it’s set down, and a right one stays.'
          : `Tap a pedestal to take its object back.${check === 'asked' ? ' When every pedestal holds something, check the answer.' : ''}`}
      </p>
      <div className="game-actions">
        {check !== 'placed' && (
          <button type="button" onClick={() => moved(nothingPlaced(riddles.length))} disabled={done || busy || placed.every((on) => on === null)}>
            Take them all back
          </button>
        )}
        {check === 'asked' && (
          <button type="button" className="primary" onClick={checkAnswer} disabled={!canCheck}>
            Check the answer
          </button>
        )}
        {check !== 'all' && (
          <span className="moves">
            {wrong === 1 ? `1 wrong ${noun}` : `${wrong} wrong ${noun}s`}
            {failAfter > 0 && `, of ${failAfter}`}
          </span>
        )}
      </div>
      <p className={!solved && (said || failed) ? 'success wrong' : 'success'} role="status">
        {solved ? line : [said, failed ? failLine || 'That was the last chance.' : ''].filter(Boolean).join(' ')}
      </p>
    </div>
  );
}
