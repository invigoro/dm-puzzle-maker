import { Fragment, useEffect, useId, useRef, useState, type ChangeEvent, type FormEvent, type KeyboardEvent } from 'react';
import { iconMask } from '../../ui/IconPicker';
import { decipher, type Key, type Method, type Step } from './engine/cipher';
import { lettersOf } from './engine/letters';
import type { Script } from './engine/rings';
import { slotsOf, type CipherProgress, type Checking } from './puzzle';
import { symbolName, Wheel } from './Wheel';

/** How the reader judges the players: against the message or answer, in the maker, or a link's fingerprint. */
export interface Judge {
  /** Whether some letters, run together, are what's checked: the message, or the answer. */
  isAnswer(letters: string): Promise<boolean>;
  /** The line for solving it, opened with what's checked. */
  lineFor(letters: string): Promise<string>;
}

interface ReaderProps {
  script: Script;
  ring: readonly string[];
  /** The message in cipher: letters A to Z stand for the inner ring's places. */
  text: string;
  method: Method;
  step?: Step;
  /** Where the mark sits at first. */
  start: number;
  check: Checking;
  /** Whether the page reads the message for them. */
  reading: boolean;
  wrongLine: string;
  /** After how many wrong answers the players fail: 0 for never. */
  failAfter: number;
  failLine: string;
  judge: Judge;
  initial?: CipherProgress | null;
  onProgress?(progress: CipherProgress): void;
}

/** What the page reads with a keyword the players give, as each kind of key calls it. */
const READ_WITH: Partial<Record<Method, string>> = { autokey: 'The starting word', keyword: 'The keyword' };

/**
 * A message in cipher, with a box under each symbol for the letter the players read there, and the
 * wheel to read it with. It's checked when every box is filled, or by an answer they give, or not
 * at all, as the game master chose.
 */
export function Reader({ script, ring, text, method, step, start, check, reading, wrongLine, failAfter, failLine, judge, initial, onProgress }: ReaderProps) {
  const id = useId();
  const [turns, setTurns] = useState(initial?.turns ?? start);
  const [written, setWritten] = useState<string[]>(initial?.written ?? Array.from({ length: slotsOf(method, text) }, () => ''));
  const [wrong, setWrong] = useState(initial?.wrong ?? 0);
  const [solved, setSolved] = useState(initial?.solved ?? false);
  const [failed, setFailed] = useState(initial?.failed ?? false);
  const [readWith, setReadWith] = useState(initial?.reading ?? '');
  const [answer, setAnswer] = useState(initial?.answer ?? '');
  /** The line for solving it, once opened; what the last wrong answer or full boxes said. */
  const [line, setLine] = useState('');
  const [said, setSaid] = useState('');
  /** The answer last given, and the full boxes last checked, so the same ones aren't checked twice. */
  const [checked, setChecked] = useState<string | null>(null);
  const filledChecked = useRef<string | null>(null);
  const [busy, setBusy] = useState(false);
  const boxes = useRef<(HTMLInputElement | null)[]>([]);
  const done = solved || failed;

  // Each letter of the message, in order, with its place on the inner ring and the box it's written in.
  const places = [...text].flatMap((char) => (char >= 'A' && char <= 'Z' ? [char.charCodeAt(0) - 65] : []));
  const slotOf = (letter: number) => (method === 'one' ? places[letter] : letter);
  const guess = places.map((_, letter) => written[slotOf(letter)]).join('');
  const full = guess.length === places.length;

  useEffect(() => {
    onProgress?.({ turns, written, wrong, solved, failed, reading: readWith, answer });
  }, [turns, written, wrong, solved, failed, readWith, answer, onProgress]);

  // Solved before, so the line's opened again: once, for where they left off.
  useEffect(() => {
    if (initial?.solved) judge.lineFor(check === 'answer' ? lettersOf(initial.answer) : guess).then(setLine);
  }, []);

  // Every box filled: checked, when that's how it's checked, once for each set of letters.
  useEffect(() => {
    if (check !== 'filled' || done || !full || guess === filledChecked.current) return;
    let current = true;
    judge.isAnswer(guess).then((right) => {
      if (!current) return;
      filledChecked.current = guess;
      if (right) solve(guess);
      else setSaid('Every box is filled, but that’s not it yet.');
    });
    return () => {
      current = false;
    };
    // `solve` only sets state, so isn't among them.
  }, [check, done, full, guess, judge]);

  function solve(letters: string) {
    setSolved(true);
    setSaid('');
    judge.lineFor(letters).then(setLine);
  }

  function write(letter: number, value: string) {
    setWritten((now) => now.map((each, slot) => (slot === slotOf(letter) ? value : each)));
    setSaid('');
  }

  function typed(event: ChangeEvent<HTMLInputElement>, letter: number) {
    // The last letter typed, whatever was there: a box holds one.
    const value = lettersOf(event.target.value).slice(-1);
    write(letter, value);
    if (value) boxes.current[letter + 1]?.focus();
  }

  function boxKey(event: KeyboardEvent<HTMLInputElement>, letter: number) {
    const go = (to: number) => {
      const box = boxes.current[to];
      if (!box) return false;
      event.preventDefault();
      box.focus();
      return true;
    };
    if (event.key === 'ArrowLeft') go(letter - 1);
    else if (event.key === 'ArrowRight') go(letter + 1);
    else if (event.key === 'Backspace' && !written[slotOf(letter)] && !done && go(letter - 1)) write(letter - 1, '');
  }

  async function tryAnswer(event: FormEvent) {
    event.preventDefault();
    const letters = lettersOf(answer);
    if (!letters || letters === checked || done || busy) return;
    setChecked(letters);
    setBusy(true);
    const right = await judge.isAnswer(letters);
    setBusy(false);
    if (right) return solve(letters);
    const count = wrong + 1;
    setWrong(count);
    setSaid(wrongLine || 'That’s not it.');
    if (failAfter > 0 && count >= failAfter) setFailed(true);
  }

  /** What the page reads, when it reads for them: at the wheel's setting, or with the keyword they give. */
  function readingNow(): string | null {
    const setting = ((turns % 26) + 26) % 26;
    const key: Key | null =
      method === 'one'
        ? { method, setting }
        : method === 'turning'
          ? { method, setting, step: step ?? 'letter' }
          : lettersOf(readWith) === ''
            ? null
            : method === 'autokey'
              ? { method, primer: readWith }
              : { method, keyword: readWith };
    return key && decipher(text, key);
  }

  // The message, a word at a time, so no word breaks across lines; each letter numbered in order.
  let letter = 0;
  const words = text.split(' ').map((word) =>
    [...word].map((char) => {
      if (char < 'A' || char > 'Z') return { char, letter: -1 };
      return { char, letter: letter++ };
    }),
  );
  const symbolOf = (char: string) => ring[char.charCodeAt(0) - 65];
  const read = reading ? readingNow() : null;

  return (
    <div className={solved ? 'game cipher solved' : 'game cipher'}>
      <Wheel script={script} ring={ring} turns={turns} onTurn={(by) => setTurns((now) => now + by)} />
      <div className="cipher-side">
        <div className="message" role="group" aria-label="The message">
          {words.map((word, w) => (
            <Fragment key={w}>
              {w > 0 && ' '}
              <span className="cipher-word">
                {word.map(({ char, letter: at }, i) => {
                  if (at < 0) {
                    return (
                      <span key={i} className="cipher-mark">
                        {char}
                      </span>
                    );
                  }
                  const symbol = symbolOf(char);
                  return (
                    <label key={i} className="glyph">
                      {script === 'pictures' ? (
                        <span className="icon-thumb" style={iconMask(symbol)} />
                      ) : (
                        <span className={script === 'runes' ? 'symbol rune' : 'symbol'}>{symbol}</span>
                      )}
                      <input
                        ref={(box) => {
                          boxes.current[at] = box;
                        }}
                        aria-label={`Letter ${at + 1}: ${symbolName(script, symbol)}`}
                        value={written[slotOf(at)]}
                        readOnly={done}
                        autoComplete="off"
                        autoCapitalize="characters"
                        spellCheck={false}
                        onFocus={(event) => event.target.select()}
                        onChange={(event) => typed(event, at)}
                        onKeyDown={(event) => boxKey(event, at)}
                      />
                    </label>
                  );
                })}
              </span>
            </Fragment>
          ))}
        </div>
        <p className="hint">
          Turn the wheel, and write under each symbol the letter you read for it.
          {method === 'one' && ' A letter written under one symbol goes under every one like it.'}
        </p>
        {reading && (
          <div className="reading">
            {READ_WITH[method] && (
              <div className="field">
                <label htmlFor={`${id}-read`}>{READ_WITH[method]}</label>
                <input id={`${id}-read`} value={readWith} maxLength={40} autoComplete="off" onChange={(event) => setReadWith(event.target.value)} />
              </div>
            )}
            {read !== null && (
              <p>
                <span className="hint">It reads: </span>
                <span className="read">{read}</span>
              </p>
            )}
          </div>
        )}
        {check === 'answer' && (
          <form className="row answer" onSubmit={tryAnswer}>
            <label htmlFor={`${id}-answer`}>The answer</label>
            <input id={`${id}-answer`} value={answer} maxLength={40} autoComplete="off" disabled={done} onChange={(event) => setAnswer(event.target.value)} />
            <button type="submit" className="primary" disabled={done || busy || !lettersOf(answer) || lettersOf(answer) === checked}>
              Give the answer
            </button>
            {wrong > 0 && (
              <span className="moves">
                {wrong === 1 ? '1 wrong answer' : `${wrong} wrong answers`}
                {failAfter > 0 && `, of ${failAfter}`}
              </span>
            )}
          </form>
        )}
        <p className={!solved && (said || failed) ? 'success wrong' : 'success'} role="status">
          {solved ? line : [said, failed ? failLine || 'That was the last chance.' : ''].filter(Boolean).join(' ')}
        </p>
      </div>
    </div>
  );
}
