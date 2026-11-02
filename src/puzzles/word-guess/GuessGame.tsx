import { useEffect, useRef, useState, type KeyboardEvent } from 'react';
import { bestMarks, type Mark } from './engine/marking';
import type { Checked, GuessProgress } from './puzzle';

interface Attempt extends Checked {
  guess: string;
}

interface GuessGameProps {
  /** The lengths of the words the players see. */
  shape: readonly number[];
  /** The answer's letters, shuffled, when they arrange tiles. */
  tiles?: string;
  /** How many tries they have: 0 for as many as they like. */
  tries: number;
  check(guess: string): Promise<Checked>;
  /** The line for solving it, given the right answer. */
  lineFor(guess: string): Promise<string>;
  /** The line for running out of tries. */
  out: string;
  /** The letters hints may give, in order. */
  hints: readonly (readonly [number, string])[];
  /** Where a player left off. */
  initial?: GuessProgress | null;
  onProgress?(progress: GuessProgress): void;
  /** Whether it takes the keyboard when it opens: on the players' page, not in the maker. */
  autoFocus?: boolean;
}

const KEYS = ['QWERTYUIOP', 'ASDFGHJKL', 'ZXCVBNM'];
const SAID: Record<Mark, string> = { right: 'right', elsewhere: 'elsewhere', absent: 'not in it' };

/** A word guess to play: tries marked as they're made, hints, and a line for solving it or running out. */
export function GuessGame({ shape, tiles, tries, check, lineFor, out, hints, initial, onProgress, autoFocus }: GuessGameProps) {
  const length = shape.reduce((sum, word) => sum + word, 0);
  const box = useRef<HTMLDivElement>(null);
  // Null while tries kept from last time are checked again.
  const [attempts, setAttempts] = useState<Attempt[] | null>(initial?.tries.length ? null : []);
  const [hintsTaken, setHintsTaken] = useState(initial?.hints ?? 0);
  const [typed, setTyped] = useState('');
  const [placed, setPlaced] = useState<number[]>([]);
  const [checking, setChecking] = useState(false);
  const [line, setLine] = useState('');

  useEffect(() => {
    if (autoFocus) box.current?.focus();
    if (!initial?.tries.length) return;
    let current = true;
    Promise.all(initial.tries.map(async (guess) => ({ guess, ...(await check(guess)) }))).then((found) => current && setAttempts(found));
    return () => {
      current = false;
    };
    // Only on opening: later tries are checked as they're made.
  }, []);

  const solved = attempts?.find((attempt) => attempt.right);
  const usedUp = !solved && tries > 0 && (attempts?.length ?? 0) >= tries;
  const over = Boolean(solved) || usedUp;

  useEffect(() => {
    let current = true;
    if (solved) lineFor(solved.guess).then((said) => current && setLine(said));
    else setLine(usedUp ? out || 'No more tries.' : '');
    return () => {
      current = false;
    };
  }, [solved, usedUp, out, lineFor]);

  useEffect(() => {
    if (attempts) onProgress?.({ tries: attempts.map((attempt) => attempt.guess), hints: hintsTaken });
  }, [attempts, hintsTaken, onProgress]);

  const now = tiles ? placed.map((tile) => tiles[tile]).join('') : typed;

  async function submit() {
    if (now.length !== length || over || checking || !attempts) return;
    setChecking(true);
    const checked = await check(now);
    setAttempts((made) => [...(made ?? []), { guess: now, ...checked }]);
    setTyped('');
    setPlaced([]);
    setChecking(false);
  }

  function add(letter: string) {
    if (over || now.length >= length) return;
    if (!tiles) return setTyped(typed + letter);
    const tile = [...tiles].findIndex((each, at) => each === letter && !placed.includes(at));
    if (tile >= 0) setPlaced([...placed, tile]);
  }

  const takeBack = () => (tiles ? setPlaced(placed.slice(0, -1)) : setTyped(typed.slice(0, -1)));

  function keyDown(event: KeyboardEvent) {
    if (event.ctrlKey || event.metaKey || event.altKey) return;
    if (event.key === 'Enter') submit();
    else if (event.key === 'Backspace') takeBack();
    else if (/^[a-z]$/i.test(event.key)) add(event.key.toUpperCase());
    else return;
    event.preventDefault();
  }

  const best = bestMarks((attempts ?? []).flatMap((attempt) => (attempt.marks ? [{ guess: attempt.guess, marks: attempt.marks }] : [])));
  const hinted: (string | null)[] = Array.from({ length }, () => null);
  for (const [at, letter] of hints.slice(0, hintsTaken)) hinted[at] = letter;
  const left = tries - (attempts?.length ?? 0);

  return (
    <div className="guess" ref={box} tabIndex={0} onKeyDown={keyDown} aria-label="The word guess. Type a try, and press Enter.">
      {hintsTaken > 0 && <Row shape={shape} letters={hinted} label={`Hints: ${hinted.map((letter) => letter ?? 'blank').join(', ')}`} hint />}
      {attempts === null && <p className="hint">Bringing back your tries…</p>}
      {attempts?.map((attempt, i) => (
        <Row
          key={i}
          shape={shape}
          letters={[...attempt.guess]}
          marks={attempt.marks}
          wrong={!attempt.right && !attempt.marks}
          label={`Try ${i + 1}: ${
            attempt.marks ? [...attempt.guess].map((letter, at) => `${letter} ${SAID[attempt.marks![at]]}`).join(', ') : attempt.guess
          }${attempt.right ? ', right' : attempt.marks ? '' : ', not it'}`}
        />
      ))}
      {!over && attempts && (
        <Row
          shape={shape}
          letters={Array.from({ length }, (_, at) => now[at] ?? null)}
          label={`Your try: ${now || 'nothing yet'}`}
          current
        />
      )}

      {!over && tiles && (
        <div className="tray" role="group" aria-label="Tiles">
          {[...tiles].map((letter, at) => (
            <button key={at} type="button" className="tile" disabled={placed.includes(at)} onClick={() => setPlaced([...placed, at])}>
              {letter}
            </button>
          ))}
        </div>
      )}
      {!over && !tiles && (
        <div className="keyboard" role="group" aria-label="Letters">
          {KEYS.map((row) => (
            <div key={row} className="keys">
              {[...row].map((letter) => (
                <button
                  key={letter}
                  type="button"
                  className={`key ${best.get(letter) ?? ''}`}
                  aria-label={best.has(letter) ? `${letter}, ${SAID[best.get(letter)!]}` : letter}
                  onClick={() => add(letter)}
                >
                  {letter}
                </button>
              ))}
            </div>
          ))}
        </div>
      )}
      {!over && (
        <div className="game-actions">
          <button type="button" onClick={takeBack} disabled={now.length === 0}>
            ⌫ Back
          </button>
          <button type="button" className="primary" onClick={submit} disabled={now.length !== length || checking}>
            Try it
          </button>
          {hintsTaken < hints.length && (
            <button type="button" onClick={() => setHintsTaken(hintsTaken + 1)}>
              Take a hint ({hints.length - hintsTaken} left)
            </button>
          )}
          <span className="moves">{tries === 0 ? 'As many tries as you like' : left === 1 ? 'Last try' : `${left} tries left`}</span>
        </div>
      )}
      <p className={solved ? 'success' : 'success out'} role="status">
        {line}
      </p>
    </div>
  );
}

interface RowProps {
  shape: readonly number[];
  letters: (string | null)[];
  marks?: readonly Mark[] | null;
  /** A try that was wrong, with no letters marked. */
  wrong?: boolean;
  label: string;
  current?: boolean;
  hint?: boolean;
}

/** A row of letter boxes, in the answer's words. */
function Row({ shape, letters, marks, wrong, label, current, hint }: RowProps) {
  let at = 0;
  return (
    <div className={['guess-row', current && 'current', hint && 'hinted'].filter(Boolean).join(' ')} role="img" aria-label={label}>
      {shape.map((word, w) => (
        <span key={w} className="guess-word">
          {Array.from({ length: word }, () => {
            const here = at++;
            return (
              <span key={here} className={`box ${marks?.[here] ?? ''} ${letters[here] ? 'filled' : ''}`}>
                {letters[here] ?? ''}
              </span>
            );
          })}
        </span>
      ))}
      {wrong && <span className="not-it">✗</span>}
    </div>
  );
}
