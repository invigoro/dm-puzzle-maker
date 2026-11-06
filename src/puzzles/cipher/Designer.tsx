import { useId, useMemo, useState } from 'react';
import { iconWords } from '../../kit/icons';
import { mulberry32, randomSeed, shuffled } from '../../kit/rng';
import { IconCredit } from '../../ui/IconCredit';
import { iconMask, IconPicker } from '../../ui/IconPicker';
import type { MakerProps } from '../types';
import { checkedOf, cipherOf, FAIL_AFTER, LONGEST_WORD, problemsOf, ringOfDesign, startOf, type CipherDesign } from './design';
import type { Method } from './engine/cipher';
import { ALPHABET, lettersOf } from './engine/letters';
import { PICTURE_CHOICES, RUNES, type Script } from './engine/rings';
import { EXAMPLE } from './example';
import { LONGEST_LINE, LONGEST_MESSAGE, type Checking } from './puzzle';
import { Reader, type Judge } from './Reader';

const SCRIPT_CHOICES: readonly { script: Script; name: string; says: string }[] = [
  { script: 'letters', name: 'Letters', says: 'the alphabet again, as a Caesar wheel has' },
  { script: 'runes', name: 'Runes', says: `${RUNES.slice(0, 8).join(' ')}…` },
  { script: 'pictures', name: 'Pictures', says: 'one of your choosing for each letter' },
];

const METHOD_CHOICES: readonly { method: Method; name: string; says: string }[] = [
  {
    method: 'one',
    name: 'One setting',
    says: 'the whole message is read with the mark under one letter. Turning finds it in a minute or so: an easy puzzle, or a first one.',
  },
  {
    method: 'turning',
    name: 'Turning as it goes',
    says: 'the mark moves a letter on after every letter, or every word. There’s no keyword: noticing that is the puzzle, so hint at it in the game.',
  },
  {
    method: 'autokey',
    name: 'Autokey',
    says: 'for the first letters, the mark goes under each letter of a starting word in turn; after that, under each letter just read. Hide the starting word in the game.',
  },
  {
    method: 'keyword',
    name: 'A keyword',
    says: 'for each letter, the mark goes under the next letter of the keyword, round and round, as Vigenère’s cipher has. Hide the keyword in the game: without it, it’s beyond most tables.',
  },
];

const CHECK_CHOICES: readonly { check: Checking; name: string; says: string }[] = [
  { check: 'filled', name: 'When every box is filled', says: 'the page checks the letters they’ve written, and says your line once they’re right.' },
  { check: 'answer', name: 'By an answer', says: 'they give an answer the message tells them, such as a password, and a wrong one can cost them.' },
  { check: 'none', name: 'Not at all', says: 'reading the message is its own reward, so your line for solving it isn’t used.' },
];

/** The game master's part of the maker: the message, the wheel's symbols, the key, how it's checked, and a try of it. */
export function Designer({ design, onChange }: MakerProps<CipherDesign>) {
  const id = useId();
  const [picking, setPicking] = useState<number | null>(null);
  const set = (change: Partial<CipherDesign>) => onChange({ ...design, ...change });

  function fillPictures() {
    const left = shuffled(
      PICTURE_CHOICES.filter((name) => !design.pictures.includes(name)),
      mulberry32(randomSeed()),
    );
    set({ pictures: design.pictures.map((picture) => picture || left.shift() || '') });
  }

  const problems = problemsOf(design);
  const ring = useMemo(() => ringOfDesign(design), [design]);
  const text = useMemo(() => cipherOf(design), [design]);
  const checked = checkedOf(design);
  const success = design.words.success.trim() || 'Solved.';
  // The message and answer are known here, so the try is judged against them, as a link's fingerprint would judge it.
  const judge = useMemo<Judge>(() => ({ isAnswer: async (letters) => letters === checked, lineFor: async () => success }), [checked, success]);
  // The try starts again whenever what's on the wheel changes, or how it's checked.
  const trial = JSON.stringify([ring, text, design.method, design.step, design.check, design.reading, design.failAfter]);
  const settingName = design.method === 'turning' ? 'The mark starts under' : 'The mark sits under';

  return (
    <>
      <section className="panel">
        <h2>The message</h2>
        <div className="field">
          <label htmlFor={`${id}-message`}>Message</label>
          <textarea
            id={`${id}-message`}
            rows={4}
            value={design.message}
            maxLength={LONGEST_MESSAGE}
            placeholder="The tide turns at midnight."
            onChange={(event) => set({ message: event.target.value })}
          />
          <span className="hint">
            Up to {LONGEST_MESSAGE} characters. Its letters are put in cipher, accents taken off; spaces and punctuation stay as they are.
          </span>
        </div>
        <label className="check">
          <input type="checkbox" checked={design.groups} onChange={(event) => set({ groups: event.target.checked })} />
          <span>
            <strong>Run the letters on in groups of five,</strong> dropping the spaces and punctuation: harder, as the words no longer show.
          </span>
        </label>
        {design.message.trim() === '' && design.words.title.trim() === '' && (
          <p>
            <button type="button" onClick={() => onChange({ ...design, ...EXAMPLE })}>
              Start from the example
            </button>{' '}
            <span className="hint">a made-up smuggler’s message, in runes</span>
          </p>
        )}
      </section>

      <section className="panel">
        <h2>The wheel</h2>
        <p className="hint">The alphabet runs round the outside, fixed. The inner ring turns, with a symbol for each letter.</p>
        <div role="radiogroup" aria-label="The inner ring’s symbols">
          {SCRIPT_CHOICES.map(({ script, name, says }) => (
            <label key={script} className="check">
              <input type="radio" name={`${id}-script`} checked={design.script === script} onChange={() => set({ script })} />
              <span>
                <strong>{name}:</strong> <span className={script === 'runes' ? 'rune' : undefined}>{says}</span>
              </span>
            </label>
          ))}
        </div>
        {design.script === 'pictures' && (
          <>
            <ol className="picture-alphabet">
              {ALPHABET.split('').map((letter, i) => {
                const picture = design.pictures[i];
                return (
                  <li key={letter}>
                    <span className="letter">{letter}</span>
                    <button
                      type="button"
                      className={picture ? 'picture-button chosen' : 'picture-button'}
                      aria-label={`Picture for ${letter}`}
                      aria-expanded={picking === i}
                      title={picture ? iconWords(picture) : 'Choose a picture'}
                      onClick={() => setPicking(picking === i ? null : i)}
                    >
                      {picture ? <span className="icon-thumb" style={iconMask(picture)} /> : <span aria-hidden="true">🖼</span>}
                    </button>
                  </li>
                );
              })}
            </ol>
            {picking !== null && (
              <IconPicker
                label={`Picture for ${ALPHABET[picking]}`}
                value={design.pictures[picking] || undefined}
                onPick={(icon) => {
                  set({ pictures: design.pictures.map((picture, i) => (i === picking ? (icon ?? '') : picture)) });
                  setPicking(null);
                }}
                onClose={() => setPicking(null)}
              />
            )}
            <p>
              <button type="button" onClick={fillPictures} disabled={design.pictures.every(Boolean)}>
                🎲 Fill the rest
              </button>{' '}
              <button type="button" onClick={() => set({ pictures: design.pictures.map(() => '') })} disabled={!design.pictures.some(Boolean)}>
                Clear them
              </button>
            </p>
          </>
        )}
        <div className="field">
          <label htmlFor={`${id}-mix`}>Mix the inner ring by a word</label>
          <input id={`${id}-mix`} value={design.mix} maxLength={LONGEST_WORD} placeholder="DRAGON" onChange={(event) => set({ mix: event.target.value })} />
          <span className="hint">
            Its letters go first, each once, then the rest of the alphabet: DRAGON gives D R A G O N B C E… Left blank, the symbols go round in order.
          </span>
        </div>
      </section>

      <section className="panel">
        <h2>The key</h2>
        <p className="hint">
          The first symbol on the inner ring has a mark. Where the mark sits, under which letter of the outer ring, is the wheel’s setting, and
          how it moves along the message is the key.
        </p>
        <div role="radiogroup" aria-label="The key">
          {METHOD_CHOICES.map(({ method, name, says }) => (
            <label key={method} className="check">
              <input type="radio" name={`${id}-method`} checked={design.method === method} onChange={() => set({ method })} />
              <span>
                <strong>{name}:</strong> {says}
              </span>
            </label>
          ))}
        </div>
        {(design.method === 'one' || design.method === 'turning') && (
          <div className="row">
            <label htmlFor={`${id}-setting`}>{settingName}</label>
            <select id={`${id}-setting`} value={design.setting} onChange={(event) => set({ setting: Number(event.target.value) })}>
              {ALPHABET.split('').map((letter, i) => (
                <option key={letter} value={i}>
                  {letter}
                </option>
              ))}
            </select>
            <button type="button" onClick={() => set({ setting: randomSeed() % 26 })}>
              🎲
            </button>
          </div>
        )}
        {design.method === 'turning' && (
          <div className="row">
            <label htmlFor={`${id}-step`}>It moves a letter on after every</label>
            <select id={`${id}-step`} value={design.step} onChange={(event) => set({ step: event.target.value === 'word' ? 'word' : 'letter' })}>
              <option value="letter">letter</option>
              <option value="word">word</option>
            </select>
          </div>
        )}
        {design.method === 'autokey' && (
          <div className="field">
            <label htmlFor={`${id}-primer`}>Starting word</label>
            <input id={`${id}-primer`} value={design.primer} maxLength={LONGEST_WORD} placeholder="SALT" onChange={(event) => set({ primer: event.target.value })} />
          </div>
        )}
        {design.method === 'keyword' && (
          <div className="field">
            <label htmlFor={`${id}-keyword`}>Keyword</label>
            <input id={`${id}-keyword`} value={design.keyword} maxLength={LONGEST_WORD} placeholder="LANTERN" onChange={(event) => set({ keyword: event.target.value })} />
          </div>
        )}
      </section>

      <section className="panel">
        <h2>Checking</h2>
        <div role="radiogroup" aria-label="Checking">
          {CHECK_CHOICES.map(({ check, name, says }) => (
            <label key={check} className="check">
              <input type="radio" name={`${id}-check`} checked={design.check === check} onChange={() => set({ check })} />
              <span>
                <strong>{name}:</strong> {says}
              </span>
            </label>
          ))}
        </div>
        {design.check === 'answer' && (
          <>
            <div className="field">
              <label htmlFor={`${id}-password`}>The answer</label>
              <input id={`${id}-password`} value={design.password} maxLength={LONGEST_WORD} placeholder="Swordfish" onChange={(event) => set({ password: event.target.value })} />
              <span className="hint">Only its letters count, whatever their case, accents or spacing.</span>
            </div>
            <div className="field">
              <label htmlFor={`${id}-wrong`}>A wrong answer says</label>
              <input
                id={`${id}-wrong`}
                value={design.wrongLine}
                maxLength={LONGEST_LINE}
                placeholder="The lock bites: 1d4 piercing."
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
        <label className="check">
          <input type="checkbox" checked={design.reading} onChange={(event) => set({ reading: event.target.checked })} />
          <span>
            <strong>Read it for them:</strong>{' '}
            {design.method === 'autokey' || design.method === 'keyword'
              ? `the page reads the message with the ${design.method === 'autokey' ? 'starting word' : 'keyword'} they type, which saves the tedium once they’ve found it.`
              : 'the page shows what the wheel reads as they turn it, which gives the answer away as fast as turning finds it.'}
          </span>
        </label>
      </section>

      <section className="panel">
        <h2>Try it</h2>
        <p className="hint">As your players will see it. Turning and writing here changes nothing in the puzzle.</p>
        {problems.length === 0 ? (
          <Reader
            key={trial}
            script={design.script}
            ring={ring}
            text={text}
            method={design.method}
            step={design.step}
            start={startOf(design)}
            check={design.check}
            reading={design.reading}
            wrongLine={design.wrongLine.trim()}
            failAfter={design.failAfter}
            failLine={design.failLine.trim()}
            judge={judge}
          />
        ) : (
          <p className="hint">{lettersOf(design.message) === '' ? 'Write the message to try it.' : problems.join(' ')}</p>
        )}
        {design.script === 'pictures' && <IconCredit names={design.pictures.filter(Boolean)} />}
      </section>
    </>
  );
}
