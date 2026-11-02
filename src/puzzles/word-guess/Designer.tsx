import { useCallback, useId, useState } from 'react';
import { randomSeed } from '../../kit/rng';
import type { MakerProps } from '../types';
import { lettersOf, MOST_HINTS, shapeOf, tilesOf, TRIES, type GuessDesign } from './design';
import { hintOrder, wordsIn } from './engine/letters';
import { mark } from './engine/marking';
import { EXAMPLE } from './example';
import { GuessGame } from './GuessGame';

const NUMBERS = ['no', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten'];
const inWords = (n: number) => NUMBERS[n] ?? String(n);

/** The game master's part of the maker: the answer, how the players guess it, and a try of it. */
export function Designer({ design, onChange }: MakerProps<GuessDesign>) {
  const id = useId();
  const [again, setAgain] = useState(0);
  const set = (change: Partial<GuessDesign>) => onChange({ ...design, ...change });

  const letters = lettersOf(design);
  const words = wordsIn(design.answer);
  const shape = shapeOf(design);
  const tiles = design.letters === 'tiles' && letters.length > 1 ? tilesOf(design) : undefined;
  const mostHints = Math.min(MOST_HINTS, Math.max(0, letters.length - 1));
  const hints = hintOrder(shape)
    .slice(0, Math.min(design.hints, mostHints))
    .map((at): [number, string] => [at, letters[at]]);

  // The try below checks against the answer itself; a player link checks against fingerprints.
  const check = useCallback(
    async (guess: string) => ({ right: guess === letters, marks: design.marking === 'letters' || guess === letters ? mark(guess, letters) : null }),
    [letters, design.marking],
  );
  const lineFor = useCallback(async () => design.words.success || 'Solved.', [design.words.success]);
  const trial = JSON.stringify([letters, shape, tiles, design.tries, design.marking, hints, again]);

  return (
    <>
      <section className="panel">
        <h2>The answer</h2>
        <div className="field">
          <label htmlFor={`${id}-answer`}>Answer</label>
          <input id={`${id}-answer`} className="half" value={design.answer} maxLength={60} onChange={(event) => set({ answer: event.target.value })} />
          <span className="hint">
            {letters.length === 0
              ? 'A password, a name, or a riddle’s answer. Only its letters count: capitals, accents and anything else are left out.'
              : `${letters.length} letters, in ${inWords(words.length)} ${words.length === 1 ? 'word' : 'words'}${words.length > 1 ? `: ${words.map((word) => word.length).join(', ')}` : ''}.`}
          </span>
        </div>
        {design.answer.trim() === '' && (
          <p>
            <button type="button" onClick={() => onChange({ ...design, words: EXAMPLE.words, answer: EXAMPLE.answer, out: EXAMPLE.out })}>
              Start from the example
            </button>{' '}
            <span className="hint">a door that asks for a tree’s name</span>
          </p>
        )}
      </section>

      <section className="panel">
        <h2>How they guess</h2>
        <fieldset className="field">
          <legend className="label-text">How they make a try</legend>
          <label className="check">
            <input type="radio" name={`${id}-letters`} checked={design.letters === 'any'} onChange={() => set({ letters: 'any' })} />
            <span>
              <strong>Any letters:</strong> they type each try, knowing only how many letters there are.
            </span>
          </label>
          <label className="check">
            <input type="radio" name={`${id}-letters`} checked={design.letters === 'tiles'} onChange={() => set({ letters: 'tiles' })} />
            <span>
              <strong>Tiles:</strong> they get the answer’s letters, shuffled, and arrange every one.
            </span>
          </label>
        </fieldset>
        {design.letters === 'any' && (
          <label className="check">
            <input type="checkbox" checked={design.breaks} onChange={(event) => set({ breaks: event.target.checked })} />
            <span>Show where the words break</span>
          </label>
        )}
        {tiles && (
          <p className="row">
            <span className="tiles-preview" role="img" aria-label={`Tiles: ${[...tiles].join(' ')}`}>
              {[...tiles].map((letter, at) => (
                <span key={at} className="box filled">
                  {letter}
                </span>
              ))}
            </span>
            <button type="button" onClick={() => set({ seed: randomSeed() })}>
              🎲 Shuffle again
            </button>
          </p>
        )}
        <div className="row">
          <label htmlFor={`${id}-tries`}>Tries</label>
          <select id={`${id}-tries`} value={design.tries} onChange={(event) => set({ tries: Number(event.target.value) })}>
            {TRIES.map((tries) => (
              <option key={tries} value={tries}>
                {tries === 0 ? 'As many as they like' : tries === 1 ? 'One try' : `${tries} tries`}
              </option>
            ))}
          </select>
          <label htmlFor={`${id}-hints`}>Hints</label>
          <select id={`${id}-hints`} value={Math.min(design.hints, mostHints)} onChange={(event) => set({ hints: Number(event.target.value) })}>
            {Array.from({ length: mostHints + 1 }, (_, n) => (
              <option key={n} value={n}>
                {n === 0 ? 'None' : n === 1 ? 'One letter' : `${n} letters`}
              </option>
            ))}
          </select>
        </div>
        <fieldset className="field">
          <legend className="label-text">What a try tells them</legend>
          <label className="check">
            <input type="radio" name={`${id}-marking`} checked={design.marking === 'letters'} onChange={() => set({ marking: 'letters' })} />
            <span>
              <strong>Letter by letter:</strong> each letter is in the right place, in the answer elsewhere, or not in it.
              <span className="hint">
                {' '}
                The player link then holds a quick fingerprint of each letter in its place, so a programmer could read the
                answer from it in moments.
              </span>
            </span>
          </label>
          <label className="check">
            <input type="radio" name={`${id}-marking`} checked={design.marking === 'whole'} onChange={() => set({ marking: 'whole' })} />
            <span>
              <strong>Only right or wrong</strong>, which keeps the answer as safe as the discs’.
            </span>
          </label>
        </fieldset>
        {design.tries > 0 && (
          <div className="field">
            <label htmlFor={`${id}-out`}>When they run out of tries</label>
            <input id={`${id}-out`} value={design.out} maxLength={200} onChange={(event) => set({ out: event.target.value })} />
          </div>
        )}
      </section>

      <section className="panel">
        <h2>Try it</h2>
        <p className="hint">As your players will see it. Trying it here changes nothing in the puzzle.</p>
        {letters.length > 1 ? (
          <>
            <GuessGame key={trial} shape={shape} tiles={tiles} tries={design.tries} check={check} lineFor={lineFor} out={design.out} hints={hints} />
            <p>
              <button type="button" onClick={() => setAgain(again + 1)}>
                Start again
              </button>
            </p>
          </>
        ) : (
          <p className="hint">Write an answer to try it.</p>
        )}
      </section>
    </>
  );
}
